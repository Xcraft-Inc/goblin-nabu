'use strict';
const {buildEntity} = require('goblin-workshop');

const entity = {
  type: 'locale',
  newEntityStatus: 'draft',

  buildSummaries: function(quest, locale, peers, MD) {
    const ref = locale.get('name', '');
    return {info: ref, description: ref};
  },
  indexer: function(quest, entity) {
    const info = entity.get('meta.summaries.description', '');
    return {info};
  },
  quests: {},
  onNew: function(quest, id, name, description) {
    return {
      id,
      name: name || `locale-${quest.uuidV4().slice(0, 6)}`,
      description: description || '',
    };
  },
};

module.exports = {
  entity,
  service: buildEntity(entity),
};
