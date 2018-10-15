'use strict';

const goblinName = 'nabu';

const {Map, fromJS} = require('immutable');
const _ = require('lodash');
const watt = require('watt');
const {crypto} = require('xcraft-core-utils');
const Goblin = require('xcraft-core-goblin');
const Shredder = require('xcraft-core-shredder');

// Define initial logic values
const logicState = {
  id: goblinName,
  enabled: false,

  locales: [],

  marker: true,
  focus: null,

  selectionMode: {
    enabled: false,
    selectedItemId: null,
  },

  translator: {
    isOpen: false,
    tableSize: 0,
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

  'set-locales': (state, action) => {
    return state.set('locales', action.get('locales'));
  },
  'set-messages': (state, action) => {
    return state.set(
      'messages',
      new Shredder(
        Map(
          fromJS(action.get('messages').map(message => [message.id, message]))
        )
      )
    );
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

  const loadMessages = _.debounce(
    watt(function*(next) {
      // Message handling
      const r = quest.getStorage('rethink');

      const messages = yield r.getAll({
        table: 'nabuMessage',
      });

      yield quest.me.setMessages({messages});
    }),
    500
  );

  yield quest.createFor('desktop', desktopId, 'nabuConfiguration', {
    id: 'nabuConfiguration@main',
    desktopId: desktopId,
  });

  loadLocales();
  loadMessages();

  quest.goblin.defer(
    quest.sub(`locale.change`, (err, msg) => {
      console.log('locale created!!!');
      console.dir(msg);
      loadLocales();
    })
  );
});

Goblin.registerQuest(goblinName, 'get', function(quest) {
  return quest.goblin.getState();
});

Goblin.registerQuest(goblinName, 'init', function*(
  quest,
  appName,
  mandate,
  desktopId,
  disabled,
  next
) {
  if (!appName) {
    throw new Error('Nabu init-error: required appName parameter');
  }

  quest.goblin.setX('appName', appName);
  quest.goblin.setX('desktopId', `nabu@${mandate}@${quest.uuidV4()}`);

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

const doIfEnabled = quest => {
  const enabled = quest.goblin.getState().get('enabled');
  if (enabled) {
    quest.do();
  }
};

const doAndIndexIfEnabled = (quest, nabuId) => {
  const enabled = quest.goblin.getState().get('enabled');
  if (enabled) {
    quest.do();
    /*const e = quest.getAPI('elastic@nabu');
    e.index({
      type: quest.goblin.getX('appName'),
      documentId: doc.id,
      document: doc,
    });*/

    const msgId = `nabuMessage@${crypto.sha256(nabuId)}`;
    quest.create(msgId, {
      id: msgId,
      nabuId: nabuId,
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
    case 'set-messages':
      Goblin.registerQuest(goblinName, action, function(quest) {
        quest.do();
      });
      continue;
    case 'add-message':
      Goblin.registerQuest(goblinName, action, doAndIndexIfEnabled);
      continue;
    default:
      Goblin.registerQuest(goblinName, action, doIfEnabled);
  }
}

// Singleton
module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
Goblin.createSingle(goblinName);
