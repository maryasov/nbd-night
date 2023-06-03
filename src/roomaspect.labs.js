const spawnHelper = require('helper.spawning');
const scientist = require('role.scientist');

// const targetCompounds = ["GH2O", "XUHO2", "XGH2O", "XUH2O", "XLH2O", "XLHO2", "XGHO2", "XZHO2", "XZH2O", "XKHO2", "XKH2O", "G"];

const targetCompounds = [
  'XUH2O' /*attack +300*/,
  'XKH2O' /*carry +150*/,
  'XLHO2' /*heal +300*/,
  'XGHO2' /*tough -70*/,
  'XKHO2' /*range +300*/,
  'XZHO2' /*move +300*/,
  'XZH2O' /*work +300*/,
  // 'G' /*nuke*/,
];

module.exports = class LabsAspect {
  constructor(roomai) {
    this.roomai = roomai;
    this.room = roomai.room;
    this.labs = roomai.labs.all;
    this.decompose = roomai.labs.decompose;

    this.reactor = roomai.labs.reactor;
    this.boosters = roomai.labs.boosters;
    this.deficits = roomai.labs.deficits;
    this.scientists = this.room.find(FIND_MY_CREEPS, { filter: (c) => c.memory.role == scientist.name });
  }

  run() {
    // console.log('lab', this.room.name,!this.room.storage, !((this.reactor && this.reactor.isValid()) || this.boosters.length > 0))
    if (!this.room.storage || !((this.reactor && this.reactor.isValid()) || this.boosters.length > 0)) return;

    if (this.roomai.noLabs && this.isCurrentReactionFinished()) {
      this.reactor.setupReaction(null, undefined, undefined);
      return;
    }

    this.updateDeficits();
    if (this.reactor) {
      if (this.roomai.mode !== 'store' && !this.roomai.noLabs) {
        this.setCurrentReaction();
      }
      this.reactor.react();
      this.reactor.renderVisuals();
    }

    if (this.roomai.mode === 'unclaim') {
      return;
    }

    if (this.roomai.mode !== 'store') {
      this.buildScientists();
    }

    for (let booster of this.boosters) {
      booster.renderVisuals();
    }
  }

  updateDeficits() {
    for (let compound of targetCompounds) {
      this.deficits[compound] = Math.max(0, this.roomai.trading.maxStorageAmount(compound) - this.amount(compound));
    }
  }

  setCurrentReaction() {
    // console.log('setCurrentReaction', this.room.name, this.isCurrentReactionFinished())
    if (!this.isCurrentReactionFinished()) return;

    let nextReaction = this.findNextReaction();
    // console.log('nextReaction', this.room.name, nextReaction);

      let reactionAmount = this.compoundAmount(nextReaction, this.reactor.reactionCycleAmount);
      this.reactor.setupReaction(nextReaction, this.amount(nextReaction) + reactionAmount, reactionAmount);
      // console.log(
      //   'this.reactor',
      //   this.reactor.memory.compound,
      //   this.reactor.memory.targetAmount,
      //   this.amount(nextReaction),
      //   reactionAmount
      // );
  }

  compoundAmount(reaction, cycle) {
    let minAmount = cycle;
    _.forEach(this.decompose(reaction), (r) => {
      // console.log('dec', r, this.amount(r));
      minAmount = Math.min(minAmount, this.amount(r));
    });
    return minAmount;
  }
  isCurrentReactionFinished() {
    let currentReaction = this.reactor.compound;
    if (!currentReaction) return true;
    // console.log('cr', currentReaction)
    // console.log('r', _.any(this.reactor.inputs, (r) => _.sum(r.store) < (LAB_REACTION_AMOUNT + 6)), this.amount(currentReaction), this.reactor.targetAmount, this.amount(currentReaction) >= this.reactor.targetAmount, JSON.stringify(this.reactor.inputs))
    // console.log('w', LAB_REACTION_AMOUNT + this.reactor.minReaction);
    if (_.any(this.reactor.inputs, (r) => _.sum(r.store) < (LAB_REACTION_AMOUNT + this.reactor.minReaction))) {
      // console.log('reaction finished', this.decompose(currentReaction))
      return true;
    }
    if (
      _.any(this.decompose(currentReaction), (r) => {
        // console.log('a', r, this.amount(r), LAB_REACTION_AMOUNT + this.reactor.minReaction);
        return this.amount(r) < (LAB_REACTION_AMOUNT + this.reactor.minReaction);
      })
    )
      return true;

    return this.amount(currentReaction) >= this.reactor.targetAmount;
  }

  findNextReaction() {
    let targets = _.sortBy(
      _.filter(targetCompounds, (r) => this.deficits[r] > 0),
      (r) => -this.deficits[r]
    );
    // console.log('targets', targets)
    for (let target of targets) {
      let missing = [target];
      while (missing.length > 0) {
        let nextReaction = missing[0];
        missing = _.filter(this.decompose(nextReaction), (r) => {
          // if (this.amount(r) < (LAB_REACTION_AMOUNT + this.reactor.minReaction)) {
          //   console.log('r', r, this.amount(r), (LAB_REACTION_AMOUNT + this.reactor.minReaction))
          // }
          return this.amount(r) < (LAB_REACTION_AMOUNT + this.reactor.minReaction)});
        if (missing.length === 0) return nextReaction;

        // filter uncookable resources (e.g. H). Can't get those using reactions.
        missing = _.filter(missing, (r) => this.decompose(r));
      }
      // console.log('mis', target, missing, LAB_REACTION_AMOUNT + this.reactor.minReaction)
    }

    return null;
  }

  amount(resource) {
    if (!resource) return 0;
    let storageAmount = this.room.storage.store[resource] || 0;
    // let terminalAmount = (this.room.terminal && this.room.terminal.store[resource]) || 0;
    let terminalAmount = 0;
    let labAmount = _.sum(
      _.filter(this.labs, (l) => l.mineralType == resource),
      (l) => l.mineralAmount
    );
    let scientistAmount = _.sum(this.scientists, (c) => c.carry[resource] || 0);

    return storageAmount + terminalAmount + labAmount + scientistAmount;
  }

  buildScientists() {
    if (!this.roomai.canSpawn()) return;

    let needToReact = this.reactor && this.reactor.compound;
    let needToBoost = _.some(
      this.boosters,
      (b) => b.needEnergy() || (b.needMineral() && this.room.storage.store[b.resource])
    );
    if (needToReact || needToBoost) {
      if (spawnHelper.numberOfLocalCreeps(this.roomai, scientist.name) >= 1) return;

      this.roomai.spawn(scientist.parts, { role: scientist.name });
    }
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'LabsAspect');
