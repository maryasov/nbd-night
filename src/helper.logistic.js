var storeStructures = [STRUCTURE_CONTAINER, STRUCTURE_LINK, STRUCTURE_STORAGE, STRUCTURE_TERMINAL];

module.exports = {
  obtainResults: {
    withdrawn: 1,
    harvested: 2,
    moving: 3,
    pickedUp: 4,
    empty: 5,
  },
  obtainEnergy: function (creep, source, considerStorage, full = false) {
    this.pickupSpareEnergy(creep);
    var terminalStore = creep.room.terminal;
    var getFromTerminal = false;
    var need = creep.carryCapacity - _.sum(creep.store);
    // console.log('need', creep.memory.role, need);
    var currStore;
    if (
      terminalStore &&
      creep.room.storage &&
      creep.room.storage.store.energy < 3000 &&
      terminalStore.store.energy > creep.room.storage.store.energy
    ) {
      getFromTerminal = true;
    }

    if (!creep.room.storage) {
      getFromTerminal = true;
    }

    if (!creep.room.terminal && !creep.room.storage) {
      let target;
      let targets = [];
      targets = targets.concat(
        creep.room.find(FIND_STRUCTURES, {
          filter: (s) =>
            storeStructures.includes(s.structureType) &&
            _.sum(s.store) > 0 /*(creep.storeCapacity - _.sum(creep.store))*/,
        })
      );
      if (full) {
        targets = _.filter(targets, (t) => t.store.energy > need);
      }
      if (targets.length > 0) {
        var targetsByDistance = _.sortBy(targets, (t) => creep.pos.getRangeTo(t));
        // console.log('dist', JSON.stringify(targetsByDistance))
        target = targetsByDistance[0];
        // console.log('trg', target);
        if (target) {
          var res = this.obtainEnergyFromStore(creep, target);
          return;
        }
      }
    }

    if (considerStorage) {
      currStore = getFromTerminal ? terminalStore : creep.room.storage;
      var result = this.obtainEnergyFromStore(creep, currStore);
      // console.log('consider', creep.name, creep.room.name, currStore, result);
      if (result && result !== this.obtainResults.empty) {
        return result;
      }
    }

    if (!source) return null;

    var store = getFromTerminal ? terminalStore : this.storeFor(source);
    var otherStore;
    // console.log('1 store', store.store.energy, JSON.stringify(creep))
    if (store && store.store.energy < creep.carryCapacity) {
      var sources = creep.room.find(FIND_SOURCES);
      var otherSources = _.filter(sources, (s) => s.id !== source.id);
      // console.log('sources', source.id,  JSON.stringify(otherSources))
      if (otherSources.length > 0) {
        otherStore = this.storeFor(otherSources[0]);
        // console.log('2 store', otherStore.store.energy, creep.storeCapacity)
        if (otherStore && otherStore.store.energy > creep.carryCapacity) {
          store = otherStore;
        }
      }
    }
    currStore = getFromTerminal ? terminalStore : store;
    var result = this.obtainEnergyFromStore(creep, getFromTerminal ? terminalStore : store);
    // console.log('obtain', creep.name, creep.room.name, currStore, result);
    if ((!result || result === this.obtainResults.empty) && _.find(creep.body, (p) => p.type === WORK)) {
      result = creep.harvest(source);
      if (result == OK) {
        return this.obtainResults.harvested;
      } else if (result == ERR_NOT_IN_RANGE) {
        creep.goTo(source);
        return this.obtainResults.moving;
      }
    } else if (result === this.obtainResults.empty) {
      if (!creep.pos.isNearTo(store)) {
        creep.goTo(store);
        return this.obtainResults.moving;
      }
    } else {
      return result;
    }

    return null; // something unexpected happened
  },
  obtainEnergyFromStore: function (creep, store) {
    if (store) {
      if (store.store.energy === 0) return this.obtainResults.empty;

      if (creep.pos.isNearTo(store)) {
        if (creep.withdraw(store, RESOURCE_ENERGY) === OK) return this.obtainResults.withdrawn;
      } else {
        creep.goTo(store);
        return this.obtainResults.moving;
      }
    }

    return null;
  },
  pickupSpareEnergy: function (creep) {
    var resources = creep.pos.lookFor(LOOK_ENERGY);
    // TODO: fix to work with any resource (and not pickup resource even if we want energy)
    if (resources.length > 0 && resources[0].resourceType == RESOURCE_ENERGY) {
      return creep.pickup(resources[0]) == OK;
    }

    return false;
  },
  pickupRecycled: function (creep) {
    // let extentionsBlock =
    // let tombstones = this.room.find(FIND_TOMBSTONES, { filter: (t) => _.sum(t.store) > 0 });
    //
    // if(_.any(tombstones, (r) => {
    //     const energy = r.store[RESOURCE_ENERGY];
    //     const other = _.sum(r.store) - energy
    //     return energy >= 300 || other >= 100
    // })) {
    //     spawnPicker = true
    // }
    // return false;
  },
  storeFor: function (target, includeConstructions, structureType) {
    if (!target) return null;
    if (storeStructures.includes(target.structureType) && (!structureType || structureType == target.structureType))
      return target;

    if (!includeConstructions && !structureType) {
      var stores = target.room.memory.stores;
      if (stores) {
        var store = Game.getObjectById(stores[target.id]);
        if (store) return store;
      }
    }

    var structures = target.pos.findInRange(FIND_STRUCTURES, 2);
    var store = _.find(
      structures,
      (r) => storeStructures.includes(r.structureType) && (!structureType || structureType == r.structureType)
    );
    if (store) {
      target.room.memory.stores = target.room.memory.stores || {};
      target.room.memory.stores[target.id] = store.id;
      return store;
    }

    if (includeConstructions) {
      var constructions = target.pos.findInRange(FIND_CONSTRUCTION_SITES, 2);
      return _.find(
        constructions,
        (r) => storeStructures.includes(r.structureType) && (!structureType || structureType == r.structureType)
      );
    } else {
      return null;
    }
  },
  distanceByPath: function (source, destination) {
    if (Memory.distances && Memory.distances[source.id] && Memory.distances[source.id][destination.id]) {
      return Memory.distances[source.id][destination.id];
    }

    // TODO: consider some kinds of obstacles?
    var pathResult = PathFinder.search(source.pos, [{ pos: destination.pos, range: 1 }]);
    var path = pathResult.path;
    Memory.distances = Memory.distances || {};
    Memory.distances[source.id] = Memory.distances[source.id] || {};
    Memory.distances[source.id][destination.id] = path.length;
    return path.length;
  },
  cleanupCaches: function () {
    for (let sourceId in Memory.distances) {
      if (Game.getObjectById(sourceId)) {
        let current = Memory.distances[sourceId];
        for (let destinationId in current) {
          if (!Game.getObjectById(destinationId)) {
            delete current[destinationId];
          }
        }
      } else {
        delete Memory.distances[sourceId];
      }
    }

    for (let roomMemory of _.values(Memory.rooms)) {
      if (!roomMemory.stores) continue;

      for (let storeId in roomMemory.stores) {
        if (!Game.getObjectById(storeId)) {
          delete roomMemory.stores[storeId];
        }
      }
    }
  },
};

const profiler = require('screeps-profiler');
profiler.registerObject(module.exports, 'logistics');
