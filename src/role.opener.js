const boosting = require("helper.boosting");
const ff = require("helper.friendFoeRecognition");
const movement = require("helper.movement");
const spawnHelper = require("helper.spawning");

const prioritizedStructures = [STRUCTURE_RAMPART];
const coveredStructures = [STRUCTURE_LAB, STRUCTURE_STORAGE, STRUCTURE_POWER_BANK, STRUCTURE_TERMINAL, STRUCTURE_CONTAINER, STRUCTURE_FACTORY];

module.exports = {
    name: "opener",
    mainBoost: "XUH2O",
    configs: function(options) {
        options = options || {};
        var configs = [];
        for(var attack = (options.maxAttack || 25); attack >= (options.minAttack || 1); attack -= 1) {
            let config = Array(attack).fill(ATTACK).concat(Array(attack).fill(MOVE));
            let shuffled = config
                .map((value) => ({ value, sort: Math.random() }))
                .sort((a, b) => a.sort - b.sort)
                .map(({ value }) => value);
            if(shuffled.length <= 50) configs.push(shuffled);
        }

        return configs;
    },
    toughConfig: function(toughness) {
      return spawnHelper.makeParts(toughness, TOUGH, 40 - toughness, ATTACK, 10, MOVE);
    },
    run: function(creep) {
        if(creep.ticksToLive == CREEP_LIFE_TIME - 1) creep.notifyWhenAttacked(false);

        if(creep.body[0].type === TOUGH) {
            if(boosting.accept(creep, "XZHO2", "XUH2O", "XGHO2")) return;
        } else {
            if(boosting.accept(creep, "XUH2O")) return;
        }

        let target = AbsolutePosition.deserialize(creep.memory.target);

        if(creep.pos.roomName === target.roomName) {
            this.attackRoom(creep, target);
        } else {
            this.approachRoom(creep, target);
        }
    },
    approachRoom: function(creep, position) {
        // TODO: waiting (somewhere) blocks aggressive move... creep does not attack, because healer is out of range
        if(!this.shouldWait(creep)) {
            creep.goTo(position);
        }

        let target = ff.findClosestHostileByRange(creep.pos);
        if(target && creep.pos.isNearTo(target)) {
            creep.attack(target);
        }
    },
    attackRoom: function(creep, position) {
        let target;
        target = position.pos.lookFor(LOOK_STRUCTURES)[0];
        const covered = creep.room.find(FIND_STRUCTURES, {filter: (s) => coveredStructures.includes(s.structureType)}).map((e)=>({x:e.pos.x, y:e.pos.y}));
        // console.log('covered', JSON.stringify(covered));
        if (!target) {

            target = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: (s) => prioritizedStructures.includes(s.structureType) && covered.filter((b)=>(b.x == s.pos.x && b.y == s.pos.y)).length > 0});
        }

        if(target) {
            this.attack(creep, target);
        } else {
            this.aggressiveMove(creep, position);
        }
    },
    attack: function(creep, target) {
        let result;
        if (_.filter(creep.body, (p) => p.type == RANGED_ATTACK).length > _.filter(creep.body, (p) => p.type == ATTACK).length) {
            result = creep.rangedAttack(target);
        } else {
            result = creep.attack(target);
        }

        if(result == ERR_NOT_IN_RANGE) {
            this.aggressiveMove(creep, target);
        }
    },
    aggressiveMove: function(creep, target) {
        if(this.shouldWait(creep)) {
            return;
        }

        if(creep.moveTo(target, { maxRooms: 1, reusePath: CREEP_LIFE_TIME }) === ERR_NO_PATH) {
            // console.log('no path')
            if (creep.moveTo(target) === -9) {
                creep.moveTo(1+Math.random()*43, 1+Math.random()*43);
            };
        }

        if(creep.memory._move.path) {
            let nextStep = Room.deserializePath(creep.memory._move.path)[0];
            let moveTarget = _.find(creep.room.lookForAt(LOOK_STRUCTURES, creep.room.getPositionAt(nextStep.x, nextStep.y)), (s) => s.structureType === STRUCTURE_WALL || ff.isHostile(s));
            if(!moveTarget) {
                moveTarget = _.find(creep.room.lookForAt(LOOK_CREEPS, creep.room.getPositionAt(nextStep.x, nextStep.y)), (c) => ff.isHostile(c));
            }

            if(!moveTarget) {
                let closeHostiles = _.filter(ff.findHostiles(creep.room), (c) => c.pos.isNearTo(creep));
                moveTarget = closeHostiles[0];
            }

            if(moveTarget) {
                creep.moveTo(moveTarget);
            }
        }
    },
    shouldWait: function(creep) {
        if(movement.isOnExit(creep)) return false;

        if(creep.room.controller && creep.room.controller.my) {
            // automatically rally close to the room border
            if(movement.isWithin(creep, 5, 5, 45, 45)) return false;
        }

        if(creep.memory.waitFor === true) {
            console.log("Attacker " + creep.name + " waiting for follower to be spawned. (" + creep.room.name + ")");
            return true;
        }

        let waitFor = Game.creeps[creep.memory.waitFor];
        if(!waitFor) return false;

        return !creep.pos.isNearTo(waitFor);
    }
};

const profiler = require("screeps-profiler");
profiler.registerObject(module.exports, 'attacker');
