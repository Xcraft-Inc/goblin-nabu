'use strict';

const path = require('path');
const goblinName = path.basename(module.parent.filename, '.js');
const Goblin = require('xcraft-core-goblin');

const DEFAULT_LOCALE = 'fr-CH';

// Define initial logic values
const logicState = {
  selectedLocale: DEFAULT_LOCALE,
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
  create: (state, action) => {
    return state.set('id', action.get('id'));
  },

  NABU_ADD_LOCALE: (state, action) => {
    const locale = action.get('locale');
    if (state.get('locales').includes(locale)) {
      return state;
    }
    return state.push('locales', locale);
  },

  NABU_CHANGE_SELECTED_LOCALE: (state, action) => {
    return state.set('selectedLocale', action.get('locale'));
  },

  NABU_ADD_MESSAGE: (state, action) => {
    return setMessage(
      state,
      action.get('messageId'),
      action.get('description'),
      null,
      null
    );
  },

  NABU_TRANSLATE: (state, action) => {
    return setMessage(
      state,
      action.messageId,
      null,
      action.locale,
      action.value
    );
  },

  NABU_TOGGLE_MARKS: state => {
    const newState = !state.get('marker');
    return state.set('marker', newState);
  },

  NABU_TOGGLE_TRANSLATOR: state => {
    const newState = !state.getIn(['translator', 'isOpen']);
    return state.setIn(['translator', 'isOpen'], newState);
  },

  NABU_SET_FOCUS: (state, action) => {
    return state.set('focus', action.value ? action.messageId : null);
  },

  NABU_SET_SELECTED_ITEM: (state, action) => {
    return state.setIn(['selectionMode', 'selectedItemId'], action.messageId);
  },

  NABU_TOGGLE_SELECTION_MODE: state => {
    const newState = !state.getIn(['selectionMode', 'enabled']);
    return state.setIn(['selectionMode', 'enabled'], newState);
  },
};

Goblin.registerQuest(goblinName, 'create', function(quest, desktopId) {
  quest.goblin.setX('desktopId', desktopId);
  quest.do();
});

Goblin.registerQuest(goblinName, 'do', function(quest, action, payload) {
  quest.dispatch(action, payload);
});

Goblin.registerQuest(goblinName, 'delete', function(quest) {});

// Create a Goblin with initial state and handlers
module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
