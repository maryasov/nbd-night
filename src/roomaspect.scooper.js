const spawnHelper = require('helper.spawning');
const picker = require('role.picker');

module.exports = class ScooperAspect {
  constructor(roomai) {
    this.roomai = roomai;
    this.room = roomai.room;
  }

  run() {
    if (!this.roomai.canSpawn() || spawnHelper.numberOfCreepsWithProps(picker.name, {home: this.room.name}) >= 1) return;
    if (this.roomai.defense.defcon >= 2) return;

    let spawnPicker = false;

    let resources = this.room.find(FIND_DROPPED_RESOURCES);
    if (_.any(resources, (r) => (r.resourceType === RESOURCE_ENERGY ? r.amount >= 300 : r.amount >= 100))) {
      spawnPicker = true;
    }

    let tombstones = this.room
      .find(FIND_TOMBSTONES, { filter: (t) => _.sum(t.store) > 0 })
      .concat(this.room.find(FIND_RUINS, { filter: (t) => _.sum(t.store) > 0 }));

    if (
      _.any(tombstones, (r) => {
        const energy = r.store[RESOURCE_ENERGY];
        const other = _.sum(r.store) - energy;
        return energy >= 300 || other >= 100;
      })
    ) {
      spawnPicker = true;
    }

    if (spawnPicker) {
      this.roomai.spawn(spawnHelper.bestAvailableParts(this.room, picker.configs(500)), {
        role: picker.name,
        home: this.room.name,
        target: this.room.name,
        renew: true,
      });
    }
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'ScooperAspect');
