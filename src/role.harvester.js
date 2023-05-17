var spawnHelper = require('helper.spawning');
var logistic = require('helper.logistic');
var renew = require('helper.renew');
const parking = require('helper.parking');
const factoryWorker = require("./role.factoryWorker");

const storeStructures = [STRUCTURE_STORAGE, STRUCTURE_CONTAINER];

module.exports = {
  name: 'harvester',
  // TODO config for kikstart
  carryConfigs: [
    //[CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
    //[CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
    //[CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
    [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
    [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
    [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
    [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
    [CARRY, CARRY, MOVE, MOVE],
    [CARRY, MOVE],
  ],
  miningConfigs: [
    [WORK, WORK, MOVE, WORK, WORK, MOVE, WORK, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
    [WORK, WORK, MOVE, WORK, WORK, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
    [WORK, WORK, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
    [WORK, WORK, MOVE, CARRY, CARRY, MOVE],
    [WORK, WORK, CARRY, MOVE],
    [WORK, CARRY, MOVE],
  ],
  run: function (creep) {
    if (renew.check(creep)) {
      if (!creep.memory.delivering && creep.store.energy > 0) {
        creep.memory.delivering = true;
      }
      return;
    }
    // check if our carry  has something else than energy and drop it (e.g. due to overfilling protection)
    let wrongCarryResource = _.find(Object.keys(creep.store), (r) => r != 'energy');
    if (wrongCarryResource) {
      creep.drop(wrongCarryResource);
    }

    // if(boosting.accept(creep, "XKH2O")) return;

    if (creep.memory.delivering && creep.store.energy == 0) {
      creep.memory.delivering = false;
    }
    if (!creep.memory.delivering && creep.store.energy > 0) {
      creep.memory.delivering = true;
    }

    if (creep.store.getFreeCapacity() > 0 && creep.pos.isNearTo(creep.room.storage)) {
      // Safety valve: protect storage from overflowing with anything but energy
      if (creep.room.storage.my && creep.room.storage.store.getFreeCapacity() < 10000) {
        let excessResource = _.invert(creep.room.storage.store)[_.sortBy(creep.room.storage.store, (r) => -r)[0]];
        console.log('Storage in room ' + creep.room.name + ' is overfilled! Removing excess ' + excessResource);
        creep.withdraw(creep.room.storage, excessResource);
        return;
      }
      creep.withdraw(creep.room.storage, RESOURCE_ENERGY);
    }

    if (creep.memory.delivering) {
      this.deliver(creep);
    } else {
      if (this.pickup(creep)) this.deliver(creep);
    }
    if (creep.memory.stopped) parking.check(creep);
  },
  deliver: function (creep) {
    let targets = this.findTargets(creep);
    // let myNumber = this.harvesterIdx(creep);
    let target = targets.shift(); // myNumber % 2 == 1 ? _.first(targets) : _.last(targets);
    if (target) {
      creep.memory.stopped = false;
      let transferResult = creep.transfer(target, RESOURCE_ENERGY);
      if (transferResult == ERR_NOT_IN_RANGE) {
        creep.goTo(target);
      } else if (transferResult == OK) {
        target = targets.shift();
        if (target && !creep.pos.isNearTo(target)) {
          creep.goTo(target);
        }
      }
    } else {
      creep.memory.stopped = true;
      if (creep.store.energy < creep.store.getCapacity()) {
        creep.memory.delivering = false;
      }
    }
  },
  harvestEnergy: function (creep) {
    var source = creep.pos.findClosestByRange(FIND_SOURCES);
    let result = logistic.obtainEnergy(creep, source, true);
    if (result == logistic.obtainResults.withdrawn) {
      creep.memory.delivering = true;
    }
  },
  harvesterIdx(creep) {
    const room = Game.rooms[creep.room.name];
    const roomai = room.ai();
    // console.log('cr', JSON.stringify(roomai))

    let harvesters = spawnHelper.localCreepsWithRole(roomai, creep.memory.role);
    // console.log('hs', creep.name, _.findIndex(harvesters, creep), harvesters)
    return _.findIndex(harvesters, creep) + 1;
  },
  findTargets: function (creep) {
    // console.log('findTargets creep', JSON.stringify(creep))
    // let myNumber = this.harvesterIdx(creep);
    // let evenOdd = myNumber % 2;
    let targets = [];
    var targetsAll = creep.room.find(FIND_MY_STRUCTURES, {
      filter: (structure) => {
        return (
          (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) &&
          structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        );
      },
    });
    // targetsAll.forEach((el, idx) => {
    //     if (evenOdd == idx % 2) {targets.push(el)}
    // })
    targets = targetsAll;

    if (creep.room.storage && creep.room.storage.store.energy > 10000) {
      if (targets.length == 0 && creep.room.terminal) {
        var terminal = creep.room.terminal;
        if (terminal.store.getFreeCapacity() > 0 && terminal.store[RESOURCE_ENERGY] < 5000) {
          targets = [terminal];
        }
      }

      if (targets.length == 0 && creep.room.ai().mode !== 'unclaim') {
        targets = creep.room.find(FIND_MY_STRUCTURES, {
          filter: (structure) => {
            return (
              (structure.structureType == STRUCTURE_NUKER || structure.structureType == STRUCTURE_POWER_SPAWN) &&
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );
          },
        });
      }
    }

    if (targets.length == 0 && spawnHelper.numberOfLocalCreeps(creep.room.ai(), 'reloader') < 1) {
      targets = creep.room.find(FIND_MY_STRUCTURES, {
        filter: (structure) => {
          return structure.structureType == STRUCTURE_TOWER && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
        },
      });
    }

    const tgsList = _.sortBy(targets, (t) => creep.pos.getRangeTo(t));

    return tgsList;
  },
  pickup: function (creep) {
    creep.memory.stopped = false;
    var source = Game.getObjectById(creep.memory.source);
    var result = logistic.obtainEnergy(creep, source, true);
    if (result == logistic.obtainResults.withdrawn) {
      creep.memory.delivering = true;
      return true;
    }

    return false;
  },
};

const profiler = require('screeps-profiler');
const linkCollector = require('./role.linkCollector');
const boosting = require('./helper.boosting');
profiler.registerObject(module.exports, 'harvester');
