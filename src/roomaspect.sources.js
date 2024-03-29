const logistic = require('helper.logistic');
const miner = require('role.miner');
const roads = require('construction.roads');
const spawnHelper = require('helper.spawning');

const energyExcessThreshold = 50000;

module.exports = class SourcesAspect {
  constructor(roomai) {
    this.roomai = roomai;
    this.room = roomai.room;
    this.sources = this.room.find(FIND_SOURCES);

    // order sources by distance to primary spawn, to ensure that aspects
    // work on that source first
    this.sources = _.sortBy(this.sources, (s) => s.pos.getRangeTo(roomai.spawns.primary));
  }

  run() {
    //if (this.roomai.mode === "store") return;
    this.buildRoads();
    this.buildMiners();
  }

  buildRoads() {
    let storagePos = this.room.storagePos();
    if (!this.roomai.intervals.buildStructure.isActive() || !storagePos) {
      return;
    }

    for (let source of this.sources) {
      let store = logistic.storeFor(source);
      if (!store) continue;

      roads.buildRoadFromTo(this.room, storagePos, store.pos);
    }
  }

  buildMiners() {
    if (!this.roomai.canSpawn()) {
      return;
    }

    let hasExcessEnergy =
      this.roomai.trading.requiredExportFromRoom(RESOURCE_ENERGY, { showExcess: true }) >= energyExcessThreshold;
    if (hasExcessEnergy) return;

    let idealParts = spawnHelper.bestAvailableParts(this.room, miner.energyConfigs());
    let minimalParts = spawnHelper.bestAffordableParts(this.room, miner.energyConfigs(), true);
    let spawnDuration = spawnHelper.spawnDuration(idealParts);

    let existingMiners = spawnHelper.localCreepsWithRole(this.roomai, miner.name);
    let longLivingMiners = _.filter(existingMiners, (c) => !c.renew && (!c.ticksToLive || c.ticksToLive > spawnDuration));
    let fullEnergy = this.room.energyAvailable == this.room.energyCapacityAvailable
    for (let source of this.sources) {
      let hasOtherMener = _.any(existingMiners, (m) => m.memory.target !== source.id)
      //TODO разобраться со слабыти майнерами
      if (!_.any(longLivingMiners, (m) => m.memory.target == source.id)) {

        let ideal = fullEnergy || hasOtherMener || _.any(existingMiners, (m) => m.memory.target == source.id)
        let parts = ideal ? idealParts : minimalParts;
        console.log('miner', ideal, JSON.stringify(parts))
        let memory = {
          role: miner.name,
          target: source.id,
          energy: this.room.energyCapacityAvailable,
          ...!ideal?{affordable: true}:{},
          resource: RESOURCE_ENERGY,
          renew: true,
        };

        this.roomai.spawn(parts, memory);
      }
    }
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'SourcesAspect');
