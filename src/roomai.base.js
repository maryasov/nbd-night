const aspectsLiteNames = [
  { name: 'ControllerAspect', module: 'roomaspect.controller' },
  { name: 'FarmPowerOperation', module: 'roomaspect.powerOperation' },
  { name: 'PowerMinesAspect', module: 'roomaspect.powerMines' },
  { name: 'TradingAspect', module: 'roomaspect.trading' },
  { name: 'PowerAspect', module: 'roomaspect.power' },
  { name: 'VirtualsAspect', module: 'roomaspect.virtuals' },
  { name: 'LabsAspect', module: 'roomaspect.labs' },
];


let aspectsLite = [];

const aspectsNames = [
  { name: 'SuppliesAspect', module: 'roomaspect.supplies' },
  { name: 'SourcesAspect', module: 'roomaspect.sources' },
  { name: 'BuildersAspect', module: 'roomaspect.builders' },
  { name: 'ScooperAspect', module: 'roomaspect.scooper' },
  { name: 'MineralsAspect', module: 'roomaspect.minerals' },
  { name: 'RemoteMinesAspect', module: 'roomaspect.remoteMines' },
  { name: 'OperationsAspect', module: 'roomaspect.operations' },
  { name: 'DefenseAspect', module: 'roomaspect.defense' },
  { name: 'ManualOperationsAspect', module: 'roomaspect.manualOperations' },
  { name: 'ConstructionsAspect', module: 'roomaspect.constructions' },
  { name: 'MasonsAspect', module: 'roomaspect.masons' },
  { name: 'FactoryAspect', module: 'roomaspect.factory' },
  { name: 'NukerAspect', module: 'roomaspect.nuker' },
];

let aspects = [];

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
    if (!global.lastAiAspectLite[this.room.name]) {
      const rnd = _.random(0, aspectsLiteNames.length - 1)
      // console.log('set rnd', this.room.name, rnd, aspectsNames[rnd] && aspectsNames[rnd].name)
      global.lastAiAspectLite[this.room.name] = aspectsLiteNames[rnd].name;
    }
    let lastAspectIndex = _.findIndex(aspectsLiteNames, a=>(a.name === global.lastAiAspectLite[this.room.name]));
    let shiftedAspectsNames = [];
    if (lastAspectIndex > -1) {
      shiftedAspectsNames = aspectsLiteNames.slice(lastAspectIndex+1).concat(aspectsLiteNames.slice(0, lastAspectIndex+1))
    } else {
      shiftedAspectsNames = aspectsLiteNames
    }
    aspectsLite = _.map(shiftedAspectsNames, a=>(a.module)).map(require);
    let aspectsCnt = aspectsLite.length;
    // console.log('aspects', JSON.stringify(_.map(aspects, (a) => a.name)));
    let runLimit = Math.min(aspectsCnt, Math.max(Math.round((aspectsCnt * aspestLiteFree) / 100), 1));
    // console.log('global.lastAiAspect', runLimit, global.lastAiAspectLite[this.room.name], lastAspectIndex/*, JSON.stringify(shiftedAspectsNames)*/);

    for (const [idx, aspect] of aspectsLite.entries()) {
      if (idx + 1 <= runLimit) {
        global.lastAiAspectLite[this.room.name] = aspect.name;
        new aspect(this).run();
      }

    }
    this.observer.performObservation();
    this.links.fullfillRequests();
  }

  run() {
    if (!global.lastAiAspect[this.room.name]) {
      const rnd = _.random(0, aspectsNames.length - 1)
      // console.log('set rnd', this.room.name, rnd, aspectsNames[rnd] && aspectsNames[rnd].name)
      global.lastAiAspect[this.room.name] = aspectsNames[rnd].name;
    }
    let lastAspectIndex = _.findIndex(aspectsNames, a=>(a.name === global.lastAiAspect[this.room.name]));
    let shiftedAspectsNames = [];
    if (lastAspectIndex > -1) {
      shiftedAspectsNames = aspectsNames.slice(lastAspectIndex+1).concat(aspectsNames.slice(0, lastAspectIndex+1))
    } else {
      shiftedAspectsNames = aspectsNames
    }
    aspects = _.map(shiftedAspectsNames, a=>(a.module)).map(require);
    let aspectsCnt = aspects.length;
    // console.log('aspects', JSON.stringify(_.map(aspects, (a) => a.name)));
    let runLimit = Math.min(aspectsCnt, Math.max(Math.round((aspectsCnt * aspestFree) / 100), 1));
    // console.log('global.lastAiAspect', runLimit, global.lastAiAspect[this.room.name], lastAspectIndex/*, JSON.stringify(shiftedAspectsNames)*/);
    if (PowerState.isActive) {
      runLimit = 1;
    }
    for (const [idx, aspect] of aspects.entries()) {
      // console.log('asp', JSON.stringify(aspect))
      if (idx + 1 <= runLimit) {
        global.lastAiAspect[this.room.name] = aspect.name;
        new aspect(this).run();
      }
    }

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
