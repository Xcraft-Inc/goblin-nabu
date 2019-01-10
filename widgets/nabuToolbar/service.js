'use strict';

const goblinName = 'nabuToolbar';

const Goblin = require('xcraft-core-goblin');

// Define initial logic values
const logicState = {
  id: goblinName,

  marker: false,
  focus: null,

  selectionMode: {
    enabled: false,
    selectedItemId: null,
  },
};

// Define logic handlers according rc.json
const logicHandlers = {
  create: state => state,
  'toggle-marks': state => {
    const newState = !state.get('marker');
    return state.set('marker', newState);
  },

  'set-focus': (state, action) => {
    return state.set(
      'focus',
      action.get('value') ? action.get('messageId') : null
    );
  },

  'set-selected-item': (state, action) => {
    return state.set(`selectionMode.selectedItemId`, action.get('messageId'));
  },

  'toggle-selection-mode': state => {
    const newState = !state.get(`selectionMode.enabled`);
    return state.set(`selectionMode.enabled`, newState);
  },
};

Goblin.registerQuest(goblinName, 'get', function(quest) {
  return quest.goblin.getState();
});

Goblin.registerQuest(goblinName, 'create', function(quest, desktopId) {
  quest.goblin.setX('desktopId', desktopId);
  quest.do();
});

Goblin.registerQuest(goblinName, 'delete', function(quest) {});

Goblin.registerQuest(goblinName, 'message-search', function*(quest, next) {
  const desk = quest.getAPI(quest.goblin.getX('desktopId'));
  const workitem = {
    name: 'nabuMessage-search',
    view: 'default',
    icon: 'solid/search',
    kind: 'tab',
    isClosable: true,
    navigate: true,
    maxInstances: 1,
  };

  yield desk.addWorkitem({workitem, navigate: true}, next);
});

Goblin.registerQuest(goblinName, 'open-datagrid', function*(quest, next) {
  const desk = quest.getAPI(quest.goblin.getX('desktopId'));
  const workitem = {
    id: quest.uuidV4(),
    name: 'nabuMessage-datagrid',
    view: 'default',
    icon: 'solid/file-alt',
    kind: 'dialog',
    isClosable: true,
    navigate: true,
    maxInstances: 1,
    isDone: false,
  };

  yield desk.addWorkitem({workitem, navigate: true}, next);
});

Goblin.registerQuest(goblinName, 'open-single-entity', function*(
  quest,
  entityId,
  next
) {
  const desk = quest.getAPI(quest.goblin.getX('desktopId'));

  if (entityId) {
    const workitem = {
      id: quest.uuidV4(),
      name: 'nabuMessage-workitem',
      view: 'default',
      icon: 'solid/file-alt',
      kind: 'dialog',
      isClosable: true,
      navigate: true,
      maxInstances: 1,
      isDone: false,
      payload: {
        entityId,
      },
    };

    quest.defer(() => {
      const nabu = quest.getAPI('nabu');
      nabu.loadTranslations({messageId: entityId});
    });

    const workitemId = yield desk.addWorkitem({workitem, navigate: true}, next);
    quest.goblin.setX('singleEntityWorkitemId', workitemId);
  }
});

Goblin.registerQuest(goblinName, 'set-selected-item', function*(
  quest,
  messageId,
  next
) {
  const nabu = quest.getAPI('nabu');
  const enabled = (yield nabu.get(next)).get('enabled');
  if (enabled) {
    const workitemId = quest.goblin.getX('singleEntityWorkitemId');
    if (workitemId) {
      const workitemApi = quest.getAPI(workitemId);
      try {
        yield workitemApi.changeEntity(
          {
            entityId: messageId,
          },
          next
        );
      } catch (err) {
        if (err.code !== 'XCRAFT_CMD_ERROR') {
          // otherwise, it is just because the workitem has been closed. how to do better??
          throw err;
        }
      }
    }
    quest.do();
  }
});

//Dynamic API see reducers for params
for (const action of Object.keys(logicHandlers)) {
  switch (action) {
    case 'toggle-selection-mode':
    case 'toggle-marks':
    case 'set-focus':
      Goblin.registerQuest(goblinName, action, function*(quest, next) {
        const nabu = quest.getAPI('nabu');
        const enabled = (yield nabu.get(next)).get('enabled');
        if (enabled) {
          quest.do();
        }
      });
  }
}

module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
