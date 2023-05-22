const ff = require('helper.friendFoeRecognition');

let fullHealthEquiv = 50000;

module.exports = {
  run: function (tower) {
    let friends = tower.room.find(FIND_MY_CREEPS, {
      filter: (creep) => creep.hits < creep.hitsMax && creep.memory.role !== 'hopper',
    });
    friends = friends.concat(tower.room.find(FIND_MY_POWER_CREEPS, {
      filter: (creep) => creep.hits < creep.hitsMax,
    }));
    let warriors = _.filter(friends, (f) => _.some(f.body, (p) => p.type === ATTACK || p.type === RANGED_ATTACK));

    if (warriors.length > 0) {
      tower.heal(_.sortBy(warriors, (w) => w.pos.getRangeTo(tower))[0]);
      return;
    }

    let hostiles = _.sortBy(
      ff.findHostiles(tower.room),
      (h) => 100 - tower.pos.getRangeTo(h) - 20 * (_.some(h.body, (p) => p.type === HEAL) ? 1 : 0)
    );
    if (hostiles.length > 0) {
      tower.attack(hostiles[0]);
      return;
    }

    if (friends.length > 0) {
      tower.heal(_.sortBy(friends, (f) => f.pos.getRangeTo(tower))[0]);
      return;
    }
    //console.log(tower.room.name);
    if (Memory.rooms[tower.room.name] && Memory.rooms[tower.room.name].mode === 'unclaim') {
      return;
    }
    if (tower.room.storage && tower.room.storage.store.energy < 5000) {
      return;
    }
    // console.log('tow', tower.room.name, tower.room.storage.store.energy)
    if (tower.room.storage.store.energy > 50000) {
      fullHealthEquiv = 100000;
    } else if (tower.room.storage.store.energy > 100000) {
      fullHealthEquiv = 150000;
    } else if (tower.room.storage.store.energy > 200000) {
      fullHealthEquiv = 300000;
    }
    let closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: (s) => s.hits < s.hitsMax && s.hits < fullHealthEquiv,
    });
    if (closestDamagedStructure && tower.energy > tower.energyCapacity * 0.8) {
      tower.repair(closestDamagedStructure);
    }
  },
};

const profiler = require('screeps-profiler');
profiler.registerObject(module.exports, 'tower');
