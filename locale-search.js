'use strict';
const {buildWorkitem} = require('goblin-workshop');

const config = {
  type: 'locale',
  kind: 'search',
  title: 'Locales',
  list: 'locale',
  hinters: {
    locale: {
      onValidate: function*(quest, selection) {
        const desk = quest.getAPI(quest.goblin.getX('desktopId'));
        const locale = yield quest.me.getEntity({
          entityId: selection.value,
        });
        yield desk.addWorkitem({
          workitem: {
            name: 'locale-workitem',
            view: 'default',
            icon: 'solid/pencil',
            kind: 'tab',
            isClosable: true,
            payload: {
              entityId: selection.value,
              entity: locale,
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
