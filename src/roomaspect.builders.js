var spawnHelper = require('helper.spawning');
var builder = require('role.builder');

module.exports = class BuildersAspect {
  constructor(roomai) {
    this.roomai = roomai;
    this.room = roomai.room;
  }

  run() {
    if (Memory.rooms[this.room.name] && Memory.rooms[this.room.name].mode === 'unclaim') {
      return;
    }

    if (
      !this.roomai.canSpawn() ||
      spawnHelper.numberOfLocalCreeps(this.roomai, builder.name) >= this.numberOfBuilders()
    ) {
      return;
    }

    let configs = builder.configs(this.numberOfWorkParts())
    let parts = spawnHelper.bestAvailableParts(this.room, configs);
    // console.log('configs', JSON.stringify(configs))
    this.roomai.spawn(parts, {
      role: builder.name,
      energy: this.room.energyCapacityAvailable,
      room: this.room.name
    });
  }

  numberOfWorkParts() {
    if (Memory.simpleBuilders && this.constructionsSimple) {
      return 1;
    } else {
      if (this.constructionMass >= 20000) {
        return 20;
      } else {
        return 8;
      }
    }
  }

  numberOfBuilders() {
    if (this.roomai.mode === 'store') {
      if (this.constructionMass > 0) {
        return 1;
      } else {
        return 0;
      }
    } else {
      if (this.constructionMass >= 5000) {
        return 2;
      } else if (this.constructionMass > 0) {
        return 1;
      } else {
        return 0;
      }
    }
  }

  get constructionMass() {
    if (this._constructionMass === undefined) {
      this._constructionMass = _.sum(
        this.room.find(FIND_MY_CONSTRUCTION_SITES),
        (cs) => cs.progressTotal - cs.progress
      );
    }

    return this._constructionMass;
  }

  get constructionsSimple() {
    const cons = this.room.find(FIND_MY_CONSTRUCTION_SITES)
    const simple = _.every(cons, c=> c.structureType === STRUCTURE_RAMPART || c.structureType === STRUCTURE_WALL)

    return simple;
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'BuildersAspect');
