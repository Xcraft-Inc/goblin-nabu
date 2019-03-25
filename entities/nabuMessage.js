'use strict';
const {buildEntity} = require('goblin-workshop');

const entity = {
  type: 'nabuMessage',
  newEntityStatus: 'published',

  buildSummaries: function(quest, nabuMessage) {
    const ref = nabuMessage.get('nabuId', '');
    return {info: ref, description: ref};
  },
  indexer: function(quest, entity) {
    const info = entity.get('meta.summaries.description', '');
    return {info, value: info.toLowerCase()};
  },
  quests: {},
  onNew: function(quest, id, nabuId, sources) {
    return {
      id: id,
      nabuId: nabuId || '',
      sources: sources || [],
    };
  },
};

module.exports = {
  entity,
  service: buildEntity(entity),
};
