module.exports = {
  emoji: {
    recycle: {
      store: '📦',
      recycle: '♻️'
    }
  },
  check: function (creep) {
    if (creep.memory.goRecycle) {
      creep.say('📦' + creep.ticksToLive, true);
      if (this.conditions(creep)) {
        creep.say('♻️' + creep.ticksToLive, true);
        if (this.recycle(creep)) return true;
      } else {
        return false;
      }
    }
  },
  recycle: function (creep) {
    let storage = creep.room.storage;
    if (!storage) return;

    let spawns = creep.room.find(FIND_MY_SPAWNS);
    const byDist = _.sortBy(spawns, (t) => t.pos.getRangeTo(storage));
    let spawn = byDist[0];
    // let spawn = spawns[0];
    if (!spawn) return;
    let tombstones = creep.room
        .find(FIND_TOMBSTONES, { filter: (t) => _.sum(t.store) > 0 });
    let amount = _.sum(tombstones, (c) => _.sum(c.store))


    // if (amount > 3000) {
    //   console.log('tombstones', amount)
    //   creep.goTo(spawn, {
    //     range: 15,
    //     visualizePathStyle: {
    //       fill: 'transparent',
    //       stroke: '#fff',
    //       lineStyle: 'dashed',
    //       strokeWidth: .15,
    //       opacity: .1
    //     }
    //   });
    //   return true;
    // }

    var result;

    result = spawn.recycleCreep(creep);

    if (result == OK) {
      console.log('recycled');
    } else if (result == ERR_NOT_IN_RANGE) {
      creep.goTo(spawn, {
        visualizePathStyle: {
          fill: 'transparent',
          stroke: '#ff0000',
          lineStyle: 'dashed',
          strokeWidth: .15,
          opacity: .1
        }
      });
      return true;
    }
  },
  conditions: function (creep) {
    if (
      creep.memory.role === 'scooper' &&
        (creep.memory.home !== creep.room.name ||
      creep.store.getUsedCapacity() !== 0)
    ) {
      // console.log(creep.name, creep.store.getUsedCapacity(), JSON.stringify(creep.store));
      return false;
    }
    if (creep.memory.role === 'powerFarmer' && creep.memory.home !== creep.room.name) return false;
    if (creep.memory.role === 'healer' && creep.memory.home !== creep.room.name) return false;
    if (creep.memory.role === 'observer' && creep.memory.home !== creep.room.name) return false;
    return true;
  },
};

const profiler = require('screeps-profiler');
profiler.registerObject(module.exports, 'renew');
