'use strict';
const {buildEntity} = require('goblin-workshop');

function convertToValue(info) {
  let value = 0;
  for (var i = 0; i < 1; i++) {
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
  type: 'nabuMessage',
  newEntityStatus: 'published',

  buildSummaries: function(quest, message) {
    const ref = message.get('nabuId', '');
    return {info: ref, description: ref};
  },
  indexer: function(quest, entity) {
    const info = entity.get('meta.summaries.description');
    const value = convertToValue(info);

    return {info, value, localeName: 'noLocale'};
  },
  quests: {},
  onNew: function(quest, id, nabuId, description) {
    return {
      id: id,
      nabuId: nabuId || '',
      description: description || '',
    };
  },
};

module.exports = {
  entity,
  service: buildEntity(entity),
};
