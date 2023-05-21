const aspectsLite = [
  require('roomaspect.controller'),
  require('roomaspect.powerOperation'),
  require('roomaspect.powerMines'),
  require('roomaspect.trading'),
  require('roomaspect.power'),
  require('roomaspect.virtuals'),
];

const aspects = [
  require('roomaspect.supplies'),
  require('roomaspect.sources'),
  require('roomaspect.defense'),
  require('roomaspect.builders'),
  require('roomaspect.scooper'),
  require('roomaspect.minerals'),
  require('roomaspect.remoteMines'),
  require('roomaspect.manualOperations'),
  require('roomaspect.constructions'),
  require('roomaspect.masons'),
  // require("roomaspect.intelligence"),
  require('roomaspect.labs'),
  require('roomaspect.factory'),
  require('roomaspect.operations'),
  require('roomaspect.nuker'),
];

// const structureTower = require("structure.tower");

const Constructions = require('roomservice.constructions');
const Virtuals = require('roomservice.virtuals');
const Defense = require('roomservice.defense');
const Factory = require('roomservice.factory');
const Intervals = require('roomservice.intervals');
const Labs = require('roomservice.labs');
const Links = require('roomservice.links');
const Observer = require('roomservice.observer');
const Spawns = require('roomservice.spawns');
const Trading = require('roomservice.trading');

module.exports = class RoomAI {
  constructor(room) {
    this.room = room;
    this.constructions = new Constructions(room);
    this.virtuals = new Virtuals(room);
    this.defense = new Defense(room);
    this.factory = new Factory(room);
    this.intervals = new Intervals();
    this.links = new Links(room);
    this.labs = new Labs(room);
    this.observer = new Observer(room);
    this.spawns = new Spawns(room);
    this.trading = new Trading(room);
    this.mode = this.room.memory.mode || 'normal';
  }

  runLite() {
    for (let aspect of aspectsLite) {
      new aspect(this).run();
    }
    this.observer.performObservation();
    this.links.fullfillRequests();
  }

  run() {
    for (let aspect of aspects) {
      new aspect(this).run();
    }

    // for(let tower of this.room.find(FIND_MY_STRUCTURES, { filter: (structure) => structure.structureType == STRUCTURE_TOWER })) {
    //     structureTower.run(tower);
    // }

    // this.links.fullfillRequests();
    this.links.replaceNextContainerByLink();
    this.labs.selectPrioritizedBoosts();

    this.spawns.renderOverlay();
    this.renderModeOverlay();
  }

  spawn(parts, memory) {
    var res = this.spawns.spawn(parts, memory);
    // console.log('spawn res', res, parts, JSON.stringify(memory))
    return res;
  }

  canSpawn() {
    return this.spawns.canSpawn();
  }

  canSpawnHarv() {
    return this.spawns.canSpawnHarv();
  }

  renderModeOverlay() {
    RoomUI.forRoom(this.room).addRoomCaption(`Mode: ${this.mode}`);
  }

  toString() {
    return '[RoomAI ' + this.room.name + ']';
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'RoomAI');
