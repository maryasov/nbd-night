const boosting = require('helper.boosting');
const ff = require('helper.friendFoeRecognition');
const movement = require('helper.movement');
const spawnHelper = require('helper.spawning');
const recycle = require('helper.recycle');

module.exports = {
  name: 'defender',
  meeleeConfigs: function () {
    let configs = [];
    for (let parts = 25; parts >= 4; parts -= 1) {
      let config = spawnHelper.makeParts(parts, RANGED_ATTACK, parts, MOVE, 5, HEAL);
      let shuffled = config
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
      configs.push(shuffled);
    }

    return configs;
  },
  closeConfigs: function () {
    let configs = [];
    for (let parts = 25; parts >= 4; parts -= 1) {
      let config = spawnHelper.makeParts(parts, ATTACK, parts, MOVE);
      let shuffled = config
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
      configs.push(shuffled);
    }

    return configs;
  },
  run: function (creep) {
    if (recycle.check(creep)) return;
    if (creep.ticksToLive == CREEP_LIFE_TIME - 1) creep.notifyWhenAttacked(false);

    creep.memory.stopped = false;
    if (creep.room.name === creep.memory.room) {
      if (creep.room.ai() && creep.room.ai().defense.defcon >= 3) {
        if (boosting.accept(creep, 'XUH2O')) return;
      } else {
        // Avoid running back to booster after defcon increases
        boosting.decline(creep, 'XUH2O');
      }
    } else {
      movement.moveToRoom(creep, creep.memory.room);
      return;
    }

    var target = ff.findHostiles(creep.room)[0];
    if (target) {
      this.attack(creep, target);
    } else {
      let center = creep.room.getPositionAt(25, 25);
      if (creep.pos.getRangeTo(center) > 10) {
        creep.goTo({ pos: center }, { range: 10 });
      } else {
        creep.memory.stopped = true;
      }
    }
  },
  attack: function (creep, target) {
    let result;
    if (
      _.filter(creep.body, (p) => p.type == RANGED_ATTACK).length > _.filter(creep.body, (p) => p.type == ATTACK).length
    ) {
      result = creep.rangedAttack(target);
    } else {
      result = creep.attack(target);
    }

    if (result == ERR_NOT_IN_RANGE) {
      creep.moveTo(target, { maxRooms: 1 });
      if (creep.hits < creep.hitsMax) {
        creep.heal(creep);
        // console.log("healing self", creep.name);
      }
    }
  },
};

const profiler = require('screeps-profiler');
profiler.registerObject(module.exports, 'defender');
