const movement = require('helper.movement');
const spawnHelper = require('helper.spawning');
const recycle = require('helper.recycle');

module.exports = {
  name: 'powerFarmer',
  partsBoost: spawnHelper.makeParts(20, MOVE, 20, ATTACK),
  parts: spawnHelper.makeParts(20, MOVE, 20, ATTACK),
  run: function (creep) {
    if (recycle.check(creep)) return;
    if (_.some(creep.body, (p) => p.type === ATTACK)) {
      // console.log('accept');
      if (boosting.accept(creep, 'XUH2O')) return;
    }

    if (creep.memory.returningHome) {
      this.returnHome(creep);
    } else {
      if (creep.room.name !== creep.memory.target) {
        movement.moveToRoom(creep, creep.memory.target);
        return;
      }

      let target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (s) => s.structureType == STRUCTURE_POWER_BANK,
      });

      if (target) {
        this.attackBank(creep, target);
      } else {
        this.clearPath(creep);
      }
    }
  },
  attackBank: function (creep, target) {
    let returnDamage = POWER_BANK_HIT_BACK * ATTACK_POWER * 4 * creep.getActiveBodyparts(ATTACK);

    // console.log('hit', returnDamage, creep.hits, POWER_BANK_HIT_BACK * ATTACK_POWER * creep.getActiveBodyparts(ATTACK));

    if (returnDamage >= creep.hits) return;

    if (creep.attack(target) == ERR_NOT_IN_RANGE) {
      creep.goTo(target);
    }
  },
  clearPath: function (creep) {
    let resources = creep.room.find(FIND_DROPPED_RESOURCES);
    if (resources.length === 0) return;
    creep.fleeFrom(resources, 4);
  },
  returnHome: function (creep) {
    let home = Game.rooms[creep.memory.home];
    // console.log('scoop storage', home.storage, JSON.stringify(home))
    let target = home && home.storage;
    creep.goTo(target, { ignoreRoads: false, avoidHostiles: true });
  },
};

const profiler = require('screeps-profiler');
const boosting = require('./helper.boosting');
profiler.registerObject(module.exports, 'powerFarmer');
