module.exports = class ExtensionOperator {
    constructor(creep) {
        this.creep = creep;
    }

    run() {
        this.generateOps();
        if(this.goHome()) return;
        if(this.renewPower()) return;
        if(this.enableRoom()) return;
        if(this.operateExtentions()) return;
        if(this.regenSources()) return;
        this.findPosition();
    }

    findPosition() {
        let room = this.creep.room;
        let positions = room.memory.constructions['powerPosition'];
        const byDist = _.sortBy(positions, (t) => this.creep.pos.getRangeTo(this.creep.room.getPositionAt(t.x, t.y)));
        let closest = byDist[0]
        this.creep.moveTo(closest.x, closest.y);
        // console.log('findPosition', room, positions, JSON.stringify(byDist))
    }

    runUnspawned() {
        if(this.spawnCooldownTime > 0) return;

        let homeRoom = Game.rooms[this.creep.memory.home];
        if(!homeRoom) return;

        this.creep.spawn(homeRoom.powerSpawn());
    }

    generateOps() {
        if(this.creep.powers[PWR_GENERATE_OPS].cooldown == 0) {
            this.creep.usePower(PWR_GENERATE_OPS);
        }
    }

    goHome() {
        let homeRoom = Game.rooms[this.creep.memory.home];
        if(!homeRoom || this.creep.room.name == homeRoom.name) return false;

        this.creep.goTo(homeRoom.powerSpawn());

        return true;
    }

    renewPower() {
        if(this.creep.ticksToLive < 200) {
            let powerSpawn = this.creep.room.powerSpawn();
            if(this.creep.pos.isNearTo(powerSpawn)) {
                this.creep.renew(powerSpawn);
            } else {
                this.creep.goTo(powerSpawn);
            }

            return true;
        } else {
            return false;
        }
    }

    enableRoom() {
        let controller = this.creep.room.controller;
        if(!controller || controller.isPowerEnabled) return false;

        if(this.creep.pos.isNearTo(controller)) {
            this.creep.enableRoom(controller);
        } else {
            this.creep.goTo(controller);
        }

        return true;
    }

    operateExtentions() {
        let roomai = this.creep.room.ai();
        if(!roomai) return;

        const room = roomai.room;
        let storage = room.storage;
        if(!storage) return;

        let powerMetadata = POWER_INFO[PWR_OPERATE_EXTENSION];

        var targetsAll = this.creep.room.find(FIND_MY_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) &&
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });

        if (!targetsAll.length) return;

        if(this.creep.pos.getRangeTo(storage) <= powerMetadata.range) {
            if(this.creep.store.ops < powerMetadata.ops) return;
            if(this.creep.powers[PWR_OPERATE_EXTENSION].cooldown > 0) return;
            this.creep.usePower(PWR_OPERATE_EXTENSION, storage);
        } else {
            this.creep.goTo(storage, { range: powerMetadata.range });
            return true;
        }
    }

    regenSources() {
        let roomai = this.creep.room.ai();
        if(!roomai) return;

        const room = roomai.room;
        let sources = room.find(FIND_SOURCES);
        let emptySources = _.filter(sources, (s) => s.energy === 0 && s.ticksToRegeneration > 50);
        let pureSources = _.filter(emptySources, (s) => !s.effects || s.effects && s.effects.length === 0);

        // console.log('sources', sources, emptySources, pureSources)

        if (pureSources.length > 0) {
            const byDist = _.sortBy(pureSources, (t) => this.creep.pos.getRangeTo(t));
            let source = byDist[0]
            // console.log('closest', spawn);
            if(!source) return;

            let powerMetadata = POWER_INFO[PWR_REGEN_SOURCE];

            if(this.creep.pos.getRangeTo(source) <= powerMetadata.range) {
                if(this.creep.store.ops < powerMetadata.ops) return;
                if(this.creep.powers[PWR_REGEN_SOURCE].cooldown > 0) return;
                this.creep.usePower(PWR_REGEN_SOURCE, source);
                return true;
            } else {
                this.creep.goTo(source, { range: powerMetadata.range });
                return true;
            }

        }
    }
}

const profiler = require("screeps-profiler");
profiler.registerClass(module.exports, 'ExtensionOperator');
