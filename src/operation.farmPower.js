const boosting = require('helper.boosting');
const spawnHelper = require('helper.spawning');
const observer = require('role.observer');
const healer = require('role.healer');
const powerFarmer = require('role.powerFarmer');
const scooper = require('role.scooper');

module.exports = class FarmPowerOperation {
  constructor(roomai, targetFlag, count, operation) {
    this.roomai = roomai;
    this.room = roomai.room;
    this.operation = operation;
    this.targetRoomName = targetFlag.pos.roomName;
    this.targetFlag = targetFlag;
    this.farmerCount = count > 5 ? 1 : count;
  }

  run() {
    //TODO go to recycle on white flag
    if (!this.roomai.canSpawn()) return;
    if (this.roomai.defense.defcon >= 4) return;

    let targetRoom = Game.rooms[this.targetRoomName];
    //console.log('targetRoom', targetRoom, this.targetRoomName)
    let powerBank =
      targetRoom &&
      targetRoom.find(FIND_STRUCTURES, { filter: (s) => s.structureType == STRUCTURE_POWER_BANK }).shift();

    // console.log('powerBank', JSON.stringify(powerBank))

    let observers = spawnHelper.globalCreepsWithRole(observer.name);
    let roomObservers = _.any(observers, (c) => c.room == this.targetRoomName);
    let targetObservers = _.any(observers, (c) => c.memory.target == this.targetRoomName);
    let healers = spawnHelper.globalCreepsWithRole(healer.name);
    let farmers = _.filter(
      spawnHelper.globalCreepsWithRole(powerFarmer.name),
      (c) => c.memory.operation == this.operation
    );
    let dropedPower = false;
    // let harvesterNum = spawnHelper.numberOfLocalCreeps(this.roomai, 'harvester');
    let scoopers = _.filter(spawnHelper.globalCreepsWithRole('scooper'), (c) => c.memory.operation == this.operation);

    if (this.roomai.observer.isAvailable() && !targetObservers && !roomObservers) {
      // console.log('observer.isAvailable');
      // this.roomai.observer.observeLater(this.targetRoomName);
      // let resObs = this.roomai.observer.observeNow(this.targetRoomName);
      // console.log('observe now', targetRoom, this.targetRoomName, resObs, powerBank)
    }

    // fix target
    for (let farmerCreep of farmers) {
      if (Game.creeps[farmerCreep.name].memory.target !== this.targetRoomName) {
        Game.creeps[farmerCreep.name].memory.target = this.targetRoomName;
      }
    }

    for (let scooperCreep of scoopers) {
      if (Game.creeps[scooperCreep.name].memory.target !== this.targetRoomName) {
        Game.creeps[scooperCreep.name].memory.target = this.targetRoomName;
        Game.creeps[scooperCreep.name].memory.targetPos = this.targetFlag.pos;
      }
    }

    // for(let healerCreep of healers) {
    //     let dist = healerCreep.pos.getRangeTo(this.targetFlag);
    //     if (dist < 2) {
    //         console.log('healerCreep too close', healerCreep.name, dist);
    //         let dir = healerCreep.pos.getDirectionTo(this.targetFlag)
    //         let opDir = inverseDirection(dir);
    //         healerCreep.cancelOrder('heal');
    //         let res = healerCreep.move(opDir);
    //         console.log('healerCreep pos', healerCreep.pos, this.targetFlag.pos, dist, dir, opDir, res);
    //         return;
    //     }
    // }

    //extra harvesters
    // console.log('harvesterNum', harvesterNum)
    // if (harvesterNum < 4) {
    //     var partConfigs = harvester.carryConfigs;
    //     let parts = spawnHelper.bestAffordableParts(this.room, partConfigs);
    //     let source = this.room.find(FIND_SOURCES)[0];
    //     var memory = { role: 'harvester', source: source.id }
    //     var res = this.roomai.spawn(parts, memory);
    // }

    for (let farmerCreep of farmers) {
      if (!_.any(healers, (c) => c.memory.target == farmerCreep.name)) {
        // console.log(JSON.stringify(farmerCreep))
        let healerParts;
        if (this.room.controller.level < 8) {
          healerParts = spawnHelper.makeParts(18, HEAL, 10, MOVE);
        } else {
          healerParts = spawnHelper.makeParts(25, MOVE, 25, HEAL);
        }

        let res = this.roomai.spawn(healerParts, {
          role: healer.name,
          target: farmerCreep.name,
          home: this.room.name,
          operation: this.operation,
          targetType: 'powerFarmer',
        });
        // console.log('res', res)
      }
    }

    // console.log('targetRoomName', this.targetRoomName);

    if (!powerBank) {
      let farmersInRoom = _.filter(
        spawnHelper.globalCreepsWithRole(powerFarmer.name),
        (c) => c.room.name == this.targetRoomName
      );
      //console.log('farmersInRoom', farmersInRoom.length)
      if (farmersInRoom.length > 0) {
        let farmer = farmersInRoom[0];
        let droped = farmer.room.find(FIND_DROPPED_RESOURCES, { filter: (t) => t.resourceType === 'power' });
        if (droped.length > 0) {
          let amount = droped[0].amount;
          this.checkScoopers(amount);
          console.log('droped power', amount);
          dropedPower = true;
        } else {
          dropedPower = false;
        }
      }
    }

    // console.log('targetRoom', targetRoom)
    if (targetRoom) {
      //console.log('tr')
      if (powerBank && powerBank.hits < 800000) {
        this.checkScoopers(powerBank.power);
      }
      // TODO расчитывать скорость разрушения источника
      if (powerBank && powerBank.hits > 200000) {
        //console.log('pb')
        let remainingDamage = _.sum(
          farmers,
          (c) => (c.ticksToLive || 0) * c.getActiveBodyparts(ATTACK).length * ATTACK_POWER * 4
        );
        let targetDistance = Game.map.getRoomLinearDistance(this.room.name, this.targetRoomName) + 1;
        let ticksToDecay = powerBank.ticksToDecay;
        // console.log('powerBank', JSON.stringify(powerBank));
        let timeToArrival = 120 + 50 * targetDistance; // approx. spawn + approx. travel time
        if (
          powerBank &&
          timeToArrival < ticksToDecay &&
          remainingDamage <= powerBank.hits &&
          _.filter(farmers, (c) => !c.ticksToLive || c.ticksToLive > timeToArrival).length < this.farmerCount
        ) {
          const parts = this.room.controller.level < 8 ? powerFarmer.parts : powerFarmer.partsBoost;
          let resPow = this.roomai.spawn(parts, {
            role: powerFarmer.name,
            target: this.targetRoomName,
            home: this.room.name,
            operation: this.operation,
          });
          // if (resPow !== 0) {console.log('cant spawn', JSON.stringify(parts))}
        }
        Memory.powerOperation = true;
      } else if (dropedPower) {
        Memory.powerOperation = true;
      } else {
        Memory.powerOperation = false;
      }
    } else {
      if (!targetObservers) {
        this.roomai.spawn(observer.parts, {
          role: observer.name,
          target: this.targetRoomName,
          operation: this.operation,
          home: this.room.name,
        });
      }
    }
  }
  checkScoopers(power) {
    let scoopers = _.filter(
      spawnHelper.globalCreepsWithRole(scooper.name),
      (c) => c.memory.operation == this.operation
    );
    // let scoopersCapacity = _.sum(scoopers, (c) => c.getActiveBodyparts(CARRY) * 2.5 * CARRY_CAPACITY)
    let scoopersCapacity = _.sum(scoopers, (c) => c.carryCapacity);
    // console.log('scoopersCapacity', scoopersCapacity)
    if (scoopersCapacity < power) {
      console.log('needMoreScoopers', this.targetRoomName, scoopersCapacity, power);
      this.roomai.spawn(scooper.configs(500)[0], {
        role: scooper.name,
        target: this.targetRoomName,
        targetPos: this.targetFlag.pos,
        home: this.room.name,
        resource: 'power',
        operation: this.operation,
        power: power,
      });
    }
  }
};

const profiler = require('screeps-profiler');
const harvester = require('./role.harvester');
const { inverseDirection } = require('./helper.movement');
profiler.registerClass(module.exports, 'FarmPowerOperation');
