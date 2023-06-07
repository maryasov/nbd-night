const boosting = require('helper.boosting');
const logistic = require('helper.logistic');
const movement = require('helper.movement');
const renew = require('helper.renew');
const recycle = require('helper.recycle');

const fullHealthEquiv = 10000;
const emergencyHitPercent = 0.3;

const highPriorityStructures = [
  STRUCTURE_LINK,
  /*STRUCTURE_STORAGE,*/ STRUCTURE_EXTENSION,
  STRUCTURE_ROAD,
  /*STRUCTURE_CONTAINER,*/ STRUCTURE_SPAWN,
  STRUCTURE_TOWER,
  STRUCTURE_WALL,
];

module.exports = {
  name: 'builder',
  configs: function (workParts) {
    var configs = [];
    for (let work = workParts; work >= 1; work -= 1) {
      let carry = Math.floor(work * 2);
      let move = work + carry;
      let config = Array(work).fill(WORK).concat(Array(carry).fill(CARRY)).concat(Array(move).fill(MOVE));
      if (config.length <= 50) configs.push(config);
    }

    // TODO: probably more handcrafted configs for low tiers?

    return configs;
  },
  run: function (creep) {
    if (recycle.check(creep)) return;
    if (renew.check(creep)) return;
    if (creep.memory.room && creep.room.name !== creep.memory.room) {
      movement.moveToRoom(creep, creep.memory.room);
      return;
    } else if (movement.isOnExit(creep)) {
      movement.leaveExit(creep);
    }

    // if(boosting.accept(creep, "XLH2O")) {
    //     return;
    // }
    if (creep.body[0].type === WORK) {
      if (boosting.accept(creep, 'XLH2O', 'LH2O')) return;
    }

    // console.log('bld', JSON.stringify(Game.getObjectById(creep.memory.lastTarget)))

    const trg = Game.getObjectById(creep.memory.lastTarget);
    if (trg) {
      if (Game.rooms[creep.room.name].ai().mode === 'way') {
        if (trg.structureType == 'constructedWall' && trg.hits > 100000) {
          creep.memory.lastTarget = null;
          console.log(1);
        }
      } else {
        if (trg.structureType == 'constructedWall') {
          creep.memory.lastTarget = null;
          console.log(2);
        }
      }
    }

    if (creep.memory.building && creep.store.energy == 0) {
      creep.memory.building = false;
      const trg = Game.getObjectById(creep.memory.lastTarget);
      // console.log('trg', JSON.stringify(trg))
      if (trg) {
        if (Game.rooms[creep.room.name].ai().mode === 'way') {
          if (trg.structureType == 'constructedWall' && trg.hits > 100000) {
            creep.memory.lastTarget = null;
            console.log(3);
          }
        } else {
          if (trg.structureType == 'constructedWall' || trg.structureType == 'rampart') {
            creep.memory.lastTarget = null;
            console.log(4);
          }
        }
      }
    }
    if (!creep.memory.building && creep.store.energy == creep.store.getCapacity()) {
      creep.memory.building = true;
    }

    if (creep.memory.building) {
      var target = this.chooseTarget(creep);

      this.constructOrRepair(creep, target);
    } else {
      //console.log(`store: ${creep.room.storage} ${creep.room.storage.store.energy}`);
      if (creep.room.storage) {
        if (creep.room.storage.store.energy > 3000) {
          this.harvestEnergy(creep);
        }
      } else {
        this.harvestEnergy(creep);
      }
    }

    // if (creep.memory.noTargetsSinc && Game.time - creep.memory.noTargetsSinc > 50 && !creep.memory.renew) {
    //   creep.memory.goRecycle = true;
    // }
  },
  chooseTarget: function (creep) {
    let lastTarget = Game.getObjectById(creep.memory.lastTarget);
    if (lastTarget) {
      if (
        this.isConstructionSite(lastTarget) ||
        (!this.isConstructionSite(lastTarget) && lastTarget.hits < lastTarget.hitsMax)
      ) {
        return lastTarget;
      }
    }

    let constructions = _.sortBy(creep.room.find(FIND_MY_CONSTRUCTION_SITES), (cs) => cs.pos.getRangeTo(creep.pos));
    let target;
    if (Game.rooms[creep.room.name].ai().mode === 'way') {
      target = this.getAllTargets(creep, constructions);
    } else {
      target = this.getConstructionTargets(creep, constructions);
    }

    return target;
  },
  getConstructionTargets: function (creep, constructions) {
    return (
      this.findHighPriorityConstructionTarget(creep, constructions) ||
      this.findNormalPriorityConstructionTarget(creep, constructions) ||
      this.findLowPriorityConstructionTarget(creep, constructions)
    );
  },
  getAllTargets: function (creep, constructions) {
    return (
      this.findEmergencyRepairTarget(creep) ||
      this.findHighPriorityConstructionTarget(creep, constructions) ||
      this.findNormalPriorityConstructionTarget(creep, constructions) ||
      this.findLowPriorityConstructionTarget(creep, constructions) ||
      this.findNormalRepairTarget(creep)
    );
  },
  findHighPriorityConstructionTarget: function (creep, constructions) {
    return _.find(constructions, (cs) => highPriorityStructures.includes(cs.structureType));
  },
  findNormalPriorityConstructionTarget: function (creep, constructions) {
    let terrain = creep.room.getTerrain();
    return _.find(
      constructions,
      (cs) =>
        (cs.structureType !== STRUCTURE_ROAD || terrain.get(cs.pos.x, cs.pos.y) === TERRAIN_MASK_SWAMP) &&
        cs.structureType != STRUCTURE_RAMPART
    );
  },
  findLowPriorityConstructionTarget: function (creep, constructions) {
    return _.find(constructions, (cs) => cs.structureType == STRUCTURE_ROAD || cs.structureType == STRUCTURE_RAMPART);
  },
  findNormalRepairTarget: function (creep) {
    let supplyNominal = creep.room.storage && creep.room.storage.store.energy >= 10000;
    if (Game.rooms[creep.room.name].ai().mode === 'way') {
      supplyNominal = true;
    }
    var targets = creep.room.find(FIND_STRUCTURES, {
      filter: function (structure) {
        return (
          structure.hits < structure.hitsMax &&
          (supplyNominal || structure.hits < fullHealthEquiv) &&
          (structure.structureType != STRUCTURE_ROAD || structure.hits / structure.hitsMax <= 0.8) &&
          structure.structureType != STRUCTURE_CONTROLLER
        );
      },
    });
    if (targets.length > 0) {
      return _.sortBy(targets, (t) => t.hits / _.min([t.hitsMax, fullHealthEquiv]))[0];
    }

    return null;
  },
  findEmergencyRepairTarget: function (creep) {
    var that = this;
    var targets = creep.room.find(FIND_STRUCTURES, {
      filter: function (structure) {
        return (
          structure.hits < that.emergencyHitpoints(structure) &&
          structure.hits / structure.hitsMax < emergencyHitPercent &&
          structure.structureType != STRUCTURE_CONTROLLER
        );
      },
    });
    if (targets.length > 0) {
      var targetsByDistance = _.sortBy(targets, (t) => creep.pos.getRangeTo(t));
      return _.sortBy(targetsByDistance, (t) => t.hits)[0];
    }

    return null;
  },
  emergencyHitpoints: function (structure) {
    if (structure.structureType == STRUCTURE_CONTAINER) {
      return 10000;
    } else {
      return 1500;
    }
  },
  constructOrRepair: function (creep, target) {
    if (!target) {
      creep.memory.stopped = true;
      if (!creep.memory.noTargetsSinc) {
        creep.memory.noTargetsSinc = Game.time;
      }
      return;
    } else {
      delete creep.memory.noTargetsSinc;
    }
    var result;

    if (this.isConstructionSite(target)) {
      result = creep.build(target);
    } else {
      result = creep.repair(target);
    }

    if (result == OK) {
      // lock onto target as soon as actual work is happening
      creep.memory.lastTarget = target.id;
      creep.memory.stopped = true;
    } else if (result == ERR_NOT_IN_RANGE) {
      creep.goTo(target, { range: 3 });
      creep.memory.stopped = false;
    }
  },
  recycle: function (creep) {
    let spawns = creep.room.find(FIND_MY_SPAWNS);
    let spawn = spawns[0];
    var result;

    result = spawn.recycleCreep(creep);

    if (result == OK) {
      console.log('recycled builder');
    } else if (result == ERR_NOT_IN_RANGE) {
      creep.goTo(spawn);
    }
  },
  isConstructionSite: function (target) {
    return !target.hits;
  },
  harvestEnergy: function (creep) {
    var source = creep.pos.findClosestByRange(FIND_SOURCES);
    let result = logistic.obtainEnergy(creep, source, true, true);
    if (result == logistic.obtainResults.withdrawn) {
      creep.memory.building = true;
    }
  },
};

const profiler = require('screeps-profiler');
profiler.registerObject(module.exports, 'builder');
