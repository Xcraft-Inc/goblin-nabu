'use strict';

const {buildEntity} = require('goblin-workshop');
const entity = {
  type: 'nabuConfiguration',
  references: {
    localeId: 'locale',
  },

  buildSummaries: function(quest, configuration, peers, MD) {
    const localeName = peers.localeId ? peers.localeId.get('name') : null;
    return {info: localeName, description: localeName};
  },
  indexer: function(quest, entity) {
    const info = entity.get('meta.summaries.description', '');
    return {info};
  },
  quests: {
    setLocale: function*(quest, localeId) {
      yield quest.me.change({
        path: 'localeId',
        newValue: localeId,
      });
    },
    get: function(quest) {
      return quest.goblin.getState();
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
