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
    this.extra = [];
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
    if (towers.length === 0) {
      return;
    }
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
        let ignore = false;
        if (_.every(hostile.body, (p) => p.type === MOVE)) {
          ignore = true;
        }
        if (hostile.owner.username === 'RemarkablyAverage') {
          ignore = false
        }
        if (!ignore) {
          tower.attack(hostile);
        }
        if (hostile.hits > 0) {
          this.hostiles.unshift(hostile);
        }
        // console.log('d3', towers.length)
      } while (this.hostiles.length && towers.length);

      if (!towers.length) return;
    }

    if (Memory.rooms[this.room.name] && Memory.rooms[this.room.name].mode === 'unclaim') {
      return;
    }
    // if (this.room.storage && this.room.storage.store.energy < 4500) {
    //   return;
    // }
    towers = _.filter(towers, (tower) => tower.energy > tower.energyCapacity * 0.8);
    // console.log('tow', tower.room.name, tower.room.storage.store.energy)
    if (this.room.storage && this.room.storage.my && this.room.storage.store.getFreeCapacity() < 10000) {
      console.log('Storage in room ' + this.room.name + ' is overfilled! Building walls!');
      if (this.room.storage.store.energy > 400000) {
        fullHealthEquiv = 10000000;
      } else if (this.room.storage.store.energy > 300000) {
        fullHealthEquiv = 5000000;
      } else if (this.room.storage.store.energy > 200000) {
        fullHealthEquiv = 300000;
      } else if (this.room.storage.store.energy > 100000) {
        fullHealthEquiv = 150000;
      } else if (this.room.storage.store.energy > 50000) {
        fullHealthEquiv = 100000;
      }

    }
    if (towers.length) {
      // console.log('this.towerStack', JSON.stringify(this.towerStack.reloadPos))
      this.extra = this.room.find(FIND_STRUCTURES, {
        filter: (s) => s.hits < s.hitsMax && s.hits < 500,
      });

      // console.log('this.damaged', JSON.stringify(this.damaged))

      if (this.extra.length) {
        do {
          let tower = towers.shift();

          this.extra = _.sortBy(this.extra, (f) => f.pos.getRangeTo(tower));
          let cons = this.extra.shift();
          tower.repair(cons);
          if (cons.hits < cons.hitsMax && cons.hits < 4500) {
            this.extra.unshift(cons);
          }
        } while (this.extra.length && towers.length);
      }

      if (!towers.length) return;

      this.damaged = this.room.find(FIND_STRUCTURES, {
        filter: (s) => s.hits < s.hitsMax && s.hits < 4500,
      });

      // console.log('this.damaged', JSON.stringify(this.damaged))

      if (this.damaged.length) {
        do {
          let tower = towers.shift();

          this.damaged = _.sortBy(this.damaged, (f) => f.pos.getRangeTo(tower));
          let cons = this.damaged.shift();
          tower.repair(cons);
          if (cons.hits < cons.hitsMax && cons.hits < 4500) {
            this.damaged.unshift(cons);
          }
        } while (this.damaged.length && towers.length);
      }

      if (!towers.length) return;

      if (!this.damaged.length) {
        this.damaged = this.room.find(FIND_STRUCTURES, {
          filter: (s) => s.hits < s.hitsMax && s.hits < fullHealthEquiv,
        });
      }

      if (this.damaged.length) {
        do {
          let tower = towers.shift();

          this.damaged = _.sortBy(this.damaged, (f) => f.pos.getRangeTo(tower));
          let cons = this.damaged.shift();
          tower.repair(cons);
          if (cons && cons.hits < cons.hitsMax && cons.hits < fullHealthEquiv) {
            this.damaged.unshift(cons);
          }
        } while (this.damaged.length && towers.length);
      }
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
