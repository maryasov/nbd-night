const ff = require("helper.friendFoeRecognition");

const fullHealthEquiv = 50000;

module.exports = {
    run: function(tower) {
        let friends = tower.room.find(FIND_MY_CREEPS, { filter: (creep) => creep.hits < creep.hitsMax && creep.memory.role !== "hopper" });
        let warriors = _.filter(friends, (f) => _.some(f.body, (p) => p.type === ATTACK || p.type === RANGED_ATTACK));

        if(warriors.length > 0) {
            tower.heal(_.sortBy(warriors, (w) => w.pos.getRangeTo(tower))[0]);
            return;
        }

        let hostiles = _.sortBy(ff.findHostiles(tower.room), (h) => 100 - tower.pos.getRangeTo(h) - 20 * ((_.some(h.body, (p) => p.type === HEAL) ? 1: 0)));
        if(hostiles.length > 0) {
            tower.attack(hostiles[0]);
            return;
        }


        if(friends.length > 0) {
            tower.heal(_.sortBy(friends, (f) => f.pos.getRangeTo(tower))[0]);
            return;
        }
        //console.log(tower.room.name);
        if (Memory.rooms[tower.room.name] && Memory.rooms[tower.room.name].mode === 'unclaim') {return;}
        if (tower.room.storage && tower.room.storage.store.energy < 5000) {
            return;
        }
        let closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, { filter: (s) => s.hits < s.hitsMax && s.hits < fullHealthEquiv });
        if(closestDamagedStructure) {
            tower.repair(closestDamagedStructure);
        }
    }
};

const profiler = require("screeps-profiler");
profiler.registerObject(module.exports, 'tower');
