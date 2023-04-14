const spawnHelper = require("helper.spawning");

module.exports = {
    name: "factoryWorker",
    parts: spawnHelper.makeParts(10, CARRY, 5, MOVE),
    run: function(creep) {
        // console.log('fw', creep.room.name, creep.name);
        let factory = creep.room.ai().factory;
        let storage = creep.room.storage;
        if(creep.memory.importing) {
            if(!this.carryTo(creep, factory.structure)) {
                creep.memory.importing = false;

                let exportResource = _.first(factory.exportableResources());
                if(exportResource) {
                    creep.withdraw(factory.structure, exportResource);
                }
            }
        } else {
            if(!this.carryTo(creep, storage)) {
                creep.memory.importing = true;
                let amount = creep.carryCapacity;
                let factorySpace = Math.max(0, factory.structure.storeCapacity * 0.9 - _.sum(factory.structure.store))

                if (factorySpace < amount) {
                    amount = factorySpace
                }

                let importResource = _.filter(factory.importableResources(), (r) => storage.store[r] > 0)[0];
                // console.log('amount', amount, factorySpace)
                if(importResource) {
                    creep.withdraw(storage, importResource, amount);
                }
            }
        }
    },

    carryTo: function(creep, target) {
        if(creep.pos.isNearTo(target)) {
            if(_.sum(creep.store) == 0) return false;
            creep.transfer(target, _.last(_.keys(creep.store)))
        } else {
            creep.goTo(target);
        }

        return true;
    }
};

const profiler = require("screeps-profiler");
profiler.registerObject(module.exports, 'factoryWorker');
