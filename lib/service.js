'use strict';

const goblinName = 'nabu';

const $ = require('highland');
const watt = require('watt');
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const {crypto} = require('xcraft-core-utils');
const {projectPath, appId} = require('xcraft-core-host');
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

const cacheFileName = 'translations.json';

// Define logic handlers according rc.json
const logicHandlers = {
  'set-locales': (state, action) => {
    return state.set('locales', action.get('locales'));
  },
  'set-translations': (state, action) => {
    return state.set('translations', action.get('translations'));
  },
};

const trySetLocales = watt(function*(quest, locales, desktopId, next) {
  const currLocales = quest.goblin.getState().get('locales');
  let shouldReload = false;

  for (let localeName of locales) {
    if (!currLocales.find(locale => locale.get('name') === localeName)) {
      // no locale exists, we should create one
      const localeId = `locale@${quest.uuidV4()}`;
      yield quest.createFor(
        localeId,
        desktopId,
        localeId,
        {
          id: localeId,
          name: localeName,
          desktopId,
        },
        next
      );
      shouldReload = true;
    }
  }

  if (shouldReload) {
    yield loadLocales(quest, next);
  }
});

const loadLocales = watt(function*(quest, next) {
  const r = quest.getStorage('rethink');

  const locales = yield r.getAll({
    table: 'locale',
  });

  yield quest.me.setLocales({locales}, next);
});

const loadEntities = watt(function*(quest, desktopId, showToolbar, next) {
  const toolbarId = `nabu-toolbar@${desktopId}`;
  yield quest.createFor(
    'desktop',
    desktopId,
    'nabu-toolbar',
    {
      id: toolbarId,
      desktopId,
      enabled: false,
      show: showToolbar,
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

  yield loadLocales(quest, next);
});

Goblin.registerQuest(goblinName, 'get', function(quest) {
  return quest.goblin.getState();
});

Goblin.registerQuest(goblinName, 'init-desktop', function*(
  quest,
  appName,
  desktopId,
  showToolbar,
  next
) {
  if (!appName) {
    throw new Error('Nabu init-error: required appName parameter');
  }
  if (!desktopId) {
    throw new Error('Nabu init-error: required desktopId parameter');
  }

  quest.goblin.setX('appName', appName);
  yield loadEntities(quest, desktopId, showToolbar, next);
  yield quest.me.unpackMessages({desktopId});

  if (showToolbar) {
    console.log(
      '\x1b[32m%s\x1b[0m',
      '\u048a\u023a\u0243\u054d TOOLBAR [ENABLED]'
    );
  } else {
    console.log(
      '\x1b[31m%s\x1b[0m',
      '\u048a\u023a\u0243\u054d TOOLBAR [DISABLED]'
    );
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

  // TODO: optimize with delegator
  yield quest.me.loadTranslations({messageId, desktopId: finalDesktopId});
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

  console.log('operation completed!!');
});

const retrieveMessageTranslations = watt(function*(
  quest,
  message,
  wrapper,
  next
) {
  const r = quest.getStorage('rethink');
  const nabuTranslations = yield r.getAll(
    {
      table: 'nabuTranslation',
      filter: {messageId: message.id},
    },
    next
  );

  if (nabuTranslations.length > 0) {
    const translations = {};
    for (let nabuTranslation of nabuTranslations) {
      if (nabuTranslation.text && nabuTranslation.text !== '') {
        const locale = quest.goblin
          .getState()
          .get('locales')
          .find(locale => locale.get('id') === nabuTranslation.localeId);
        if (locale) {
          translations[locale.get('name')] = nabuTranslation.text;
        }
      }
    }

    if (Object.keys(translations).length > 0)
      wrapper[message.id] = translations;
  }
});

Goblin.registerQuest(goblinName, 'pack-messages', function*(
  quest,
  desktopId,
  next
) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('cannot pack messages in production mode');
  }

  const appName = quest.goblin.getX('appName');
  const r = quest.getStorage('rethink');
  const translatedMessages = {};

  const messages = (yield r.getAll({
    table: 'nabuMessage',
  })).filter(
    message =>
      message.sources.filter(source => source.appName === appName).length > 0
  );

  yield $(messages)
    .map(message => n => {
      retrieveMessageTranslations(quest, message, translatedMessages, n);
    })
    .nfcall([])
    .parallel(10)
    .done(next);

  console.log(
    `found ${Object.keys(translatedMessages).length} messages with translations`
  );

  if (Object.keys(messages).length > 0) {
    const resourcesPath = path.resolve(projectPath, 'app', appId, 'resources');

    yield fs.ensureDir(resourcesPath, next);
    yield fs.writeFile(
      path.resolve(resourcesPath, cacheFileName),
      JSON.stringify(
        {
          locales: quest.goblin
            .getState()
            .get('locales')
            .map(locale => locale.get('name'))
            .toJS(),
          translations: translatedMessages,
        },
        {encoding: 'utf8', flag: 'w'}
      ),
      next
    );
  }

  console.log('operation completed!!');
});

Goblin.registerQuest(goblinName, 'unpack-messages', function*(
  quest,
  desktopId,
  next
) {
  let basePath = projectPath;

  if (/[\\/]app\.asar[\\/]/.test(projectPath)) {
    /* I don't use hazardous here, because the project is broken with electron >1 */
    basePath = projectPath.replace(/app\.asar/, 'app.asar.unpacked');
  }

  // TODO: optimize with delegator
  const translationsPath =
    process.env.NODE_ENV === 'production'
      ? path.resolve(basePath, cacheFileName)
      : path.resolve(basePath, 'app', appId, 'resources', cacheFileName);

  try {
    const content = JSON.parse(yield fs.readFile(translationsPath, next));

    yield trySetLocales(quest, content.locales, desktopId, next);
    yield quest.me.setTranslations(
      {translations: Goblin.Shredder.fromJS(content.translations)},
      next
    );
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(
        `translations file (at ${translationsPath}) not found, fallback to mandate translations`
      );
      return;
    }
    throw err;
  }
});

Goblin.registerQuest(goblinName, 'load-translations', function*(
  quest,
  messageId,
  ownerId,
  desktopId,
  next
) {
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

        quest.createFor(
          translationId,
          ownerId || messageId,
          translationId,
          {
            id: translationId,
            messageId,
            localeId: locale.get('id'),
            desktopId: finalDesktopId,
          },
          next.parallel()
        );
      });
    yield next.sync();
  }
});

//Dynamic API see reducers for params
for (const action of Object.keys(logicHandlers)) {
  switch (action) {
    case 'set-locales':
    case 'set-translations':
      Goblin.registerQuest(goblinName, action, function(quest) {
        quest.do();
      });
      continue;
  }
}

// Singleton
module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
Goblin.createSingle(goblinName);
