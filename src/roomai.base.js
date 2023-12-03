const aspectsExtraNames = [
  { name: 'ControllerAspect', module: 'roomaspect.controller' },
  { name: 'TowersAspect', module: 'roomaspect.towers' },
];


let aspectsExtra = [];

const aspectsLiteNames = [
  { name: 'FarmPowerOperation', module: 'roomaspect.powerOperation' },
  { name: 'PowerMinesAspect', module: 'roomaspect.powerMines' },
  { name: 'TradingAspect', module: 'roomaspect.trading' },
  { name: 'PowerAspect', module: 'roomaspect.power' },
  { name: 'VirtualsAspect', module: 'roomaspect.virtuals' },
  { name: 'LabsAspect', module: 'roomaspect.labs' },
  { name: 'ManualOperationsAspect', module: 'roomaspect.manualOperations' },
  { name: 'FactoryAspect', module: 'roomaspect.factory' },
];


let aspectsLite = [];

const aspectsNames = [
  { name: 'SuppliesAspect', module: 'roomaspect.supplies' },
  { name: 'SourcesAspect', module: 'roomaspect.sources' },
  { name: 'RemoteMinesAspect', module: 'roomaspect.remoteMines' },
  { name: 'OperationsAspect', module: 'roomaspect.operations' },
  { name: 'BuildersAspect', module: 'roomaspect.builders' },
  { name: 'ScooperAspect', module: 'roomaspect.scooper' },
  { name: 'MineralsAspect', module: 'roomaspect.minerals' },
  { name: 'DefenseAspect', module: 'roomaspect.defense' },
  { name: 'ConstructionsAspect', module: 'roomaspect.constructions' },
  { name: 'MasonsAspect', module: 'roomaspect.masons' },
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
const Towers = require('roomservice.towers');
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
    this.towers = new Towers(room);
    this.observer = new Observer(room);
    this.spawns = new Spawns(room);
    this.trading = new Trading(room);
    this.mode = this.room.memory.mode || 'normal';
    this.noPower = this.room.memory.noPower || false;
    this.noLabs = this.room.memory.noLabs || false;
  }

  rotLeft(inp, N) {
    let a = [...inp]
    for(let i = 1;i <= N; i++){

      // Remove first element
      let firstElement = a.shift()

      // Append first element at the last
      a.push(firstElement);

    }
    return a
  }

  runExtra() {
    aspectsExtra = _.map(aspectsExtraNames, a=>(a.module)).map(require);
    for (const [idx, aspect] of aspectsExtra.entries()) {
        new aspect(this).run(true);
    }
    this.links.fullfillRequests();
  }

  runLite() {
    if (!global.lastAiAspectLite[this.room.name]) {
      const rnd = _.random(0, aspectsLiteNames.length - 1)
      // console.log('set rnd', this.room.name, rnd, aspectsNames[rnd] && aspectsNames[rnd].name)
      global.lastAiAspectLite[this.room.name] = aspectsLiteNames[rnd].name;
    }
    let lastAspectLiteIndex = _.findIndex(aspectsLiteNames, a=>(a.name === global.lastAiAspectLite[this.room.name])) + 1;
    let shiftedLiteAspectsNames = [];

      shiftedLiteAspectsNames = this.rotLeft(aspectsLiteNames, lastAspectLiteIndex)

    let aspectsCnt = shiftedLiteAspectsNames.length;
    // console.log('aspects', JSON.stringify(_.map(aspectsLite, (a) => a.name)));
    let runLimit = Math.min(aspectsCnt, Math.max(Math.round((aspectsCnt * aspestLiteFree) / 100), 1));
    // if (this.room.name === 'W29S11'){
    //   console.log('global.lastAiAspect', this.room.name, runLimit, global.lastAiAspectLite[this.room.name], lastAspectLiteIndex, JSON.stringify(_.map(aspectsLiteNames, a=>(a.name))));
    //   console.log('global.lastAiAspect', this.room.name, runLimit, global.lastAiAspectLite[this.room.name], lastAspectLiteIndex, JSON.stringify(_.map(shiftedLiteAspectsNames, a=>(a.name))));
    // }

    for (const [idx, aspectR] of shiftedLiteAspectsNames.entries()) {
      if (idx + 1 <= runLimit) {
        const aspect = require(aspectR.module)
        global.lastAiAspectLite[this.room.name] = aspect.name;
        new aspect(this).run(true);
      }

    }
    this.observer.performObservation();
  }

  run() {
    if (!global.lastAiAspect[this.room.name]) {
      const rnd = _.random(0, aspectsNames.length - 1)
      // console.log('set rnd', this.room.name, rnd, aspectsNames[rnd] && aspectsNames[rnd].name)
      global.lastAiAspect[this.room.name] = aspectsNames[rnd].name;
    }
    let lastAspectIndex = _.findIndex(aspectsNames, a=>(a.name === global.lastAiAspect[this.room.name])) + 1;
    let shiftedAspectsNames = [];
    shiftedAspectsNames = this.rotLeft(aspectsNames, lastAspectIndex)

    // aspects = _.map(shiftedAspectsNames, a=>(a.module)).map(require);
    let aspectsCnt = shiftedAspectsNames.length;
    // console.log('aspects', JSON.stringify(_.map(aspects, (a) => a.name)));
    let runLimit = Math.min(aspectsCnt, Math.max(Math.round((aspectsCnt * aspestFree) / 100), 1));
    // console.log('global.lastAiAspect', runLimit, global.lastAiAspect[this.room.name], lastAspectIndex/*, JSON.stringify(shiftedAspectsNames)*/);
    if (PowerState.isActive) {
      runLimit = 1;
    }
    for (const [idx, aspectR] of shiftedAspectsNames.entries()) {
      if (idx + 1 <= runLimit) {
        const aspect = require(aspectR.module)
        // console.log('asp', this.room.name, JSON.stringify(aspectR))
        global.lastAiAspect[this.room.name] = aspect.name;
        new aspect(this).run();
      }
    }

    this.links.replaceNextContainerByLink();
    this.labs.selectPrioritizedBoosts();

    this.spawns.renderOverlay();
    this.renderModeOverlay();
  }

  spawn(parts, memory, safe = false) {
    var res = this.spawns.spawn(parts, memory, safe);
    // console.log('spawn res', res, parts, safe, JSON.stringify(memory))
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
