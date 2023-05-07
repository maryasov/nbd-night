const spawnFlagRegex = /^spawn([A-Za-z]+)([0-9]+)$/;
const operations = {
  deposits: require('operation.farmDeposits'),
  ranger: require('operation.ranger'),
};

module.exports = class ManualOperationsAspect {
  constructor(roomai) {
    this.roomai = roomai;
    this.room = roomai.room;
  }

  run() {
    let results = _.filter(
      _.map(this.room.find(FIND_FLAGS), (f) => ({ match: spawnFlagRegex.exec(f.name), flag: f })),
      (m) => m.match
    );
    // console.log('chk mo', this.room.name, JSON.stringify(results));
    for (let result of results) {
      // console.log('flag', JSON.stringify(result));
      let opName = result.match[1].toLowerCase();
      let opId = result.match[2];
      let targetFlag = Game.flags[opName + opId];
      let operation = operations[opName];
      // console.log('man', opName, opId, targetFlag, operation && (targetFlag || operation.canSkipFlag), JSON.stringify(result));
      // console.log('targetFlag', JSON.stringify(targetFlag))
      if (operation && (targetFlag || operation.canSkipFlag)) {
        new operation(this.roomai, targetFlag, targetFlag && targetFlag.color, opId).run();
      }
    }
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'ManualOperationsAspect');
