'use strict';
const {buildEntity} = require('goblin-workshop');

const entity = {
  type: 'nabuTranslation',
  references: {
    messageId: 'nabuMessage',
  },
  newEntityStatus: 'draft',
  cache: 0,
  buildSummaries: function(quest, nabuTranslation, peers, MD) {
    const ref = nabuTranslation.get('text', '');
    const localeName = nabuTranslation.get('locale');
    return {info: ref, description: ref, localeName};
  },
  indexer: function(quest, nabuTranslation) {
    const info = nabuTranslation.get('meta.summaries.description', '');
    const messageId = nabuTranslation.get('messageId');

    let result = {info, messageId};

    const localeName = nabuTranslation.get('meta.summaries.localeName');
    const variableName = `${localeName}-value`;
    result[variableName] = info.toLowerCase();

    return result;
  },
  onNew: function(quest, id, messageId, locale, text) {
    return {
      id: id,
      messageId,
      locale: locale || id.split('@')[1],
      text: text || '',
    };
  },
};

module.exports = {
  entity,
  service: buildEntity(entity),
};
