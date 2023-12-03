const logistic = require('helper.logistic');

const TERMINAL_MAX_FILL = 270000;

const baseMinerals = [
  RESOURCE_OXYGEN,
  RESOURCE_HYDROGEN,
  RESOURCE_LEMERGIUM,
  RESOURCE_UTRIUM,
  RESOURCE_KEANIUM,
  RESOURCE_ZYNTHIUM,
  RESOURCE_CATALYST,
];
const rawCommodities = [RESOURCE_MIST, RESOURCE_BIOMASS, RESOURCE_METAL, RESOURCE_SILICON];
const refinedCommodities = Object.keys(COMMODITIES).filter(
  (r) => r.length > 1 && !rawCommodities.includes(r) && r != 'energy'
);

// TODO: remove duplication with labs aspect and selling blacklist
const t3Boosts = ['XUH2O', 'XKH2O', 'XLHO2', 'XGHO2', 'XKHO2', 'XZHO2', 'XZH2O'];
const intermediateCompounds = Object.keys(REACTIONS).filter((c) => !baseMinerals.includes(c));

const maximumExportBuffer = 10000;

module.exports = class Trading {
  constructor(room) {
    this.room = room;
    this.storage = this.room.storage;
    this.terminal = this.room.terminal;

    if (!room.memory.trading) {
      room.memory.trading = {
        manualExports: {},
      };
    }
    this.memory = room.memory.trading;
  }

  get sellingWhitelist() {
    let wl = [
      'H',
      'O',
      'L',
      'K',
      'Z',
      'U',
      'X',
      'utrium_bar',
      'lemergium_bar',
      'zynthium_bar',
      'keanium_bar',
      'ghodium_melt',
      'oxidant',
      'reductant',
      'purifier',

      'ops',
      'metal',
      'alloy',
      'microchip',
      'composite',
      'liquid',
      'wire',
      // 'ghodium_melt',
      'fixtures',
      'tube',
      'frame',
      'transistor',
      'crystal',

      'XGH2O',
      'XUHO2',
      'XLH2O',
      'GH2O',
      'UHO2',
      'LH2O',

      'XUH2O',
      'XKH2O',
      'XLHO2',
      'XGHO2',
      'XKHO2',
      'XZHO2',
      'XZH2O',
    ];
    // let mineral = this.room.find(FIND_MINERALS)[0];
    // if (mineral) {
    //     wl.push(mineral.mineralType)
    // }
    // console.log('term', this.room.name, wl)
    return wl;
  }

  get terminalEnergyBuffer() {
    return 15000;
  }

  get storeEnergyBuffer() {
    let val = this.storage.store['energy'] || 0;
    // console.log('val', this.room.name, val)
    return val;
  }

  isTradingPossible() {
    //return false;
    return this.terminal && this.storage;
  }

  tradingTerminal() {
    //return false;
    return this.terminal;
  }

  get resourcesImportableToStorage() {
    return _.sortBy(
      _.filter(_.keys(this.terminal.store), (res) => this.neededImportToStorage(res) > 0),
      (res) => res === 'energy'
    );
  }

  neededImportToStorage(resource) {
    let amountInTerminal = this.terminal.store[resource];
    if (this.room.ai().mode === 'unclaim' && amountInTerminal < maximumExportBuffer) {
      return 0;
    }
    if (this.room.ai().mode === 'stack') {
      return 0;
    }
    // console.log('neededImportToStorage', this.room.name, resource, this.terminal.store[resource], Math.min(this.terminalEnergyBuffer, this.storeEnergyBuffer))
    if (
      resource === RESOURCE_ENERGY &&
      this.terminal.store[resource] <= Math.min(this.terminalEnergyBuffer, this.storeEnergyBuffer)
    )
      return 0;

    let baselineMiss = this.minNeededAmount(resource) - (this.storage.store[resource] || 0);

    let manualExport = this.manualExports[resource];
    if (manualExport) {
      let sentAmount = manualExport.amount;
      let val = Math.max(0, Math.min(amountInTerminal - sentAmount, baselineMiss));
      // console.log('manual send', sentAmount, val);
      return val;
    }

    return Math.max(0, baselineMiss, amountInTerminal - maximumExportBuffer);
  }

  get resourcesExportableFromStorage() {
    return _.filter(_.keys(this.storage.store), (res) => this.possibleExportFromStorage(res) > 0);
  }

  get hasTradingRequest() {
    return _.filter(
      _.keys(Memory.tradeRequests),
      (res) => this.possibleExportFromRoom(res) > 0 && _.any(Memory.tradeRequests[res], (tr) => tr.amount > 5000)
    );
  }

  possibleExportFromStorage(resource) {
    let amountInTerminal = this.terminal.store[resource];
    let maximumExportBufferLocal = maximumExportBuffer;
    if (resource === 'energy') {
      maximumExportBufferLocal = 15000;
    }

    let val = 0;

    let manualExport = this.manualExports[resource];
    if (manualExport) {
      let sentAmount = Math.min(manualExport.amount, maximumExportBuffer);
      let transactionPrice = Game.market.calcTransactionCost(sentAmount, this.terminal.room.name, manualExport.room);
      if (resource === 'energy') {
        sentAmount = sentAmount + transactionPrice;
      }
      let sendVal = Math.max(0, sentAmount - amountInTerminal);
      val = sendVal;
      // console.log('mme', resource, manualExport.amount, sentAmount, sendVal)
    } else {
      val = Math.max(
        0,
        Math.min(
          this.storage.store[resource] - this.minNeededAmount(resource),
          maximumExportBufferLocal - amountInTerminal
        )
      );
      // console.log(this.room.name, resource, this.minNeededAmount(resource), this.storage.store[resource] - this.minNeededAmount(resource), maximumExportBufferLocal - amountInTerminal)
    }
    // if (val > 0) {console.log('posible', this.room.name, resource, val, this.storage.store[resource], this.minNeededAmount(resource), maximumExportBufferLocal, amountInTerminal)}
    if (this.room.ai().mode === 'unclaim' && maximumExportBufferLocal > amountInTerminal) {
      val = this.storage.store[resource];
    }

    if (_.sum(this.terminal.store) > TERMINAL_MAX_FILL && resource !== 'energy') {
      val = 0;
    }

    return val;
  }

  // amount of the resource that needs to be evicted from the room because it is
  // over the maximum alloted amount
  requiredExportFromRoom(resource, options) {
    if (!this.storage) return 0;
    if (!this.terminal) return 0;

    let amountInTerminal = this.terminal.store[resource];
    let amountInStorage = this.storage.store[resource];
    let excessAmount = amountInTerminal + amountInStorage - this.maxStorageAmount(resource);
    if (options && options.showExcess) return excessAmount;
    return Math.min(amountInTerminal, excessAmount);
  }

  // amount that could be exported from the room, if there is demand elsewhere
  possibleExportFromRoom(resource) {
    let amountInTerminal = this.terminal.store[resource];
    let amountInStorage = this.storage.store[resource];
    let excessAmount = amountInTerminal + amountInStorage - this.minNeededAmount(resource);
    return Math.min(amountInTerminal, excessAmount);
    // return excessAmount;
  }

  // amount that need to be imported into the room, because it currently has less
  // than it wants to have
  requiredImportToRoom(resource) {
    if (this.room.ai().mode === 'stack') {
      return 0;
    }
    if (this.room.ai().mode === 'unclaim' && resource !== 'energy') return 0;
    let amountInTerminal = this.terminal.store[resource];
    let amountInStorage = this.storage.store[resource];
    return Math.max(0, this.minNeededAmount(resource) - (amountInTerminal + amountInStorage));
  }

  // amount that could be imported into the room, because there is capacity for the resource
  // left
  possibleImportToRoom(resource) {
    if (this.room.ai().mode === 'stack') return 0;
    if (this.room.ai().mode === 'unclaim') return 0;
    let amountInTerminal = this.terminal.store[resource];
    let amountInStorage = this.storage.store[resource];
    return Math.max(0, this.maxStorageAmount(resource) - (amountInTerminal + amountInStorage));
  }

  sellableAmount(resource) {
    if (!this.sellingWhitelist.includes(resource)) return 0;
    // if(this.sellingBlacklist.includes(resource)) return 0;
    if (resource === RESOURCE_POWER && !Memory.sellPower) return 0;

    return this.requiredExportFromRoom(resource);
  }

  // The room wants to have at least this much of a resource in stock
  // (e.g. because it is needed internally).
  // if it goes above this level, it will start sharing with other rooms that
  // did not yet fill their minimum need.
  minNeededAmount(resource) {
    if (this.room.ai().mode === 'stack') {
      return 0;
    }
    if (resource == RESOURCE_ENERGY) {
      if (this.room.ai().mode === 'unclaim') return 30000;
    }

    if (this.room.ai().mode === 'unclaim') return 0;

    if (resource == RESOURCE_ENERGY) return 50000;

    if (resource == RESOURCE_POWER) {
      if (this.room.powerSpawn() && !Memory.sellPower && !this.room.ai().noPower) return 5000;
      return 0;
    }

    if (baseMinerals.includes(resource)) {
      if (this.room.ai().labs.reactor && this.room.ai().labs.reactor.isValid() && !this.room.ai().noLabs) {
        return 7500;
      } else {
        return 0;
      }
    }

    if (t3Boosts.includes(resource)) return 15000;
    if (resource === 'G') return 5000;
    if (resource === 'ops') return 10000;

    // ensures that compounds don't get stuck in terminal
    // TODO: should we actually consider the current reaction for this,
    // so that materials are shifted towards the right reactors?
    if (intermediateCompounds.includes(resource)) {
      if (this.room.ai().labs.reactor && this.room.ai().labs.reactor.isValid() && !this.room.ai().noLabs) {
        return 2500;
      } else {
        return 0;
      }
    }

    if (rawCommodities.includes(resource) || refinedCommodities.includes(resource)) {
      if (this.room.ai().factory.isAvailable() && this.room.ai().factory.usableResources.includes(resource)) {
        return 2000;
      } else {
        return 0;
      }
    }

    return 0;
  }

  // The room can afford keeping this much of a resource in stock, acting
  // as a reserve.
  // it really doesn't want to have more than that.
  maxStorageAmount(resource) {
    if (resource == RESOURCE_ENERGY) {
      if (this.room.ai().mode === 'unclaim') return 30000;
      if (this.room.ai().mode === 'support') return 400000;

      return 400000;
    }

    if (this.room.ai().mode === 'unclaim') return 0;

    if (resource == RESOURCE_POWER) {
      if (Memory.sellPower) return 0;
      if (this.room.powerSpawn()) return 15000;
      return 5000;
    }

    if (baseMinerals.includes(resource)) return 30000;
    if (t3Boosts.includes(resource)) return 30000;
    if (resource === 'G') return 10000;
    // if (resource === 'battery') return 50000;
    if (resource === 'ops') return 100000;
    // if (resource === 'power') return 5000;

    if (rawCommodities.includes(resource) || refinedCommodities.includes(resource)) {
      if (this.room.ai().factory.isAvailable() && this.room.ai().factory.usableResources.includes(resource)) {
        return 5000;
      } else {
        return 0;
      }
    }

    return 5000;
  }

  // Not considering resources with an excess of less than that amount for export
  // This is mostly a protection from micro transactions that might block terminal
  // time for other resources
  minimumExportAmount(resource) {
    if (resource !== 'energy' && this.room.ai().mode === 'unclaim') return 0;
    if (resource === RESOURCE_ENERGY) return 500;
    if (resource === RESOURCE_POWER) return 100;
    if (refinedCommodities.includes(resource)) return 10;

    return 100;
  }

  get manualExports() {
    return this.memory.manualExports;
  }

  exportManually(resource, amount, targetRoom) {
    if (!resource || !amount || !targetRoom) return false;

    this.manualExports[resource] = {
      amount: amount,
      room: targetRoom,
    };

    return true;
  }

  clearManualExport(resource) {
    delete this.manualExports[resource];
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'Trading');
