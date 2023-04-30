const BuildProxy = require("construction.buildproxy");

module.exports = class VirtualsAspect {
    constructor(roomai) {
        this.roomai = roomai;
        this.room = roomai.room;
    }

    run() {
        // if (this.room.name === 'W8N7') {
        //     console.log('const asp', this.room)
        // }
        // this.roomai.virtuals.addBlocks();
        this.roomai.virtuals.addBuildings();
        this.roomai.virtuals.removeBuildings();

        let buildProxy = new BuildProxy(this.room);
        for(let building of this.roomai.virtuals.buildings) {
            if (!Memory.noOutline && this.roomai.mode !== "store") {building.outline();}
            // if(this.roomai.intervals.buildStructure.isActive()) {
            //     building.build(buildProxy);
            // }
        }

        // if(this.roomai.intervals.buildStructure.isActive()) {
        //     buildProxy.commit();
        // }

        this.roomai.virtuals.drawDebugMarkers();
    }
}

const profiler = require("screeps-profiler");
profiler.registerClass(module.exports, 'VirtualsAspect');
