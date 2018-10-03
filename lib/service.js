'use strict';

const goblinName = 'nabu';

const {crypto} = require('xcraft-core-utils');
const Goblin = require('xcraft-core-goblin');
const Shredder = require('xcraft-core-shredder');

// Define initial logic values
const logicState = {
  id: goblinName,
  enabled: false,

  selectedLocale: null,
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

  messages: {},
};

// /!\ We must take care of messageId with Shredder state,
// getter and setter can corrupt state if we use path descriptor
// ex. with messageId 'it'was... bad!'  -> state.set ('messages.it'was... bad!.translation')

function addMessage(state, messageId, description, locale, translation) {
  //Back to immutableJS API
  let newState = state.state;
  let size = newState.get('messages').size;
  size++;

  newState = newState.setIn(
    ['messages', messageId],
    Shredder.fromJS({
      id: messageId,
      description: description,
      translations: {},
    })
  );

  if (locale && translation) {
    newState = newState.setIn(
      ['messages', messageId, 'translations'],
      Shredder.fromJS({
        [locale]: {
          message: translation,
        },
      })
    );
  }
  newState = newState.setIn(['translator', 'tableSize'], size);
  //Return a new Shredder
  return new Shredder(newState);
}

function updateMessage(state, messageId, description, locale, translation) {
  let newState = state.state;

  if (description) {
    newState = newState.setIn(
      ['messages', messageId, 'description'],
      description
    );
  }

  if (locale && translation) {
    newState = newState.setIn(
      ['messages', messageId, 'translations', locale, 'message'],
      translation
    );
  }

  return new Shredder(newState);
}

function setMessage(state, messageId, description, locale, translation) {
  if (!state.state.hasIn(['messages', messageId])) {
    return addMessage(state, messageId, description, locale, translation);
  } else {
    return updateMessage(state, messageId, description, locale, translation);
  }
}

// Define logic handlers according rc.json
const logicHandlers = {
  enable: state => {
    return state.set('enabled', true);
  },
  disable: state => {
    return state.set('enabled', false);
  },
  'add-locale': (state, action) => {
    const locale = action.get('locale');
    if (state.get('locales').includes(locale)) {
      return state;
    }
    return state.push('locales', locale);
  },

  'change-locale': (state, action) => {
    return state.set('selectedLocale', action.get('locale'));
  },

  'add-message': (state, action) => {
    return setMessage(
      state,
      action.get('messageId'),
      action.get('description'),
      null,
      null
    );
  },

  translate: (state, action) => {
    return setMessage(
      state,
      action.get('messageId'),
      null,
      action.get('locale'),
      action.get('value')
    );
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
};

Goblin.registerQuest(goblinName, 'get', function(quest) {
  return quest.goblin.getState();
});

Goblin.registerQuest(goblinName, 'init', function*(
  quest,
  appName,
  mandate,
  disabled
) {
  if (!appName) {
    throw new Error('Nabu init-error: required appName parameter');
  }
  quest.goblin.setX('appName', appName);
  quest.goblin.setX('desktopId', `desktop@${mandate}@${quest.uuidV4()}`);
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

const doAndIndexIfEnabled = (quest, messageId) => {
  const enabled = quest.goblin.getState().get('enabled');
  if (enabled) {
    quest.do();
    const messages = quest.goblin.getState().get('messages').state;
    const doc = messages.get(messageId).toJS();
    const e = quest.getAPI('elastic@nabu');
    e.index({
      type: quest.goblin.getX('appName'),
      documentId: doc.id,
      document: doc,
    });

    const msgId = `nabuMessage@${crypto.sha256(doc.id)}`;
    quest.create(msgId, {
      id: msgId,
      nabuId: doc.id,
      description: doc.description || '',
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
      Goblin.registerQuest(goblinName, action, function(quest) {
        quest.do();
      });
      continue;
    case 'add-message':
    case 'translate':
      Goblin.registerQuest(goblinName, action, doAndIndexIfEnabled);
      continue;
    default:
      Goblin.registerQuest(goblinName, action, doIfEnabled);
  }
}

// Singleton
module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
Goblin.createSingle(goblinName);
