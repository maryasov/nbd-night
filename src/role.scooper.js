// const parkStructures = [STRUCTURE_STORAGE, STRUCTURE_POWER_BANK, STRUCTURE_TERMINAL, STRUCTURE_CONTAINER, STRUCTURE_FACTORY, STRUCTURE_SPAWN];
const sParkStructures = [STRUCTURE_POWER_BANK, STRUCTURE_TERMINAL, STRUCTURE_CONTAINER, STRUCTURE_SPAWN];
const parkStructures = [STRUCTURE_LAB, STRUCTURE_EXTENSION, STRUCTURE_STORAGE, STRUCTURE_POWER_BANK, STRUCTURE_TERMINAL, STRUCTURE_CONTAINER, STRUCTURE_FACTORY, STRUCTURE_TOWER];
const blockStructures = [/*STRUCTURE_RAMPART*/];
const storeStructures = [STRUCTURE_STORAGE, STRUCTURE_CONTAINER];
const wayStructures = [STRUCTURE_POWER_BANK];

module.exports = {
    name: "scooper",
    configs:  function(capacity) {
        var configs = [];
        for(var carries = Math.ceil(capacity / CARRY_CAPACITY); carries >= 2; carries -= 1) {
            let config = Array(carries).fill(CARRY).concat(Array(carries).fill(MOVE));
            if(config.length <= 50) configs.push(config);
        }

        return configs;
    },
    run: function(creep) {
        if (creep.memory.operation && Memory.powerOperation) {
            let scoopers = _.filter(spawnHelper.globalCreepsWithRole(creep.memory.role), (c) => c.memory.operation == creep.memory.operation);
            let scoopersCapacity = _.sum(scoopers, (c) => c.carryCapacity)
            if(scoopersCapacity < creep.memory.power) {
                if(_.some(creep.body, (p) => p.type === CARRY)) {
                    // console.log('accept', creep.name);
                    if(boosting.accept(creep, "XKH2O")) return;
                }
            }
        }
        if(creep.memory.returningHome) {
            this.returnHome(creep);
        } else {

            if(creep.room.name !== creep.memory.target) {
                let tg;
                // if (creep.room.name !=='W20S10') {
                tg = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES);

                if(!tg) tg = creep.pos.findClosestByRange(FIND_TOMBSTONES, { filter: (t) => _.sum(t.store) > 0 });
                // }
                // if(!tg && (!creep.room.controller || (creep.room.controller && !creep.room.controller.my))) {
                //     tg = creep.pos.findClosestByRange(FIND_STRUCTURES, { filter: (s) => wayStructures.includes(s.structureType) && _.sum(s.store) > 0 });
                // }

                let objs;
                if (tg && tg.store) {
                    objs = _.filter(Object.keys(tg.store), (e)=>['H', 'Z', 'U', 'L', 'O', 'X'].indexOf(e) < 0 )
                }

                if (tg && objs && objs.length > 0) {
                    this.scoopWay(creep);
                } else {
                    if(creep.store.getFreeCapacity() < creep.store.getCapacity() * 0.1) {
                        creep.memory.returningHome = true;
                        return;
                    }
                    let target = { pos: new RoomPosition(25, 25, creep.memory.target) };
                    creep.goTo(target, { avoidHostiles: true });
                }
            } else {
                this.scoopRoom(creep);
            }
        }
    },
    returnHome: function(creep) {
        let home = Game.rooms[creep.memory.home];
        // console.log('scoop storage', home.storage, JSON.stringify(home))
        let target = home && home.storage;
        if (!target) {
            target = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: (s) => storeStructures.includes(s.structureType) && _.sum(s.store) < s.storeCapacity});
            // console.log('targ scoo', JSON.stringify(target))
        }
        if(!target) return;
        if(creep.pos.isNearTo(target)) {
            creep.memory.stopped = true;
            let resource = _.findKey(creep.store, (amount) => amount > 0);
            if(resource) {
                creep.transfer(target, resource);
            } else {
                creep.memory.returningHome = false;
            }
        } else {
            creep.memory.stopped = false;
            creep.goTo(target, { ignoreRoads: false, avoidHostiles: true });
        }
    },
    scoopWay: function(creep) {
        const ignoreResources = [];
        if(creep.store.getFreeCapacity() < creep.store.getCapacity() * 0.1) {
            creep.memory.returningHome = true;
            return;
        }

        let target;
        // if (creep.room.name !=='W20S10') {
            target = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES);
            if (!target) target = creep.pos.findClosestByRange(FIND_TOMBSTONES, {filter: (t) => _.sum(t.store) > 0});
        // }
        if(!target && (!creep.room.controller || (creep.room.controller && !creep.room.controller.my))) {
            target = creep.pos.findClosestByRange(FIND_STRUCTURES, { filter: (s) => wayStructures.includes(s.structureType) && _.sum(s.store) > 0 });

        }

        if(!target) {
            return;
        }

        let result = null;
        if(target.store) {
            let objs;
            objs = _.filter(Object.keys(target.store), (e)=>ignoreResources.indexOf(e) < 0 )
            result = creep.withdraw(target, _.last(objs));
        } else {
            result = creep.pickup(target);
        }

        if(result === ERR_NOT_IN_RANGE) {
            creep.memory.stopped = false;
            creep.goTo(target, { ignoreRoads: true, avoidHostiles: true });
        }
    },
    scoopRoom: function(creep) {
        if(creep.store.getFreeCapacity() == 0) {
            creep.memory.returningHome = true;
            return;
        }

        const ignoreResources = []

        let target = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, { filter: (t) => t.resourceType !== 'H' });
        if(!target) target = creep.pos.findClosestByRange(FIND_TOMBSTONES, { filter: (t) => _.sum(t.store) > 0 });
        if (!target && (!creep.room.controller || (creep.room.controller && !creep.room.controller.my))) {

            const blocks = creep.room.find(FIND_STRUCTURES, {filter: (s) => blockStructures.includes(s.structureType)}).map((e) => ({
                x: e.pos.x,
                y: e.pos.y
            }));

            target = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: (s) => parkStructures.includes(s.structureType) && blocks.filter((b) => (b.x == s.pos.x && b.y == s.pos.y)).length == 0 && _.sum(s.store) > 0});

        }

        if(!target) {
            if(_.sum(creep.store) > 0) {
                creep.memory.returningHome = true;
            } else {
                // Wait at a parking position.
                target = creep.pos.findClosestByRange(FIND_STRUCTURES,
                    { filter: (s) => parkStructures.includes(s.structureType) });
                if(!target) target = { pos: creep.room.getPositionAt(25, 25) };
                if(creep.pos.getRangeTo(target) <= 5) {
                    creep.memory.stopped = true;
                } else {
                    creep.memory.stopped = false;
                    creep.goTo(target, { range: 5, ignoreRoads: true, avoidHostiles: true });
                }
            }

            return;
        }

        let result = null;
        let objs = [];
        if(target.store) {
            // if (creep.room.name =='W13S11') {
                objs = _.filter(Object.keys(target.store), (e)=>ignoreResources.indexOf(e) < 0 )
            // } else {
            //     objs = Object.keys(target.store);
            // }
            if (objs.length > 0) {
                result = creep.withdraw(target, _.first(objs));
            }
        } else {
            // console.log('droped', JSON.stringify(target))
            result = creep.pickup(target);
        }
        // console.log('withdraw', JSON.stringify(objs), creep.room.name, result, ERR_NOT_IN_RANGE)

        if(result === ERR_NOT_IN_RANGE) {
            creep.memory.stopped = false;
            creep.goTo(target, { ignoreRoads: true, avoidHostiles: true });
        }
    }
};

const profiler = require("screeps-profiler");
const boosting = require("./helper.boosting");
const spawnHelper = require("./helper.spawning");
profiler.registerObject(module.exports, 'scooper');
