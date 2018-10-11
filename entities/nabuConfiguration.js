'use strict';

const {buildEntity} = require('goblin-workshop');
const entity = {
  type: 'nabuConfiguration',
  references: {
    localeId: 'locale',
  },
  quests: {
    setLocale: function*(quest, localeId) {
      yield quest.me.change({
        path: 'localeId',
        newValue: localeId,
      });
    },
  },
  onNew: function(quest, id) {
    id = 'nabuConfiguration@main';
    return {
      id,
      localeId: null,
    };
  },
};

module.exports = {
  entity,
  service: buildEntity(entity),
};
