class TowerStack {
  constructor(memory, towers) {
    this.memory = memory;
    this.towersClass = towers;
  }

  get reloadPos() {
    if (!this.memory.reload) return null;
    return this.towersClass.room.getPositionAt(this.memory.reload[0], this.memory.reload[1]);
  }


  get towers() {
    if (!this._towers) {
      this._towers = _.compact(_.map(this.memory.towers, (id) => Game.getObjectById(id)));
      // TODO: find missing towers
    }

    return this._towers;
  }

  findTowers() {
    this.memory.towers = [];
    this._towers = undefined;

    let relevantTowers = this.towersClass.all;
    for (let tower of relevantTowers) {
      this.memory.towers.push(tower.id);
    }
  }

}


module.exports = class Towers {
  constructor(room) {
    if (!room.memory.towers || !room.memory.towers.hasOwnProperty('towerStack')) {
      room.memory.towers = {
        towerStack: null,
      }}

    this.room = room;
    this.memory = room.memory.towers;
    this.all = room.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType == STRUCTURE_TOWER });
  }

  get towerStack() {
    if (this._towerStack === undefined) {
      if (this.memory.towerStack) {
        this._towerStack = new TowerStack(this.memory.towerStack, this);
      } else {
        this._towerStack = null;
      }
    }

    return this._towerStack;
  }


  get towers() {
    return this.towerStack && this.towerStack.towers;
  }


  updateTowerStack(reload) {
    if (
        !this.towerStack ||
        !this.towerStack.reloadPos ||
        this.towerStack.reloadPos.x !== reload.x ||
        this.towerStack.reloadPos.y !== reload.y
    ) {
      this.memory.towerStack = {
        towers: [],
        reload: [reload.x, reload.y],
      };
      this._towerStack = undefined;
    }

    this.towerStack.findTowers();
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'TowerStack');
