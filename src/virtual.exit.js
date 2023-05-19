const exitOutline = [
  { x: -0.4, y: -0.4 },
  { x: 0.4, y: -0.4 },
  { x: 0.4, y: 0.4 },
  { x: -0.4, y: 0.4 },
  { x: -0.4, y: -0.4 },
];

module.exports = {
  outline: function (room, exit) {
    let x = exit.x,
      y = exit.y;

    //room.visual.circle(x, y, { stroke: "#fd2600", radius: 0.25, fill: null });
    room.visual.poly(
      _.map(exitOutline, (p) => [x + p.x, y + p.y]),
      { stroke: 'rgb(255,255,255)', strokeWidth: 0.05 }
    );
    room.visual.poly(
      _.map(exitOutline, (p) => [x + p.x/2, y + p.y/2]),
      { stroke: 'rgb(255,255,255)', strokeWidth: 0.05 }
    );
  },
  build: function (proxy, exit, roomai) {
    // proxy.planConstruction(exit.x, exit.y, STRUCTURE_LAB);
    // let lab = _.find(roomai.labs.all, (l) => l.pos.x === exit.x && l.pos.y === exit.y);
    // if(lab) roomai.labs.setBooster(lab);
  },
  updateCostMatrix: function (matrix, exit) {
    // console.log('updateCostMatrix exit');
    matrix.set(exit.x, exit.y, 10);
  },
  addBuilding: function (memory, flag) {
    // console.log('addBuilding', JSON.stringify(flag))
    let index = _.findIndex(memory, (p) => p.x == flag.pos.x && p.y == flag.pos.y);
    if (index >= 0) memory.splice(index, 1);
    memory.push({ x: flag.pos.x, y: flag.pos.y });
  },
  removeBuilding: function (memory, flag) {
    let index = _.findIndex(memory, (p) => p.x == flag.pos.x && p.y == flag.pos.y);
    if (index >= 0) memory.splice(index, 1);
  },
};

const profiler = require('screeps-profiler');
profiler.registerObject(module.exports, 'construction.exit');
