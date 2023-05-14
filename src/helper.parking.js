module.exports = {
  check: function (creep) {
    this.findPosition(creep);
  },
  findPosition(creep) {
    if (!creep) return;
    let room = creep.room;
    let positions = room.memory.virtuals['rolePosition'];
    positions = _.filter(
        positions,
        (pos) => creep.memory.role === pos.role
    );
    let localCreeps = spawnHelper.localCreepsWithRole(creep.room.ai(), creep.memory.role)
    positions = _.filter(
        positions,
        (pos) => !_.any(localCreeps, (pc) => pc.name !== creep.name && pc.pos && pc.pos.x === pos.x && pc.pos.y === pos.y)
    );

    if (!positions.length) return;
    const byDist = _.sortBy(positions, (t) => creep.pos.getRangeTo(creep.room.getPositionAt(t.x, t.y)));
    let closest = byDist[0];
    // console.log('byDist', JSON.stringify(byDist))
    creep.moveTo(closest.x, closest.y);
    // console.log('findPosition', room, positions, JSON.stringify(byDist))
  }
};

const profiler = require('screeps-profiler');
const spawnHelper = require("./helper.spawning");
const carrier = require("./role.carrier");
profiler.registerObject(module.exports, 'renew');
