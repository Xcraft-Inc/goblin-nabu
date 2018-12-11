'use strict';
const {buildWorkitem} = require('goblin-workshop');

const config = {
  type: 'nabuMessage',
  kind: 'search',
  title: 'Messages',
  list: 'nabuMessage',
  hinters: {
    nabuMessage: {
      onValidate: function*(quest, selection) {
        const desk = quest.getAPI(quest.goblin.getX('desktopId'));
        const nabuMessage = yield quest.me.getEntity({
          entityId: selection.value,
        });
        yield desk.addWorkitem({
          workitem: {
            name: 'nabuMessage-workitem',
            view: 'default',
            icon: 'solid/pencil',
            kind: 'tab',
            isClosable: true,
            payload: {
              entityId: selection.value,
              entity: nabuMessage,
            },
          },
          navigate: true,
        });
      },
    },
  },
};

exports.xcraftCommands = function() {
  return buildWorkitem(config);
};
