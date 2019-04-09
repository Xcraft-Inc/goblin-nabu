'use strict';
//T:2019-04-09

const T = require('goblin-nabu/widgets/helpers/t.js');
const {buildWorkitem} = require('goblin-workshop');

const config = {
  type: 'nabuMessage',
  kind: 'search',
  title: T('Messages'),
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
  afterFetch: function*(quest, listId) {
    yield quest.me.loadEntities({listId});
  },
  quests: {
    loadEntities: function*(quest, listId, next) {
      // Don't need to load entity since list already have a load
      // main entity
      const listApi = quest.getAPI(listId);

      const ids = yield listApi.getListIds(next);
      yield quest.me.loadTranslations({listIds: ids});
    },
    loadTranslations: function*(quest, listIds, next) {
      const nabuApi = quest.getAPI('nabu');
      // TODO: optimize with delegator
      for (const messageId of Object.values(listIds)) {
        nabuApi.loadTranslations(
          {messageId, ownerId: quest.me.id},
          next.parallel()
        );
      }
      yield next.sync();
    },
  },
};

exports.xcraftCommands = function() {
  return buildWorkitem(config);
};
