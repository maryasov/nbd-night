const movement = require("helper.movement");

module.exports = {
    name: "claimer",
    parts: [CLAIM, MOVE, MOVE], // TODO: how much to move over swamp without issue?
    run: function(creep) {
        let target = AbsolutePosition.deserialize(creep.memory.target);
        if(creep.room.name != target.roomName) {
            creep.goTo(target);
            return;
        }

        target = creep.room.controller;
        let claimResult = creep.claimController(target);

        if(claimResult == OK || claimResult == -7) {
            let text
            switch (creep.owner.username) {
                case 'MaxWagner':
                    text = 'Explored by Max';
                    break;
                case 'DISconnect24':
                    text = 'Owned by DIS';
                    break;
                case 'MonstrikSupra':
                    text = 'NO FATE';
                    break;
                default:
            }
            if(!target.sign || target.sign.username !== creep.owner.username || target.sign.text !== text) {
                let res = creep.signController(target, text);
            }
        } else if(claimResult == ERR_NOT_IN_RANGE) {
            creep.goTo(target);
        }
    }
};

const profiler = require("screeps-profiler");
profiler.registerObject(module.exports, 'claimer');
