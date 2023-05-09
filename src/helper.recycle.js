module.exports = {
  check: function (creep) {
    if (creep.memory.goRecycle) {
      creep.say('⌛' + creep.ticksToLive);
      if (this.conditions(creep)) {
        creep.say('🗑️' + creep.ticksToLive);
        if (this.recycle(creep)) return true;
      }
    }
  },
  recycle: function (creep) {
    let spawns = creep.room.find(FIND_MY_SPAWNS);
    let spawn = spawns[0];
    var result;

    result = spawn.recycleCreep(creep);

    if (result == OK) {
      console.log('recycled');
    } else if (result == ERR_NOT_IN_RANGE) {
      console.log('recycled0');

      creep.goTo(spawn);
      return true;
    }
  },
  conditions: function (creep) {
    if (creep.memory.role === 'scooper' && creep.memory.home !== creep.room.name && creep.store.getUsedCapacity() !== 0) return false;
    return true;
  },
};

const profiler = require('screeps-profiler');
profiler.registerObject(module.exports, 'renew');
