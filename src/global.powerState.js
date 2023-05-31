const segmentImports = [require('segmentimport.trading')];

module.exports = class PowerState {
  static setActive(value) {
    Memory.powerOperation = value;
  }

  static get isActive() {
    if (!Memory.activeMines) {
      Memory.activeMines = [];
    }
    if (!Memory.terminateMines) {
      Memory.terminateMines = [];
    }
    if (Memory.powerOperation) return true;
    if (Memory.activeMines.length) return true;
    if (Memory.terminateMines.length) return true;
    return false;
  }

  constructor() {

  }

  run() {}
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'PowerState');
