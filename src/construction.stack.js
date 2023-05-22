const layout = require('helper.layout');

module.exports = {
  directions: {
    1: { x: 0, y: -1 },
    2: { x: 1, y: 0 },
    3: { x: 0, y: 1 },
    4: { x: -1, y: 0 },
  },
  outlines: {
    storage: [
      { x: -0.7, y: -0.77 },
      { x: 0.7, y: -0.77 },
      { x: 0.7, y: 0.77 },
      { x: -0.7, y: 0.77 },
      { x: -0.7, y: -0.77 },
    ],
    link: [
      { x: -0.4, y: 0 },
      { x: 0, y: 0.5 },
      { x: 0.4, y: 0 },
      { x: 0, y: -0.5 },
      { x: -0.4, y: 0 },
      { x: 0, y: 0.5 },
    ],
    terminal: [
      { x: -0.25, y: -0.5 },
      { x: 0.25, y: -0.5 },
      { x: 0.5, y: -0.25 },
      { x: 0.5, y: 0.25 },
      { x: 0.25, y: 0.5 },
      { x: -0.25, y: 0.5 },
      { x: -0.5, y: 0.25 },
      { x: -0.5, y: -0.25 },
      { x: -0.25, y: -0.5 },
    ],
    powerSpawn: [
      { x: -0.1, y: -0.5 },
      { x: 0.1, y: -0.5 },
      { x: 0.5, y: -0.1 },
      { x: 0.5, y: 0.1 },
      { x: 0.1, y: 0.5 },
      { x: -0.1, y: 0.5 },
      { x: -0.5, y: 0.1 },
      { x: -0.5, y: -0.1 },
      { x: -0.1, y: -0.5 },
    ],
    factory: [
      { x: -0.25, y: -0.5 },
      { x: 0, y: -0.25 },
      { x: 0.25, y: -0.5 },
      { x: 0.5, y: -0.25 },
      { x: 0.25, y: 0 },
      { x: 0.5, y: 0.25 },
      { x: 0.25, y: 0.5 },
      { x: 0, y: 0.25 },
      { x: -0.25, y: 0.5 },
      { x: -0.5, y: 0.25 },
      { x: -0.25, y: 0 },
      { x: -0.5, y: -0.25 },
      { x: -0.25, y: -0.5 },
    ],
  },
  positions: {
    center: {
      x: 0,
      y: -2,
    },
    right: {
      x: 1,
      y: -2,
    },
    left: {
      x: -1,
      y: -2,
    },
  },
  constructions: {
    center: STRUCTURE_LINK,
    right: STRUCTURE_TERMINAL,
    left: STRUCTURE_FACTORY,
  },
  type: 'stack',
  options: function (storage) {
    let mergeCons;
    if (storage.locations) {
      mergeCons = storage.locations;
    } else {
      mergeCons = this.constructions;
      if (storage.noFactory) {
        mergeCons = _.omit(mergeCons, 'left');
      }
    }
    return mergeCons;
  },
  outline: function (room, storage) {
    let x = storage.x,
      y = storage.y;
    let cons = this.options(storage);
    // console.log(room.name, JSON.stringify(cons));
    for (let loc of Object.keys(cons)) {
      let consType = cons[loc];
      let points = this.outlines[consType];
      let pos = this.positions[loc];
      // console.log(loc, consType, JSON.stringify(pos));
      let transPoints = _.map(points, (p) => ({ x: p.x + pos.x, y: p.y + pos.y }));
      // console.log(JSON.stringify(points), JSON.stringify(transPoints));
      let dirOutline = layout.dirPoints(transPoints, storage.dir);
      room.visual.poly(
        _.map(dirOutline, (p) => [x + p.x, y + p.y]),
        { stroke: '#77f' }
      );
    }
  },
  build: function (proxy, storage) {
    proxy.planConstruction(storage.x, storage.y, STRUCTURE_STORAGE);

    let cons = this.options(storage);
    for (let loc of Object.keys(cons)) {
      let consType = cons[loc];
      let points = this.outlines[consType];
      let pos = this.positions[loc];
      // console.log(loc, consType, JSON.stringify(pos));
      let transPoints = _.map(points, (p) => ({ x: p.x + pos.x, y: p.y + pos.y }));
      // console.log(JSON.stringify(points), JSON.stringify(transPoints));
      let consPos = layout.dirPos(pos, storage.dir)
      proxy.planConstruction(storage.x + consPos.x, storage.y + consPos.y, consType);
    }
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
