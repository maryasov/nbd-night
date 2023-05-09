const movement = require('helper.movement');
const recycle = require('helper.recycle');

module.exports = {
  name: 'observer',
  parts: [MOVE],
  run: function (creep) {
    if (recycle.check(creep)) return;
    if (creep.memory.returningHome) {
      this.returnHome(creep);
      return;
    }
    if (Game.cpu.bucket < 100) {
      return;
    }
    movement.moveToRoom(creep, creep.memory.target);
  },
  returnHome: function (creep) {
    let home = Game.rooms[creep.memory.home];
    // console.log('scoop storage', home.storage, JSON.stringify(home))
    let target = home && home.storage;
    creep.goTo(target, { ignoreRoads: false, avoidHostiles: true });
  },
};

const profiler = require('screeps-profiler');
profiler.registerObject(module.exports, 'observer');
