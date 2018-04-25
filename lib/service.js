'use strict';

const goblinName = 'nabu';

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
    return state.set('marker', newState);
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
    return state.setIn(`selectionMode.selectedItemId`, action.get('messageId'));
  },

  'toggle-selection-mode': state => {
    const newState = !state.get(`selectionMode.enabled`);
    return state.set(`selectionMode.enabled`, newState);
  },
};

Goblin.registerQuest(goblinName, 'init', function(quest, disabled) {
  if (!disabled) {
    quest.me.enable();
    console.log('\x1b[32m%s\x1b[0m', '\u048a\u023a\u0243\u054d [ENABLED]');
  } else {
    console.log('\x1b[31m%s\x1b[0m', '\u048a\u023a\u0243\u054d [DISABLED]');
  }
});

const doIfEnabled = quest => {
  const enabled = quest.goblin.getState().get('enabled');
  if (enabled) {
    quest.do();
  }
};

//Dynamic API see reducers for params
for (const action of Object.keys(logicHandlers)) {
  if (action === 'enable' || action === 'disable') {
    Goblin.registerQuest(goblinName, action, function(quest) {
      quest.do();
    });
    continue;
  }
  Goblin.registerQuest(goblinName, action, doIfEnabled);
}

// Singleton
module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
Goblin.createSingle(goblinName);
