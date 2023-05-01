const logistic = require('helper.logistic');
const profitVisual = require("visual.roomProfit");
const renew = require('helper.renew');

module.exports = {
    name: "carrier",
    partConfigs: [
        [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
        [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
        [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
        [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
        [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
        [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
        [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
        [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
        [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
        [CARRY, CARRY, MOVE]
    ],
    configsForCapacity: function(capacity, options) {
        var workParts = (options && options.workParts) || 0;
        var configs = [];
        for(var carries = Math.max(2, Math.ceil(capacity / 50)); carries >= 2; carries -= 1) {
            let config = Array(workParts).fill(WORK).concat(Array(carries).fill(CARRY)).concat(Array(Math.ceil((carries + workParts) / 2)).fill(MOVE));
            // maximum creep size is 50 parts
            if(config.length <= 50) configs.push(config);
        }

        return configs;
    },
    run: function(creep) {
        if (renew.check(creep)) return;
        if(creep.memory.resource == RESOURCE_ENERGY) {
            logistic.pickupSpareEnergy(creep);
        }

        // if(creep.body[0].type === CARRY) {
        //     if(boosting.accept(creep, "XKH2O", "KH2O")) return;
        // }

        if(_.sum(creep.store) > 0 && !this.shouldWait(creep)) {
            if(this.deliver(creep)) this.pickup(creep);
        }
        else {
            if(this.pickup(creep)) this.deliver(creep);
        }
    },
    deliver: function(creep) {
        if(creep.memory.selfSustaining && !(creep.room.controller && creep.room.controller.owner)) {
            var road = _.find(creep.pos.lookFor(LOOK_STRUCTURES), (s) => s.structureType == STRUCTURE_ROAD);
            if(road) {
                if(road.hits / road.hitsMax <= 0.6) {
                    creep.repair(road);
                }
            } else if(creep.pos.x > 0 && creep.pos.x < 49 && creep.pos.y > 0 && creep.pos.y < 49) {
                if(this.buildRoad(creep)) {
                    return false; // stop on pending construction sites
                };
            }
        }

        var target = logistic.storeFor(this.destination(creep)) || this.destination(creep);
        // console.log('target', creep.name, JSON.stringify(target))
        let transferResult;
        transferResult = creep.transfer(target, creep.memory.resource);


        // console.log('tr', JSON.stringify(transferResult))
        if(transferResult == OK) {
            creep.memory.waitStart = null;
            if (creep.memory.clearResource) {
                delete creep.memory.resource;
            }
            if(creep.memory.registerRevenueFor && creep.memory.resource == RESOURCE_ENERGY) {
                // assuming we always transfer all our energy
                profitVisual.addRevenue(creep.memory.registerRevenueFor, creep.store.energy);
            }

            return true;
        } else if(transferResult == ERR_NOT_IN_RANGE) {
            creep.goTo(target);
        }
    },
    pickup: function(creep) {
        // TODO: also collect raw resources lying around the source
        if(!this.source(creep)) return;
        let target = this.source(creep).isCreep ? this.source(creep) : (logistic.storeFor(this.source(creep)) || this.source(creep));

        if(creep.pos.isNearTo(target)) {
            let result = this.withdraw(creep, target);
            if(result == OK) {
                return this.startWait(creep);
            }
        } else {
            creep.goTo(target);
        }
    },
    buildRoad: function(creep) {
        var constructionSite = _.find(creep.pos.lookFor(LOOK_CONSTRUCTION_SITES), (cs) => cs.structureType == STRUCTURE_ROAD);
        const my = (creep)=>{
            return creep.room && creep.room.controller && creep.room.controller.reservation && creep.room.controller.reservation.username === creep.owner.username
        }
        if(constructionSite) {
            return my(creep) ? creep.build(constructionSite) == OK : false;
        } else {
            // строим новую дорогу по пути домой
            if (my(creep)){ creep.pos.createConstructionSite(STRUCTURE_ROAD); } else{ return false; }
            return true;
        }
    },
    source: function(creep) {
      return Game.getObjectById(creep.memory.source);
    },
    destination: function(creep) {
      return Game.getObjectById(creep.memory.destination);
    },
    withdraw: function(creep, source) {
        if(source.isCreep) {
            return source.transfer(creep, creep.memory.resource);
        } else {
            if (creep.memory.resource) {
                return creep.withdraw(source, creep.memory.resource);
            } else {
                // console.log('wd s', JSON.stringify(source))
                let resources = _.filter(Object.keys(source.store), (r)=> [/*'K', 'X', 'Z', 'H'*/].indexOf(r) < 0)
                // console.log('ress', resources);
                if (resources.length > 0) {
                    let first = _.first(resources)
                    // console.log('first', first);
                    creep.memory.resource = first;
                    return creep.withdraw(source, first);
                }

            }

        }

    },
    shouldWait: function(creep) {
        if(!creep.memory.waitTicks) return false;
        if(creep.store.getFreeCapacity() == 0) return false;
        if(!creep.memory.waitStart) return true;
        return creep.memory.waitStart + creep.memory.waitTicks > Game.time;
    },
    // starts waiting at source (if necessary), returns true if creep can go
    // to destination immediately.
    startWait: function(creep) {
        if(!creep.memory.waitTicks) return true;

        if(!creep.memory.waitStart) creep.memory.waitStart = Game.time;

        return !this.shouldWait(creep);
    }
};

const profiler = require("screeps-profiler");
const boosting = require("./helper.boosting");
profiler.registerObject(module.exports, 'carrier');
