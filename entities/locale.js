'use strict';
const {buildEntity} = require('goblin-workshop');

const entity = {
  type: 'locale',

  buildSummaries: function(quest, locale, peers, MD) {
    const ref = locale.get('name', '');
    return {info: ref, description: ref};
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
