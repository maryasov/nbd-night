const aspects = [require('roomaspect.virtuals')];

// const structureTower = require("structure.tower");

const Virtuals = require('roomservice.virtuals');
// const Intervals = require("roomservice.intervals");

module.exports = class RoomAILite {
  constructor(room) {
    this.room = room;
    this.virtuals = new Virtuals(room);
    // this.intervals = new Intervals();
  }

  run() {
    for (let aspect of aspects) {
      new aspect(this).run();
    }

    // this.renderModeOverlay();
  }

  // renderModeOverlay() {
  //     RoomUI.forRoom(this.room).addRoomCaption(`Mode: ${this.mode}`);
  // }

  toString() {
    return '[RoomAI ' + this.room.name + ']';
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'RoomAILite');
