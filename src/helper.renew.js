module.exports = {
  check: function (creep) {
    if (
      creep.memory.closestPlain &&
      creep.memory.renewOk &&
      creep.memory.renewOk + 10 > Game.time &&
      creep.pos.getRangeTo(
        new RoomPosition(creep.memory.closestPlain.x, creep.memory.closestPlain.y, creep.room.name)
      ) > 0
    ) {
      // console.log('range', creep.pos.getRangeTo(new RoomPosition(creep.memory.closestPlain.x, creep.memory.closestPlain.y, creep.room.name)))
      creep.say('Flee!', true);
      creep.moveTo(creep.memory.closestPlain.x, creep.memory.closestPlain.y);
    } else {
      delete creep.memory.renewOk;
      delete creep.memory.closestPlain;
      delete creep.memory.renewSpawn;
    }
    if (creep.memory.renewSpawn && creep.memory.renewOk && creep.memory.renewOk + 10 > Game.time) {
      let spawn = Game.getObjectById(creep.memory.renewSpawn);
      let res = creep.fleeFrom(spawn, 4);
      if (res === OK) {
        creep.say('Flee!', true);
        return true;
      }
    } else {
      delete creep.memory.renewOk;
      delete creep.memory.closestPlain;
      delete creep.memory.renewSpawn;
    }
    if (creep.memory.renew && !creep.memory.goRenew) {
      let renewTimeout = 150;

      switch (creep.memory.role) {
        case 'builder':
          renewTimeout = 200;
          break;
        case 'mover':
          renewTimeout = 500;
          break;
        case 'scooper':
          renewTimeout = 1000;
          break;
        case 'miner':
          renewTimeout = 200;
          break;
        case 'harvester':
          renewTimeout = 200;
          break;
        case 'upgrader':
          renewTimeout = 200;
          break;
        case 'carrier':
          renewTimeout = creep.memory.selfSustaining ? 500 : 200;
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
    // TODO weak first
    // let nextTo = spawn.pos.findInRange(FIND_MY_CREEPS, 2, { filter: (s) => s.memory.goRenew });
    // let tooWeak = _.filter(nextTo, )
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
      const area = creep.room.lookAtArea(spawn.pos.y - 5, spawn.pos.x - 5, spawn.pos.y + 5, spawn.pos.x + 5, true);
      // console.log('area', JSON.stringify(area))
      const plains = _.filter(area, (t) => {
        const range = spawn.pos.getRangeTo(new RoomPosition(t.x, t.y, spawn.room.name));
        const look = new RoomPosition(t.x, t.y, spawn.room.name).look();
        // console.log('look', t.x, t.y, look.length, JSON.stringify(look))
        return t.type == 'terrain' && t.terrain == 'plain' && range > 1 && range < 5 && look.length == 1;
      });
      // console.log('plains', creep.name, JSON.stringify(plains))
      if (plains.length > 0) {
        var closestPlain = _.sortBy(plains, (t) =>
          creep.pos.getRangeTo(new RoomPosition(t.x, t.y, spawn.room.name))
        )[0];
        // console.log('closest', creep.name, JSON.stringify(closestPlain))
        creep.memory.closestPlain = { x: closestPlain.x, y: closestPlain.y };
      } else {
        creep.memory.renewSpawn = spawn.id;
      }

      creep.memory.renewOk = Game.time;
      //TODO расчитать путь отхода от спавна
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
      (creep.memory.energy < creep.room.energyCapacityAvailable || creep.memory.affordable)
    )
      return false;
    if (
      creep.memory.role === 'mener' &&
      (creep.memory.energy < creep.room.energyCapacityAvailable || creep.memory.affordable)
    )
      return false;
    if (creep.memory.role === 'builder' && creep.memory.energy < creep.room.energyCapacityAvailable) return false;
    if (creep.memory.role === 'upgrader' && creep.memory.energy < creep.room.energyCapacityAvailable) return false;
    if (creep.memory.role === 'carrier' && creep.memory.home !== creep.room.name) return false;
    return true;
  },
};

const profiler = require('screeps-profiler');
profiler.registerObject(module.exports, 'renew');
