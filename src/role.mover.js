const logistic = require('helper.logistic');
const profitVisual = require('visual.roomProfit');
const renew = require('helper.renew');
const recycle = require('helper.recycle');

const storeStructures = [STRUCTURE_STORAGE, STRUCTURE_CONTAINER];
const wayStructures = [STRUCTURE_POWER_BANK];

module.exports = {
  name: 'mover',
  partConfigs: [
    [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
    [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
    [CARRY, CARRY, MOVE],
  ],
  configsForCapacity: function (capacity, options) {
    var workParts = (options && options.workParts) || 0;
    var configs = [];
    for (var carries = Math.max(2, Math.ceil(capacity / 50)); carries >= 2; carries -= 1) {
      let config = Array(workParts)
        .fill(WORK)
        .concat(Array(carries).fill(CARRY))
        .concat(Array(Math.ceil((carries + workParts) / 2)).fill(MOVE));
      // maximum creep size is 50 parts
      if (config.length <= 50) configs.push(config);
    }

    return configs;
  },
  run: function (creep) {
    if (recycle.check(creep)) return;
    if (renew.check(creep)) return;
    if (creep.memory.resource == RESOURCE_ENERGY) {
      logistic.pickupSpareEnergy(creep);
    }

    if (creep.store.getFreeCapacity() < creep.store.getCapacity() * 0.1 && !this.shouldWait(creep)) {
      if (this.deliver(creep)) this.pickup(creep);
    } else {
      // if(creep.room.name == creep.memory.target) {
      if (this.pickup(creep)) this.deliver(creep);
      // } else {
      //     // if(this.pickupWay(creep)) {/*this.deliver(creep)*/} else {
      //     if(this.deliver(creep)) this.pickup(creep);
      //         // if(this.pickup(creep)) this.deliver(creep);
      //     // };
      // }
    }
  },
  approachRoom: function (creep, position) {
    // TODO: waiting (somewhere) blocks aggressive move... creep does not attack, because healer is out of range
    if (!this.shouldWait(creep)) {
      creep.goTo(position);
    }

    // let target = ff.findClosestHostileByRange(creep.pos);
    // if(target && creep.pos.isNearTo(target)) {
    //     creep.attack(target);
    // }
  },
  deliver: function (creep) {
    // console.log(creep.memory.home)
    let tg = AbsolutePosition.toRoom(creep.memory.home);
    // console.log(tg)

    if (creep.pos.roomName !== tg.roomName) {
      this.approachRoom(creep, tg);
      return;
    }
    // if(creep.memory.selfSustaining && !(creep.room.controller && creep.room.controller.owner)) {
    //     var road = _.find(creep.pos.lookFor(LOOK_STRUCTURES), (s) => s.structureType == STRUCTURE_ROAD);
    //     if(road) {
    //         if(road.hits / road.hitsMax <= 0.6) {
    //             creep.repair(road);
    //         }
    //     } else if(creep.pos.x > 0 && creep.pos.x < 49 && creep.pos.y > 0 && creep.pos.y < 49) {
    //         if(this.buildRoad(creep)) {
    //             return false; // stop on pending construction sites
    //         };
    //     }
    // }

    let targets = [];
    let target;
    let room = creep.room;
    if (room && room.storage) {
      targets = targets.concat((room && room.storage) || []);
    } else {
      targets = targets.concat(
        creep.room.find(FIND_STRUCTURES, {
          filter: (s) =>
            storeStructures.includes(s.structureType) &&
            _.sum(s.store) < s.storeCapacity &&
            s.storeCapacity - _.sum(s.store) > _.sum(creep.store),
        })
      );
      // console.log('targ scoo', JSON.stringify(target))
    }
    if (targets.length > 0) {
      var targetsByDistance = _.sortBy(targets, (t) => creep.pos.getRangeTo(t));
      // console.log('dist', JSON.stringify(targetsByDistance))
      target = targetsByDistance[0];
    }

    // console.log('target', creep.name, JSON.stringify(target))
    let transferResult;
    transferResult = creep.transfer(target, creep.memory.resource);

    // console.log('tr', JSON.stringify(transferResult))
    if (transferResult == OK) {
      creep.memory.waitStart = null;
      if (creep.memory.clearResource) {
        delete creep.memory.resource;
      }
      if (creep.memory.registerRevenueFor && creep.memory.resource == RESOURCE_ENERGY) {
        // assuming we always transfer all our energy
        profitVisual.addRevenue(creep.memory.registerRevenueFor, creep.store.energy);
      }

      return true;
    } else if (transferResult == ERR_NOT_IN_RANGE) {
      creep.goTo(target);
    }
  },
  pickupWay: function (creep) {
    if (creep.store.getFreeCapacity() < creep.store.getCapacity() * 0.1) {
      creep.memory.returningHome = true;
      return false;
    }

    let target;
    target = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES);
    if (!target)
      target = creep.pos.findClosestByRange(FIND_TOMBSTONES, {
        filter: (t) => _.sum(t.store) > 0 && t.creep && t.creep.my,
      });
    // console.log('targ', JSON.stringify(target))
    // if(!target && (!creep.room.controller || (creep.room.controller && !creep.room.controller.my))) {
    //     target = creep.pos.findClosestByRange(FIND_STRUCTURES, { filter: (s) => wayStructures.includes(s.structureType) && _.sum(s.store) > 0 });
    //
    // }

    if (!target) {
      return false;
    }

    let result = null;
    if (target.store) {
      let objs;
      objs = _.filter(Object.keys(target.store), (e) => [].indexOf(e) < 0);
      // console.log('objs', JSON.stringify(objs))
      result = creep.withdraw(target, _.first(objs));
    } else {
      result = creep.pickup(target);
    }

    if (result === ERR_NOT_IN_RANGE) {
      creep.memory.stopped = false;
      creep.goTo(target, { ignoreRoads: true, avoidHostiles: true });
    }
    return true;
  },
  pickup: function (creep) {
    // TODO: also collect raw resources lying around the source
    if (!this.source(creep)) return;
    let target = this.source(creep).isCreep
      ? this.source(creep)
      : logistic.storeFor(this.source(creep)) || this.source(creep);

    // console.log('mover pickup', JSON.stringify(target))

    if (creep.pos.isNearTo(target)) {
      let result = this.withdraw(creep, target);
      if (result == OK) {
        return this.startWait(creep);
      }
    } else {
      creep.goTo(target);
    }
  },
  buildRoad: function (creep) {
    var constructionSite = _.find(
      creep.pos.lookFor(LOOK_CONSTRUCTION_SITES),
      (cs) => cs.structureType == STRUCTURE_ROAD
    );
    if (constructionSite) {
      return creep.build(constructionSite) == OK;
    } else {
      // creep.pos.createConstructionSite(STRUCTURE_ROAD);
      return false;
    }
  },
  source: function (creep) {
    let room = Game.rooms[creep.memory.target];
    // console.log('mover sou', room.storage, JSON.stringify(room))
    let target;
    let targets = [];
    if (room && room.storage) {
      targets = targets.concat((room && room.storage) || []);
    } else {
      targets = targets.concat(
        creep.room.find(FIND_STRUCTURES, {
          filter: (s) =>
            storeStructures.includes(s.structureType) &&
            _.sum(s.store) < s.storeCapacity &&
            s.storeCapacity - _.sum(s.store) > _.sum(creep.store),
        })
      );
    }
    // console.log('sc targ', target)
    // targets = targets.concat(creep.room.find(FIND_STRUCTURES, {filter: (s) => storeStructures.includes(s.structureType) && _.sum(s.store) < s.storeCapacity && (s.storeCapacity - _.sum(s.store)) > _.sum(creep.store)}));
    if (targets.length > 0) {
      var targetsByDistance = _.sortBy(targets, (t) => creep.pos.getRangeTo(t));
      // console.log('dist', JSON.stringify(targetsByDistance))
      target = targetsByDistance[0];
    }
    return Game.getObjectById(target.id);
  },
  destination: function (creep) {
    let room = Game.rooms[creep.memory.home];
    // console.log('mover dest', room.storage, JSON.stringify(room))
    let target;
    let targets = [];
    targets = targets.concat(room || []);
    // console.log('sc targ', target)
    targets = targets.concat(
      room.find(FIND_STRUCTURES, {
        filter: (s) => storeStructures.includes(s.structureType) && _.sum(s.store) < s.storeCapacity * 0.6,
      })
    );
    if (targets.length > 0) {
      var targetsByDistance = _.sortBy(targets, (t) => creep.pos.getRangeTo(t));
      // console.log('dist', JSON.stringify(targetsByDistance))
      target = targetsByDistance[0];
    }
    return Game.getObjectById(target.id);
  },
  withdraw: function (creep, source) {
    if (source.isCreep) {
      return source.transfer(creep, creep.memory.resource);
    } else {
      if (creep.memory.resource) {
        return creep.withdraw(source, creep.memory.resource);
      } else {
        // console.log('wd s', JSON.stringify(source))
        let resources = _.filter(
          Object.keys(source.store),
          (r) =>
            [
              /*'K', 'X', 'Z', 'H'*/
            ].indexOf(r) < 0
        );
        // console.log('ress', resources);
        if (resources.length > 0) {
          let first = _.first(resources);
          // console.log('first', first);
          creep.memory.resource = first;
          return creep.withdraw(source, first);
        }
      }
    }
  },
  shouldWait: function (creep) {
    if (!creep.memory.waitTicks) return false;
    if (creep.store.getFreeCapacity() == 0) return false;
    if (!creep.memory.waitStart) return true;
    return creep.memory.waitStart + creep.memory.waitTicks > Game.time;
  },
  // starts waiting at source (if necessary), returns true if creep can go
  // to destination immediately.
  startWait: function (creep) {
    if (!creep.memory.waitTicks) return true;

    if (!creep.memory.waitStart) creep.memory.waitStart = Game.time;

    return !this.shouldWait(creep);
  },
};

const profiler = require('screeps-profiler');
const ff = require('./helper.friendFoeRecognition');
profiler.registerObject(module.exports, 'mover');
