const operationsCache = {
  operations: function (key) {
    this.ensureList();
    return this.opsList;
  },

  add: function (operation) {
    this.ensureList();
    this.opsList.push(operation);
  },

  remove: function (operation) {
    this.ensureList();

    let index = this.opsList.indexOf(operation);
    if (index > -1) {
      this.opsList.splice(index, 1);
    }
  },

  ensureList: function () {
    if (!this.opsList || Game.time !== this.currentTick) {
      this.opsList = _.compact(_.map(Memory.operations || [], (mem) => Operation.loadOperation(mem)));
      this.currentTick = Game.time;
    }
  },
};

global.Operation = class Operation {
  constructor(memory) {
    this.memory = memory;

    this.id = memory.id;
    this.type = memory.type;
  }

  get supportRoom() {
    return Game.rooms[this.memory.supportRoom];
  }

  set supportRoom(room) {
    this.memory.supportRoom = room ? room.name : null;
  }

  isValid() {
    return this.supportRoom && this.supportRoom.ai();
  }

  run() {
    // TODO: call this method for all operations in main.js
    // should be overridden in operations to run code once per tick for the operation
    // (that is independent from rooms supporting the operation)
    // e.g. picking a common target for creeps, figuring out whether the operation
    // is finished/canceled, etc
  }

  supportRoomCallback(room) {
    // should be overridden in operations to run code specific to the room supporting this operation,
    // e.g. spawning creeps, setting up boosts, using observers, etc.
  }

  drawVisuals() {
    // can be overridden to draw visuals to aid in understanding what this operation
    // is doing
  }

  toString() {
    return `[Operation ${this.type}#${this.id} from ${this.supportRoom}]`;
  }

  static get operations() {
    return operationsCache.operations();
  }

  static forSupportRoom(room) {
    return _.filter(Operation.operations, (op) => op.supportRoom === room);
  }

  static createOperation(type, initMemory) {
    if (!Memory.operations) Memory.operations = [];

    let subclass = operationSubclasses[type];
    if (!subclass) {
      console.log(`Tried to create unknown operation type ${type}`);
      return;
    }

    if (!initMemory) initMemory = {};
    let memory = { type: type, id: Operation.generateId(), ...initMemory };
    let instance = new subclass(memory);
    Memory.operations.push(memory);
    return instance;
  }

  static count(material, byRooms, base) {
    if (material === '') {
      material = undefined;
    }
    if (base === undefined) {
      base = true;
    }
    if (byRooms === undefined) {
      byRooms = false;
    }
    let store = {};
    let rooms = [];
    let baseMaterials = ['energy', 'power', 'ops', 'O', 'H', 'K', 'L', 'Z', 'U', 'X'];
    let myRooms = _.filter(Game.rooms, (r) => r.controller && r.controller.owner && r.controller.my);
    _.forEach(myRooms, (cr) => {
      rooms.push(cr.name);
    });
    _.forEach(rooms, (cr) => {
      const room = Game.rooms[cr];
      if (room.storage && room.storage.store) {
        _.forEach(room.storage.store, (amount, mat) => {
          if (material && material !== mat) {
            return;
          }
          if (base && baseMaterials.indexOf(mat) < 0) {
            return;
          }
          if (store[mat] === undefined) {
            store[mat] = [];
          }
          store[mat].push({ r: room.name, a: amount });
        });
      }
      if (room.terminal && room.terminal.store) {
        _.forEach(room.terminal.store, (amount, mat) => {
          if (material && material !== mat) {
            return;
          }
          if (base && baseMaterials.indexOf(mat) < 0) {
            return;
          }
          if (store[mat] === undefined) {
            store[mat] = [];
          }
          store[mat].push({ r: room.name, a: amount });
        });
      }
    });
    console.log('Total materials');
    let total = {};
    if (byRooms) {
      _.forEach(store, (data, mat) => {
        let mTotal = 0;
        _.forEach(data, (amount) => {
          if (total[mat] === undefined) {
            total[mat] = {};
          }
          total[mat][amount.r] = total[mat][amount.r] !== undefined ? total[mat][amount.r] + amount.a : amount.a;
          mTotal = mTotal + amount.a;
        });
        console.log(mat, ' (' + mTotal + ')');
        _.forEach(total[mat], (a, r) => {
          console.log(r, a);
        });
      });
    } else {
      _.forEach(store, (data, mat) => {
        let mTotal = 0;
        _.forEach(data, (amount) => {
          total[mat] = total[mat] !== undefined ? total[mat] + amount.a : amount.a;
          mTotal = mTotal + amount.a;
        });
        console.log(mat, ' (' + mTotal + ')');
      });
    }
    Memory.lastCount = total;
  }

  static boosts(material, byRooms, base) {
    if (material === '') {
      material = undefined;
    }
    if (base === undefined) {
      base = true;
    }
    if (byRooms === undefined) {
      byRooms = false;
    }
    let store = {};
    let rooms = [];
    // let baseMaterials = ['XUH2O', 'XKH2O', 'XLHO2', 'XGHO2', 'XKHO2', 'XZHO2', 'XZH2O'];
    let baseMaterials = ['XLHO2', 'XGHO2', 'XKHO2', 'XZHO2'];
    let myRooms = _.filter(Game.rooms, (r) => r.controller && r.controller.owner && r.controller.my);
    _.forEach(myRooms, (cr) => {
      rooms.push(cr.name);
    });
    _.forEach(rooms, (cr) => {
      const room = Game.rooms[cr];
      if (room.storage && room.storage.store) {
        _.forEach(room.storage.store, (amount, mat) => {
          if (material && material !== mat) {
            return;
          }
          if (base && baseMaterials.indexOf(mat) < 0) {
            return;
          }
          if (store[mat] === undefined) {
            store[mat] = [];
          }
          store[mat].push({ r: room.name, s: amount, t: 0 });
        });
      }
      if (room.terminal && room.terminal.store) {
        _.forEach(room.terminal.store, (amount, mat) => {
          if (material && material !== mat) {
            return;
          }
          if (base && baseMaterials.indexOf(mat) < 0) {
            return;
          }
          if (store[mat] === undefined) {
            store[mat] = [];
          }
          store[mat].push({ r: room.name, s: 0, t: amount });
        });
      }
    });
    console.log('Total materials');
    _.sortBy(store, (e)=> (e))
    let total = {};
    if (byRooms) {
      _.forEach(store, (data, mat) => {
        let mTotal = 0;
        _.forEach(data, (amount) => {
          if (total[mat] === undefined) {
            total[mat] = {};
          }
          if (total[mat][amount.r] === undefined) {
            total[mat][amount.r] = {};
          }
          // console.log('amount', JSON.stringify(amount))
          total[mat][amount.r]['s'] = total[mat][amount.r]['s'] !== undefined ? total[mat][amount.r]['s'] + amount.s : amount.s;
          total[mat][amount.r]['t'] = total[mat][amount.r]['t'] !== undefined ? total[mat][amount.r]['t'] + amount.t : amount.t;
          mTotal = mTotal + amount.s;
        });
        console.log(mat, ' (' + mTotal + ')');
        _.forEach(total[mat], (a, r) => {
          console.log(r, `s: ${a.s} t: ${a.t}`);
        });
      });
    } else {
      _.forEach(store, (data, mat) => {
        let mTotal = 0;
        _.forEach(data, (amount) => {
          total[mat] = total[mat] !== undefined ? total[mat] + amount.s + amount.t : amount.s + amount.t;
          mTotal = mTotal + amount.s + amount.t;
        });
        console.log(mat, ' (' + mTotal + ')');
      });
    }
    Memory.lastCount = total;
  }

  static addEnemy(room) {
    Memory.enemyRooms.push(room);
    console.log('Memory.enemyRooms', JSON.stringify(Memory.enemyRooms));
  }

  static removeEnemy(room) {
    Memory.enemyRooms = _.filter(Memory.enemyRooms, (o) => o !== room);
    console.log('Memory.enemyRooms', JSON.stringify(Memory.enemyRooms));
  }

  static removeOperation(operation) {
    Memory.operations = _.filter(Memory.operations, (o) => o.id !== operation.id);
    operationsCache.remove(operation);
  }

  // used internally to populate Operation.operations
  static loadOperation(memory) {
    let subclass = operationSubclasses[memory.type];
    if (!subclass) {
      console.log(`Tried to load unknown operation type ${type} from operation ${memory.id}.`);
      return null;
    }

    return new subclass(memory);
  }

  static generateId() {
    let id = 0;
    do {
      id = Math.floor(Math.random() * 100000);
    } while (_.any(Memory.operations, (op) => op.id === id));

    return id;
  }
};

const operationSubclasses = {
  attack: require('operation.attack'),
  opener: require('operation.opener'),
  claim: require('operation.claim'),
  downgrade: require('operation.downgrade'),
  drain: require('operation.drain'),
  move: require('operation.move'),
  scoop: require('operation.scoop'),
};
