const spawnHelper = require('helper.spawning');
const logistic = require('helper.logistic');
const movement = require('helper.movement');

module.exports = {
  name: 'conqueror',
  configs: function () {
    var configs = [];
    for (var parts = 10; parts >= 2; parts -= 1) {
      let config = Array(parts)
        .fill(WORK)
        .concat(Array(parts).fill(CARRY))
        .concat(Array(parts * 2).fill(MOVE));
      // config.push(HEAL);
      configs.push(config);
    }

    return configs;
  },
  configsMove: function (capacity) {
    var configs = [];
    for (var carries = Math.ceil(capacity / CARRY_CAPACITY); carries >= 2; carries -= 1) {
      let config = Array(carries).fill(CARRY).concat(Array(carries).fill(MOVE));
      if (config.length <= 50) configs.push(config);
    }

    return configs;
  },
  run: function (creep) {
    let target;
    if (creep.memory.target) {
      target = AbsolutePosition.deserialize(creep.memory.target);
    }
    if (creep.hits < creep.hitsMax) {
      creep.heal(creep);
      // console.log("healing self", creep.name);
    }
    if (creep.store.getFreeCapacity() > 0 && (creep.memory.move || creep.room.name === 'W52S28' || creep.room.name === 'W49S29')) {
      var source = creep.pos.findClosestByRange(FIND_SOURCES);
      var result = logistic.obtainEnergy(creep, source, true, true);
      return;
    }
    if (target && creep.room.name !== target.roomName) {
      let ret = creep.goTo(target, {avoidHostiles: true});
      // console.log('con', creep.name, ret)
      return;
    }

    if (creep.room.name === 'W32S15' && creep.memory.target.r === 'W32S15') {
      creep.memory.role = 'mover';
      creep.memory.to = 'W32S15';
      creep.memory.resource = 'energy';
      creep.memory.oneWay = true;
    }

    if (creep.room.find(FIND_MY_SPAWNS).length > 0) {
      //w1
      // creep.memory.role = 'harvester';
      //w2
      //w3
      if (creep.memory.target.r === 'W32S12' || creep.memory.target.r === 'W52S28' || creep.memory.target.r === 'W58S24') {
        creep.memory.role = 'scooper';
        creep.memory.home = creep.room.name;
        creep.memory.goRecycle = true;
        creep.memory.returningHome = true;
        creep.memory.renew = false;
        creep.memory.source = creep.pos.findClosestByRange(FIND_SOURCES).id;
      } else {
        if (spawnHelper.numberOfLocalCreeps(creep.room.ai(), 'builder') >= 2) {
          creep.memory.role = 'scooper';
          creep.memory.home = creep.room.name;
          creep.memory.goRecycle = true;
          creep.memory.returningHome = true;
          creep.memory.renew = false;
        } else {
          creep.memory.role = 'builder';
          creep.memory.room = creep.room.name;
        }
      }
//
      // TODO: move that into the operation? turning one into harvester and the other into upgrader?
      creep.say('Spawn is there. Becoming a harvester...');
      return;
    }

    if (creep.memory.building && creep.store.energy == 0) {
      creep.memory.building = false;
    }
    if (!creep.memory.building && creep.store.energy == creep.store.getCapacity()) {
      creep.memory.building = true;
    }

    if (creep.memory.building) {
      this.constructStructures(creep);
    } else {
      this.harvestEnergy(creep);
    }
  },
  constructStructures: function (creep) {
    var target = creep.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES, {
      filter: (cs) => cs.structureType == STRUCTURE_SPAWN,
    });
    if (target) {
      if (creep.build(target) == ERR_NOT_IN_RANGE) {
        creep.goTo(target);
      }
    }
    return target;
  },
  harvestEnergy: function (creep) {
    let source = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
    logistic.obtainEnergy(creep, source, true);
  },
};

const profiler = require('screeps-profiler');
const builder = require("./role.builder");
profiler.registerObject(module.exports, 'conqueror');
