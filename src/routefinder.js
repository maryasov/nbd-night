const ROUTE_MY_ROOM_COST = 2;
const ROUTE_NEUTRAL_ROOM_COST = 3;
const ROUTE_HOSTILE_ROOM_COST = 10;
const ROUTE_ENEMY_ROOM_COST = 200;
const ROUTE_HIGHWAY_ROOM_COST = 1.5;

const roomNameRegex = /^[EW]([0-9]+)[NS]([0-9]+)$/;

function routeCallback(roomName, fromRoomName) {
  let room = Game.rooms[roomName];

  if (Memory.enemyRooms === undefined) {
    Memory.enemyRooms = [];
  }

  if (Memory.enemyRooms && Memory.enemyRooms.indexOf(roomName) > -1) {
    if (Memory.rooms[roomName] === undefined) {
      Memory.rooms[roomName] = {};
    }
    return ROUTE_ENEMY_ROOM_COST;
  }

  if (room && room.controller && room.controller.my) return ROUTE_MY_ROOM_COST;
  // TODO: consider own remote mines

  let match = roomNameRegex.exec(roomName);
  if (match[1].endsWith('0') || match[2].endsWith('0')) return ROUTE_HIGHWAY_ROOM_COST;

  return ROUTE_NEUTRAL_ROOM_COST;
}

module.exports = class RouteFinder {
  constructor(startRoom, destinationRoom) {
    this.startRoom = startRoom;
    this.destinationRoom = destinationRoom;
  }

  findRoute() {
    let allowedRooms = _.map(
      Game.map.findRoute(this.startRoom, this.destinationRoom, { routeCallback: routeCallback }),
      (i) => i.room
    );
    //console.log('ar', this.startRoom, this.destinationRoom, JSON.stringify(allowedRooms));
    return _.uniq(allowedRooms.concat([this.startRoom, this.destinationRoom]));
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'RouteFinder');
