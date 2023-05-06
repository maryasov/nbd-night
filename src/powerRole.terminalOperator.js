module.exports = class TerminalOperator {
  constructor(creep) {
    this.creep = creep;
  }

  run() {
    this.generateOps();
    if (this.goHome()) return;
    if (this.renewPower()) return;
    if (this.enableRoom()) return;
    if (this.operateFactory()) return;
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

  operateFactory() {
    let roomai = this.creep.room.ai();
    if (!roomai) return;

    let terminal = roomai.trading.isTradingPossible() && roomai.trading.tradingTerminal();
    // console.log('terminal', terminal)
    if (!terminal) return;

    let powerMetadata = POWER_INFO[PWR_OPERATE_TERMINAL];

    if (this.creep.pos.getRangeTo(terminal) <= powerMetadata.range) {
      if (this.creep.store.ops < powerMetadata.ops) return;
      if (this.creep.powers[PWR_OPERATE_TERMINAL].cooldown > 0) return;
      this.creep.usePower(PWR_OPERATE_TERMINAL, terminal);
    } else {
      this.creep.goTo(terminal, { range: powerMetadata.range });
    }
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'TerminalOperator');
