'use strict';

const path = require('path');
const goblinName = 'nabu';
const Goblin = require('xcraft-core-goblin');

// Define initial logic values
const logicState = {
  selectedLocale: null,
  locales: [],

  marker: false,
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

function addMessage(state, messageId, description, locale, translation) {
  let size = state.get('messages').size;
  size++;

  let newState = state.set(`messages.${messageId}`, {
    id: messageId,
    description: description,
    translations: {},
  });

  if (locale && translation) {
    newState = newState.set(`messages.${messageId}.translations`, {
      [locale]: {
        message: translation,
      },
    });
  }

  return newState.set(`translator.tableSize`, size);
}

function updateMessage(state, messageId, description, locale, translation) {
  let newState = state;

  if (description) {
    newState = newState.set(`messages.${messageId}.description`, description);
  }

  if (locale && translation) {
    newState = newState.set(
      `messages.${messageId}.translations.${locale}.message`,
      translation
    );
  }

  return newState;
}

function setMessage(state, messageId, description, locale, translation) {
  if (!state.has(`messages.${messageId}`)) {
    return addMessage(state, messageId, description, locale, translation);
  } else {
    return updateMessage(state, messageId, description, locale, translation);
  }
}

// Define logic handlers according rc.json
const logicHandlers = {
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

Goblin.registerQuest(goblinName, 'init', function(quest) {
  console.log('\x1b[32m%s\x1b[0m', '\u048a\u023a\u0243\u054d [STARTED]');
});

Goblin.registerQuest(goblinName, 'change-locale', function(quest, locale) {
  quest.do();
});

Goblin.registerQuest(goblinName, 'add-locale', function(quest, locale) {
  quest.do();
});

Goblin.registerQuest(goblinName, 'add-message', function(
  quest,
  messageId,
  description
) {
  quest.do();
});

Goblin.registerQuest(goblinName, 'translate', function(
  quest,
  messageId,
  local,
  value
) {
  quest.do();
});

Goblin.registerQuest(goblinName, 'set-focus', function(
  quest,
  messageId,
  value
) {
  quest.do();
});

Goblin.registerQuest(goblinName, 'set-selected-item', function(
  quest,
  messageId
) {
  quest.do();
});

Goblin.registerQuest(goblinName, 'toggle-marks', function(quest) {
  quest.do();
});

Goblin.registerQuest(goblinName, 'toggle-translator', function(quest) {
  quest.do();
});

Goblin.registerQuest(goblinName, 'toggle-selection-mode', function(quest) {
  quest.do();
});

// Singleton
module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
Goblin.createSingle(goblinName);
