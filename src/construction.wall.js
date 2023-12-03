function eachWallPosition(wall, callback) {
  let x = wall.start.x;
  let y = wall.start.y;
  let xDir = wall.start.x < wall.end.x ? 1 : -1;
  let yDir = wall.start.y < wall.end.y ? 1 : -1;

  for (x; x != wall.end.x; x += xDir) callback({ x: x, y: y });
  for (y; y != wall.end.y; y += yDir) callback({ x: x, y: y });
  callback({ x: wall.end.x, y: wall.end.y });
}

// builds a wall between start and end position.
// "pure" walls are made entirely of ramparts (any non-first-color flag)
module.exports = {
  outline: function (room, wall) {
    let start = wall.start;
    let end = wall.end;

    if (end) {
      room.visual.poly(
        [
          [start.x, start.y],
          [end.x, start.y],
          [end.x, end.y],
        ],
        {
          stroke: wall.type === 'rampart' ? '#a2ff00' : '#ffffff',
          // lineStyle: 'dotted',
          opacity: 0.25,
          strokeWidth: 0.2,
        }
      );
    } else {
      room.visual.poly(
        [
          [start.x - 0.25, start.y- 0.25],
          [start.x + 0.25, start.y+ 0.25],
        ],
        { stroke: '#f77',
          lineStyle: 'dotted',
          strokeWidth: 0.25, }
      );
      room.visual.poly(
        [
          [start.x - 0.25, start.y+ 0.25],
          [start.x + 0.25, start.y- 0.25],
        ],
        { stroke: '#f77',
          lineStyle: 'dotted',
          strokeWidth: 0.25, }
      );
    }
  },
  build: function (proxy, wall) {
    if (!wall.end) return;

    // keeping number of construction sites in low-level rooms down
    let waitWalls = false;
    if (proxy.room.controller.level < 3) {
      waitWalls = true;
    }
    if (proxy.room.controller.level >= 2 && (Memory.rooms[proxy.room.name].mode === 'transit' || Memory.rooms[proxy.room.name].lowWalls)) {
      waitWalls = false;
    }

    if (waitWalls) {return;}

    this.setWallAtPos(proxy, wall, { x: wall.end.x, y: wall.end.y });
    eachWallPosition(wall, (pos) => {
      this.setWallAtPos(proxy, wall, pos);
    });
  },
  updateCostMatrix: function (matrix, wall) {
    if (!wall.type || wall.type === 'rampart') return;

    let isWall = true;
    eachWallPosition(wall, (pos) => {
      if (isWall) {
        if (pos.x !== wall.end.x || pos.y !== wall.end.y) {
          matrix.set(pos.x, pos.y, 255);
        }
      }
    });
  },
  setWallAtPos: function (proxy, wall, pos) {
    if (wall.type === 'rampart') {
      proxy.planConstruction(pos.x, pos.y, STRUCTURE_RAMPART);
    } else {
      const struct = Game.rooms[proxy.room.name].lookForAt('structure', pos.x, pos.y);
      const foundRoad = _.find(struct, (w) => w.structureType === 'road');
      const exits = Memory.rooms[proxy.room.name].virtuals.exit;
      const exitsInPosition = _.find(exits, (ex) => ex.x === pos.x && ex.y === pos.y);
      if (exitsInPosition) {
        // const str = Game.rooms[proxy.room.name].lookForAt('structure',pos.x,pos.y);
        const foundWall = _.find(struct, (w) => w.structureType === 'constructedWall');
        if (foundWall) {
          foundWall.destroy();
        }
        // console.log('str', str)
        if (!foundRoad) {
          proxy.planConstruction(pos.x, pos.y, STRUCTURE_ROAD);
        } else {
          proxy.planConstruction(pos.x, pos.y, STRUCTURE_RAMPART);
        }
      } else {
        if (!foundRoad) {
          proxy.planConstruction(pos.x, pos.y, STRUCTURE_WALL);
        } else {
          proxy.planConstruction(pos.x, pos.y, STRUCTURE_RAMPART);
        }
      }
    }
  },
  addBuilding: function (memory, flag) {
    let lastWall = _.last(memory);
    if (!lastWall) {
      memory.push({ start: { x: flag.pos.x, y: flag.pos.y } });
    } else if (lastWall.end) {
      memory.push({ start: { x: flag.pos.x, y: flag.pos.y } });
    } else {
      lastWall.end = { x: flag.pos.x, y: flag.pos.y };
      if (flag.color === 5) {
        lastWall.type = 'rampart';
      } else {
        lastWall.type = 'wall';
      }
    }
  },
  removeBuilding: function (memory, flag) {
    let index = _.findIndex(
      memory,
      (w) => (w.start.x == flag.pos.x && w.start.y == flag.pos.y) || (w.end.x == flag.pos.x && w.end.y == flag.pos.y)
    );
    if (index >= 0) memory.splice(index, 1);
  },
};

const profiler = require('screeps-profiler');
profiler.registerObject(module.exports, 'construction.tower');
