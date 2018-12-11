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

    quest.defer(() => quest.me.loadTranslations({messageId: entityId}));

    const workitemId = yield desk.addWorkitem({workitem, navigate: true}, next);
    quest.goblin.setX('singleEntityWorkitemId', workitemId);
  }
});

Goblin.registerQuest(goblinName, 'add-message', function*(
  quest,
  workitemId,
  nabuId,
  description,
  next
) {
  const enabled = quest.goblin.getState().get('enabled');
  if (enabled) {
    /*const e = quest.getAPI('elastic@nabu');
    e.index({
      type: quest.goblin.getX('appName'),
      documentId: doc.id,
      document: doc,
    });*/

    const messageId = `nabuMessage@${crypto.sha256(nabuId)}`;

    if (messageId === workitemId) {
      // Rare case when the translatable text is embedded inside a widget
      // wired itself with the message entity.
      // In this case, this means the entity has already been loaded, so we don't
      // need to load it again (otherwise we generate a leak as its id and owner are the same).
      return;
    }

    yield quest.createFor(
      messageId,
      workitemId,
      messageId,
      {
        id: messageId,
        nabuId,
        description: description || '',
        desktopId: quest.getDesktop(),
      },
      next
    );

    quest.defer(() => quest.me.loadTranslations({messageId}));
  }
});

Goblin.registerQuest(
  goblinName,
  'load-translations',
  (quest, messageId, ownerId) => {
    const enabled = quest.goblin.getState().get('enabled');
    if (enabled && messageId) {
      const hashedNabuId = messageId.split('@')[1];

      quest.goblin
        .getState()
        .get('locales')
        .forEach(locale => {
          const translationId = `nabuTranslation@${locale.get(
            'name'
          )}-${hashedNabuId}`;

          quest.defer(() =>
            quest.createFor(
              translationId,
              ownerId || messageId,
              translationId,
              {
                id: translationId,
                messageId,
                localeId: locale.get('id'),
              }
            )
          );
        });
    }
  }
);

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
    case 'set-selected-item':
      Goblin.registerQuest(goblinName, action, function*(
        quest,
        messageId,
        next
      ) {
        const enabled = quest.goblin.getState().get('enabled');
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
      continue;
    default:
      Goblin.registerQuest(goblinName, action, function(quest) {
        const enabled = quest.goblin.getState().get('enabled');
        if (enabled) {
          quest.do();
        }
      });
  }
}

// Singleton
module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
Goblin.createSingle(goblinName);
