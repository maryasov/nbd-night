const boosting = require('helper.boosting');
const ff = require('helper.friendFoeRecognition');
const movement = require('helper.movement');
const spawnHelper = require('helper.spawning');
const renew = require('helper.renew');
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
  remoteConfigs: function () {
    let configs = [];
    for (let parts = 15; parts >= 4; parts -= 1) {
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
    if (renew.check(creep)) return;
    if (creep.ticksToLive == CREEP_LIFE_TIME - 1) creep.notifyWhenAttacked(false);

    creep.memory.stopped = false;
    if (creep.memory.goRecycle && creep.room.name !== creep.memory.originRoom) {
      movement.moveToRoom(creep, creep.memory.originRoom);
      return;
    }
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

    var targets = ff.findHostiles(creep.room);
    // if (!_.every(hostile.body, (p) => p.type === MOVE)) {
    //   tower.attack(hostile);
    // }

    var sorted = _.sortBy(targets, (t) => t.ticksToLive)
    var target = sorted[0];
    if (target) {
      this.attack(creep, target);
    } else {
      if (!creep.memory.noRecycle && creep.room.name === creep.memory.room) {
        creep.memory.goRecycle = true;
      }
      // let center = creep.room.getPositionAt(25, 25);
      // if (creep.pos.getRangeTo(center) > 10) {
      //   creep.goTo({ pos: center }, { range: 10 });
      // } else {
      //   creep.memory.stopped = true;
      // }
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
