const spawnHelper = require('helper.spawning');
const opener = require('role.opener');
const dismantler = require('role.dismantler');
const healer = require('role.healer');

const keyStructures = [STRUCTURE_SPAWN, STRUCTURE_TOWER];
const prioritizedStructures = [STRUCTURE_RAMPART];
const coveredStructures = [
  STRUCTURE_LAB,
  STRUCTURE_STORAGE,
  STRUCTURE_POWER_BANK,
  STRUCTURE_TERMINAL,
  STRUCTURE_CONTAINER,
  STRUCTURE_FACTORY,
];

module.exports = class AttackOperation extends Operation {
  constructor(memory) {
    super(memory);

    if (!this.memory.openerCount) this.memory.openerCount = 1;
    if (this.memory.attackRole !== 'dismantler') this.memory.attackRole = 'opener';
    if (this.memory.timeout) {
      this.memory.terminateAfterTick = Game.time + this.memory.timeout;
      delete this.memory.timeout;
    }
  }

  get targetPosition() {
    if (!this.memory.targetPosition) return null;
    return AbsolutePosition.deserialize(this.memory.targetPosition);
  }

  set targetPosition(pos) {
    this.memory.targetPosition = pos.toJSON();
  }

  get attackRole() {
    return this.memory.attackRole === 'opener' ? opener : dismantler;
  }

  run() {
    if (this.memory.terminateAfterTick && Game.time > this.memory.terminateAfterTick + CREEP_LIFE_TIME) {
      Operation.removeOperation(this);
    }

    if (this.memory.terminateAfterSuccess && this.targetPosition.room) {
      const covered = creep.room
        .find(FIND_STRUCTURES, { filter: (s) => coveredStructures.includes(s.structureType) })
        .map((e) => ({ x: e.pos.x, y: e.pos.y }));
      if (
        this.targetPosition.room.find(FIND_STRUCTURES, {
          filter: (s) =>
            prioritizedStructures.includes(s.structureType) &&
            covered.filter((b) => b.x == s.pos.x && b.y == s.pos.y).length > 0,
        }).length === 0
      ) {
        Operation.removeOperation(this);
        Operation.createOperation('scoop', {
          supportRoom: 'W29S11',
          targetRoom: 'W29S19',
          scooperCount: 15,
          terminateWhenEmpty: true,
        });
      }
    }

    this.openers = _.filter(
      spawnHelper.globalCreepsWithRole(this.attackRole.name),
      (c) => c.memory.operation === this.id
    );
    if (!this.memory.nextWaveAt || this.memory.nextWaveAt < Game.time) {
      this.memory.nextWaveAt = Game.time + CREEP_LIFE_TIME;
      this.memory.missingAttackers = this.memory.openerCount;
    }
  }

  supportRoomCallback(room) {
    if (!this.isValid()) return;

    let roomai = room.ai();

    this.requestBoosts(roomai);

    if (this.memory.terminateAfterTick && Game.time > this.memory.terminateAfterTick) return;

    if (this.memory.useHeal) this.spawnHealers(roomai);

    if (this.memory.missingAttackers > 0) {
      let memory = { role: this.attackRole.name, target: this.targetPosition, operation: this.id };
      let configs = this.attackRole.configs();
      if (this.memory.useHeal) memory['waitFor'] = true;
      if (this.memory.useTough) configs = [this.attackRole.toughConfig(15)];

      let spawnResult = roomai.spawn(spawnHelper.bestAvailableParts(roomai.room, configs), memory);
      if (_.isString(spawnResult)) {
        this.memory.missingAttackers -= 1;
      }
    }
  }

  drawVisuals() {
    let targetPos = this.targetPosition;
    if (targetPos) {
      let visual = new RoomVisual(targetPos.roomName);

      visual.text(`X`, targetPos.x, targetPos.y, { align: 'center', color: '#f00', stroke: '#000' });
      RoomUI.forRoom(targetPos.roomName).addRoomCaption(
        `Opening from ${this.memory.supportRoom} with ${this.memory.openerCount} ${this.attackRole.name}s`
      );
      RoomUI.forRoom(this.memory.supportRoom).addRoomCaption(
        `Opening ${targetPos.roomName} with ${this.memory.openerCount} ${this.attackRole.name}s (next wave in ${
          this.memory.nextWaveAt - Game.time
        })`
      );
    }
  }

  requestBoosts(roomai) {
    roomai.labs.requestBoost(this.attackRole.mainBoost, 40);
    if (this.memory.useHeal) roomai.labs.requestBoost('XLHO2', 50);
    if (this.memory.useTough) {
      roomai.labs.requestBoost('XGHO2', 45);
      roomai.labs.requestBoost('XZHO2', 44);
    }
  }

  spawnHealers(roomai) {
    let healers = spawnHelper.globalCreepsWithRole(healer.name);
    for (let openerCreep of this.openers) {
      if (!_.any(healers, (c) => c.memory.target === openerCreep.name)) {
        let healerParts = spawnHelper.bestAvailableParts(
          roomai.room,
          healer.configs({ minHeal: 5, maxHeal: 25, healRatio: 1 })
        );
        if (this.memory.useTough) healerParts = healer.toughConfig(15);
        let spawnResult = roomai.spawn(healerParts, {
          role: healer.name,
          target: openerCreep.name,
          operation: this.id,
        });
        if (_.isString(spawnResult)) {
          openerCreep.memory.waitFor = spawnResult;
        }
      }
    }
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'OpenerOperation');
