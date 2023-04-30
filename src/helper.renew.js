module.exports = {
    check: function(creep) {
        if (creep.memory.renew && !creep.memory.goRenew) {
            let renewTimeout = 100;

            switch (creep.memory.role) {
                case 'mover':
                    renewTimeout = 400;
                    break;
                case 'miner':
                    renewTimeout = 300;
                    break;
                case 'harvester':
                    renewTimeout = 200;
                    break;
            }
            if (this.enoughtEnergy(creep) && creep.ticksToLive < renewTimeout && this.conditions(creep)) {
                creep.memory.goRenew = true;
            }
        }
        if (creep.memory.goRenew) {
            if (this.renew(creep)) return true;
        }
    },
    renew: function (creep) {
        let roomai = creep.room.ai();
        if (!roomai) return
        let spawn = roomai.spawns.getBestSpawn();
        if (!spawn) return
        if (!this.enoughtEnergy(creep)) {
            console.log('finish renew', creep.name)
            creep.memory.goRenew = false;
            return;
        }
        let res = spawn.renewCreep(creep)
        // console.log('renew res', res)
        if (res === ERR_NOT_IN_RANGE) {
            creep.goTo(spawn);
            return true;
        }
        if (res === ERR_NOT_ENOUGH_ENERGY) {
            creep.memory.goRenew = false;
            return false;
        }
        if (creep.ticksToLive > 1300) {
            creep.memory.goRenew = false;
        }
        if (res === OK) {
            return  true
        }
    },
    enoughtEnergy: function (creep) {
        let roomai = creep.room.ai();
        if (!roomai) return false;
        let spawn = roomai.spawns.getBestSpawn();
        if (!spawn) return
        if (creep.memory.role === 'harvester' && spawn.energyAvailable < spawn.energyCapacity * 0.8) return false;
        if (spawn.energyAvailable < spawn.energyCapacity * 0.4) {
            return false;
        }
        return true;
    },
    conditions: function (creep) {
        if (creep.memory.role === 'mover' && creep.memory.support !== creep.room.name) return false;
        return true;
    }
};

const profiler = require("screeps-profiler");
profiler.registerObject(module.exports, 'renew');
