'use strict';
const {buildEntity} = require('goblin-workshop');

function convertToValue(info) {
  let value = 0;
  for (var i = 0; i < 5; i++) {
    let char = ' ';
    if (info.length > i) {
      char = info.charAt(i);
    }
    const intValue = char.charCodeAt(0);
    value = value + intValue;
  }
  return value;
}

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
    const ownerId = entity.get('messageId');
    const localeName = entity.get('meta.summaries.localeName');

    let result = {info, ownerId, localeName};

    const value = convertToValue(info);
    const variableName = `${localeName}-value`;
    result[variableName] = value;

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
