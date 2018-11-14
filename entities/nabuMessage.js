'use strict';
const {buildEntity} = require('goblin-workshop');

const entity = {
  type: 'nabuMessage',
  newEntityStatus: 'published',

  buildSummaries: function(quest, message, peers, MD) {
    const ref = message.get('nabuId', '');
    return {info: ref, description: ref};
  },
  quests: {},
  onNew: function(quest, id, nabuId, description) {
    return {
      id: id,
      nabuId: nabuId,
      description: description || '',
    };
  },
};

module.exports = {
  entity,
  service: buildEntity(entity),
};
