const logistic = require('helper.logistic');
const roads = require('construction.roads');
const spawnHelper = require('helper.spawning');

var carrier = require('role.carrier');
var upgrader = require('role.upgrader');

const specialRoom = 'W5N3'

module.exports = class ControllerAspect {
  constructor(roomai) {
    this.roomai = roomai;
    this.room = roomai.room;
    this.controller = this.room.controller;
  }

  run() {
    let link = this.roomai.links.controller();
    if (link && this.roomai.links.storage()) {
      if (link.store.energy / link.store.getCapacity(RESOURCE_ENERGY) <= 0.5) {
        this.roomai.links.requestEnergy(link, 1);
      }
    } else if (logistic.storeFor(this.controller)) {
      this.buildCarriers();
    }

    this.buildUpgraders();

    if (this.roomai.intervals.buildStructure.isActive()) {
      let storagePos = this.room.storagePos();
      let store = logistic.storeFor(this.controller);
      if (storagePos && store) {
        roads.buildRoadFromTo(this.room, storagePos, store.pos);
        roads.buildRoadAround(this.room, store.pos);
      }
    }

    if (this.roomai.mode === 'gcl') {
      this.roomai.labs.requestBoost('XGH2O', 20);
    } else {
      this.roomai.labs.unloadBoost('XGH2O');
    }
  }

  buildUpgraders() {
    //TODO не спавнить если нет линкКоллектора
    const mult = this.room.name == specialRoom ? 3 : 1;
    let parts = spawnHelper.bestAvailableParts(
      this.room,
      upgrader.configsForEnergyPerTick(Math.floor((this.energyPerTick() / this.upgraderCount()) * mult))
    );
    let spawnDuration = spawnHelper.spawnDuration(parts);
    let existingUpgraders = _.filter(
      spawnHelper.localCreepsWithRole(this.roomai, upgrader.name),
      (c) => !c.ticksToLive || c.ticksToLive > spawnDuration
    );
    let uCount = this.upgraderCount();
    let hCount = spawnHelper.localCreepsWithRole(this.roomai, 'harvester').length;
    // console.log('hCount', hCount, uCount)
    if (uCount > hCount) {
      return;
    }
    if (!this.roomai.canSpawn() || existingUpgraders.length >= this.upgraderCount()) {
      return;
    }

    if (this.room.storage && this.room.storage.store.energy < 10000 && this.controller.ticksDowngraded() < 1000) {
      return; // strictly conserve energy when supply is very low
    }

    this.roomai.spawn(parts, {
      role: upgrader.name,
      room: this.room.name,
      energy: this.room.energyCapacityAvailable,
      renew: true
    });
  }

  buildCarriers() {
    if (!this.roomai.canSpawn()) return;
    const mult = this.room.name == specialRoom ? 3 : 1;

    let controllerStore = logistic.storeFor(this.controller);
    let existingCarriers = spawnHelper.localCreepsWithRole(this.roomai, carrier.name);
    existingCarriers = _.filter(existingCarriers, (c) => c.memory.destination == this.controller.id);
    if (this.room.storage) {
      if (existingCarriers.length > 0) return;
      this.spawnCarrier(this.room.storage);
    } else {
      for (let source of this.room.find(FIND_SOURCES)) {
        let sourceStore = logistic.storeFor(source);
        if (controllerStore === sourceStore) continue;

        if (!_.any(existingCarriers, (m) => m.memory.source == source.id) && sourceStore) {
          this.spawnCarrier(source, 1000 * mult);
        }
      }
    }
  }

  spawnCarrier(source, capacityCap) {
    // avoid spawning overly large carriers
    let capacity = logistic.distanceByPath(source, this.controller) * 2 * this.energyPerTick();
    if (capacityCap) capacity = Math.min(capacity, capacityCap);

    var parts = spawnHelper.bestAvailableParts(this.room, carrier.configsForCapacity(capacity));
    var memory = {
      role: carrier.name,
      source: source.id,
      destination: this.controller.id,
      resource: RESOURCE_ENERGY,
    };

    this.roomai.spawn(parts, memory);
  }

  energyPerTick() {
    if (this.roomai.defense.defcon >= 4) return 1;

    let energy = 10;

    const mult = this.room.name == specialRoom ? 4 : 1;

    if (this.room.storage) {
      if (this.room.storage.store.energy > this.highLimit) {
        energy = 40 * mult;
      } else if (this.room.storage.store.energy > this.normalLimit) {
        energy = 20 * mult;
      } else if (this.room.storage.store.energy < this.lowLimit) {
        energy = 4 * mult;
      }
    }

    if (this.room.controller.level == 8) {
      let maxOutput = 15;
      // TODO: provide different prebuilt configurations depending on mode
      if (this.roomai.mode === 'store') maxOutput = 1;
      if (this.roomai.mode === 'transit') maxOutput = 1;
      if (this.roomai.mode !== 'normal' && this.roomai.mode !== 'gcl') maxOutput = 4;
      if (this.roomai.mode !== 'gcl' && Memory.hibernateGclFarming) maxOutput = 1;
      return _.min([maxOutput, energy]);
    } else {
      if (this.roomai.mode === 'transit' && this.room.controller.level < 3) {

      }
      if (this.roomai.mode === 'transit') {
        if (this.room.controller.level >= 3) {
          energy = 1;
        } else {
          energy = 40;
        }
      }
      return energy;
    }
  }

  upgraderCount() {
    if (this.roomai.mode === 'transit') {
      if (this.room.controller.level >= 3) {
        return 1;
      } else{
        return 4;
      }
    }
    if (this.room.controller.level == 8) return 1;
    if (this.roomai.defense.defcon >= 4) return 1;

    if (this.room.storage) {
      if (this.room.storage.store.energy < this.lowLimit) {
        return 1;
      }

      if (this.room.controller.level == 7 && this.room.storage.store.energy < this.highLimit) {
        return 1;
      }
    } else if (this.room.controller.level >= 4) {
      // ensure spawn capacity for builders is available when storage needs to be built
      return 1;
    }
    // if (this.room.name == 'W25S9') {return 3}

    return 2;
  }

  get lowLimit() {
    return 15000;
  }

  get normalLimit() {
    if (this.roomai.mode === 'gcl') return 150000;

    return 200000;
  }

  get highLimit() {
    if (this.roomai.mode === 'gcl') return 250000;

    return 500000;
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'ControllerAspect');
