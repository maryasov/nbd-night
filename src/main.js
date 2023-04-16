const roles = [
    require("role.harvester"),
    require("role.miner"),
    require("role.linkCollector"),
    require("role.upgrader"),
    require("role.builder"),
    require("role.claimer"),
    require("role.conqueror"),
    require("role.reserver"),
    require("role.carrier"),
    require("role.guard"),
    require("role.defender"),
    require("role.ranger"),
    require("role.reloader"),
    // require("role.flagHunter"),
    require("role.attacker"),
    require("role.opener"),
    // require("role.dismantler"),
    require("role.healer"),
    require("role.hopper"),
    require("role.observer"),
    require("role.discoverer"),
    require("role.trader"),
    require("role.factoryWorker"),
    require("role.picker"),
    require("role.scooper"),
    require("role.powerFarmer"),
    require("role.powerRefiner"),
    require("role.mason"),
    require("role.mover"),
    require("role.scientist"),
    require("role.nukeOperator"),
    // require("role.downgrader"),
];

const powerRoles = [
    require("powerRole.factoryOperator"),
    require("powerRole.terminalOperator"),
    require("powerRole.extensionOperator"),
    require("powerRole.labOperator"),
    require("powerRole.spawnOperator")
];

const ConstructionSitesCleaner = require("cleaner.constructionSites");
const logistic = require("helper.logistic");

const globalStatistics = require("global.statistics");
const profitVisual = require("visual.roomProfit");

const PixelTrader = require("global.pixelTrader");
const SegmentExport = require("global.segmentExport");
const ShardTravel = require("global.shardTravel");
const TradeLogger = require("global.tradeLogger");

global.AbsolutePosition = require("global.absolutePosition");
global.ExpansionPlanner = require("global.expansionPlanner");
global.FriendList = require("global.friendList");
global.MapKnowledge = require("global.mapKnowledge");
global.RoomUI = require("global.roomui");
global.SegmentScanner = require("global.segmentScanner");

require("global.operation");


require("patch.controller");
require("patch.creep");
require("patch.powerCreep");
require("patch.room");

const profiler = require('screeps-profiler');
const structureTower = require("./structure.tower");
const movement = require("./helper.movement");
// profiler.enable();

const blockFlagRegex = /^b$/;
const exitFlagRegex = /^e$/;
const creepsStat = false;
let bucket = [];

const safeLimit = 250;
const commonLimit = 150;
const roleLimit = {
    builder: 25,
    attacker: -15,
    carrier: -15,
    mover: -15,
    observer: -20,
    scientist: 15,
    factoryWorker: -5,
    harvester: -20,
    healer: -35,
    powerFarmer: -35,
    upgrader: -5,
    picker: -35,
    reserver: -35,
    scooper: -35,
    linkCollector: -35,
    miner: -50,
    trader: -5,
}

const powerStop = [
    "builder",
    "attacker",
    "carrier",
    "mover",
    // "observer",
    // "scientist",
    "factoryWorker",
    "powerRefiner",
    // "harvester",
    // "healer",
    // "powerFarmer",
    "upgrader",
    "picker",
    "reserver",
    "discoverer",
    // "scooper",
    "linkCollector",
    // "miner",
    // "trader",
];

function suppressErrors(callback) {
    try {
        callback();
    } catch(error) {
        console.log('<span style="color: #faa">' + error.stack + '</span>');
    }
}

