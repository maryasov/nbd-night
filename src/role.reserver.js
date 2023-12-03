module.exports = {
  name: 'reserver',
  partConfigs: [
    [CLAIM, CLAIM, CLAIM, MOVE, MOVE, MOVE],
    [CLAIM, CLAIM, MOVE, MOVE],
    [CLAIM, MOVE, MOVE],
  ],
  run: function (creep) {
    var target = Game.getObjectById(creep.memory.target);
    if (!target) return;

    let result = creep.reserveController(target);
    if (result == OK) {
      if (!target.sign || target.sign.username !== 'MaxWagner') {
        creep.signController(target, 'Explored by Max');
      }
    } else if (result == ERR_NOT_IN_RANGE) {
      creep.goTo(target);
    }
  },
};

const profiler = require('screeps-profiler');
profiler.registerObject(module.exports, 'reserver');
