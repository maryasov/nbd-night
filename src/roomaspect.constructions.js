const BuildProxy = require('construction.buildproxy');

module.exports = class ConstructionsAspect {
  constructor(roomai) {
    this.roomai = roomai;
    this.room = roomai.room;
  }

  run(lite) {
    if (lite) {
      this.roomai.constructions.addBuildings();
      this.roomai.constructions.removeBuildings();

      for (let building of this.roomai.constructions.buildings) {
        if (!Memory.noOutline && this.roomai.mode !== 'store') {
          building.outline();
        }
      }

      this.roomai.constructions.drawDebugMarkers();
    } else {
      let buildProxy = new BuildProxy(this.room);
      for (let building of this.roomai.constructions.buildings) {
        if (this.roomai.intervals.buildStructure.isActive()) {
          building.build(buildProxy);
        }
      }

      if (this.roomai.intervals.buildStructure.isActive()) {
        buildProxy.commit();
      }
    }
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'ConstructionsAspect');
