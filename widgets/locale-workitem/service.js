'use strict';

const {buildWorkitem} = require('goblin-workshop');

const config = {
  type: 'locale',
  kind: 'workitem',
  quests: {},
  hinters: {
    locale: {
      onValidate: function(quest, selection) {
        const localeApi = quest.getAPI(quest.goblin.getX('entityId'));
        localeApi.setLocaleId({entityId: selection.value});
      },
    },
  },
};

module.exports = buildWorkitem(config);
