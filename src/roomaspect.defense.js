const spawnHelper = require('helper.spawning');
const guard = require('role.guard');
const reloader = require('role.reloader');

const keyStructures = [STRUCTURE_SPAWN, STRUCTURE_STORAGE, STRUCTURE_TOWER, STRUCTURE_EXTENSION];

const protectedStructures = [
  STRUCTURE_SPAWN,
  //STRUCTURE_EXTENSION,
  STRUCTURE_LINK,
  STRUCTURE_STORAGE,
  STRUCTURE_TOWER,
  STRUCTURE_POWER_SPAWN,
  STRUCTURE_LAB,
  STRUCTURE_TERMINAL,
  STRUCTURE_CONTAINER,
  STRUCTURE_NUKER,
  STRUCTURE_OBSERVER,
];

module.exports = class DefenseAspect {
  constructor(roomai) {
    this.roomai = roomai;
    this.room = roomai.room;
    this.defense = roomai.defense;
  }

  run() {
    this.engageSafeMode();
    this.checkNukes();
    this.buildRamparts();
    this.defense.updateDefcon();
    this.defense.displayDefcon();
    if (this.roomai.mode === 'store') {
      return;
    }


    if (this.defense.defcon < 3) {
      // keep a reserve on stock unless boosters are otherwise needed
      // XKH2O 150 - carry +150%
      // XUHO2 150 - harvest +600%
      // XLH2O 150 - build +100%
      // XLHO2 150 - heal +300%
      // XUH2O 10 - boost power miners
      //
      // this.roomai.labs.requestBoost('XUH2O', 150);
      // this.roomai.labs.requestBoost('XLHO2', 149);
      // this.roomai.labs.requestBoost('XKH2O', 148);
      this.roomai.labs.unloadBoost('XUH2O');
      this.roomai.labs.unloadBoost('XLHO2');
      this.roomai.labs.unloadBoost('XKH2O');
    } else {
      this.roomai.labs.requestBoost('XUH2O', 80);
      this.roomai.labs.requestBoost('XLHO2', 79);
      this.roomai.labs.requestBoost('XKH2O', 78);
    }

    // low-level rooms can't spawn anything meaningful in defense anyways
    if (this.room.controller.level < 4) return;

    if (spawnHelper.localCreepsWithRole(this.roomai, reloader.name).length < 1 && this.room.controller.level >= 4) {
      let towers = this.room.find(FIND_MY_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_TOWER,
          })

      let allCapacity = 0;
      let freeCapacity = 0;
      _.forEach(towers, (tower) => {
        // console.log('tow', JSON.stringify(tower))
        allCapacity += tower.energyCapacity;
        freeCapacity += tower.energyCapacity - tower.energy;
      });
      let perc = Math.floor((freeCapacity * 100) / allCapacity)
      // console.log('rel', allCapacity, freeCapacity, perc)
      if (perc > 40) {
        this.roomai.spawn(reloader.parts, { role: reloader.name, renew: true });
      }
    }


    if (this.defense.defcon < 1) return;

    if (!this.roomai.canSpawn()) return;

    if (spawnHelper.localCreepsWithRole(this.roomai, reloader.name).length < 1 && this.room.controller.level >= 4) {
      this.roomai.spawn(reloader.parts, { role: reloader.name });
    }

    if (this.defense.defcon < 2) return;

    // TODO: determine number of defenders in a useful way
    if (spawnHelper.localCreepsWithRole(this.roomai, guard.name).length < 2) {
      let parts = spawnHelper.bestAvailableParts(this.room, guard.configs(), true);
      this.roomai.spawn(parts, { role: guard.name });
    }
  }

  engageSafeMode() {
    let controller = this.room.controller;
    if (controller.safeMode || controller.upgradeBlocked || controller.level < 6) return;
    if (
      this.room.find(FIND_MY_STRUCTURES, {
        filter: (s) => keyStructures.includes(s.structureType) && s.hits / s.hitsMax < 0.95,
      }).length == 0
    )
      return;
    if (_.filter(this.defense.hostiles, (c) => c.owner.username !== 'Invader').length == 0) return;

    controller.activateSafeMode();
    Game.notify('Safe mode engaged in room ' + this.room.name + ' (RCL ' + controller.level + ')');
  }

  checkNukes() {
    let nukes = this.room.find(FIND_NUKES, { filter: (n) => n.timeToLand > NUKE_LAND_TIME - 5 });
    for (let nuke of nukes) {
      Game.notify('Nuke incoming at ' + this.room.name + ' (Origin: ' + nuke.launchRoomName + ')');
    }
  }

  buildRamparts() {
    if (!this.roomai.intervals.buildStructure.isActive()) {
      return;
    }

    if (this.room.controller.level < 4) return;

    for (let structure of this.room.find(FIND_STRUCTURES, {
      filter: (s) => protectedStructures.includes(s.structureType),
    })) {
      this.room.createConstructionSite(structure.pos, STRUCTURE_RAMPART);
    }
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'DefenseAspect');
