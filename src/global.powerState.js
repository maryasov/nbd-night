const segmentImports = [require('segmentimport.trading')];

module.exports = class PowerState {
  static setActive(value) {
    Memory.powerOperation = value;
  }

  static get isActive() {
    if (Memory.powerOperation) return true;
    if (Memory.activeMines.length) return true;
    if (Memory.terminateMines.length) return true;
    return false;
  }

  constructor() {
    if (!Memory.segmentScanner) {
      Memory.segmentScanner = {
        lastScan: 0,
        partners: [],
      };
    }

    this.memory = Memory.segmentScanner;
    if (!this.memory.partners) this.memory.partners = [];
  }

  run() {}
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'PowerState');
