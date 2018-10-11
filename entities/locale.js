'use strict';
const {buildEntity} = require('goblin-workshop');

const entity = {
  type: 'locale',
  newEntityStatus: 'published',

  buildSummaries: function(quest, locale, peers, MD) {
    const ref = locale.get('name', '');
    return {info: ref, description: ref};
  },
  indexer: function(quest, entity) {
    const info = entity.get('meta.summaries.description', '');
    return {info};
  },
  quests: {},
  onNew: function(quest, id, name) {
    return {
      id,
      name: name || '',
    };
  },
};

module.exports = {
  entity,
  service: buildEntity(entity),
};
