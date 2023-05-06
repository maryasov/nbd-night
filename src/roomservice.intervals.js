module.exports = class Intervals {
  constructor() {
    this.transferResources = new Interval(10);
    this.buildStructure = new Interval(10);
    this.scanRooms = new Interval(1500);
    this.planRemoteMines = new Interval(1500);
  }
};

class Interval {
  constructor(period) {
    this.period = period;
    this.age = Game.time % this.period;
  }

  isActive() {
    // console.log('this.age', this.age)
    return this.age === 1;
  }

  isActiveIn(ticks) {
    // wrap high tick length into the length of a period
    let leadTime = ticks % this.period;

    return this.age === (this.period - leadTime) % this.period;
  }
}

const profiler = require('screeps-profiler');
profiler.registerClass(Interval, 'Intervals.Interval');
profiler.registerClass(module.exports, 'Intervals');
