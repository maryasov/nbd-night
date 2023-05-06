module.exports = {
  findHostiles: function (room, options) {
    let filter = (c) => true;
    if (options && options.filter) filter = options.filter;
    const struc = room.find(FIND_HOSTILE_STRUCTURES, { filter: (c) => c.structureType === 'invaderCore' });
    if (struc.length > 0) {
      return struc;
    }
    return room.find(FIND_HOSTILE_CREEPS, {
      filter: (c) => !FriendList.friends.includes(c.owner.username) && filter(c),
    });
  },
  findClosestHostileByRange: function (position, options) {
    let filter = (c) => true;
    if (options && options.filter) filter = options.filter;
    return position.findClosestByRange(FIND_HOSTILE_CREEPS, {
      filter: (c) => !FriendList.friends.includes(c.owner.username) && filter(c),
    });
  },
  findAllies: function (room) {
    let filter = (c) => true;
    if (options && options.filter) filter = options.filter;
    return room.find(FIND_HOSTILE_CREEPS, {
      filter: (c) => FriendList.friends.includes(c.owner.username) && filter(c),
    });
  },
  isHostile: function (ownedThing) {
    if (!ownedThing.owner) return false;
    return !ownedThing.my && !FriendList.friends.includes(ownedThing.owner.username);
  },
};

const profiler = require('screeps-profiler');
profiler.registerObject(module.exports, 'ff');
