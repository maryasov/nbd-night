module.exports = class VirtualsAspect {
    constructor(roomai) {
        this.roomai = roomai;
        this.room = roomai.room;
    }

    run() {
        this.roomai.virtuals.addBuildings();
        this.roomai.virtuals.removeBuildings();

        for(let building of this.roomai.virtuals.buildings) {
            if (!Memory.noOutline && this.roomai.mode !== "store") {building.outline();}
        }

        this.roomai.virtuals.drawDebugMarkers();
    }
}

const profiler = require("screeps-profiler");
profiler.registerClass(module.exports, 'VirtualsAspect');
