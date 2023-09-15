const spawnHelper = require('helper.spawning');
const renew = require('helper.renew');

module.exports = {
  name: 'scientist',
  parts: spawnHelper.makeParts(20, CARRY, 10, MOVE),
  run: function (creep) {
    if (renew.check(creep)) return;
    if (!creep.room.ai()) {
      console.log('Scientist is in AI-less room ' + creep.room.name);
      return;
    }

    let reactor = creep.room.ai().labs.reactor;
    if (creep.memory.state === 'deliver') {
      // console.log(creep.room.name, 1);
      this.deliverToReactor(creep, reactor);
    } else if (creep.memory.state === 'deliverBoost') {
      // console.log(creep.room.name, 2);
      this.deliverBoost(creep, reactor);
    } else if (creep.memory.state === 'pickAtReactor') {
      // console.log(creep.room.name, 3);
      this.pickAtReactor(creep, reactor);
    } else if (creep.memory.state === 'store') {
      // console.log(creep.room.name, 4);
      this.store(creep, reactor);
    } else if (creep.memory.state === 'pickAtStorage') {
      // console.log(creep.room.name, 5);
      this.pickAtStorage(creep, reactor);
    } else if (creep.memory.state === 'pickAtBooster') {
      // console.log(creep.room.name, 6);
      this.pickAtBooster(creep, reactor);
    } else {
      // console.log(creep.room.name, 7);
      // by default move to store
      this.store(creep, reactor);
    }
    if (this.needToWork(creep)) {
      console.log('needToWork')
      creep.memory.state = 'deliverBoost';
    }
  },
  deliverToReactor: function (creep, reactor) {
    let target = null;
    let resource = Object.keys(creep.store)[0];
    if (!reactor.baseMinerals) {
      return;
    }
    if (resource == reactor.baseMinerals[0]) target = reactor.inputs[0];
    if (resource == reactor.baseMinerals[1]) target = reactor.inputs[1];
    if (!target) {
      if (resource) {
        // carry contains invalid resource
        creep.memory.state = 'store';
        return;
      } else {
        target = { pos: reactor.rallyPos, isRally: true };
      }
    }

    let range = creep.pos.getRangeTo(target.pos);
    let expectedRange = target.isRally ? 0 : 1;
    if (range === expectedRange) {
      if (!target.isRally) creep.transfer(target, resource);
      creep.memory.state = 'pickAtReactor';
      // console.log('pick', reactor.needMineralg)
      this.pickAtReactor(creep, reactor);
    } else {
      // console.log('room', creep.room, JSON.stringify(target))
      creep.goTo(target);
    }
  },
  pickAtReactor: function (creep, reactor) {
    let target = _.find(reactor.outputs, (l) => l.mineralAmount > 0);
    if (!reactor.inputSatisfied(0)) target = reactor.inputs[0];
    if (!reactor.inputSatisfied(1)) target = reactor.inputs[1];

    if (!target || target.mineralAmount === 0 || _.sum(creep.store) === creep.store.getCapacity()) {
      creep.memory.state = 'store';
      this.store(creep, reactor);
    } else if (creep.withdraw(target, target.mineralType) === ERR_NOT_IN_RANGE) {
      creep.goTo(target);
    }
  },
  store: function (creep) {
    let target = creep.room.storage;
    if (!target) return;

    let resource = Object.keys(creep.store)[0];
    if (creep.pos.isNearTo(target)) {
      creep.transfer(target, resource);
      creep.memory.state = 'pickAtStorage';
    } else {
      creep.goTo(target);
    }
  },
  pickAtStorage: function (creep, reactor) {
    if (!reactor) {
      // boost-only operation
      if (this.pickupBoost(creep)) {
        creep.memory.state = 'deliverBoost';
      }
      return;
    }
    let resources = [];
    if (reactor.inputSatisfied(0) && !reactor.inputFull(0)) {
      resources.push({
        type: reactor.baseMinerals[0],
        amount: reactor.inputs[0].store[reactor.inputs[0].mineralType] || 0,
      });
    }
    if (reactor.inputSatisfied(1) && !reactor.inputFull(1)) {
      resources.push({
        type: reactor.baseMinerals[1],
        amount: reactor.inputs[1].store[reactor.inputs[1].mineralType] || 0,
      });
    }

    resources = _.sortBy(
      _.filter(resources, (r) => creep.room.storage.store[r.type]),
      (r) => r.amount
    );

    let resource = resources[0];

    if (resource) {
      let compMax = reactor.reactionCycleAmount
      _.forEach([reactor.baseMinerals[0], reactor.baseMinerals[1]], (r) => {
        let tot = this.compoundAmount(creep, reactor, r)
        // console.log('dec', r, tot);
        compMax = Math.min(compMax, tot);
      });

      let actualAmount =
        (creep.room.storage.store[reactor.compound] || 0) + _.sum(reactor.outputs, (l) => l.store[l.mineralType]);
      let neededProduce = Math.min(
        reactor.targetAmount - actualAmount,
          compMax,
        reactor.reactionCycleAmount
      );
      let missingInput = /*Math.max(0, */ neededProduce - resource.amount; /*)*/
      if (missingInput > 0) {
        missingInput = Math.min(missingInput, neededProduce, 3000);
      }
      // if (missingInput)
      //   console.log('missingInput', JSON.stringify(resource), neededProduce, missingInput, reactor.needAmount);
      let inStore = creep.room.storage.store[resource.type] || 0;
      if (missingInput > 0 && inStore > 0) {
        missingInput = Math.max(missingInput);
        creep.withdraw(creep.room.storage, resource.type, Math.min(creep.store.getCapacity(), missingInput, inStore));
      } else {
        if (this.pickupBoost(creep)) {
          creep.memory.state = 'deliverBoost';
          return;
        }
      }
    } else {
      if (this.pickupBoost(creep)) {
        creep.memory.state = 'deliverBoost';
        return;
      }
    }

    creep.memory.state = 'deliver';
  },
  pickupBoost: function (creep) {
    let target = _.sortBy(
      _.filter(creep.room.ai().labs.boosters, (b) => b.lab && b.lab.store.getFreeCapacity(RESOURCE_ENERGY) > 0),
      (b) => b.lab.store.energy
    )[0];
    if (target) {
      creep.withdraw(
        creep.room.storage,
        RESOURCE_ENERGY,
        Math.min(target.lab.store.getFreeCapacity(RESOURCE_ENERGY), creep.store.getCapacity())
      );
      return true;
    } else {
      target = _.sortBy(
        _.filter(
          creep.room.ai().labs.boosters,
          (b) =>
            b.resource &&
            creep.room.storage.store[b.resource] &&
            (!b.lab.mineralType || b.resource === b.lab.mineralType) &&
            b.lab.mineralAmount < b.lab.mineralCapacity
        ),
        (b) => b.lab.mineralAmount
      )[0];
      if (target) {
        let amount = Math.min(
          target.lab.mineralCapacity - target.lab.mineralAmount,
          creep.store.getCapacity(),
          creep.room.storage.store[target.resource]
        );
        if (amount > 0) {
          creep.withdraw(creep.room.storage, target.resource, amount);
          return true;
        }

        // Can' fill other boosters, but still has booster with wrong resource loaded
        if (
          _.find(
            creep.room.ai().labs.boosters,
            (b) => b.resource && b.lab.mineralType && b.lab.mineralType !== lab.resource
          )
        ) {
          return true;
        }
      } else if (
        _.find(
          creep.room.ai().labs.boosters,
          (b) => b.resource && b.lab.mineralAmount > 0 && b.resource !== b.lab.mineralType
        )
      ) {
        // clean booster with wrong resource
        return true;
      }
    }

    return false;
  },
  deliverBoost: function (creep) {
    let creepMineral = _.find(Object.keys(creep.store), (r) => r !== 'energy');
    let target = null;
    if (_.sum(creep.store) > 0) {
      if (creepMineral) {
        target = _.find(creep.room.ai().labs.boosters, (b) => b.resource === creepMineral);
      } else {
        target = _.sortBy(creep.room.ai().labs.boosters, (b) => b.lab.energy)[0];
      }
    } else {
      target = _.find(creep.room.ai().labs.boosters, (b) => b.resource && b.resource !== b.lab.mineralType);
    }

    if (!target) {
      creep.memory.state = 'stop';
    } else {
      let transferResult = creep.transfer(target.lab, creepMineral || RESOURCE_ENERGY);
      if (transferResult === ERR_NOT_IN_RANGE) {
        creep.goTo(target.lab);
      } else {
        creep.memory.state = 'pickAtBooster';
      }
    }
  },
  pickAtBooster: function (creep, reactor) {
    // we might be close to multiple boosters
    let boosters = _.filter(
      creep.room.ai().labs.boosters,
      (b) => b.lab.mineralType !== b.resource && creep.pos.isNearTo(b.lab)
    );
    if (boosters.length > 0) {
      let booster = boosters[0];
      creep.withdraw(booster.lab, booster.lab.mineralType);
    }

    creep.memory.state = 'store';
    this.store(creep, reactor);
  },
  needToWork(creep){
    let inps = creep.room.ai().labs.reactor.inputs
    let ops = creep.room.ai().labs.reactor.outputs
    return _.find(
        inps.concat(ops),
        (b) => b.resource && b.lab.mineralType && b.lab.mineralType !== b.resource
    )
  },
  compoundAmount(creep, reactor, compound) {
    let inStore = creep.room.storage.store[compound]
    let inCreep = 0;//creep.store[compound]
    let inReactor = _.sum(_.map(reactor.inputs.concat(reactor.outputs), (i)=>i.store[compound]))
    // console.log('ca', inStore, inReactor)
    return inStore + inCreep + inReactor;
  }

};

const profiler = require('screeps-profiler');
profiler.registerObject(module.exports, 'scientist');
