module.exports = {
    outline: function(room, block) {
        let x = block.x,
            y = block.y;

        room.visual.circle(x, y, { stroke: "#fd2600", radius: 0.25, fill: null });
    },
    build: function(proxy, block, roomai) {
        // proxy.planConstruction(block.x, block.y, STRUCTURE_LAB);
        // let lab = _.find(roomai.labs.all, (l) => l.pos.x === block.x && l.pos.y === block.y);
        // if(lab) roomai.labs.setBooster(lab);
    },
    updateCostMatrix: function(matrix, block) {
        matrix.set(block.x, block.y, 255);
    },
    addBuilding: function(memory, flag) {
        // console.log('addBuilding', JSON.stringify(flag))
        memory.push({ x: flag.pos.x, y: flag.pos.y });
    },
    removeBuilding: function(memory, flag) {
        let index = _.findIndex(memory, (p) => p.x == flag.pos.x && p.y == flag.pos.y);
        if(index >= 0) memory.splice(index, 1);
    }
};

const profiler = require("screeps-profiler");
profiler.registerObject(module.exports, 'construction.block');