module.exports = class SpawnOperator {
  constructor(creep) {
    this.creep = creep;
  }

  run() {
    this.generateOps();
    //this.storeOps();
    if (this.goHome()) return;
    if (this.renewPower()) return;
    if (this.enableRoom()) return;
    if (this.operateSpawns()) return;
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

  storeOps() {
    let toStore = 0;
    if (this.creep.carryCapacity * 0.9 > _.sum(this.creep.store['ops'])) {
      toStore = _.sum(this.creep.store['ops']) - this.creep.carryCapacity * 0.8;
    }
    if (toStore > 0) {
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

  operateSpawns() {
    let roomai = this.creep.room.ai();
    if (!roomai) return;

    let spawns = roomai.spawns.getPureSpawns();
    // console.log('spawns', JSON.stringify(spawns))
    if (spawns.length > 0) {
      const byDist = _.sortBy(spawns, (t) => this.creep.pos.getRangeTo(t));
      let spawn = byDist[0];
      // console.log('closest', spawn);
      if (!spawn) return;

      let powerMetadata = POWER_INFO[PWR_OPERATE_SPAWN];

      if (this.creep.pos.getRangeTo(spawn) <= powerMetadata.range) {
        if (this.creep.store.ops < powerMetadata.ops) return;
        if (this.creep.powers[PWR_OPERATE_SPAWN].cooldown > 0) return;
        this.creep.usePower(PWR_OPERATE_SPAWN, spawn);
      } else {
        this.creep.goTo(spawn, { range: powerMetadata.range });
      }
    }
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'SpawnOperator');
