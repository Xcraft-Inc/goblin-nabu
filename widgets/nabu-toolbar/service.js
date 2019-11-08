//T:2019-02-28
'use strict';

const goblinName = 'nabu-toolbar';

const Goblin = require('xcraft-core-goblin');
const T = require('goblin-nabu/widgets/helpers/t.js');

const getNabuDesktopId = id => {
  if (id.endsWith('@nabu')) {
    return id;
  }
  const p = id.split('@');
  return `${p[0]}@${p[1]}@nabu`;
};

// Define initial logic values
const logicState = {
  show: false,
  enabled: false,

  marker: false,
  focus: null,

  editor: false,

  selectedLocaleId: null,
  selectionMode: {
    enabled: false,
    selectedItemId: null,
  },
};

// Define logic handlers according rc.json
const logicHandlers = {
  'create': (state, action) => {
    return state
      .set('id', action.get('id'))
      .set('show', action.get('show'))
      .set('editor', action.get('editor'));
  },
  'enable': state => {
    return state.set('enabled', true);
  },
  'disable': state => {
    return state.set('enabled', false);
  },

  'toggle-enabled': state => {
    const newState = !state.get('enabled');
    return state.set('enabled', newState);
  },
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

  'set-selected-locale': (state, action) => {
    return state.set(`selectedLocaleId`, action.get('localeId'));
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

Goblin.registerQuest(goblinName, 'create', function(quest, desktopId, enabled) {
  quest.goblin.setX('desktopId', desktopId);
  const nabuDesktopId = getNabuDesktopId(desktopId);

  //SET EDITOR MODE ONLY FOR NABU SESSION
  let editor = false;
  if (nabuDesktopId === desktopId) {
    editor = true;
    enabled = true;
  }

  quest.do({editor});
  if (enabled) {
    quest.dispatch('enable');
  }
  const goblinId = quest.goblin.id;
  quest.goblin.defer(
    quest.sub(`*::*.${goblinId}.edit-message-requested`, function*(
      err,
      {msg, resp}
    ) {
      yield resp.cmd(`${goblinName}.open-single-entity`, {
        id: goblinId,
        entityId: msg.data.entityId,
        navigate: msg.data.navigate,
      });
    })
  );
});

Goblin.registerQuest(goblinName, 'delete', function(quest) {});

Goblin.registerQuest(goblinName, 'open-locale-search', function*(quest, next) {
  const desk = quest.getAPI(quest.goblin.getX('desktopId'));
  const workitem = {
    name: 'locale-search',
    description: T("Recherche d'une locale"),
    view: 'default',
    icon: 'solid/search',
    kind: 'tab',
    isClosable: true,
    navigate: true,
    maxInstances: 1,
  };

  yield desk.addWorkitem({workitem, navigate: true}, next);
});

Goblin.registerQuest(goblinName, 'open-session', function*(quest) {
  const client = quest.getAPI('client');
  const nabuAPI = quest.getAPI('nabu');
  const configuration = yield nabuAPI.getConfiguration();
  yield client.openSession({
    desktopId: `desktop@${configuration.mandate}@nabu`,
    session: `desktop@${configuration.mandate}@nabu`,
    username: 'nabu',
    rootWidget: 'desktop',
    configuration,
  });
  quest.dispatch('enable');
});

Goblin.registerQuest(goblinName, 'open-datagrid', function*(quest, next) {
  const desk = quest.getAPI(quest.goblin.getX('desktopId'));
  const workitem = {
    id: quest.uuidV4(),
    name: 'nabuMessage-datagrid',
    view: 'default',
    icon: 'solid/file-alt',
    kind: 'tab',
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
  navigate,
  next
) {
  const desktopId = quest.goblin.getX('desktopId');
  const nabuDesktopId = getNabuDesktopId(desktopId);
  const desk = quest.getAPI(nabuDesktopId);

  if (entityId) {
    const workitem = {
      id: quest.uuidV4(),
      name: 'nabuMessage-workitem',
      view: 'default',
      icon: 'solid/file-alt',
      kind: 'tab',
      isClosable: true,
      isDone: false,
      payload: {
        entityId,
      },
    };

    const workitemId = yield desk.addWorkitem(
      {workitem, navigate: !!navigate},
      next
    );
    const workitemApi = quest.getAPI(workitemId);
    yield workitemApi.setPostRemove({
      postRemoveAction: () =>
        quest.goblin.setX('singleEntityWorkitemId', undefined),
    });

    quest.goblin.setX('singleEntityWorkitemId', workitemId);

    const nabu = quest.getAPI('nabu');
    // TODO: optimize with delegator
    yield nabu.loadTranslations({
      messageId: entityId,
      desktopId,
    });
    if (nabuDesktopId !== desktopId) {
      yield nabu.loadTranslations({
        messageId: entityId,
        desktopId: nabuDesktopId,
      });
    }
  }
});

Goblin.registerQuest(goblinName, 'set-selected-item', function*(
  quest,
  messageId,
  next
) {
  const enabled = quest.goblin.getState().get('enabled');
  if (enabled) {
    const desktopId = quest.goblin.getX('desktopId');
    const nabuDesktopId = getNabuDesktopId(desktopId);
    const workitemId = quest.goblin.getX('singleEntityWorkitemId');
    if (workitemId) {
      const workitemApi = quest.getAPI(workitemId);
      yield workitemApi.changeEntity(
        {
          desktopId: nabuDesktopId,
          entityId: messageId,
        },
        next
      );
      const nabu = quest.getAPI('nabu');
      yield nabu.loadTranslations({
        messageId: messageId,
        desktopId,
      });
      if (nabuDesktopId !== desktopId) {
        yield nabu.loadTranslations({
          messageId: messageId,
          desktopId: nabuDesktopId,
        });
      }
    }
    quest.do();
  }
});

Goblin.registerQuest(goblinName, 'set-locale-from-name', function*(
  quest,
  name
) {
  const nabuAPI = quest.getAPI('nabu');
  const locale = yield nabuAPI.findBestLocale({locale: name});
  if (!locale) {
    return false;
  }
  const localeId = locale.get('id');
  yield quest.me.setSelectedLocale({localeId});
  return true;
});

//Dynamic API see reducers for params
for (const action of Object.keys(logicHandlers)) {
  switch (action) {
    case 'enable':
    case 'disable':
    case 'toggle-enabled':
    case 'set-selected-locale':
      Goblin.registerQuest(goblinName, action, function(quest) {
        quest.do();
      });
      break;
    case 'toggle-selection-mode':
    case 'toggle-marks':
    case 'set-focus':
      Goblin.registerQuest(goblinName, action, function(quest) {
        const enabled = quest.goblin.getState().get('enabled');
        if (enabled) {
          quest.do();
        }
      });
  }
}

module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
