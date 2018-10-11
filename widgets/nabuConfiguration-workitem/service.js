'use strict';
const {buildWorkitem} = require('goblin-workshop');

const config = {
  type: 'nabuConfiguration',
  kind: 'workitem',
  hinters: {},
  quests: {
    setLocale: function(quest, localeId) {
      const entityId = quest.goblin.getX('entityId');
      const entityAPI = quest.getAPI(entityId);
      entityAPI.setLocale({localeId});
    },
  },
};

module.exports = buildWorkitem(config);
