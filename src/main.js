const roles = [
  require('role.harvester'),
  require('role.miner'),
  require('role.linkCollector'),
  require('role.upgrader'),
  require('role.builder'),
  require('role.claimer'),
  require('role.conqueror'),
  require('role.reserver'),
  require('role.carrier'),
  require('role.guard'),
  require('role.defender'),
  require('role.ranger'),
  require('role.reloader'),
  // require("role.flagHunter"),
  require('role.attacker'),
  require('role.opener'),
  require("role.dismantler"),
  require('role.healer'),
  require('role.hopper'),
  require('role.observer'),
  // require('role.discoverer'),
  require('role.trader'),
  require('role.factoryWorker'),
  require('role.picker'),
  require('role.scooper'),
  require('role.powerFarmer'),
  require('role.powerRefiner'),
  require('role.mason'),
  require('role.mover'),
  require('role.scientist'),
  require('role.nukeOperator'),
  // require("role.downgrader"),
];

const powerRoles = [
  require('powerRole.factoryOperator'),
  require('powerRole.terminalOperator'),
  require('powerRole.extensionOperator'),
  require('powerRole.labOperator'),
  require('powerRole.spawnOperator'),
];

const ConstructionSitesCleaner = require('cleaner.constructionSites');
const logistic = require('helper.logistic');

const globalStatistics = require('global.statistics');
const profitVisual = require('visual.roomProfit');

const PixelTrader = require('global.pixelTrader');
const SegmentExport = require('global.segmentExport');
const ShardTravel = require('global.shardTravel');
const TradeLogger = require('global.tradeLogger');

global.AbsolutePosition = require('global.absolutePosition');
global.ExpansionPlanner = require('global.expansionPlanner');
global.FriendList = require('global.friendList');
global.MapKnowledge = require('global.mapKnowledge');
global.RoomUI = require('global.roomui');
global.SegmentScanner = require('global.segmentScanner');
global.PowerState = require('global.powerState');

require('global.operation');

require('patch.controller');
require('patch.creep');
require('patch.powerCreep');
require('patch.room');

const profiler = require('screeps-profiler');
const movement = require('./helper.movement');
profiler.enable();

const creepsStat = false;
let bucket = [];
let frees = [];
let freesAspoctsLite = [];
let freesAspocts = [];

const logLimit = 9500;
const targetLimit = 8000; //10000
const aspectsLiteLimit = 15500; //4000
const aspectsLiteSafe = 250;
const aspectsLimit = 18000; //9900
const aspectsSafe = 8000;
const aspectsMax = 50;
const powerSafe = 3500;
const safeLimit = 500;
const commonLimit = 25;
const roleLimit = {
  claimer: 1,
  miner: 1,
  harvester: 1,
  linkCollector: 1,
  picker: 1,
  trader: 5,
  reloader: 5,
  builder: 5,
  mason: 10,
  upgrader: 5,
  scientist: 5,
  factoryWorker: 15,
  observer: 15,
  powerFarmer: 15,
  healer: 15,
  scooper: 1,
  reserver: 15,
  carrier: 5,
  mover: 5,
  attacker: 30,
  dismantler: 5,
};

// const powerWorks = ['healer', 'scooper', 'picker', 'dismantler', 'scientist', 'harvester', 'trader', 'mover'];
const powerWorks = ['healer', 'scooper', 'picker', 'dismantler', 'trader', 'mover', 'upgrader', 'claimer', 'conqueror', 'builder'];
const powerStop = [
  // 'builder',
  // 'attacker',
  // 'carrier',
  // 'mover',
  // "observer",
  // 'scientist',
  // "factoryWorker",
  'powerRefiner',
  // 'harvester',
  // "healer",
  // "powerFarmer",
  // 'upgrader',
  // 'picker',
  // 'reserver',
  // 'discoverer',
  // "scooper",
  // 'linkCollector',
  // 'miner',
  // "trader",
];

function suppressErrors(callback) {
  try {
    callback();
  } catch (error) {
    console.log('<span style="color: #faa">' + error.stack + '</span>');
  }
}

