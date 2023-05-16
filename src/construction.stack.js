const layout = require('helper.layout');

module.exports = {
  directions: {
    1: { x: 0, y: -1 },
    2: { x: 1, y: 0 },
    3: { x: 0, y: 1 },
    4: { x: -1, y: 0 },
  },
  outlines: [
    [
      { x: -0.7, y: -0.77 },
      { x: 0.7, y: -0.77 },
      { x: 0.7, y: 0.77 },
      { x: -0.7, y: 0.77},
      { x: -0.7, y: -0.77 },
    ] /*[
    { x: -1.5, y: -2.5 },
    { x: 1.5, y: -2.5 },
    { x: 1.5, y: -1.5 },
    { x: -1.5, y: -1.5 },
    { x: -1.5, y: -2.5 },
  ],*/,
    [
      { x: -0.4, y: -2 },
      { x: 0, y: -1.5 },
      { x: 0.4, y: -2 },
      { x: 0, y: -2.5 },
      { x: -0.4, y: -2 },
      { x: 0, y: -1.5 },
    ],
    [
      { x: 0.75, y: -2.5 },
      { x: 1.25, y: -2.5 },
      { x: 1.5, y: -2.25 },
      { x: 1.5, y: -1.75 },
      { x: 1.25, y: -1.5 },
      { x: 0.75, y: -1.5 },
      { x: 0.5, y: -1.75 },
      { x: 0.5, y: -2.25 },
      { x: 0.75, y: -2.5 },
    ],
    [
      { x: -1.25, y: -2.5 },
      { x: -1, y: -2.25 },
      { x: -0.75, y: -2.5 },
      { x: -0.5, y: -2.25 },
      { x: -0.75, y: -2 },
      { x: -0.5, y: -1.75 },
      { x: -0.75, y: -1.5 },
      { x: -1, y: -1.75 },
      { x: -1.25, y: -1.5 },
      { x: -1.5, y: -1.75 },
      { x: -1.25, y: -2 },
      { x: -1.5, y: -2.25 },
      { x: -1.25, y: -2.5 },
    ],
  ],
  constructions: [
    {
      structure: STRUCTURE_LINK,
      pos: { x: 0, y: -2 },
    },
    {
      structure: STRUCTURE_TERMINAL,
      pos: { x: 1, y: -2 },
    },
    {
      structure: STRUCTURE_FACTORY,
      pos: { x: -1, y: -2 },
    },
  ],
  type: 'stack',
  outline: function (room, storage) {
    let x = storage.x,
      y = storage.y;
    for (let points of this.outlines) {
      let dirOutline = layout.dirPoints(points, storage.dir);
      room.visual.poly(
        _.map(dirOutline, (p) => [x + p.x, y + p.y]),
        { stroke: '#77f' }
      );
    }
  },
  build: function (proxy, storage) {
    let dir = this.directions[storage.dir];
    proxy.planConstruction(storage.x, storage.y, STRUCTURE_STORAGE);
    const linkPos = layout.dirPos(this.constructions[0].pos, storage.dir)
    const terminalPos = layout.dirPos(this.constructions[1].pos, storage.dir)
    const factoryPos = layout.dirPos(this.constructions[2].pos, storage.dir)
    proxy.planConstruction(storage.x + linkPos.x, storage.y + linkPos.y, STRUCTURE_LINK);
    proxy.planConstruction(storage.x + terminalPos.x, storage.y + terminalPos.y, STRUCTURE_TERMINAL);
    if (!storage.noFactory) proxy.planConstruction(storage.x + factoryPos.x, storage.y + factoryPos.y, STRUCTURE_FACTORY);
    for (let x = -1; x <= 1; x += 1) {
      for (let y = -1; y <= 1; y += 1) {
        if (x === 0 && y === 0) continue;
        proxy.planConstruction(storage.x + x, storage.y + y, STRUCTURE_ROAD);
      }
    }
  },
  updateCostMatrix: function (matrix, storage) {
    let dir = this.directions[storage.dir];
    matrix.set(storage.x, storage.y, 255);
    // matrix.set(storage.x + dir.x, storage.y + dir.y, 255);
  },
  addBuilding: function (memory, flag) {
    let size = memory.push({ x: flag.pos.x, y: flag.pos.y, dir: flag.color });
    if (size > 1) memory.shift();
  },
  removeBuilding: function (memory, flag) {
    memory.pop();
  },
  plan: function (spaceFinder, buildings, room) {
    if (_.filter(buildings, (b) => b.type === this.type).length > 0) return [];

    let spaces = spaceFinder.findSpaces(3, 3);
    if (spaces.length === 0) return [];
    let sourcesPos = layout.averagePos(_.map(room.find(FIND_SOURCES), (s) => s.pos));
    let extensions = _.filter(buildings, (b) => b.type === 'scalableExtensions');
    let extensionsPos = layout.averagePos(_.map(extensions, (e) => layout.centerPos(e.memory)));

    let preferredPos = layout.averagePos([sourcesPos, extensionsPos]);

    let space = _.sortBy(spaces, (s) => layout.distanceFromSpace(preferredPos, s))[0];
    let pos = layout.alignInSpace(preferredPos, space, { x: 1, y: 1, width: 3, height: 3 });
    return [{ x: pos.x, y: pos.y, dir: 1 }];
  },
};

const profiler = require('screeps-profiler');
profiler.registerObject(module.exports, 'construction.stack');
