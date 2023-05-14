const ppOutline = [
  { x: -0.2, y: 0 },
  { x: 0, y: -0.2 },
  { x: 0.2, y: 0 },
  { x: 0, y: 0.2 },
  { x: -0.2, y: 0 },
  { x: 0, y: -0.2 },
];

const roleColors = {
  picker: '#c9ff77',
  harvester: '#77ebff'
}

module.exports = {
  outline: function (room, booster) {
    let x = booster.x,
      y = booster.y,
      role = booster.role;

    let color = roleColors[role];
    if (!color) {color = '#000'}

    // room.visual.circle(x, y, { stroke: "#0023fd", radius: 0.25, fill: null });
    room.visual.circle(x, y, { stroke: color, radius: 0.2, fill: null });
  },
  build: function (proxy, booster, roomai) {
    // proxy.planConstruction(booster.x, booster.y, STRUCTURE_LAB);
    // let lab = _.find(roomai.labs.all, (l) => l.pos.x === booster.x && l.pos.y === booster.y);
    // if(lab) roomai.labs.setBooster(lab);
  },
  updateCostMatrix: function (matrix, booster) {
    matrix.set(booster.x, booster.y, 200);
  },
  addBuilding: function (memory, flag, role) {
    memory.push({ x: flag.pos.x, y: flag.pos.y, role: role });
  },
  removeBuilding: function (memory, flag, role) {
    let index = _.findIndex(memory, (p) => p.x == flag.pos.x && p.y == flag.pos.y && p.role == role);
    if (index >= 0) memory.splice(index, 1);
  },
};

const profiler = require('screeps-profiler');
profiler.registerObject(module.exports, 'virtual.powerPosition');
