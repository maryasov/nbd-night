const checkInterval = 500;
const valuableSiteThreshold = 500;

module.exports = class ConstructionSitesCleaner {
  constructor() {
    if (!Memory.constructionSitesCleaner) {
      Memory.constructionSitesCleaner = {
        sites: {},
      };
    }
    this.memory = Memory.constructionSitesCleaner;
  }
  run() {
    if (Game.time - (Memory.lastSitesCheck || 0) < checkInterval) return;
    console.log('checked');
    Memory.lastSitesCheck = Game.time;

    let previousSites = _.compact(_.map(Object.keys(this.memory.sites), (id) => Game.getObjectById(id)));
    console.log('Previously had ' + previousSites.length + ' sites');
    console.log('Now has ' + Object.keys(Game.constructionSites).length + ' sites');
    for (let site of previousSites) {
      if (site.progress === this.memory.sites[site.id]) {
        // console.log("No progess on " + (site.room && site.room.name) + " " + site.id + " (" + site.structureType + "; " + site.progress + " / " + site.progressTotal +")");
        if (site.progress < valuableSiteThreshold) {
          // console.log('remove')
          site.remove();
        }
      }
    }

    this.memory.sites = {};
    _.forEach(Game.constructionSites, (site) => {
      this.memory.sites[site.id] = site.progress;
    });
  }
};

const profiler = require('screeps-profiler');
profiler.registerClass(module.exports, 'ConstructionSitesCleaner');