function runCreeps() {
  const bt = Game.cpu.bucket;
  let free = global.free;
  const rls = {};

  // console.log('free', bt, free)
  for (let role of roles) {
    // const workFine = [];
    // const workIdle = [];

    let limit = roleLimit[role.name] || commonLimit;

    if (free < limit && role.name !== 'miner') {
      continue;
    }

    // console.log('-', role.name, limit)
    let creeps = _.filter(Game.creeps, (creep) => creep.memory.role == role.name && creep.ticksToLive !== undefined);

    // _.sortBy(creeps, (t) => t.memory.lastTick)
    creeps.sort((a, b) => (a.memory.lastTick || 0) - (b.memory.lastTick || 0));

    let cnt = creeps.length;
    // if (!cnt) continue;
    let runLimit = Math.min(cnt, Math.max(Math.round((cnt * free) / 100), 1));
    // console.log('rl', cnt, runLimit, free, role.name)
    if (PowerState.isActive) {
      // console.log('po', role.name)
      if (powerWorks.indexOf(role.name) > -1 && bt > powerSafe) {
        runLimit = cnt;
      }
      if (powerStop.indexOf(role.name) > -1 && bt < powerSafe) {
        // console.log('list')
        if (Game.time % 5 === 0) {
          // console.log('limit')
          runLimit = 1;
        } else {
          // console.log('else')
          runLimit = 0;
        }
      }
    }
    let startCreeps;
    let endCreeps;
    for (const [idx, creep] of creeps.entries()) {
      let mustBreake = false;
      if (idx + 1 > runLimit && role.name !== 'miner') {
        // rls[role.name] = {}
        // console.log('off', `role: ${role.name} cnt: ${cnt} limit: ${runLimit} free: ${free} idx: ${idx} bt: ${bt}`);
        // console.log('off', cnt, runLimit, free, idx, bt);
        if (!movement.isOnExit(creep)) {
          mustBreake = true;
        } else {
          // movement.leaveExitRev(creep);
          // console.log('creep', creep.memory.role, creep.pos.x, creep.pos.y);
          // continue;
        }
      }
      if (creep.memory.goRenew) {
        mustBreake = false;
      }
      if (creep.memory.role === 'claimer') {
        mustBreake = false;
      }
      if (creep.memory.role === 'defender') {
        mustBreake = false;
      }
      if (creep.memory.role === 'healer') {
        mustBreake = false;
      }
      // if (creep.memory.role === 'upgrader' && Memory.rooms[creep.room.name].mode==='transit') {
      //   mustBreake = false;
      // }
      // if (creep.memory.role === 'builder' && Memory.rooms[creep.room.name].mode==='transit') {
      //   mustBreake = false;
      // }
      // if (creep.memory.role === 'conqueror' && Memory.rooms[creep.room.name].mode==='transit') {
      //   mustBreake = false;
      // }
      // if (creep.memory.role === 'picker' && Memory.rooms[creep.room.name].mode==='transit') {
      //   mustBreake = false;
      // }
      // if (creep.memory.role === 'harvester' && Memory.rooms[creep.room.name].mode==='transit') {
      //   mustBreake = false;
      // }
      // if (creep.memory.role === 'carrier' && Memory.rooms[creep.room.name].mode==='transit') {
      //   mustBreake = false;
      // }
      if (movement.isOnExit(creep)) {
        mustBreake = false;
      }
      if (mustBreake) {
        continue;
      }
      if (creepsStat) {
        startCreeps = Game.cpu.getUsed();
      }
      suppressErrors(() => role.run(creep));
      if (creepsStat) {
        endCreeps = Game.cpu.getUsed();
      }
      creep.memory.lastTick = Game.time;
      if (creepsStat) {
        creep.memory.lastUsed = endCreeps - startCreeps;
        creep.memory.cpuUsed = (creep.memory.cpuUsed || 0) + (endCreeps - startCreeps);
        creep.memory.cpuCnt = (creep.memory.cpuCnt || 0) + 1;
        creep.memory.avgCpu = creep.memory.cpuUsed / creep.memory.cpuCnt;
      }
    }
    // let wolt = _.filter(creeps, (creep) => !creep.memory.lastTick);
    // _.forEach(wolt, (c)=>{c.memory.lastTick = 0})
    // console.log('wolt', wolt.length)

    // if (workFine.length > 0) {console.log('workFine', JSON.stringify(workFine))}
    // if (workIdle.length > 0) {console.log('workIdle', JSON.stringify(workIdle))}
  }

  // console.log('rls', JSON.stringify(rls));

  for (let roleClass of powerRoles) {
    let creeps = _.filter(Game.powerCreeps, (creep) => creep.memory.role == roleClass.name);
    for (let creep of creeps) {
      let role = new roleClass(creep);
      if (creep.ticksToLive) {
        suppressErrors(() => role.run());
      } else {
        suppressErrors(() => role.runUnspawned());
      }
    }
  }
}

runCreeps = profiler.registerFN(runCreeps, 'Creep Actions');

Function.prototype.valueOf = function () {
  this.call(this);
  return 0;
};

global.r = () => Operation.count('', false);

global.rr = () => Operation.count('', true);

global.b = () => {
  Operation.boosts('', false);
};

global.bb = () => {
  Operation.boosts('', true);
};

global.e = () => {
  Operation.count('energy', true);
};

global.p = () => {
  Memory.pixel = true;
};

global.free = 0;
global.aspestLiteFree = 0;
global.aspestFree = 0;
global.lastAiLiteAspect = {};
global.lastAiAspectExtra = {};
global.lastAiAspectLite = {};
global.lastAiAspect = {};

