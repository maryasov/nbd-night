module.exports = {
  check: function (creep) {
    if (creep.memory.goRecycle) {
      creep.say('⌛' + creep.ticksToLive);
      if (this.conditions(creep)) {
        creep.say('🗑️' + creep.ticksToLive);
        if (this.recycle(creep)) return true;
      } else {
        return false;
      }
    }
  },
  recycle: function (creep) {
    let spawns = creep.room.find(FIND_MY_SPAWNS);
    let spawn = spawns[0];
    if (!spawn) return;
    var result;

    result = spawn.recycleCreep(creep);

    if (result == OK) {
      console.log('recycled');
    } else if (result == ERR_NOT_IN_RANGE) {
      creep.goTo(spawn);
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