function runCreeps() {
    const bt = Game.cpu.bucket;
    let free = Math.max(Math.floor((safeLimit - bt)/safeLimit * 10), 0) / 2 + 1;
    const rls = {}

    // console.log('free', bt, free)
    for(let role of roles) {

        // const workFine = [];
        // const workIdle = [];

        let limit = (roleLimit[role.name] || 0) + commonLimit;

        if (bt < limit && role.name !== 'miner') {
            return
        }

        // console.log('-', role.name, limit)
        let creeps = _.filter(Game.creeps, (creep) => creep.memory.role == role.name && creep.ticksToLive !== undefined);

        // _.sortBy(creeps, (t) => t.memory.lastTick)
        creeps.sort((a, b)=>((a.memory.lastTick || 0)) - (b.memory.lastTick || 0))

        let cnt = creeps.length;
        let runLimit = cnt / free;
        if (Memory.powerOperation) {
            // console.log('po', role.name)
            if (powerStop.indexOf(role.name) > -1 && bt < 1000) {
                // console.log('list')
                if (Game.time % 4 === 0) {
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
        for(const [idx, creep] of creeps.entries()) {
            let mustBreake = false
            if (idx >= runLimit && role.name !== 'miner') {
                // rls[role.name] = {}
                // console.log('off', `role: ${role.name} cnt: ${cnt} limit: ${runLimit} free: ${free} idx: ${idx} bt: ${bt}`);
                // console.log('off', cnt, runLimit, free, idx, bt);
                if (!movement.isOnExit(creep)) {
                    mustBreake = true
                } else {
                    // movement.leaveExitRev(creep);
                    // console.log('creep', creep.memory.role, creep.pos.x, creep.pos.y);
                    // continue;
                }
            }
            if (movement.isOnExit(creep)) {
                mustBreake = false;
            }
            if (mustBreake) {
                continue;
            }
            if (creepsStat) {startCreeps = Game.cpu.getUsed();}
            suppressErrors(() => role.run(creep));
            if (creepsStat) {endCreeps = Game.cpu.getUsed();}
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

    for(let roleClass of powerRoles) {
        let creeps = _.filter(Game.powerCreeps, (creep) => creep.memory.role == roleClass.name);
        for(let creep of creeps) {
            let role = new roleClass(creep)
            if(creep.ticksToLive) {
                suppressErrors(() => role.run());
            } else {
                suppressErrors(() => role.runUnspawned());
            }
        }
    }
}

runCreeps = profiler.registerFN(runCreeps, 'Creep Actions');

module.exports.loop = function() {
    // profiler.wrap(function() {
        // globalStatistics.initialize();
        if(Memory.lastCompletedTick < Game.time - 1) {
            Memory.stats.skippedTicks += 1;
        }

        bucket.push(Game.cpu.bucket);
        if(Game.time % 10 === 0 && Game.cpu.bucket < 3000) {
            console.log("Bucket at " + JSON.stringify(bucket));
            bucket = [];
        }

        // if (Game.cpu.bucket < 150) {return;}

        // suppressErrors(() => ShardTravel.loadArrivals());
        // const startCreeps = Game.cpu.getUsed();
        runCreeps();
        // if (Game.cpu.getUsed() < 5) {
        //     runCreeps();
        // }
        // const endCreeps = Game.cpu.getUsed();
        // console.log(`Creeps time: ${endCreeps - startCreeps} ms`);
        // suppressErrors(() => ShardTravel.announceDepartures());

        // const gbt = Game.cpu.bucket;
        // let gfree = Math.max(Math.floor((1000 - bt)/10), 0) + 1;

        // const startLinks = Game.cpu.getUsed();
        for(let roomName in Game.rooms) {
            let room = Game.rooms[roomName];
            if(room.ai()) {
                suppressErrors(() => room.ai().runLite());
            }
        }
        // const endLinks = Game.cpu.getUsed();
        // console.log(`Links time: ${endLinks - startLinks} ms`);

        if (Game.cpu.bucket > 100) {
            // const startTowers = Game.cpu.getUsed();
            for (let roomName in Game.rooms) {
                let room = Game.rooms[roomName];

                for (let tower of room.find(FIND_MY_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_TOWER})) {
                    structureTower.run(tower);
                }
            }
            // const endTowers = Game.cpu.getUsed();
            // console.log(`Towers time: ${endTowers - startTowers} ms`);
        }

        if(Game.time % 100 == 51) {
            for(let name in Memory.creeps) {
                if(!Game.creeps[name]) {
                    delete Memory.creeps[name];
                }
            }
        }

        if (Game.cpu.bucket < safeLimit * 0.8 && Game.time % 10 !== 1) return;

        if (Game.cpu.bucket < 230) {return;}



        // if(Game.cpu.bucket < 1000 && Game.time % 2 === 0) return;

        if(Game.cpu.bucket < 1000 && Game.time % 10 !== 1) return;

        // console.log('Game.time % 2', Game.time % 2)

        if(Game.time % 10000 === 0) {
            logistic.cleanupCaches();
        }

        // console.log('Game.time % 10', Game.time % 10, Game.time % 100)


        for(let roomName in Game.rooms) {
            let room = Game.rooms[roomName];
            const _flags = room.find(FIND_FLAGS);
            let results = _.filter(_.map(_flags, (f) => ({ match: blockFlagRegex.exec(f.name), flag: f })), (m) => m.match);
            let resultsExits = _.filter(_.map(_flags, (f) => ({ match: exitFlagRegex.exec(f.name), flag: f })), (m) => m.match);

            for(let result of results) {
                if (result.flag.color == 1) {
                    const roomName = result.flag.room.name;
                    const flagPos = result.flag.pos
                    if (Memory.rooms[roomName] === undefined) {
                        Memory.rooms[roomName] = {};
                    }
                    if (Memory.rooms[roomName].blocks === undefined) {
                        Memory.rooms[roomName].blocks = [];
                    }
                    Memory.rooms[roomName].blocks = _.filter(Memory.rooms[roomName].blocks, (b)=> b.x !== flagPos.x || b.y !== flagPos.y);
                    Memory.rooms[roomName].blocks.push({x: flagPos.x, y: flagPos.y});
                }
                if (result.flag.color == 10) {
                    const roomName = result.flag.room.name;
                    const flagPos = result.flag.pos
                    if (Memory.rooms[roomName] === undefined) {
                        Memory.rooms[roomName] = {};
                    }
                    if (Memory.rooms[roomName].blocks === undefined) {
                        Memory.rooms[roomName].blocks = [];
                    }
                    Memory.rooms[roomName].blocks = _.filter(Memory.rooms[roomName].blocks, (b)=> b.x !== flagPos.x || b.y !== flagPos.y);
                }
                result.flag.remove();
            }
            for(let result of resultsExits) {
                if (result.flag.color === 1) {
                    const roomName = result.flag.room.name;
                    const flagPos = result.flag.pos
                    if (Memory.rooms[roomName] === undefined) {
                        Memory.rooms[roomName] = {};
                    }
                    if (Memory.rooms[roomName].exits === undefined) {
                        Memory.rooms[roomName].exits = [];
                    }
                    Memory.rooms[roomName].exits = _.filter(Memory.rooms[roomName].exits, (b)=> b.x !== flagPos.x || b.y !== flagPos.y);
                    Memory.rooms[roomName].exits.push({x: flagPos.x, y: flagPos.y});
                }
                if (result.flag.color === 10) {
                    const roomName = result.flag.room.name;
                    const flagPos = result.flag.pos
                    if (Memory.rooms[roomName] === undefined) {
                        Memory.rooms[roomName] = {};
                    }
                    if (Memory.rooms[roomName].exits === undefined) {
                        Memory.rooms[roomName].exits = [];
                    }
                    Memory.rooms[roomName].exits = _.filter(Memory.rooms[roomName].exits, (b)=> b.x !== flagPos.x || b.y !== flagPos.y);
                }
                result.flag.remove();
            }
        }

        if (Memory.enableAutoExpansion) {
            suppressErrors(() => MapKnowledge.updateKnowledge());
        }

        suppressErrors(() => new SegmentScanner().run());

        for(let operation of Operation.operations) {
            suppressErrors(() => operation.run());
        }

        for(let roomName in Game.rooms) {
            let room = Game.rooms[roomName];
            if(room.ai()) {
                suppressErrors(() => room.ai().run());
            }
        }

        new ConstructionSitesCleaner().run();

        suppressErrors(() => new ExpansionPlanner().run());

        suppressErrors(() => new TradeLogger().logTrades());
        suppressErrors(() => new PixelTrader().run());

        for(let operation of Operation.operations) {
            suppressErrors(() => operation.drawVisuals());
        }

        suppressErrors(() => new SegmentExport().run());

        for(let ui of RoomUI.all) {
            suppressErrors(() => ui.render());
        }

        // suppressErrors(() => MapKnowledge.drawMapVisuals());
        suppressErrors(() => Memory.debugRoomScores && new ExpansionPlanner().drawRoomScores());

        if(Memory.generatePixels && Game.cpu.bucket >= 9999) {
            Game.cpu.generatePixel();
        }

        ExpansionPlanner.sampleCpuUsage();

        globalStatistics.run();
        profitVisual.run();

        RawMemory.setActiveSegments([98, 99]);
        RawMemory.setPublicSegments([98]);
        RawMemory.setDefaultPublicSegment(98);

        Memory.lastCompletedTick = Game.time;
    // });
}
