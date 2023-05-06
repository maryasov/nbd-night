var spawnHelper = require('helper.spawning');
var carrier = require('role.carrier');
var harvester = require('role.harvester');
var linkCollector = require('role.linkCollector');
var miner = require('role.miner');
var logistic = require('helper.logistic');

module.exports = class SuppliesAspect {
  constructor(roomai) {
    this.roomai = roomai;
    this.room = roomai.room;
    this.linksEnabled = this.room.storage && this.roomai.links.storage() && this.room.controller.level > 4;
  }

  run() {
    // Choosing source far away from upgraders to avoid conflict
    //todo near spawn
    let spawns = this.room.find(FIND_MY_SPAWNS);
    let targs = this.room.controller;
    if (spawns) {
      targs = spawns[0];
    }
    // console.log('new harv', JSON.stringify(spawns[0]))
    let source = _.sortBy(this.room.find(FIND_SOURCES), (s) => s.pos.getRangeTo(targs))[0];
    this.buildHarvesters(source);

    if (this.linksEnabled) {
      let collector = spawnHelper.localCreepsWithRole(this.roomai, linkCollector.name)[0];
      if (!collector) {
        this.buildLinkCollector();
      }
    }

    this.buildCollectors();
  }

  buildHarvesters(source) {
    var partConfigs = harvester.carryConfigs;
    var partConfigsMine = harvester.miningConfigs;
    var neededHarvesters = 2;
    if (this.room.controller && this.room.controller.level == 5) {
      neededHarvesters = 3;
    }
    if (!logistic.storeFor(source) && !(this.room.storage && this.room.storage.store.energy)) {
      partConfigs = harvester.miningConfigs;
      neededHarvesters = 3;
    }
    if (this.roomai.mode === 'store') {
      neededHarvesters = 1;
    }
    // console.log('need', neededHarvesters, partConfigs)
    var hz = spawnHelper.numberOfLocalCreeps(this.roomai, harvester.name);
    if (!this.roomai.canSpawnHarv() || hz >= neededHarvesters) {
      // console.log('ret', !this.roomai.canSpawnHarv() , hz , neededHarvesters)
      return;
    }

    var parts = null;
    var numHarv = spawnHelper.numberOfLocalCreeps(this.roomai, harvester.name);
    var ignoreReserved = false;
    if (numHarv == 0) {
      if (Memory.rooms[this.room.name].failBuildHarvester > 20) {
        parts = spawnHelper.bestAffordableParts(this.room, partConfigsMine);
        ignoreReserved = true;
      } else {
        parts = spawnHelper.bestAffordableParts(this.room, partConfigs);
      }
      // console.log('spawn harv', numHarv, JSON.stringify(parts));
    } else {
      parts = spawnHelper.bestAvailableParts(this.room, partConfigs);
      // console.log('spawn harv', numHarv, parts);
    }

    var memory = { role: harvester.name, source: source.id };
    if (ignoreReserved) {
      memory.ignoreReserved = ignoreReserved;
    }
    var res = this.roomai.spawn(parts, memory);
    // console.log('res h spawn', res)

    if (res !== 0 && numHarv === 0) {
      if (Memory.rooms[this.room.name].failBuildHarvester === undefined) {
        Memory.rooms[this.room.name].failBuildHarvester = 0;
      }
      Memory.rooms[this.room.name].failBuildHarvester = Memory.rooms[this.room.name].failBuildHarvester + 1;
    } else {
      delete Memory.rooms[this.room.name].failBuildHarvester;
    }
  }

  buildCollectors() {
    let storage = this.room.storage;
    if (!storage) return;

    let sources = this.room.find(FIND_SOURCES);

    // FIXME: ordering duplicated with miners
    let roomai = this.roomai;
    sources = _.sortBy(sources, (s) => s.pos.getRangeTo(roomai.spawns.primary));

    let existingCollectors = spawnHelper.localCreepsWithRole(this.roomai, carrier.name);
    let existingMiners = spawnHelper.localCreepsWithRole(this.roomai, miner.name);
    for (let source of sources) {
      if (!this.roomai.canSpawn()) continue;
      if (logistic.storeFor(source) === storage) continue;
      if (_.any(existingCollectors, (m) => m.memory.source == source.id && m.memory.destination == storage.id))
        continue;
      if (this.linksEnabled && this.roomai.links.linkAt(source)) continue;

      if (_.any(existingMiners, (m) => m.memory.target == source.id)) {
        // let parts = spawnHelper.bestAffordableParts(this.room, carrier.configsForCapacity(this.neededCollectorCapacity(source)), true);
        let parts = spawnHelper.bestAvailableParts(
          this.room,
          carrier.configsForCapacity(this.neededCollectorCapacity(source))
        );
        this.roomai.spawn(parts, {
          role: carrier.name,
          source: source.id,
          destination: storage.id,
          resource: RESOURCE_ENERGY,
          home: this.room.name,
          renew: true,
        });
      }
    }
  }

  neededCollectorCapacity(source) {
    // back and forth while 10 energy per tick are generated
    var needed = logistic.distanceByPath(source, this.room.storage) * 60;
    // adding at least one extra CARRY to make up for inefficiencies
    return needed + 60;
  }

  buildLinkCollector() {
    if (!this.roomai.canSpawn()) {
      return;
    }

    this.roomai.spawn(linkCollector.parts, { role: linkCollector.name });
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'SuppliesAspect');
