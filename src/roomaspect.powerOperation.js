const autopowerSpawnFlagRegex = /^autoPowerSpawn$/;
const autopowerFlagRegex = /^autoPower([A-Z0-9]+)$/;
const operation = require('operation.farmPower');

module.exports = class ManualOperationsAspect {
  constructor(roomai) {
    this.roomai = roomai;
    this.room = roomai.room;
  }

  run() {
    let spawnFlagMatch = _.filter(
      _.map(this.room.find(FIND_FLAGS), (f) => ({ match: autopowerSpawnFlagRegex.exec(f.name), flag: f })),
      (m) => m.match
    ).shift();
    if (spawnFlagMatch) {
      let spawnFlag = Game.flags[spawnFlagMatch.match[0]];
      // console.log('chk mo', this.room.name, spawnFlag.color, JSON.stringify(spawnFlagMatch));
      if (spawnFlag.color === 10) {
        for (let activeMine of Memory.activeMines) {
          // console.log('flag', JSON.stringify(result));
          let targetFlag = Game.flags['autoPower' + activeMine.room];
          if (!targetFlag) return;
          let opId = targetFlag.memory.id;
          // console.log('man', this.room, room, opName, opId, targetFlag, targetFlag.color, JSON.stringify(spawnFlag));
          // console.log('targetFlag', JSON.stringify(targetFlag))
          if (operation && targetFlag) {
            new operation(this.roomai, targetFlag, targetFlag && targetFlag.color, opId).run();
          }
        }

      }
    }
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'ManualOperationsAspect');