module.exports.loop = function () {
  profiler.wrap(function () {
    const currentBucket = Game.cpu.bucket
    globalStatistics.initialize();
    if (Memory.lastCompletedTick < Game.time - 1) {
      Memory.stats.skippedTicks += 1;
    }

    global.free = Math.min(
      100,
      Math.ceil(Math.max(((currentBucket - safeLimit) * 100) / (targetLimit - safeLimit), 0))
    );
    global.aspestLiteFree = Math.min(
      100,
      Math.ceil(Math.max(((currentBucket - aspectsLiteSafe) * 100) / (aspectsLiteLimit - aspectsLiteSafe), 0))
    );
    global.aspestFree = Math.min(
      aspectsMax,
      Math.ceil(Math.max(((currentBucket - aspectsSafe) * aspectsMax) / (aspectsLimit - aspectsSafe), 0))
    );

    bucket.push(currentBucket);
    frees.push(global.free);
    freesAspoctsLite.push(global.aspestLiteFree);
    freesAspocts.push(global.aspestFree);
    if (Game.time % 10 === 0) {
      if (_.min(bucket) <= aspectsLimit) {
        console.log(
            'Bucket at ' + JSON.stringify(bucket),
            JSON.stringify(frees),
            JSON.stringify(freesAspoctsLite),
            JSON.stringify(freesAspocts)
        );
      }
      bucket = [];
      frees = [];
      freesAspoctsLite = [];
      freesAspocts = [];
    }

    if (currentBucket < safeLimit) return;

    if (Memory.pixel && currentBucket >= 6000) {
      console.log('current bucket', currentBucket);
      if (currentBucket == 10000) {
        // Game.cpu.generatePixel();
        const pRes = Game.cpu.generatePixel();
        console.log('pRes', pRes)
        if (pRes === OK) {
          delete Memory.pixel;
          return;
        }
      } else {
        return;
      }
    }

    if (!PowerState.isActive && Memory.generatePixels && currentBucket == 10000) {
      const pRes = Game.cpu.generatePixel();
      console.log('generatePixel ✴️', pRes)

      return;
    }

    suppressErrors(() => ShardTravel.loadArrivals());
    runCreeps();
    suppressErrors(() => ShardTravel.announceDepartures());

    for (let operation of Operation.operations) {
      suppressErrors(() => operation.run());
    }

    for (let roomName in Game.rooms) {
      let room = Game.rooms[roomName];

      if (room.aiLite()) {
        suppressErrors(() => room.aiLite().run());
      }
      if (room.ai()) {
        suppressErrors(() => room.ai().runExtra());
        suppressErrors(() => room.ai().runLite());
      }
    }

    if (Game.time % 100 == 51) {
      for (let name in Memory.creeps) {
        if (!Game.creeps[name]) {
          delete Memory.creeps[name];
        }
      }
    }



    if (currentBucket < aspectsSafe && Game.time % 10 !== 1) return;

    if (currentBucket < (PowerState.isActive ? powerSafe : safeLimit)) {
      return;
    }

    // if(currentBucket < 1000 && Game.time % 2 === 0) return;

    if (currentBucket < aspectsLimit && Game.time % 10 !== 1) return;

    // console.log('Game.time % 2', Game.time % 2)

    if (Game.time % 10000 === 0) {
      logistic.cleanupCaches();
    }

    if (Memory.enableAutoExpansion) {
      suppressErrors(() => MapKnowledge.updateKnowledge());
    }

    suppressErrors(() => new SegmentScanner().run());

    // console.log('rooms', JSON.stringify(Game.rooms))
    for (let roomName in Game.rooms) {
      let room = Game.rooms[roomName];
      if (room.ai()) {
        suppressErrors(() => room.ai().run());
      }
    }

    new ConstructionSitesCleaner().run();

    suppressErrors(() => new ExpansionPlanner().run());

    suppressErrors(() => new TradeLogger().logTrades());
    suppressErrors(() => new PixelTrader().run());

    for (let operation of Operation.operations) {
      suppressErrors(() => operation.drawVisuals());
    }

    suppressErrors(() => new SegmentExport().run());

    for (let ui of RoomUI.all) {
      suppressErrors(() => ui.render());
    }

    suppressErrors(() => MapKnowledge.drawMapVisuals());
    suppressErrors(() => Memory.debugRoomScores && new ExpansionPlanner().drawRoomScores());

    ExpansionPlanner.sampleCpuUsage();

    globalStatistics.run();
    profitVisual.run();

    RawMemory.setActiveSegments([98, 99]);
    RawMemory.setPublicSegments([98]);
    RawMemory.setDefaultPublicSegment(98);

    Memory.lastCompletedTick = Game.time;
  });
};
