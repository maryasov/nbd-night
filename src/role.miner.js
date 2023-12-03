const logistic = require('helper.logistic');
const boosting = require('helper.boosting');
const movement = require('helper.movement');
const spawnHelper = require('helper.spawning');
const renew = require('helper.renew');
const recycle = require('helper.recycle');

module.exports = {
  name: 'miner',
  energyConfigs: function (workParts = 10) {
    var configs = [];
    for (let work = workParts; work >= 2; work -= 1) {
      let carry = work <= 5 ? 1 : 2;
      let move = work <= 5 ? Math.max(1, Math.floor(work / 3)) : Math.max(2, Math.ceil(work / 2)) + carry;
      // let move = Math.ceil((work + 1) / 2);
      let config = Array(work).fill(WORK).concat(Array(carry).fill(CARRY)).concat(Array(move).fill(MOVE));
      if (config.length <= 50) configs.push(config);
    }

    // TODO: probably more handcrafted configs for low tiers?
    configs.push([WORK, WORK, CARRY, MOVE]); // spawn-only config

    // console.log('', JSON.stringify(configs))
    return configs;
  },
  energyRemoteConfigs: function (workParts = 7) {
    var configs = [];
    for (let work = workParts; work >= 2; work -= 1) {
      let carry = work <= 5 ? 1 : 2;
      let move = work <= 5 ? Math.max(1, Math.floor(work / 2)) : Math.max(2, Math.ceil(work / 2)) + carry;
      // let move = Math.ceil((work + 1) / 2);
      let config = Array(work).fill(WORK).concat(Array(carry).fill(CARRY)).concat(Array(move).fill(MOVE));
      if (config.length <= 50) configs.push(config);
    }

    // TODO: probably more handcrafted configs for low tiers?
    configs.push([WORK, WORK, CARRY, MOVE]); // spawn-only config

    // console.log('', JSON.stringify(configs))
    return configs;
  },
  claimConfigs: function (workParts) {
    var configs = [];
    for (let work = workParts; work >= 2; work -= 1) {
      let carry = work < 5 ? 1 : 2;
      let move = work + carry;
      let config = Array(work).fill(WORK).concat(Array(carry).fill(CARRY)).concat(Array(move).fill(MOVE));
      if (config.length <= 50) configs.push(config);
    }

    // TODO: probably more handcrafted configs for low tiers?
    configs.push([WORK, WORK, CARRY, MOVE]); // spawn-only config

    return configs;
  },
  mineralConfigs: function (mineral) {
    let configs = [];

    let workNeeded = Math.ceil((mineral.mineralAmount * EXTRACTOR_COOLDOWN) / CREEP_LIFE_TIME);
    workNeeded = Math.max(workNeeded, 5);
    for (let parts = Math.min(workNeeded, 32); parts > 2; parts -= 1) {
      configs.push(spawnHelper.makeParts(parts, WORK, 2, CARRY, Math.ceil(parts / 2), MOVE));
    }

    return configs;
  },
  depositParts: spawnHelper.makeParts(30, WORK, 5, CARRY, 15, MOVE),
  run: function (creep) {
    if (recycle.check(creep)) return;
    if (renew.check(creep)) return;
    /*if (Game.cpu.bucket < 50) {
             return;
         }*/
    if (creep.memory.targetRoom && creep.room.name !== creep.memory.targetRoom) {
      movement.moveToRoom(creep, creep.memory.targetRoom);
      return;
    }

    if (creep.body[0].type === WORK && creep.memory.resource !== 'energy') {
      if (boosting.accept(creep, 'XUHO2', 'UHO2', 'UO')) return;
    }

    if (!creep.memory.resource) {
      creep.memory.resource = RESOURCE_ENERGY;
    }

    var target = Game.getObjectById(creep.memory.target);
    if (!target) {
      return;
    }

    if (target.room.name && creep.room.name !== target.room.name) {
      movement.moveToRoom(creep, target.room.name);
    }

    if (creep.memory.targetRoom && creep.room.name !== creep.memory.targetRoom) {
      movement.moveToRoom(creep, creep.memory.targetRoom);
    }

    if (Game.time % 10 == 0 && creep.memory.resource == RESOURCE_ENERGY) {
      this.considerSuicide(creep);
    }

    var harvestResult = OK;
    let harvestPower = creep.memory.resource === RESOURCE_ENERGY ? HARVEST_POWER : HARVEST_MINERAL_POWER;
    if (creep.store.getFreeCapacity() >= harvestPower * creep.getActiveBodyparts(WORK)) {
      harvestResult = creep.harvest(target);
    }

    if (harvestResult == OK) {
      creep.memory.stopped = true;
      var store = logistic.storeFor(target);
      if (store) {
        // let harvestPower = creep.memory.resource === RESOURCE_ENERGY ? HARVEST_POWER : HARVEST_MINERAL_POWER;
        if (creep.memory.resource === RESOURCE_ENERGY && store.hits / store.hitsMax < 0.5) {
          if (creep.repair(store) == ERR_NOT_IN_RANGE) {
            creep.goTo(store);
          }
        } else if (
          creep.store[creep.memory.resource] >=
          creep.store.getCapacity() - harvestPower * creep.getActiveBodyparts(WORK)
        ) {
          if (creep.transfer(store, creep.memory.resource) == ERR_NOT_IN_RANGE) {
            // Avoid creep misrouting to a spot where it needs to move
            // back and forth between store and target.
            if (store.pos.getRangeTo(target) == 2) {
              let centerPos = new RoomPosition(
                Math.round((target.pos.x + store.pos.x) / 2),
                Math.round((target.pos.y + store.pos.y) / 2),
                store.pos.roomName
              );
              let minerRes = creep.goTo({ pos: centerPos });
              if (minerRes !== OK) {
                console.log('miner move res', creep.room.name, minerRes)
              }
            } else {
              creep.goTo(store);
            }
          }
        }
      } else if (
        creep.memory.resource === RESOURCE_ENERGY &&
        creep.store.energy >= _.filter(creep.body, (part) => part.type == WORK).length * 5
      ) {
        this.buildContainer(creep, target);
      }
    } else if (harvestResult == ERR_NOT_IN_RANGE) {
      // limit maxRooms to 1 if same room
      creep.goTo(target);
    }
  },
  buildContainer: function (creep, source) {
    var constructionSite = logistic.storeFor(source, true);
    if (constructionSite) {
      if (creep.build(constructionSite) == ERR_NOT_IN_RANGE) {
        creep.goTo(constructionSite);
      }
    } else if (creep.memory.selfSustaining) {
      creep.pos.createConstructionSite(STRUCTURE_CONTAINER);
    }
  },
  considerSuicide: function (creep) {
    let myWorkParts = this.countWorkParts(creep);
    // if (myWorkParts == 5) return;

    let betterMiner = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
      filter: (c) =>
        c.memory.role == this.name && c.memory.target == creep.memory.target && (this.countWorkParts(c) > myWorkParts || (this.countWorkParts(c) >= myWorkParts && c.ticksToLive > creep.ticksToLive)),
    });
    if (!betterMiner || creep.pos.getRangeTo(betterMiner) > 5) return;

    creep.suicide();
  },
  countWorkParts: function (creep) {
    return _.filter(creep.body, (p) => p.type == WORK).length;
  },
};

const profiler = require('screeps-profiler');
profiler.registerObject(module.exports, 'miner');
