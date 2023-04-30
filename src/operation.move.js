const ff = require("helper.friendFoeRecognition");
const spawnHelper = require("helper.spawning");
const mover = require("role.mover");

module.exports = class MoveOperation extends Operation {
    constructor(memory) {
        super(memory);

        if(!this.memory.moverCount) this.memory.moverCount = 1;
        if(this.memory.timeout) {
            this.memory.terminateAfterTick = Game.time + this.memory.timeout;
            delete this.memory.timeout;
        }
    }

    get targetRoom() {
        return Game.rooms[this.memory.target];
    }

    run() {
        if(this.memory.terminateAfterTick && Game.time > this.memory.terminateAfterTick) {
            Operation.removeOperation(this);
        }

        if(this.memory.terminateWhenEmpty) {
            if(this.targetRoom) {
                let targetRoom = this.targetRoom;
                let storageEmpty = targetRoom.storage && _.sum(targetRoom.storage.store) === 0;
                let terminalEmpty = targetRoom.terminal && _.sum(targetRoom.terminal.store) === 0;
                let noStores = !targetRoom.storage && !targetRoom.terminal;
                if(noStores || (storageEmpty && terminalEmpty)) {
                    Operation.removeOperation(this);
                }
            }
        }

        if(this.memory.waitForClear) {
            this.wait = true;
            if(this.targetRoom) {
                let hostilesPresent = ff.findHostiles(this.targetRoom).length > 0;
                let towersPresent = this.targetRoom.find(FIND_HOSTILE_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_TOWER }).length > 0;

                if(!hostilesPresent && !towersPresent) this.wait = false;
            }
        }
    }

    supportRoomCallback(room) {
        let roomai = room.ai();

        if(this.memory.waitForClear && roomai.observer.isAvailable()) {
            if(Game.time % 10 === 0) roomai.observer.observeLater(this.memory.targetRoom);
        }

        if(!roomai.canSpawn()) return;
        if(this.wait) return;

        let movers = _.filter(spawnHelper.globalCreepsWithRole(mover.name), (c) => c.memory.operation === this.id);

        if(movers.length < this.memory.moverCount) {
            roomai.spawn(spawnHelper.bestAvailableParts(room, mover.configsForCapacity(2000)), { role: mover.name, home: this.memory.home, target: this.memory.target, support: this.memory.supportRoom, resource: this.memory.resource, operation: this.id, renew: true });
        }
    }

    drawVisuals() {
        let targetRoom = this.memory.target;
        if(targetRoom) {
            let caption = `Moving from ${this.memory.target} to ${this.memory.home} by ${this.memory.supportRoom} with ${this.memory.moverCount} movers`;
            let options = {};
            if(this.wait) {
                caption = `${caption} (waiting)`;
                options = { color: "#ccc" };
            }

            RoomUI.forRoom(targetRoom).addRoomCaption(caption, options);
        }
    }
}

const profiler = require("screeps-profiler");
const carrier = require("./role.carrier");
profiler.registerClass(module.exports, 'MoveOperation');
