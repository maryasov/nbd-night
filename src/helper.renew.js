module.exports = {
  check: function (creep) {
    if (creep.memory.renew && !creep.memory.goRenew) {
      let renewTimeout = 100;

      switch (creep.memory.role) {
        case 'mover':
          renewTimeout = 500;
          break;
        case 'scooper':
          renewTimeout = 500;
          break;
        case 'miner':
          renewTimeout = 300;
          break;
        case 'harvester':
          renewTimeout = 200;
          break;
        case 'upgrader':
          renewTimeout = 200;
          break;
        case 'carrier':
          renewTimeout = 200;
          break;
      }
      if (creep.ticksToLive < renewTimeout) {
        if (this.conditions(creep)) {
          // creep.say("Too old! 😨");
          if (this.enoughtEnergy(creep)) {
            creep.memory.goRenew = true;
          }
        }
      }
    }
    if (creep.memory.goRenew) {
      creep.say('😰:' + creep.ticksToLive, true);
      if (this.renew(creep)) return true;
    }
  },
  renew: function (creep) {
    let roomai = creep.room.ai();
    if (!roomai) return;
    let spawn = roomai.spawns.getBestRenewSpawn(creep);
    if (!spawn) return;
    if (!this.enoughtEnergy(creep)) {
      console.log('finish renew', creep.name);
      if (this.canInterrupt(creep)) {
        creep.memory.goRenew = false;
        delete spawn.memory.lastRenewCreep;
        delete spawn.memory.lastRenew;
      }
      return;
    }
    let res = spawn.renewCreep(creep);
    // console.log('renew res', res)
    if (res === ERR_NOT_IN_RANGE) {
      this.repare(creep);
      creep.goTo(spawn);
      return true;
    }
    if (res === ERR_NOT_ENOUGH_ENERGY) {
      if (this.canInterrupt(creep)) {
        creep.memory.goRenew = false;
        delete spawn.memory.lastRenewCreep;
        delete spawn.memory.lastRenew;
      }
      return false;
    }
    if (res === ERR_FULL) {
      creep.memory.goRenew = false;
      delete spawn.memory.lastRenewCreep;
      delete spawn.memory.lastRenew;
      creep.say("❤️I'm ok!", true);
    }
    if (res === OK) {
      spawn.memory.lastRenewCreep = creep.name;
      spawn.memory.lastRenew = Game.time;
      creep.say('😊:' + creep.ticksToLive, true);
      return true;
    }
  },
  enoughtEnergy: function (creep) {
    let roomai = creep.room.ai();
    if (!roomai) return false;
    let spawn = roomai.spawns.getBestSpawn(creep);
    if (!spawn) return;
    if (creep.memory.role === 'harvester' && spawn.energyAvailable < spawn.energyCapacity * 0.8) return false;
    if (spawn.energyAvailable < spawn.energyCapacity * 0.4) {
      return false;
    }
    return true;
  },
  canInterrupt: function (creep) {
    if (creep.memory.role === 'mover' && creep.memory.support !== creep.room.name) return false;
    if (creep.memory.role === 'carrier' && creep.memory.home !== creep.room.name) return false;
    return true;
  },
  repare: function (creep) {
    // if (creep.memory.role === 'miner') {
    //   ress = Object.keys(creep.store);
    //   if (ress.length > 0) {
    //     let firstRes = _.first(ress);
    //     result = creep.drop(firstRes);
    //     // console.log('drop', firstRes, result)
    //   }
    // }
  },
  conditions: function (creep) {
    if (creep.memory.role === 'mover' && creep.memory.support !== creep.room.name) return false;
    if (creep.memory.role === 'scooper' && creep.memory.home !== creep.room.name) return false;
    if (
      creep.memory.role === 'harvester' &&
      (creep.memory.level !== creep.room.controller.level || creep.memory.affordable)
    )
      return false;
    if (creep.memory.role === 'carrier' && creep.memory.home !== creep.room.name) return false;
    return true;
  },
};

const profiler = require('screeps-profiler');
profiler.registerObject(module.exports, 'renew');
