'use strict';

const goblinName = 'nabu';

const _ = require('lodash');
const watt = require('watt');
const {crypto} = require('xcraft-core-utils');
const Goblin = require('xcraft-core-goblin');

// Define initial logic values
const logicState = {
  id: goblinName,
  enabled: false,

  locales: [],

  marker: false,
  focus: null,

  selectionMode: {
    enabled: false,
    selectedItemId: null,
  },

  translator: {
    isOpen: false,
  },
};

// /!\ We must take care of messageId with Shredder state,
// getter and setter can corrupt state if we use path descriptor
// ex. with messageId 'it'was... bad!'  -> state.set ('messages.it'was... bad!.translation')

// Define logic handlers according rc.json
const logicHandlers = {
  enable: state => {
    return state.set('enabled', true);
  },
  disable: state => {
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

  'toggle-translator': state => {
    const newState = !state.get(`translator.isOpen`);
    return state.set(`translator.isOpen`, newState);
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

  'add-message': (state, action) => {
    return state;
  },
  'set-locales': (state, action) => {
    return state.set('locales', action.get('locales'));
  },
};

const loadEntities = watt(function*(quest, desktopId, next) {
  const loadLocales = _.debounce(
    watt(function*(next) {
      // Locale handling
      const r = quest.getStorage('rethink');

      const locales = yield r.getAll({
        table: 'locale',
      });

      yield quest.me.setLocales({locales});
    }),
    500
  );

  yield quest.createFor('desktop', desktopId, 'nabuConfiguration', {
    id: 'nabuConfiguration@main',
    desktopId: desktopId,
  });

  loadLocales();
});

Goblin.registerQuest(goblinName, 'get', function(quest) {
  return quest.goblin.getState();
});

Goblin.registerQuest(goblinName, 'init', function*(
  quest,
  appName,
  desktopId,
  disabled,
  next
) {
  if (!appName) {
    throw new Error('Nabu init-error: required appName parameter');
  }

  quest.goblin.setX('appName', appName);
  quest.goblin.setX('desktopId', desktopId);

  const nabuElastic = `elastic@nabu`;
  const e = yield quest.create(nabuElastic, {
    id: nabuElastic,
    url: 'lab0.epsitec.ch:9200',
    index: `nabu`,
  });
  yield e.ensureIndex();
  yield e.ensureType({
    type: appName,
  });

  yield loadEntities(quest, desktopId, next);

  if (!disabled) {
    quest.me.enable();
    console.log('\x1b[32m%s\x1b[0m', '\u048a\u023a\u0243\u054d [ENABLED]');
  } else {
    console.log('\x1b[31m%s\x1b[0m', '\u048a\u023a\u0243\u054d [DISABLED]');
  }
});

Goblin.registerQuest(goblinName, 'reset-index', function(quest) {
  const e = quest.getAPI('elastic@nabu');
  e.resetIndex();
  console.log('\x1b[31m%s\x1b[0m', '\u048a\u023a\u0243\u054d index [RESETED]');
});

Goblin.registerQuest(goblinName, 'open-datagrid', function(quest) {
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

  desk.addWorkitem({workitem, navigate: true});
});

const doIfEnabled = quest => {
  const enabled = quest.goblin.getState().get('enabled');
  if (enabled) {
    quest.do();
  }
};

const addMessage = (quest, workitemId, messageId, description) => {
  const enabled = quest.goblin.getState().get('enabled');
  if (enabled) {
    quest.do();
    /*const e = quest.getAPI('elastic@nabu');
    e.index({
      type: quest.goblin.getX('appName'),
      documentId: doc.id,
      document: doc,
    });*/

    const msgId = `nabuMessage@${crypto.sha256(messageId)}`;
    quest.createFor(msgId, workitemId, msgId, {
      id: msgId,
      nabuId: messageId,
      description: description || '',
      desktopId: quest.getDesktop(),
    });
  }
};

//Dynamic API see reducers for params
for (const action of Object.keys(logicHandlers)) {
  switch (action) {
    case 'enable':
    case 'disable':
    case 'toggle-enabled':
    case 'set-locales':
      Goblin.registerQuest(goblinName, action, function(quest) {
        quest.do();
      });
      continue;
    case 'add-message':
      Goblin.registerQuest(goblinName, action, addMessage);
      continue;
    default:
      Goblin.registerQuest(goblinName, action, doIfEnabled);
  }
}

// Singleton
module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
Goblin.createSingle(goblinName);
