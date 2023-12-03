const CreepMover = require('creepmover');
const PathBuilder = require('pathbuilder');
const ff = require('helper.friendFoeRecognition');

Creep.prototype.goTo = function (target, options) {
  // TODO: stop using anything else than newPathing
  // console.log('options', !options , options && options.newPathing !== false)
  if (!options || options.newPathing !== false) {
    let mover = new CreepMover(this, target, options);
    return mover.move();
  }

  let builder = new PathBuilder();
  options = options || {};
  if (options.avoidExits) {
    // console.log('avoidExits')
    builder.avoidExits = true;
  }
  if (options.debugCosts) {
    builder.debugCosts = true;
  }
  if (options.avoidHostiles) {
    builder.avoidHostiles = true;
    if (
      _.some(ff.findHostiles(this.room), (c) => _.some(c.parts, (p) => p.type === ATTACK || p.type === RANGED_ATTACK))
    ) {
      options.reusePath = 0;
    }
  }
  options.costCallback = builder.getAdditiveCallback();
  // console.log('goTo', this.name, target, JSON.stringify(options))
  return this.moveTo(target, options);
};

Creep.prototype.fleeFrom = function (hostiles, range) {
  if (!Array.isArray(hostiles)) hostiles = [hostiles];
  hostiles = _.map(hostiles, (h) => ({ pos: h.pos, range: range }));
  let result = PathFinder.search(this.pos, hostiles, { flee: true });
  if (result.path.length > 0) {
    let pos = result.path.reverse()[0];
    // console.log('hostiles', pos, this.pos.getDirectionTo(pos), JSON.stringify(hostiles), JSON.stringify(result.path))
    return this.moveTo(pos);
  }

  // return this.moveByPath(result.path);
};

Creep.prototype.plain = function (hostiles, range) {
  if (!Array.isArray(hostiles)) hostiles = [hostiles];
  hostiles = _.map(hostiles, (h) => ({ pos: h.pos, range: range }));
  let result = PathFinder.search(this.pos, hostiles, { flee: true });
  if (result.path.length > 0) {
    let pos = result.path.reverse()[0];
    // console.log('hostiles', pos, this.pos.getDirectionTo(pos), JSON.stringify(hostiles), JSON.stringify(result.path))
    return this.moveTo(pos);
  }

  // return this.moveByPath(result.path);
};

Creep.prototype.canAttack = function () {
  return _.some(this.body, (p) => p.type === ATTACK || p.type === RANGED_ATTACK);
};

Creep.prototype.check = function () {
  return _.some(this.body, (p) => p.type === ATTACK || p.type === RANGED_ATTACK);
};

Creep.prototype.isCreep = true;
