module.exports = class Spawns {
  constructor(room) {
    this.room = room;
    this.spawns = room.find(FIND_MY_SPAWNS);
    this.firstSpawn = _.last(this.spawns);
    this.availableSpawns = _.filter(this.spawns, (s, i) => !s.spawning);
    this.availableSpawnsBoosted = _.filter(this.spawns, (s) => !s.spawning && s.effects && s.effects.length > 0);
    this.busySpawns = _.filter(this.spawns, (s) => s.spawning && (!s.effects || (s.effects && s.effects.length === 0)));
    this.pureSpawns = _.filter(this.spawns, (s) => !s.effects);
    this.primary = this.spawns[0];
  }

  getBestSpawn(creep) {
    let spawn = this.availableSpawnsBoosted[0];
    if (!spawn) {
      spawn = this.availableSpawns[0];
    }
    return spawn;
  }
  getBestRenewSpawn(creep) {
    if (!this.spawns) {
      return;
    }
    let spawns = _.filter(this.spawns, (s) => !s.spawning);
    const mySpawn = _.find(spawns, (r) => r.memory.lastRenewCreep === creep.name);
    // console.log('mySpawn', mySpawn)
    if (mySpawn) {
      // if (creep.room.name === 'W9N9') console.log('my', creep.room.name, creep.name, mySpawn.name);
      return mySpawn;
    }
    let freeSpawns = _.sortBy(spawns, (s) => {
      const shift = s.memory.lastRenew ? s.memory.lastRenew : Game.time - 10;
      const shiftNorm = Game.time - shift > 10 ? 10 : Game.time - shift;
      return -shiftNorm;
    });
    // let fs = _.map(freeSpawns, (p,i) => p.name+' '+i+ ' '+(Game.time - (p.memory.lastRenew?p.memory.lastRenew:Game.time-100)))
    // if (creep.room.name === 'W9N9') console.log('fs', creep.room.name, creep.name, fs.join(','))
    let spawn = freeSpawns[0];
    return spawn;
  }
  spawn(parts, memory, safe = false) {
    let spawn;
    let pending = this.countPendingRenew(this.room)
    if (['harvester', 'miner'].includes(memory.role)) {
      pending = 0;
    }
    if (safe) {
      spawn = (pending < this.spawns.length) && this.firstSpawn;
    } else {
      spawn = _.filter(this.availableSpawnsBoosted, (s, i) => pending < i+1)[0];
    }

    if (!spawn) {
      spawn = _.filter(this.availableSpawns, (s, i) => pending < i+1)[0];
    }
    if (!spawn || (this.spawnReserved && !memory.ignoreReserved)) {
      // console.log('no', spawn ,this.spawnReserved)
      return false;
    }

    let name = this.nameCreep(memory.role);
    let result = spawn.spawnCreep(parts, name, {
      memory: memory,
      energyStructures: this.energyStructures,
    });
    // console.log('result', result, name, {
    //     memory: memory,
    //     energyStructures: this.energyStructures, parts
    // })
    if (result === OK) {
      spawn.memory.lastCreep = memory;
      this.availableSpawns.shift();
      return name; // be compatible with old spawn API
    } else if (result === ERR_NOT_ENOUGH_ENERGY) {
      this.spawnReserved = true;
    } else {
      // console.log(this.room.name + ' - Unexpected spawn result: ' + result);
      // console.log('Name was: ' + name + ' Parts were ' + parts);
    }

    return result;
  }

  getPureSpawns() {
    return this.pureSpawns;
  }

  getBusySpawns() {
    return this.busySpawns;
  }

  getExtensions() {
    let structures = this.energyStructures();
    let extensions = _.filter(structures, (s) => s.structureType === STRUCTURE_EXTENSION);
    let pureExtensions = _.filter(extensions, (s) => !s.effects);
    return pureExtensions;
  }

  canSpawn() {
    return !this.spawnReserved && this.availableSpawns.length > 0;
  }

  countPendingRenew(r) {
    let olds = spawnHelper.localCreepsForRenew({room:Game.rooms[r.name]});
    // console.log('c', r.name, olds.length)
    return olds.length;
  }

  canSpawnHarv() {
    return this.availableSpawns.length > 0;
  }

  renderOverlay() {
    for (let spawn of this.spawns) {
      this.renderSpawnOverlay(spawn);
    }
  }

  renderSpawnOverlay(spawn) {
    if (spawn.spawning) {
      let role = Game.creeps[spawn.spawning.name].memory.role;
      let remaining = spawn.spawning.remainingTime - 1;
      spawn.room.visual.rect(spawn.pos.x - 1.3, spawn.pos.y + 0.9, 2.6, 0.6, {
        fill: '#333',
        opacity: 0.8,
        stroke: '#fff',
        strokeWidth: 0.03,
      });
      spawn.room.visual.text(role, spawn.pos.x - 0.0, spawn.pos.y + 1.3, { align: 'center', size: 0.4 });
      spawn.room.visual.circle(spawn.pos, { fill: '#000000', radius: 0.5, opacity: 0.8 });
      spawn.room.visual.text(remaining, spawn.pos.x - 0.0, spawn.pos.y + 0.2, { align: 'center', size: 0.6 });
    }
  }

  nameCreep(role) {
    let rolePart = role ? role + '-' : '';
    let id = this.fetchCreepId().toString();
    return rolePart + id + '-' + Game.shard.name;
  }

  fetchCreepId() {
    let id = (Memory.nextCreepId || 0) % 10000;
    Memory.nextCreepId = id + 1;
    return id;
  }

  get energyStructures() {
    if (!this._energyStructures) {
      let structures = this.room.find(FIND_MY_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION,
      });
      let reference = this.room.storage || this.primary.pos.findClosestByRange(FIND_SOURCES);
      this._energyStructures = _.sortBy(structures, (s) => s.pos.getRangeTo(reference));
    }

    return this._energyStructures;
  }

  getAllExtentions() {
    let targets = this.room.find(FIND_MY_STRUCTURES, {
      filter: (structure) => structure.structureType == STRUCTURE_EXTENSION,
    });
    return targets
  }
};

const profiler = require('screeps-profiler');
const spawnHelper = require("./helper.spawning");
profiler.registerClass(module.exports, 'Spawns');
