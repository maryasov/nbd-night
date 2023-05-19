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
};

const profiler = require('screeps-profiler');
profiler.registerObject(module.exports, 'renew');
