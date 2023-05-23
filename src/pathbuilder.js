const ff = require('helper.friendFoeRecognition');

const AVOID_CREEPS_COST = 50;
const AVOID_HOSTILE_COST = 200;
const AVOID_EXITS = 50;
const AVOID_BLOCK_COST = 255;
const ROAD_COST = 1;

const virtualsCosts = {
  block: 255,
  powerPosition: 200,
};

const PORTAL_COST = 10;

const TERRAIN_PLAIN = 0; // for whatever reason this has not been defined...

const matrixCache = {
  get: function (key) {
    this.ensureStore();
    return this.store[key];
  },

  set: function (key, matrix) {
    this.ensureStore();
    this.store[key] = matrix;
  },

  ensureStore: function () {
    if (!this.store || Game.time !== this.lastTick) {
      this.store = {};
      this.lastTick = Game.time;
    }
  },
};

module.exports = class PathBuilder {
  constructor() {
    this.plainCost = 2;
    this.swampCost = 10;
    this.avoidCreeps = true;
    this.avoidExits = false;
    this.avoidHostiles = false;
    this.debugCosts = false;
    this.preferRoads = true;
    this.allowedRooms = null;
  }

  matrixCacheKey(roomName) {
    return JSON.stringify({
      roomName: roomName,
      avoidHostiles: this.avoidHostiles,
      preferRoads: this.preferRoads,
    });
  }

  // returns a callback to be used in Room.findPath
  getAdditiveCallback() {
    let builder = this;
    return function additiveCallback(roomName, matrix) {
      builder.doAvoidStructures(roomName, matrix);
      builder.doAvoidVirtuals(roomName, matrix);
      if (builder.avoidHostiles) {
        builder.doAvoidHostiles(roomName, matrix);
      }
      if (builder.avoidExits) {
        builder.doAvoidExits(roomName, matrix);
      }
      builder.doAvoidBlock(roomName, matrix);
    };
  }

  // returns a callback to be used in PathFinder.search
  getRoomCallback() {
    let builder = this;
    return function roomCallback(roomName) {
      if (!builder.isRoomAllowed(roomName)) return false;

      let cachedMatrix = matrixCache.get(builder.matrixCacheKey(roomName));
      if (cachedMatrix) return cachedMatrix;

      let matrix = new PathFinder.CostMatrix();
      builder.doAvoidStructures(roomName, matrix);
      builder.doAvoidVirtuals(roomName, matrix);
      builder.doAvoidConstructionSites(roomName, matrix);
      if (builder.avoidExits) {
        builder.doAvoidExits(roomName, matrix);
      }
      if (builder.avoidCreeps) {
        builder.doAvoidAllCreeps(roomName, matrix);
      } else {
        builder.doAvoidStoppedCreeps(roomName, matrix);
      }

      if (builder.preferRoads) builder.doPreferRoads(roomName, matrix);
      if (builder.avoidHostiles) builder.doAvoidHostiles(roomName, matrix);
      builder.doAvoidBlock(roomName, matrix);

      if (builder.debugCosts) builder.drawCosts(roomName, matrix);
      matrixCache.set(builder.matrixCacheKey(roomName), matrix);
      return matrix;
    };
  }

  isRoomAllowed(roomName) {
    if (!this.allowedRooms) return true;

    return this.allowedRooms.includes(roomName);
  }

  doAvoidStructures(roomName, matrix) {
    let room = Game.rooms[roomName];
    if (!room) return;

    let structures = room.find(FIND_STRUCTURES);
    for (let structure of structures) {
      let blocked = OBSTACLE_OBJECT_TYPES.includes(structure.structureType);
      blocked = blocked || (structure.structureType === STRUCTURE_RAMPART && !(structure.my || structure.isPublic));
      if (blocked) {
        matrix.set(structure.pos.x, structure.pos.y, 255);
      } else if (structure.structureType === STRUCTURE_PORTAL) {
        matrix.set(
          structure.pos.x,
          structure.pos.y,
          Math.max(matrix.get(structure.pos.x, structure.pos.y), PORTAL_COST)
        );
      }
    }
  }

  doAvoidVirtuals(roomName, matrix) {
    let room = Game.rooms[roomName];
    if (!room) return;
    let roomAi = room.ai() || room.aiLite();
    if (!roomAi) return;
    let buildings = roomAi.virtuals.buildings;

    if (!buildings) return;
    for (let building of buildings) {
      building.updateCostMatrix(matrix);
    }
  }

  doAvoidExits(roomName, matrix) {
    for (let i = 0; i < 50; i += 1) {
      matrix.set(i, 0, AVOID_EXITS);
      matrix.set(i, 49, AVOID_EXITS);
      matrix.set(0, i, AVOID_EXITS);
      matrix.set(49, i, AVOID_EXITS);
    }
  }

  doAvoidConstructionSites(roomName, matrix) {
    let room = Game.rooms[roomName];
    if (!room) return;

    let sites = room.find(FIND_CONSTRUCTION_SITES);
    for (let site of sites) {
      let blocked = OBSTACLE_OBJECT_TYPES.includes(site.structureType) && !ff.isHostile(site);
      if (blocked) {
        matrix.set(site.pos.x, site.pos.y, 255);
      }
    }
  }

  doAvoidAllCreeps(roomName, matrix) {
    let room = Game.rooms[roomName];
    if (!room) return;

    let creeps = room.find(FIND_CREEPS);
    let powerCreeps = room.find(FIND_POWER_CREEPS);
    creeps = creeps.concat(powerCreeps);
    for (let creep of creeps) {
      matrix.set(creep.pos.x, creep.pos.y, AVOID_CREEPS_COST);
    }
  }

  doAvoidBlock(roomName, matrix) {
    let room = Memory.rooms[roomName];
    if (!room) return;

    if (room.blocks) {
      let blocks = room.blocks;
      for (let site of blocks) {
        if (site) {
          matrix.set(site.x, site.y, AVOID_BLOCK_COST);
        }
      }
    }
  }

  doAvoidStoppedCreeps(roomName, matrix) {
    let room = Game.rooms[roomName];
    if (!room) return;

    let creeps = room.find(FIND_MY_CREEPS);
    for (let creep of creeps) {
      let stopped = creep.memory.stopped;
      if (stopped) {
        matrix.set(creep.pos.x, creep.pos.y, AVOID_CREEPS_COST);
      }
    }
  }

  doPreferRoads(roomName, matrix) {
    let room = Game.rooms[roomName];
    if (!room) return;

    let roads = room.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_ROAD });
    // let roadsC = room.find(FIND_CONSTRUCTION_SITES, { filter: (s) => s.structureType === 'road' && !_.find(Game.rooms[roomName].lookAt(s.pos.x,s.pos.y), (w) => w.type == 'terrain' && w.terrain == 'wall')});
    // roads = roads.concat(roadsC)
    for (let road of roads) {
      // console.log('cur', matrix.get(road.pos.x, road.pos.y))
      if (matrix.get(road.pos.x, road.pos.y) == 0) {
        matrix.set(road.pos.x, road.pos.y, ROAD_COST);
      }
    }
  }

  doAvoidHostiles(roomName, matrix) {
    let room = Game.rooms[roomName];
    if (!room) return;

    let hostiles = ff.findHostiles(room);
    let terrain = room.getTerrain();
    for (let hostile of hostiles) {
      let range = 0;
      if (_.some(hostile.body, (p) => p.type === RANGED_ATTACK)) range = 5;
      else if (_.some(hostile.body, (p) => p.type === ATTACK)) range = 5;
      if (range === 0) continue;

      for (let dx = -range; dx <= range; dx += 1) {
        for (let dy = -range; dy <= range; dy += 1) {
          let x = hostile.pos.x + dx;
          let y = hostile.pos.y + dy;
          if (terrain.get(x, y) !== TERRAIN_MASK_WALL) matrix.set(x, y, AVOID_HOSTILE_COST);
        }
      }
    }
  }

  drawCosts(roomName, matrix) {
    let visual = new RoomVisual(roomName);
    let terrain = Game.map.getRoomTerrain(roomName);
    for (let x = 0; x < 50; x += 1) {
      for (let y = 0; y < 50; y += 1) {
        let baseCost = this.getTerrainCost(terrain.get(x, y));
        let cost = matrix.get(x, y);
        if (cost === 0) continue;

        if (cost >= baseCost) {
          if (cost === 255) {
            visual.circle(x, y, { radius: 0.2, fill: '#f00' });
          } else {
            visual.circle(x, y, { radius: 0.2, fill: '#ff0' });
          }
        } else {
          visual.circle(x, y, { radius: 0.2, fill: '#0f0' });
        }
      }
    }
  }

  getTerrainCost(terrain) {
    if (terrain === TERRAIN_PLAIN) return this.plainCost;
    if (terrain === TERRAIN_MASK_SWAMP) return this.swampCost;
    return 255;
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'PathBuilder');
