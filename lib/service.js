'use strict';

const goblinName = 'nabu';

const $ = require('highland');
const watt = require('gigawatts');
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const {projectPath, appId} = require('xcraft-core-host');
const Goblin = require('xcraft-core-goblin');
const {
  extractDesktopId,
  computeMessageId,
  computeTranslationId,
} = require('./helpers.js');
const {
  getUniqueSourceString,
  updateSources,

  addMessage,
  patchMessage,
  deleteMessage,

  retrieveJsFiles,
} = require('./extractor/extract-helpers.js');

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
  const storageAvailable = quest.goblin.getX('storageAvailable');
  const currLocales = quest.goblin.getState().get('locales');
  let shouldReload = false;

  if (storageAvailable) {
    // Important because the createFor indexes the locales, which
    // calls set-index, which call buildMultiLanguageSUmmaries,
    // which needs the locales list in state!!
    yield quest.me.setLocales({locales});

    for (let locale of locales) {
      if (
        !currLocales.find(currLocale => currLocale.get('name') === locale.name)
      ) {
        // no locale exists, we should import it
        yield quest.createFor(
          locale.id,
          desktopId,
          locale.id,
          {
            id: locale.id,
            name: locale.name,
            description: locale.description,
            desktopId,
          },
          next
        );
        shouldReload = true;
      }
    }

    if (shouldReload) {
      yield quest.me.loadLocales({desktopId});
    }
  } else {
    yield quest.me.setLocales({locales});
  }
});

Goblin.registerQuest(goblinName, 'load-locales', function*(quest, desktopId) {
  const r = quest.getStorage('rethink');

  const locales = yield r.getAll({
    table: 'locale',
  });

  yield quest.me.setLocales({locales});
});

const loadEntities = watt(function*(
  quest,
  desktopId,
  showToolbar,
  storageAvailable,
  next
) {
  const toolbarId = `nabu-toolbar@${desktopId}`;
  yield quest.createFor(
    'nabu-toolbar',
    desktopId,
    'nabu-toolbar',
    {
      id: toolbarId,
      desktopId,
      enabled: false,
      show: storageAvailable && showToolbar,
      localeId: null,
      locale: null,
    },
    next
  );

  if (storageAvailable) {
    yield quest.me.loadLocales({desktopId});

    const r = quest.getStorage('rethink');
    yield r.startQuestOnChanges({
      table: 'locale',
      onChangeQuest: `${goblinName}.load-locales`,
      goblinId: quest.goblin.id,
      questArgs: {desktopId: desktopId},
    });
  }
});

Goblin.registerQuest(goblinName, 'get', function(quest) {
  return quest.goblin.getState();
});

Goblin.registerQuest(goblinName, 'getLocales', function(quest) {
  return quest.goblin.getState().get('locales');
});

Goblin.registerQuest(goblinName, 'is-storage-available', function(quest) {
  return quest.goblin.getX('storageAvailable');
});

Goblin.registerQuest(goblinName, 'init-desktop', function*(
  quest,
  appName,
  desktopId,
  showToolbar,
  noStorage,
  next
) {
  if (!appName) {
    throw new Error('Nabu init-error: required appName parameter');
  }
  if (!desktopId) {
    throw new Error('Nabu init-error: required desktopId parameter');
  }

  quest.goblin.setX('appName', appName);
  quest.goblin.setX('storageAvailable', !noStorage);

  yield loadEntities(quest, desktopId, showToolbar, !noStorage, next);

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
  const storageAvailable = quest.goblin.getX('storageAvailable');
  if (!storageAvailable) {
    throw new Error('Cannot add message because storage is not available');
  }

  const messageId = computeMessageId(nabuId);

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

  const entityApi = yield quest.createFor(
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

  const entity = yield entityApi.get();

  if (!entity.get('sources')) {
    console.warn(
      `NabuMessage seems to be empty after creation ("${nabuId}")!!!`
    );
    return;
  }

  const persistedSources = entity.get('sources').toJS();

  if (
    persistedSources.filter(
      source =>
        source.appName === currentSource.appName &&
        source.description === currentSource.description
    ).length === 0
  ) {
    // we consider that if a source with same appName/description already exists, then it will probably be
    // linked to this particular message and we do not add the source
    yield entityApi.change(
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
  // Loading all context translations
  var arr = nabuId.split('::');
  if (arr.length === 1) {
    // No context
    yield quest.me.loadTranslations({messageId, desktopId: finalDesktopId});
  } else {
    while (arr.length > 0) {
      const currMsgId = computeMessageId(arr.join('::'));
      yield quest.me.loadTranslations({
        messageId: currMsgId,
        desktopId: finalDesktopId,
        ownerId: messageId,
      });
      arr = arr.slice(1);
    }
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
        './lib/goblin-nabu/lib/extractor/babel-plugin-extractor.js',
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
  const storageAvailable = quest.goblin.getX('storageAvailable');
  if (!storageAvailable) {
    throw new Error('Cannot extract messages because storage is not available');
  }

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
  const storageAvailable = quest.goblin.getX('storageAvailable');
  if (!storageAvailable) {
    throw new Error('Cannot pack messages because storage is not available');
  }

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
            .map(locale => ({
              id: locale.get('id'),
              name: locale.get('name'),
              description: locale.get('description'),
            }))
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
  const storageAvailable = quest.goblin.getX('storageAvailable');
  if (!storageAvailable) {
    throw new Error(
      'Cannot load translations because storage is not available'
    );
  }

  if (messageId) {
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
        const translationId = computeTranslationId(
          messageId,
          locale.get('name')
        );

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
