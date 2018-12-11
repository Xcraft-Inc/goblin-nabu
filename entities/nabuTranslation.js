'use strict';
const {buildEntity} = require('goblin-workshop');

const entity = {
  type: 'nabuTranslation',
  references: {
    localeId: 'locale',
    messageId: 'nabuMessage',
  },
  newEntityStatus: 'draft',

  buildSummaries: function(quest, message, peers, MD) {
    const ref = message.get('text', '');
    return {info: ref, description: ref};
  },
  indexer: function(quest, entity) {
    const info = entity.get('meta.summaries.description');
    const ownerId = entity.get('messageId');
    return {info, ownerId};
  },
  onNew: function(quest, id, messageId, localeId, text) {
    return {
      id: id,
      messageId,
      localeId,
      text: text || '',
    };
  },
};

module.exports = {
  entity,
  service: buildEntity(entity),
};
