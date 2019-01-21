'use strict';

const goblinName = 'nabu';
const $ = require('highland');
const watt = require('watt');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const {crypto} = require('xcraft-core-utils');
const {projectPath} = require('xcraft-core-host');
const Goblin = require('xcraft-core-goblin');
const {extractDesktopId} = require('./helpers.js');
const {
  getUniqueSourceString,
  updateSources,

  addMessage,
  patchMessage,
  deleteMessage,

  retrieveJsFiles,
} = require('./extract-helpers.js');

// Define initial logic values
const logicState = {
  id: goblinName,
  locales: [],
};

// Define logic handlers according rc.json
const logicHandlers = {
  'set-locales': (state, action) => {
    return state.set('locales', action.get('locales'));
  },
};

const loadLocales = watt(function*(quest, next) {
  const r = quest.getStorage('rethink');

  const locales = yield r.getAll({
    table: 'locale',
  });

  yield quest.me.setLocales({locales}, next);
});

const loadEntities = watt(function*(quest, desktopId, enabled, next) {
  const toolbarId = `nabu-toolbar@${desktopId}`;
  yield quest.createFor(
    'desktop',
    desktopId,
    'nabu-toolbar',
    {
      id: toolbarId,
      desktopId,
      enabled,
    },
    next
  );

  yield quest.createFor(
    'desktop',
    desktopId,
    'nabuConfiguration',
    {
      id: 'nabuConfiguration@main',
      desktopId,
    },
    next
  );

  loadLocales(quest);
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
  if (!desktopId) {
    throw new Error('Nabu init-error: required desktopId parameter');
  }

  quest.goblin.setX('appName', appName);
  yield loadEntities(quest, desktopId, !disabled, next);

  if (!disabled) {
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

Goblin.registerQuest(goblinName, 'add-message', function*(
  quest,
  workitemId,
  desktopId,
  nabuId,
  description,
  next
) {
  const messageId = `nabuMessage@${crypto.sha256(nabuId)}`;

  if (messageId === workitemId) {
    // Rare case when the translatable text is embedded inside a widget
    // wired itself with the message entity.
    // In this case, this means the entity has already been loaded, so we don't
    // need to load it again (otherwise we generate a leak as its id and owner are the same).
    return;
  }

  const finalDesktopId = desktopId || extractDesktopId(workitemId);
  if (!finalDesktopId) {
    console.warn(
      `cannot extract desktopId from workitem ${workitemId} and none is provided`
    );
    return;
  }

  quest.defer(() =>
    quest.me.loadTranslations({messageId, desktopId: finalDesktopId})
  );

  const appName = quest.goblin.getX('appName');

  const entity = yield quest.createFor(
    messageId,
    workitemId,
    messageId,
    {
      id: messageId,
      nabuId,
      desktopId: finalDesktopId,
      sources: [],
    },
    next
  );

  const currentSource = {
    appName,
    description: description || '',
    path: '',
    location: {
      start: {
        line: '',
        column: '',
      },
      end: {
        line: '',
        column: '',
      },
    },
  };

  const persistedSources = (yield entity.get({path: 'sources'}, next)).toJS();

  if (
    persistedSources.filter(
      source =>
        source.appName === currentSource.appName &&
        source.description === currentSource.description
    ).length === 0
  ) {
    // we consider that if a source with same appName/description already exists, then it will probably be
    // linked to this particular message and we do not add the source
    yield entity.change(
      {
        path: 'sources',
        newValue: _(persistedSources.concat([currentSource]))
          .uniqBy(source => getUniqueSourceString(source))
          .value(),
      },
      next
    );
  }
});

const extractFileMessages = watt(function*(
  babelCore,
  filePath,
  appName,
  wrapper,
  next
) {
  const relativePath = path.relative(projectPath, filePath);

  const opts = {
    presets: ['es2015', 'react', 'stage-0'],
    plugins: [
      [
        './lib/goblin-nabu/lib/babel-plugin-extractor.js',
        {appName, file: relativePath},
      ],
    ],
  };

  try {
    const content = yield fs.readFile(filePath, next);
    const res = babelCore.transform(content, opts);

    if (res) {
      console.log(
        `found ${
          res.metadata['nabu'].messages.length
        } messages in file ${relativePath}`
      );

      wrapper.messages = wrapper.messages.concat(res.metadata['nabu'].messages);
    }
  } catch (err) {
    console.warn(`error processing file ${relativePath}: ${err}`);
  }
});

Goblin.registerQuest(goblinName, 'extract-messages', function*(
  quest,
  desktopId,
  next
) {
  const babelCore = require('babel-core');

  /*
      source: {
        appName: '...',
        description: '',
        path: '...',
        process: 'frontend' | 'backend',
        component: '<JSX Component>',
        location: {
          start: {
            line: '..',
            column: '..'
          },
          end: {
            line: '..',
            column: '..'
          }
        }
      }
  */
  const appName = quest.goblin.getX('appName');
  const paths = retrieveJsFiles();
  const messagesWrapper = {
    messages: [],
  };

  yield $(paths)
    .map(filePath => n => {
      extractFileMessages(babelCore, filePath, appName, messagesWrapper, n);
    })
    .nfcall([])
    .parallel(10)
    .done(next);

  const r = quest.getStorage('rethink');
  const persistedMessages = (yield r.getAll({
    table: 'nabuMessage',
  })).map(message => {
    // marking persisted sources as old
    message.sources = message.sources.map(source => ({
      isOld: true,
      ...source,
    }));

    return message;
  });

  const persistedMessagesIds = persistedMessages.map(msg => msg.id);
  const messagesIds = messagesWrapper.messages.map(msg => msg.id);

  const messagesToDelete = _.without.apply(
    _,
    [persistedMessagesIds].concat(messagesIds)
  );
  const messagesToAdd = _.without.apply(
    _,
    [messagesIds].concat(persistedMessagesIds)
  );
  const messagesToPatch = _.without.apply(
    _,
    [messagesIds].concat(messagesToAdd)
  );

  const messagesMap = {};
  _(persistedMessages.concat(messagesWrapper.messages))
    .groupBy(msg => msg.id)
    .map(group => {
      return {
        id: group[0].id,
        nabuId: group[0].nabuId,
        sources: updateSources(
          _(group)
            .flatMap(group => group.sources)
            .value(),
          appName
        ),
      };
    })
    .value()
    .forEach(msg => (messagesMap[msg.id] = msg));

  for (let msgId of messagesToDelete) {
    deleteMessage(
      quest,
      messagesMap[msgId],
      desktopId,
      appName,
      next.parallel()
    );
  }

  for (let msgId of messagesToAdd) {
    addMessage(quest, messagesMap[msgId], desktopId, next.parallel());
  }

  for (let msgId of messagesToPatch) {
    patchMessage(quest, messagesMap[msgId], desktopId, next.parallel());
  }

  yield next.sync();
});

Goblin.registerQuest(
  goblinName,
  'load-translations',
  (quest, messageId, ownerId, desktopId) => {
    if (messageId) {
      const hashedNabuId = messageId.split('@')[1];
      const finalDesktopId = desktopId || extractDesktopId(ownerId);

      if (!finalDesktopId) {
        console.warn(
          `cannot extract desktopId from ownerId ${ownerId} and none is provided`
        );
        return;
      }

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
                desktopId: finalDesktopId,
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
    case 'set-locales':
      Goblin.registerQuest(goblinName, action, function(quest) {
        quest.do();
      });
      continue;
  }
}

// Singleton
module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
Goblin.createSingle(goblinName);
