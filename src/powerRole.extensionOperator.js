module.exports = class ExtensionOperator {
  constructor(creep) {
    this.creep = creep;
  }

  run() {
    this.generateOps();
    // return;
    if (this.goHome()) return;
    if (this.renewPower()) return;
    if (this.enableRoom()) return;

    if (this.getOps()) return;
    if (this.storeOps()) return;

    if (this.operateExtentions()) return;
    // console.log('1');
    if (this.operateLabs()) return;
    // console.log('2');
    if (this.operateSpawns()) return;
    if (this.operatePowerSpawns()) return;
    // console.log('3');
    if (this.regenSources()) return;
    // console.log('4');
    this.findPosition();
  }

  findPosition() {
    let room = this.creep.room;
    let positions = room.memory.virtuals['powerPosition'];
    if (!positions) return;
    const byDist = _.sortBy(positions, (t) => this.creep.pos.getRangeTo(this.creep.room.getPositionAt(t.x, t.y)));
    let closest = byDist[0];
    this.creep.moveTo(closest.x, closest.y);
    // console.log('findPosition', room, positions, JSON.stringify(byDist))
  }

  runUnspawned() {
    if (this.spawnCooldownTime > 0) return;

    let homeRoom = Game.rooms[this.creep.memory.home];
    if (!homeRoom) return;

    this.creep.spawn(homeRoom.powerSpawn());
  }

  generateOps() {
    if (this.creep.powers[PWR_GENERATE_OPS].cooldown == 0) {
      this.creep.usePower(PWR_GENERATE_OPS);
    }
  }

  goHome() {
    let homeRoom = Game.rooms[this.creep.memory.home];
    if (!homeRoom || this.creep.room.name == homeRoom.name) return false;

    this.creep.goTo(homeRoom.powerSpawn());

    return true;
  }

  renewPower() {
    if (this.creep.ticksToLive < 200) {
      let powerSpawn = this.creep.room.powerSpawn();
      if (this.creep.pos.isNearTo(powerSpawn)) {
        this.creep.renew(powerSpawn);
      } else {
        this.creep.goTo(powerSpawn);
      }

      return true;
    } else {
      return false;
    }
  }

  enableRoom() {
    let controller = this.creep.room.controller;
    if (!controller || controller.isPowerEnabled) return false;

    if (this.creep.pos.isNearTo(controller)) {
      this.creep.enableRoom(controller);
    } else {
      this.creep.goTo(controller);
    }

    return true;
  }

  operateExtentions() {
    let roomai = this.creep.room.ai();
    if (!roomai) return;

    const room = roomai.room;
    let storage = room.storage;
    if (!storage) return;
    let extFull = this.extentionsFull();
    if (extFull < 30) return;

    let powerMetadata = POWER_INFO[PWR_OPERATE_EXTENSION];

    var targetsAll = this.creep.room.find(FIND_MY_STRUCTURES, {
      filter: (structure) => {
        return structure.structureType == STRUCTURE_EXTENSION && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
      },
    });

    if (!targetsAll.length) return;

    if (this.creep.store.ops < powerMetadata.ops) return;
    if (this.creep.powers[PWR_OPERATE_EXTENSION].cooldown > 0) return;
    if (this.creep.pos.getRangeTo(storage) <= powerMetadata.range) {
      this.creep.usePower(PWR_OPERATE_EXTENSION, storage);
    } else {
      this.creep.goTo(storage, { range: powerMetadata.range });
      return true;
    }
  }

  extentionsFull() {
    let roomai = this.creep.room.ai();
    if (!roomai) return false;
    let extentions = roomai.spawns.getAllExtentions();
    if (!extentions) return;
    let allCapacity = 0;
    let freeCapacity = 0;
    _.forEach(extentions, (ext) => {
      allCapacity += ext.energyCapacity;
      freeCapacity += ext.energyCapacity - ext.energy;
    });
    return Math.floor((freeCapacity * 100) / allCapacity);
  }

  getOps() {
    let roomai = this.creep.room.ai();
    if (!roomai) return;

    const room = roomai.room;
    let storage = room.storage;
    if (!storage) return;

    if (this.creep.store.ops > 300) return;
    if (storage.store.ops < 200) return;

    const max = Math.min(500, this.creep.carryCapacity);
    const amount = Math.min(max - this.creep.store.ops, storage.store.ops);
    let transferResult = this.creep.withdraw(storage, 'ops', amount);

    if (transferResult == OK) {
      if (!this.creep.memory['storedOps']) this.creep.memory['storedOps'] = 0;
      this.creep.memory['storedOps'] -= amount;
    } else if (transferResult == ERR_NOT_IN_RANGE) {
      this.creep.goTo(storage);
      return true;
    }
  }

  storeOps() {
    let roomai = this.creep.room.ai();
    if (!roomai) return;

    const room = roomai.room;
    let storage = room.storage;
    if (!storage) return;

    if (this.creep.store.ops < 1000) return;

    const amount = this.creep.store.ops - 800;
    let transferResult = this.creep.transfer(storage, 'ops', amount);

    if (transferResult == OK) {
      if (!this.creep.memory['storedOps']) this.creep.memory['storedOps'] = 0;
      this.creep.memory['storedOps'] += amount;
    } else if (transferResult == ERR_NOT_IN_RANGE) {
      this.creep.goTo(storage);
      return true;
    }
  }

  operateLabs() {
    let roomai = this.creep.room.ai();
    if (!roomai) return;

    let labs = roomai.labs.getPureLabs();
    // console.log('spawns', spawns)
    if (labs.length > 0) {
      const byDist = _.sortBy(labs, (t) => this.creep.pos.getRangeTo(t));
      let lab = byDist[0];
      // console.log('closest', lab);
      if (!lab) return;

      let powerMetadata = POWER_INFO[PWR_OPERATE_LAB];

      if (this.creep.store.ops < powerMetadata.ops) return;
      if (this.creep.powers[PWR_OPERATE_LAB].cooldown > 0) return;
      if (this.creep.pos.getRangeTo(lab) <= powerMetadata.range) {
        this.creep.usePower(PWR_OPERATE_LAB, lab);
      } else {
        this.creep.goTo(lab, { range: powerMetadata.range });
        return true;
      }
    }
  }

  operatePowerSpawns() {
    let roomai = this.creep.room.ai();
    if (!roomai) return;
    if (!this.creep.powers[PWR_OPERATE_POWER]) return;
    // console.log('Memory.powerOperation', Memory.powerOperation)
    if (this.creep.powers[PWR_OPERATE_POWER].cooldown > 0) return;

    let spawn = roomai.room.powerSpawn();
    if (spawn.effects && spawn.effects.length > 0) return;
    if (!spawn.power) return;
    // console.log('spawns', JSON.stringify(spawns))
    if (spawn) {
      let powerMetadata = POWER_INFO[PWR_OPERATE_POWER];

      if (this.creep.store.ops < powerMetadata.ops) return;
      if (this.creep.powers[PWR_OPERATE_POWER].cooldown > 0) return;
      if (this.creep.pos.getRangeTo(spawn) <= powerMetadata.range) {
        this.creep.usePower(PWR_OPERATE_POWER, spawn);
      } else {
        this.creep.goTo(spawn, { range: powerMetadata.range });
        return true;
      }
    }
  }

  operateSpawns() {
    let roomai = this.creep.room.ai();
    if (!roomai) return;
    if (!this.creep.powers[PWR_OPERATE_SPAWN]) return;
    // console.log('Memory.powerOperation', Memory.powerOperation)
    if (!Memory.powerOperation) return;
    if (this.creep.powers[PWR_OPERATE_SPAWN].cooldown > 0) return;

    let spawns = roomai.spawns.getBusySpawns();
    // console.log('spawns', JSON.stringify(spawns))
    if (spawns.length > 0) {
      const byDist = _.sortBy(spawns, (t) => this.creep.pos.getRangeTo(t));
      let spawn = byDist[0];
      // console.log('closest', spawn);
      if (!spawn) return;

      let powerMetadata = POWER_INFO[PWR_OPERATE_SPAWN];

      if (this.creep.store.ops < powerMetadata.ops) return;
      if (this.creep.powers[PWR_OPERATE_SPAWN].cooldown > 0) return;
      if (this.creep.pos.getRangeTo(spawn) <= powerMetadata.range) {
        this.creep.usePower(PWR_OPERATE_SPAWN, spawn);
      } else {
        this.creep.goTo(spawn, { range: powerMetadata.range });
        return true;
      }
    }
  }

  regenSources() {
    let roomai = this.creep.room.ai();
    if (!roomai) return;

    const room = roomai.room;
    let sources = room.find(FIND_SOURCES);
    let emptySources = _.filter(sources, (s) => s.energy === 0 && s.ticksToRegeneration > 25);
    let pureSources = _.filter(emptySources, (s) => !s.effects || (s.effects && s.effects.length === 0));

    // console.log('sources', sources, emptySources, pureSources)

    if (pureSources.length > 0) {
      const byDist = _.sortBy(pureSources, (t) => this.creep.pos.getRangeTo(t) + Math.ceil(t.ticksToRegeneration / 5));
      let source = byDist[0];
      // console.log('closest', spawn);
      if (!source) return;

      let powerMetadata = POWER_INFO[PWR_REGEN_SOURCE];

      if (this.creep.store.ops < powerMetadata.ops) return;
      if (this.creep.powers[PWR_REGEN_SOURCE].cooldown > 0) return;
      if (this.creep.pos.getRangeTo(source) <= powerMetadata.range) {
        this.creep.usePower(PWR_REGEN_SOURCE, source);
        return true;
      } else {
        this.creep.goTo(source, { range: powerMetadata.range });
        return true;
      }
    }
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'ExtensionOperator');
