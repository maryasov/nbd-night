const recycle = require('helper.recycle');
const renew = require('helper.renew');
// const parkStructures = [STRUCTURE_STORAGE, STRUCTURE_POWER_BANK, STRUCTURE_TERMINAL, STRUCTURE_CONTAINER, STRUCTURE_FACTORY, STRUCTURE_SPAWN];
const sParkStructures = [STRUCTURE_POWER_BANK, STRUCTURE_TERMINAL, STRUCTURE_CONTAINER, STRUCTURE_SPAWN];
const parkStructures = [
  STRUCTURE_STORAGE,
  // STRUCTURE_EXTENSION,
  // STRUCTURE_LAB,
  STRUCTURE_TERMINAL,
  STRUCTURE_POWER_BANK,
  // STRUCTURE_CONTAINER,
  // STRUCTURE_TOWER,
  STRUCTURE_FACTORY,
];
const blockStructures = [
  /*STRUCTURE_RAMPART*/
];
const storeStructures = [STRUCTURE_TERMINAL, STRUCTURE_STORAGE];
const wayStructures = [STRUCTURE_POWER_BANK];
const ignoreResources = [];


module.exports = {
  name: 'scooper',
  configs: function (capacity) {
    var configs = [];
    for (var carries = Math.ceil(capacity / CARRY_CAPACITY); carries >= 2; carries -= 1) {
      let config = Array(carries).fill(CARRY).concat(Array(carries).fill(MOVE));
      if (config.length <= 50) configs.push(config);
    }

    return configs;
  },
  run: function (creep) {
    if (recycle.check(creep)) return;
    if (renew.check(creep)) return;
    if (creep.room.name === creep.memory.home && !creep.memory.goRecycle && creep.memory.operation && PowerState.isActive) {
      let scoopers = _.filter(
        spawnHelper.globalCreepsWithRole(creep.memory.role),
        (c) => c.memory.operation == creep.memory.operation
      );
      //console.log('scoopers', JSON.stringify(scoopers));
      let scoopersCapacity = _.sum(scoopers, (c) => c.carryCapacity);
      if (scoopersCapacity < creep.memory.power) {
        if (_.some(creep.body, (p) => p.type === CARRY)) {
          // console.log('accept', creep.name);
          if (boosting.accept(creep, 'XKH2O')) return;
        }
      } else {
        this.cancelSpawning(creep);
      }
    }
    if (creep.memory.returningHome) {
      this.returnHome(creep);
    } else {
      if (creep.room.name !== creep.memory.target) {
        let tg;
        let tgs;
        // if (creep.room.name !=='W20S10') {
        tg = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, { filter: (t) => t.amount > 0 });
        // console.log('tg', JSON.stringify(tg))
        // tgs = creep.pos.lookFor(LOOK_ENERGY);
        // console.log('am', JSON.stringify(tgs));
        // tg = _.sortBy(tgs, (t)=>(-t.amount))[0]

        if (!tg) tg = creep.pos.findClosestByRange(FIND_TOMBSTONES, { filter: (t) => _.sum(t.store) > 0 });
        // }
        // if(!tg && (!creep.room.controller || (creep.room.controller && !creep.room.controller.my))) {
        //     tg = creep.pos.findClosestByRange(FIND_STRUCTURES, { filter: (s) => wayStructures.includes(s.structureType) && _.sum(s.store) > 0 });
        // }

        let objs;
        if (tg && tg.store) {
          objs = _.filter(Object.keys(tg.store), (e) => this.resourceFilter(creep, e));
        }

        // console.log('tg', tg, objs)
        if (tg && objs && objs.length > 0) {
          this.scoopWay(creep);
        } else {
          if (creep.store.getFreeCapacity() < creep.store.getCapacity() * 0.1) {
            creep.memory.returningHome = true;
            return;
          }
          let target = { pos: new RoomPosition(25, 25, creep.memory.target) };
          creep.goTo(target, { avoidHostiles: true });
        }
      } else {
        this.scoopRoom(creep);
      }
    }
  },
  returnHome: function (creep) {
    let home = Game.rooms[creep.memory.home];
    // console.log('scoop storage', home.storage, JSON.stringify(home))
    let target = home && home.storage;
    if (!target) {
      target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (s) => storeStructures.includes(s.structureType) && _.sum(s.store) < s.storeCapacity,
      });
      // console.log('targ scoo', JSON.stringify(target))
    }
    if (!target) return;
    if (creep.pos.isNearTo(target)) {
      creep.memory.stopped = true;
      let resource = _.findKey(creep.store, (amount) => amount > 0);
      if (resource) {
        creep.transfer(target, resource);
      } else {
        creep.memory.returningHome = false;
        if (creep.memory.renew) {
          creep.memory.goRenew = true;
        }
      }
    } else {
      creep.memory.stopped = false;
      creep.goTo(target, { ignoreRoads: false, avoidHostiles: true });
    }
  },
  scoopWay: function (creep) {
    if (creep.store.getFreeCapacity() < creep.store.getCapacity() * 0.1) {
      creep.memory.returningHome = true;
      return;
    }

    let target;
    // if (creep.room.name !=='W20S10') {
    target = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES);
    if (!target) target = creep.pos.findClosestByRange(FIND_TOMBSTONES, { filter: (t) => _.sum(t.store) > 0 });
    // }
    if (!target && (!creep.room.controller || (creep.room.controller && !creep.room.controller.my))) {
      target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (s) => wayStructures.includes(s.structureType) && _.sum(s.store) > 0,
      });
    }

    if (!target) {
      return;
    }

    let result = null;
    // console.log('target', target)
    if (target.store) {
      let objs;
      objs = _.filter(Object.keys(target.store), (e) => this.resourceFilter(creep, e));
      result = creep.withdraw(target, _.last(objs));
    } else {
      result = creep.pickup(target);
    }
    // console.log('result', result, creep.name)

    if (result === ERR_NOT_IN_RANGE) {
      creep.memory.stopped = false;
      creep.goTo(target, { ignoreRoads: true, avoidHostiles: true });
    }
  },
  scoopRoom: function (creep) {
    if (creep.store.getFreeCapacity() == 0) {
      creep.memory.returningHome = true;
      return;
    }


    let target;
    if (!target) target = creep.pos.findClosestByRange(FIND_RUINS, { filter: (t) => _.sum(t.store) > 0 });
    if (!target) target = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, { filter: (t) => t.resourceType !== 'energy' });
    if (!target) target = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, { filter: (t) => t.resourceType === 'energy' && t.amount > 100 });

    // let tgs = creep.room.find(FIND_DROPPED_RESOURCES, { filter: (t) => t.resourceType === 'energy' })
    // let tgsA = _.sortBy(tgs, (t)=>{t.amount})
    // if (!target && tgsA.length) target = tgsA[0];
    if (!target) target = creep.pos.findClosestByRange(FIND_TOMBSTONES, { filter: (t) => _.sum(t.store) > 0 });
    if (!target && (!creep.room.controller || (creep.room.controller && !creep.room.controller.my))) {
      const blocks = creep.room
        .find(FIND_STRUCTURES, { filter: (s) => blockStructures.includes(s.structureType) })
        .map((e) => ({
          x: e.pos.x,
          y: e.pos.y,
        }));

      target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (s) =>
          parkStructures.includes(s.structureType) &&
          blocks.filter((b) => b.x == s.pos.x && b.y == s.pos.y).length == 0 &&
          _.sum(s.store) > 0,
      });
    }

    if (!target) {
      if (_.sum(creep.store) > 0) {
        creep.memory.returningHome = true;
      } else {
        // Wait at a parking position.
        if (creep.memory.resource === 'power') {
          target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_POWER_BANK,
          });
        } else {
          target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (s) => parkStructures.includes(s.structureType),
          });
        }
        if (!target) {
          if (creep.memory.targetPos) {
            target = { pos: creep.room.getPositionAt(creep.memory.targetPos.x, creep.memory.targetPos.y) };
          } else {
            target = { pos: creep.room.getPositionAt(25, 25) };
          }
        }
        if (creep.pos.getRangeTo(target) <= 5) {
          creep.memory.stopped = true;
        } else {
          creep.memory.stopped = false;
          creep.goTo(target, { range: 5, ignoreRoads: true, avoidHostiles: true });
        }
      }

      // return;
    }


    if (!target) {
      return;
    }

    let result = null;
    let objs = [];
    if (target.store) {
      // if (creep.room.name =='W13S11') {
      objs = _.filter(Object.keys(target.store), (e) => this.resourceFilter(creep, e));
      // } else {
      //     objs = Object.keys(target.store);
      // }
      // objs = _.sortBy(Object.keys(target.store), (e) => this.resourceFilter(creep, e));
      if (objs.length > 0) {
        result = creep.withdraw(target, _.last(objs));
      }
    } else {
      // console.log('droped', JSON.stringify(target))
      result = creep.pickup(target);
    }
    // console.log('withdraw', JSON.stringify(objs), creep.room.name, result, ERR_NOT_IN_RANGE)

    if (result === ERR_NOT_IN_RANGE) {
      creep.memory.stopped = false;
      creep.goTo(target, { ignoreRoads: true, avoidHostiles: true });
    }
  },
  resourceFilter: function (creep, r) {
    if (creep.memory.resource === 'power') {
      return ['power'].indexOf(r) >= 0
    }/* else {
      return ['energy'].indexOf(r) >= 0
    }*/
    return ignoreResources.indexOf(r) < 0
  },
  cancelSpawning: function (creep) {
    let scoopers = _.filter(
        spawnHelper.globalCreepsWithRole(creep.memory.role),
        (c) => c.memory.operation == creep.memory.operation
    );
    let spawned = _.filter(
        scoopers,
        (c) => c.memory.operation == creep.memory.operation && c.spawning === false
    );
    let spawning = _.filter(
        scoopers,
        (c) => c.memory.operation == creep.memory.operation && c.spawning === true
    );
    let roomai = creep.room.ai();
    if (!roomai) return;
    let spawns = roomai.spawns.getBusySpawns();
    // console.log('spawning', JSON.stringify(spawns))
    let spawnedCapacity = _.sum(spawned, (c) => c.carryCapacity);
    if (spawnedCapacity > creep.memory.power && spawning.length) {
      console.log('Over capacity 🛢️', spawnedCapacity - creep.memory.power, 'for', creep.memory.target);
      _.forEach(spawning, (sCreep) => {
        let currentSpawn = _.find(spawns, (s) => s.spawning && s.spawning.name === sCreep.name);
        if (!currentSpawn) return;
        Game.spawns[currentSpawn.name].spawning.cancel();
        console.log(currentSpawn.name, 'Cancel spawning of', sCreep.name);
      });
    }
  }
};

const profiler = require('screeps-profiler');
const boosting = require('./helper.boosting');
const spawnHelper = require('./helper.spawning');
profiler.registerObject(module.exports, 'scooper');
