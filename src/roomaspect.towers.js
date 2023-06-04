const spawnHelper = require('helper.spawning');
const reloader = require('role.reloader');
const ff = require('helper.friendFoeRecognition');

let fullHealthEquiv = 50000;
module.exports = class TowersAspect {
  constructor(roomai) {
    this.roomai = roomai;
    this.room = roomai.room;
    this.towers = roomai.towers.all;
    this.reload = roomai.towers.reload;
    this.towerStack = roomai.towers.towerStack;
    this.reloader = this.room.find(FIND_MY_CREEPS, { filter: (c) => c.memory.role == reloader.name });
    this.friends = [];
    this.warriors = [];
    this.hostiles = [];
    this.damaged = [];
  }

  run() {
    this.friends = this.room.find(FIND_MY_CREEPS, {
      filter: (creep) => creep.hits < creep.hitsMax && creep.memory.role !== 'hopper',
    });
    if (!this.friends.length) {
      this.friends = this.friends.concat(
        this.room.find(FIND_MY_POWER_CREEPS, {
          filter: (creep) => creep.hits < creep.hitsMax,
        })
      );
    }

    let towers = this.towers;
    if (this.friends.length > 0) {
      do {
        let tower = towers.shift();
        this.friends = _.sortBy(this.friends, (f) => f.pos.getRangeTo(tower));
        let friend = this.friends.shift();
        tower.heal(friend);
        if (friend.hits < friend.hitsMax) {
          this.friends.unshift(friend);
        }
      } while (this.friends.length && towers.length);

      if (!towers.length) return;
    }
    this.warriors = _.filter(this.friends, (f) => _.some(f.body, (p) => p.type === ATTACK || p.type === RANGED_ATTACK));

    if (this.warriors.length > 0) {
      do {
        let tower = towers.shift();
        this.warriors = _.sortBy(this.warriors, (f) => f.pos.getRangeTo(tower));
        let warrior = this.warriors.shift();
        tower.heal(warrior);
        if (warrior.hits < warrior.hitsMax) {
          this.warriors.unshift(friend);
        }
      } while (this.warriors.length && towers.length);

      if (!towers.length) return;
    }

    this.hostiles = _.sortBy(
      ff.findHostiles(this.room),
      (h) => 100 - this.towerStack.reloadPos.getRangeTo(h) - 20 * (_.some(h.body, (p) => p.type === HEAL) ? 1 : 0)
    );
    if (this.hostiles.length > 0) {
      do {
        let tower = towers.shift();
        this.hostiles = _.sortBy(this.hostiles, (f) => f.pos.getRangeTo(tower));
        let hostile = this.hostiles.shift();
        tower.attack(hostile);
        if (hostile.hits > 0) {
          this.hostiles.unshift(hostile);
        }
      } while (this.hostiles.length && towers.length);

      if (!towers.length) return;
    }

    if (Memory.rooms[this.room.name] && Memory.rooms[this.room.name].mode === 'unclaim') {
      return;
    }
    if (this.room.storage && this.room.storage.store.energy < 5000) {
      return;
    }
    towers = _.filter(towers, (tower) => tower.energy > tower.energyCapacity * 0.8);
    // console.log('tow', tower.room.name, tower.room.storage.store.energy)
    // if (tower.room.storage.store.energy > 50000) {
    //   fullHealthEquiv = 100000;
    // } else if (tower.room.storage.store.energy > 100000) {
    //   fullHealthEquiv = 150000;
    // } else if (tower.room.storage.store.energy > 200000) {
    //   fullHealthEquiv = 300000;
    // } else if (tower.room.storage.store.energy > 300000) {
    //   fullHealthEquiv = 1000000;
    // }
    if (towers.length) {

      // console.log('this.towerStack', JSON.stringify(this.towerStack.reloadPos))
      this.damaged = this.room.find(FIND_STRUCTURES, {
        filter: (s) => s.hits < s.hitsMax && s.hits < 5000,
      });

      // console.log('this.damaged', JSON.stringify(this.damaged))

      if (!this.damaged.length) return;

      do {
        let tower = towers.shift();

        this.damaged = _.sortBy(this.damaged, (f) => f.pos.getRangeTo(tower));
        let cons = this.damaged.shift();
        tower.repair(cons);
        if (cons.hits < cons.hitsMax && cons.hits < 5000) {
          this.damaged.unshift(cons);
        }
      } while (this.damaged.length && towers.length);

      if (!towers.length) return;

      if (!this.damaged.length) {
        this.damaged = this.room.find(FIND_STRUCTURES, {
          filter: (s) => s.hits < s.hitsMax && s.hits < fullHealthEquiv,
        });
      }

      do {
        let tower = towers.shift();

        this.damaged = _.sortBy(this.damaged, (f) => f.pos.getRangeTo(tower));
        let cons = this.damaged.shift();
        tower.repair(cons);
        if (cons.hits < cons.hitsMax && cons.hits < fullHealthEquiv) {
          this.damaged.unshift(cons);
        }
      } while (this.damaged.length && towers.length);

    }
  }

  findFriends() {
    this.friends = tower.room.find(FIND_MY_CREEPS, {
      filter: (creep) => creep.hits < creep.hitsMax && creep.memory.role !== 'hopper',
    });
    if (!this.friends.length) {
      this.friends = friends.concat(
        tower.room.find(FIND_MY_POWER_CREEPS, {
          filter: (creep) => creep.hits < creep.hitsMax,
        })
      );
    }
  }

  healFriend() {
    if (this.friends.length > 0) {
      tower.heal(_.sortBy(friends, (f) => f.pos.getRangeTo(tower))[0]);
      return;
    }
  }
  runFactory() {
    if (!this.factory.product) return;
    if (this.factory.structure.cooldown > 0) return;

    let product = this.factory.nextProduction();
    if (!product) return;

    this.factory.structure.produce(product);
  }

  buildWorkers() {
    if (!this.roomai.canSpawn()) return;
    if (this.room.storage.store.energy < 1000) return;

    let needToWork = this.factory.product; // TODO: figure out whether spawning is necessary
    if (needToWork) {
      if (spawnHelper.numberOfLocalCreeps(this.roomai, factoryWorker.name) >= 1) return;

      this.roomai.spawn(factoryWorker.parts, { role: factoryWorker.name });
    }
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'TowersAspect');
