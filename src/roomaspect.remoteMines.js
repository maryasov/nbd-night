const carrier = require('role.carrier');
const defender = require('role.defender');
const miner = require('role.miner');
const observer = require('role.observer');
const reserver = require('role.reserver');

const logistic = require('helper.logistic');
const roads = require('construction.roads');
const spawnHelper = require('helper.spawning');
const ff = require('helper.friendFoeRecognition');

const profitVisual = require('visual.roomProfit');

const energyExcessThreshold = 20000;
const secondCarrierMinCapacity = 400;

const targetRemoteMineCount = 2;

function isAcceptableMine(roomName) {
  let knowledge = MapKnowledge.roomKnowledge(roomName);
  if (!knowledge) return false;
  // mines need a source, but should not be center rooms (which have hostile NPCs)
  if (knowledge.sources < 1 || knowledge.sources > 2) return false;
  if (knowledge.owner) return false;

  // has another room already chosen this mine?
  if (knowledge.remoteMineOf) {
    let ownerRoom = Game.rooms[knowledge.remoteMineOf];
    if (ownerRoom && ownerRoom.ai()) return false;
  }

  return true;
}

module.exports = class RemoteMinesAspect {
  constructor(roomai) {
    this.roomai = roomai;
    this.room = roomai.room;
    if (!this.room.memory.remoteMines) this.room.memory.remoteMines = [];
    this.remoteMines = this.room.memory.remoteMines;
  }

  run() {
    if (!this.room.storage/* && this.room.name !== 'W32S12'*/) return;
    if (this.remoteMines.length < targetRemoteMineCount) {
      if (Memory.enableAutoExpansion && this.roomai.intervals.planRemoteMines.isActive()) {
        this.planRemoteMines();
      }
    }

    // TODO: only disable endangered remote mines
    if (this.roomai.defense.defcon >= 3) return;

    let hasExcessEnergy =
      this.roomai.trading.requiredExportFromRoom(RESOURCE_ENERGY, { showExcess: true }) >= energyExcessThreshold;

    for (var roomName of this.remoteMines) {
      // console.log('rm', roomName)
      var remoteRoom = Game.rooms[roomName];
      if (remoteRoom) {
        //if(this.isInvaderRoom(remoteRoom)) continue;
        if (this.spawnDefender(remoteRoom)) continue;

        let res = this.spawnReserver(remoteRoom);
        //console.log(`res: ${res}`);

        // console.log('remote hasExcessEnergy', roomName, hasExcessEnergy)
        if (hasExcessEnergy) continue;

        for (let source of remoteRoom.find(FIND_SOURCES)) {
          this.spawnMiner(source);
          this.spawnCarrier(source);
          this.buildRoad(source);
        }
      } else {
        // TODO: restrict spawning to once every few (500?) ticks
        //       (avoiding overproduction during siege)
        this.spawnObserver(roomName);
      }
    }
  }

  isInvaderRoom(remoteRoom) {
    let remoteOwner = remoteRoom.controller.reservation && remoteRoom.controller.reservation.username;
    return remoteOwner === 'Invader';
  }

  spawnDefender(remoteRoom) {
    let remoteOwner = remoteRoom.controller.owner && remoteRoom.controller.owner.username;
    var hostile = ff.findHostiles(remoteRoom, { filter: (c) => c.owner.username !== remoteOwner && !_.every(c.body, (p) => p.type === MOVE)
    })[0];
    if (!hostile) return false;

    if (!this.roomai.canSpawn()) return true;
    if (this.roomai.defense.defcon >= 3) return true;

    var hasDefender = _.any(spawnHelper.globalCreepsWithRole(defender.name), (c) => c.memory.room == remoteRoom.name);
    if (!hasDefender) {
      this.spawn(
        spawnHelper.bestAvailableParts(this.room, defender.remoteConfigs()),
        { role: defender.name, room: remoteRoom.name, originRoom: this.room.name },
        remoteRoom.name
      );
    }

    return true;
  }

  spawnReserver(remoteRoom) {
    if (!this.roomai.canSpawn()) return;

    var needReservation =
      !remoteRoom.controller.owner &&
      (!remoteRoom.controller.reservation || remoteRoom.controller.reservation.ticksToEnd < 1000);
    var hasReserver = _.any(
      spawnHelper.globalCreepsWithRole(reserver.name),
      (c) => c.memory.target == remoteRoom.controller.id
    );
    if (needReservation && !hasReserver) {
      this.spawn(
        spawnHelper.bestAvailableParts(this.room, reserver.partConfigs),
        { role: reserver.name, target: remoteRoom.controller.id },
        remoteRoom.name
      );
    }
  }

  spawnMiner(source) {
    // if (PowerState.isActive) return;
    if (!this.roomai.canSpawn()) return;

    var hasMiner = _.any(spawnHelper.globalCreepsWithRole(miner.name), (c) => c.memory.target == source.id);
    if (!hasMiner) {
      this.spawn(
        spawnHelper.bestAvailableParts(this.room, miner.energyRemoteConfigs()),
        {
          role: miner.name,
          target: source.id,
          targetRoom: source.room.name,
          resource: RESOURCE_ENERGY,
          selfSustaining: true,
        },
        source.room.name
      );
    }
  }

  spawnCarrier(source) {
    // if (PowerState.isActive) return;
    if (!this.roomai.canSpawn()) return;

    let hasStore = logistic.storeFor(source);
    let carrierCapacity =
      _.sum(
        _.filter(spawnHelper.globalCreepsWithRole(carrier.name), (c) => c.memory.source == source.id),
        (c) => _.filter(c.body, (p) => p.type === CARRY).length
      ) * CARRY_CAPACITY;
    let neededCapacity = this.neededCollectorCapacity(source);
    let missingCapacity = neededCapacity - carrierCapacity;
    if (hasStore && (carrierCapacity == 0 || missingCapacity >= secondCarrierMinCapacity)) {
      // let dest = '';
      // if (this.room.storage) {dest = this.room.storage.id}
      // if (dest === '' && ['W31S12'].includes(source.room.name)) {dest = '651eabcc9013aa43cb7cd880'}
      // if (dest === '' && ['W32S13', 'W33S13'].includes(source.room.name)) {dest = '651eac8b05e4116067f8a90c'}
      let memory = {
        role: carrier.name,
        source: source.id,
        destination: this.room.storage.id,
        // destination: dest,
        resource: RESOURCE_ENERGY,
        selfSustaining: true,
        renew: true,
        home: this.room.name,
        registerRevenueFor: source.room.name,
      };
      this.spawn(
        spawnHelper.bestAvailableParts(this.room, carrier.configsForCapacity(missingCapacity, { workParts: 1 })),
        memory,
        source.room.name
      );
    }
  }

  buildRoad(source) {
    let pos;
    if (this.room.storage) {
      pos = this.room.storage.pos
    } else {
      let store = Memory.rooms[this.room.name].constructions.stack
      pos = new RoomPosition(store.x, store.y, this.room.name)
    }
    if (this.roomai.intervals.buildStructure.isActive() && this.neighbourRooms().includes(source.room.name)) {
      roads.buildRoadFromTo(this.room, pos, source.pos);
    }
  }

  buildExtRoads() {
    let storagePos = this.room.storagePos();
    if (!this.roomai.intervals.buildStructure.isActive() || !storagePos) {
      return;
    }

    for (let source of this.sources) {
      let store = logistic.storeFor(source);
      if (!store) continue;

      roads.buildRoadFromTo(this.room, storagePos, store.pos);
    }
  }

  spawnObserver(roomName) {
    if (!_.any(spawnHelper.globalCreepsWithRole(observer.name), (c) => c.memory.target == roomName)) {
      this.spawn(observer.parts, { role: observer.name, target: roomName }, roomName);
    }
  }

  neededCollectorCapacity(source) {
    // back and forth while 10 energy per tick are generated
    let pos = this.room.controller;
    // this.storeFor(this.room.controller)
    if (this.room.storage) {pos = this.room.storage}
    var needed = logistic.distanceByPath(source, pos) * 20;
    // adding at least one extra CARRY to make up for inefficiencies
    return _.min([needed + 60, 2000]) * 1.25;
  }

  spawn(parts, memory, targetRoom) {
    let result = this.roomai.spawn(parts, memory);
    if (_.isString(result)) {
      profitVisual.addCost(targetRoom, spawnHelper.costForParts(parts));
    }
  }

  neighbourRooms() {
    let exits = Game.map.describeExits(this.room.name);
    return Object.values(exits);
  }

  planRemoteMines() {
    let missingMines = targetRemoteMineCount - this.remoteMines.length;

    let candidates = this.possibleRemoteMines(this.neighbourRooms());
    for (let roomName of _.take(candidates, missingMines)) {
      this.addRemoteMine(roomName);
      missingMines--;
    }

    if (missingMines > 0) {
      candidates = this.possibleRemoteMines(
        _.flatten(_.map(this.remoteMines, (r) => Object.values(Game.map.describeExits(r))))
      );
      for (let roomName of _.take(candidates, missingMines)) this.addRemoteMine(roomName);
    }
  }

  possibleRemoteMines(roomNames) {
    roomNames = _.filter(
      roomNames,
      (r) => r !== this.room.name && !this.remoteMines.includes(r) && isAcceptableMine(r)
    );
    return _.sortBy(roomNames, (r) => -MapKnowledge.roomKnowledge(r).sources);
  }

  addRemoteMine(roomName) {
    this.remoteMines.push(roomName);
    MapKnowledge.roomKnowledge(roomName).remoteMineOf = this.room.name;
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'RemoteMinesAspect');
