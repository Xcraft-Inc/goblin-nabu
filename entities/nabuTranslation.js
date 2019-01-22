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
    const localeName = peers['localeId'].get('name');
    return {info: ref, description: ref, localeName};
  },
  indexer: function(quest, entity) {
    const info = entity.get('meta.summaries.description');
    const messageId = entity.get('messageId');

    let result = {info, messageId};

    const localeName = entity.get('meta.summaries.localeName');
    const variableName = `${localeName}-value`;
    result[variableName] = info.toLowerCase();

    return result;
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
