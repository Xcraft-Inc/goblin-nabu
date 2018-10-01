'use strict';
const {buildEntity} = require('goblin-workshop');

const entity = {
  type: 'nabuMessage',

  buildSummaries: function(quest, message, peers, MD) {
    const ref = message.get('id', '');
    return {info: ref, description: ref};
  },
  quests: {
    addMessage: function*(quest, message) {
      const msgId = `nabuMessage@${message.id}`;
      yield quest.create(msgId, {
        id: msgId,
        desktopId: quest.getDesktop(),
        description: message.description,
        translations: message.translations,
      });
    },
  },
  onNew: function(quest, id, description) {
    return {
      id: id,
      description: description,
      translations: {},
    };
  },
};

module.exports = {
  entity,
  service: buildEntity(entity),
};
