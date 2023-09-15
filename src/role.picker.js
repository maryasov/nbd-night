const storeStructures = [STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_CONTAINER, STRUCTURE_LINK];
const renew = require('helper.renew');
const parking = require('helper.parking');

module.exports = {
  name: 'picker',
  configs: function (capacity) {
    var configs = [];
    for (var carries = Math.ceil(capacity / CARRY_CAPACITY); carries >= 2; carries -= 1) {
      let config = Array(carries).fill(CARRY).concat(Array(carries).fill(MOVE));
      if (config.length <= 50) configs.push(config);
    }

    return configs;
  },
  run: function (creep) {
    if (renew.check(creep)) return;
    if (creep.memory.scoop && creep.store.getFreeCapacity() == 0) {
      creep.memory.scoop = false;
    }
    // if (!creep.memory.scoop && creep.store.getUsedCapacity() == 0) {
    //   creep.memory.scoop = true;
    // }

    if (creep.memory.scoop) {
      this.pickup(creep);
    } else {
      this.stack(creep);
    }
    if (creep.memory.stopped) parking.check(creep);
    // creep.say((creep.memory.scoop ? 'sc+':'sc-') + ' '+(creep.memory.stopped ? 'st+':'st-'))
  },
  pickup: function (creep) {
    let targets = this.findTargets(creep);
    // let myNumber = this.harvesterIdx(creep);
    let target = targets.shift(); // myNumber % 2 == 1 ? _.first(targets) : _.last(targets);
    if (target) {
      creep.memory.stopped = false;
      let result = null;
      let objs = [];
      if (target.store) {
        objs = Object.keys(target.store);
        if (objs.length > 0) {
          result = creep.withdraw(target, _.last(objs));
        }
      } else {
        result = creep.pickup(target);
      }
      if (result == ERR_NOT_IN_RANGE) {
        creep.goTo(target);
      } else if (result == OK) {
        target = targets.shift();
        if (target && !creep.pos.isNearTo(target)) {
          creep.goTo(target);
        }
      }
    } else {
      if (creep.store.getUsedCapacity() > 0) {
        creep.memory.scoop = false;
      }
      creep.memory.stopped = true;
    }
  },
  stack: function (creep) {
    let home = Game.rooms[creep.memory.home];
    creep.memory.stopped = false;

    let target;
    let targets = [];
    let storage = home && home.storage;
    if (!storage && home && home.terminal) {
      storage = home && home.terminal;
    }

    if (storage) {
      targets = targets.concat(storage || []);
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

    if (creep.store.getUsedCapacity() == 0) {
      creep.memory.stopped = true;
      creep.memory.scoop = true;
      return true;
    }

    if (!target) {
      return 
    }

    if (creep.pos.isNearTo(target)) {
      let resource = _.findKey(creep.store, (amount) => amount > 0);
      if (resource) {
        creep.transfer(target, resource);
      }
    } else {
      creep.goTo(target, { ignoreRoads: false, avoidHostiles: true });
    }

    if (creep.store.getUsedCapacity() == 0) {
      creep.memory.stopped = true;
      return true;
    }

    return false;
  },
  findTargets: function (creep) {
    // console.log('findTargets creep', JSON.stringify(creep))
    // let myNumber = this.harvesterIdx(creep);
    // let evenOdd = myNumber % 2;
    let targets = creep.room
      .find(FIND_DROPPED_RESOURCES, { filter: (r) => r.amount > creep.pos.getRangeTo(r) })
      .concat(creep.room.find(FIND_TOMBSTONES, { filter: (t) => _.sum(t.store) > 0 }))
      .concat(creep.room.find(FIND_RUINS, { filter: (t) => _.sum(t.store) > 0 }));

    const targetsByTime = _.sortBy(targets, (t) => t.ticksToDecay);

    return targetsByTime;
  },

  returnHome: function (creep) {
    let home = Game.rooms[creep.memory.home];
    // console.log('scoop storage', home.storage, JSON.stringify(home))
    let target;
    let targets = [];
    let storage = home && home.storage;
    if (!storage && home && home.terminal) {
      storage = home && home.terminal;
    }

    if (storage) {
      targets = targets.concat(storage || []);
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

    // console.log('pick store', creep.room.name, JSON.stringify(targets))

    if (!target) {
      return;
      creep.memory.stopped = true;
    }
    if (creep.store.getUsedCapacity() == 0) {
      creep.memory.stopped = true;
      creep.memory.returningHome = false;
      return;
    }
    if (creep.pos.isNearTo(target)) {
      creep.memory.stopped = true;
      let resource = _.findKey(creep.store, (amount) => amount > 0);
      if (resource) {
        creep.transfer(target, resource);
      } else {
        creep.memory.returningHome = false;
      }
    } else {
      creep.memory.stopped = false;
      creep.goTo(target, { ignoreRoads: false, avoidHostiles: true });
    }
  },
  scoopRoom: function (creep) {
    if (creep.store.getFreeCapacity() == 0) {
      creep.memory.returningHome = true;
      return;
    }

    const ignoreResources = [];

    let target;
    let targets = creep.room
      .find(FIND_DROPPED_RESOURCES)
      .concat(creep.room.find(FIND_TOMBSTONES, { filter: (t) => _.sum(t.store) > 0 }))
      .concat(creep.room.find(FIND_RUINS, { filter: (t) => _.sum(t.store) > 0 }));

    // console.log('pick', creep.room.name, JSON.stringify(targets))

    if (targets.length > 0) {
      var targetsByDistance = _.sortBy(targets, (t) => creep.pos.getRangeTo(t));
      var targetsByTime = _.sortBy(targets, (t) => t.ticksToDecay);
      // target = targetsByDistance[0];
      target = targetsByTime[0];
    }

    if (!target) {
      creep.memory.returningHome = true;
      creep.memory.stopped = true;
      return;
    }

    let result = null;
    let objs = [];
    if (target.store) {
      objs = Object.keys(target.store);
      if (objs.length > 0) {
        result = creep.withdraw(target, _.last(objs));
      }
    } else {
      result = creep.pickup(target);
    }

    if (result === ERR_NOT_IN_RANGE) {
      creep.memory.stopped = false;
      creep.goTo(target, { ignoreRoads: true, avoidHostiles: true });
    }
  },
};

const profiler = require('screeps-profiler');
const logistic = require('./helper.logistic');
const spawnHelper = require('./helper.spawning');
profiler.registerObject(module.exports, 'picker');
