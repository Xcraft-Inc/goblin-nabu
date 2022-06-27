'use strict';

const goblinName = 'nabu';
const _ = require('lodash');
const Goblin = require('xcraft-core-goblin');
const {
  extractDesktopId,
  computeMessageId,
  computeTranslationId,
  findBestLocale,
} = require('./helpers.js');
const {getUniqueSourceString} = require('./extractor/extract-helpers.js');
const {
  packMessages,
  unpackMessages,
  importPackedMessages,
} = require('./pack.js');
const {extractMessages} = require('./extraction.js');
const {splitContext} = require('./gettext.js');

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
  'hide-locales': (state, action) => {
    const currLocales = state.get('locales');
    const matchedLocaleNames = action
      .get('localeNames')
      .map((localeName) => findBestLocale(currLocales, localeName, true))
      .filter((localeName) => !!localeName);

    return state.set(
      'locales',
      currLocales.map((locale) =>
        locale.set('hide', !matchedLocaleNames.includes(locale.get('name')))
      )
    );
  },
  'set-translations': (state, action) => {
    return state.set('translations', action.get('translations'));
  },
};

Goblin.registerQuest(goblinName, 'init', function* (
  quest,
  desktopId,
  appName,
  configuration
) {
  //prevent a second init
  const initCalled = quest.goblin.getX('initDone');
  if (initCalled) {
    quest.log.warn(
      'Nabu init already called for app:',
      quest.goblin.getX('appName')
    );
    return;
  } else {
    quest.goblin.setX('initDone', true);
  }

  if (!desktopId) {
    throw new Error('Nabu init error: required desktopId parameter');
  }

  if (!appName) {
    throw new Error('Nabu init-error: required appName parameter');
  }

  quest.goblin.setX('appName', appName);

  const storageAvailable = !!configuration;
  quest.goblin.setX('storageAvailable', storageAvailable);

  let mandate = null;
  if (storageAvailable) {
    mandate = configuration.mandate;
    quest.goblin.defer(
      quest.sub('*::nabu-store.locales-loaded', function* (err, {msg, resp}) {
        yield resp.cmd('nabu.set-locales', {
          id: 'nabu',
          locales: msg.data.locales,
        });
        yield quest.me.unpackMessages({
          desktopId,
          mandate,
        });
        yield quest.me.loadConfigurationLocales({desktopId, mandate});
      })
    );
  } else {
    yield quest.me.unpackMessages({
      desktopId,
      mandate,
    });
    yield quest.me.loadConfigurationLocales({desktopId, mandate});
  }
});

Goblin.registerQuest(goblinName, 'get', function (quest, path) {
  if (path) {
    return quest.goblin.getState().get(path, null);
  } else {
    return quest.goblin.getState();
  }
});

Goblin.registerQuest(goblinName, 'find-best-locale', function (
  quest,
  locale,
  avoidCompareLanguages
) {
  const locales = quest.goblin.getState().get('locales');
  return findBestLocale(locales, locale, avoidCompareLanguages || false);
});

Goblin.registerQuest(goblinName, 'getFirstLocale', function (quest) {
  const locales = quest.goblin.getState().get('locales');
  return locales.get('0.name', null);
});

Goblin.registerQuest(goblinName, 'get-locales', function (quest) {
  return quest.goblin.getState().get('locales');
});

Goblin.registerQuest(goblinName, 'get-configuration', function (quest) {
  return quest.goblin.getX('configuration');
});

Goblin.registerQuest(goblinName, 'is-storage-available', function (quest) {
  return quest.goblin.getX('storageAvailable');
});

Goblin.registerQuest(goblinName, 'try-add-locales', function* (
  quest,
  desktopId,
  mandate,
  locales,
  next
) {
  const storageAvailable = quest.goblin.getX('storageAvailable');
  if (storageAvailable) {
    const configuration = quest.goblin.getX('configuration');
    const localesToAdd = [];

    for (let locale of locales) {
      const bestMatch = yield quest.me.findBestLocale(
        {locale: locale.name, avoidCompareLanguages: true},
        next
      );
      if (!bestMatch) {
        localesToAdd.push(locale);
      }
    }

    // Important because the createFor indexes the locales, which
    // calls set-index, which calls buildMultiLanguageSummaries,
    // which needs the locales list in state!!
    locales = quest.goblin
      .getState()
      .get('locales')
      .toJS()
      .concat(localesToAdd);
    yield quest.me.setLocales({
      locales,
    });

    const storeAPI = quest.getAPI('nabu-store');
    yield storeAPI.handleElasticIndexes({
      mandate,
      locales,
      configuration,
    });

    for (let locale of localesToAdd) {
      // no locale exists, we should import it
      yield quest.createFor(
        locale.id,
        desktopId,
        locale.id,
        {
          id: locale.id,
          status: 'published',
          name: locale.name,
          text: locale.text,
          description: locale.description,
          desktopId,
        },
        next
      );
    }
  } else {
    yield quest.me.setLocales({locales});
  }
});

Goblin.registerQuest(goblinName, 'load-configuration-locales', function* (
  quest,
  desktopId,
  mandate
) {
  const nabuConfig = require('xcraft-core-etc')().load('goblin-nabu');

  const validLocaleNames = nabuConfig.locales
    // TODO: canonicalize
    .filter(() => true); // TODO: check if consistent with ISO codes

  // TODO: show error for invalid locales

  const defaultLocales = [
    {
      id: `locale@fr_CH`,
      name: 'fr_CH',
      description: '',
      text: 'Français',
    },
    {
      id: `locale@de_CH`,
      name: 'de_CH',
      description: '',
      text: 'Deutsch',
    },
  ];

  const locales =
    validLocaleNames.length > 0
      ? validLocaleNames.map((localeName) => {
          return {
            id: `locale@${localeName}`,
            name: localeName,
            description: '',
            text: localeName, // has to be changed in nabu store
          };
        })
      : defaultLocales;

  yield quest.me.tryAddLocales({desktopId, mandate, locales});

  if (validLocaleNames.length > 0) {
    yield quest.me.hideLocales({localeNames: validLocaleNames});
  }
});

Goblin.registerQuest(goblinName, 'add-message', function* (
  quest,
  workitemId,
  desktopId,
  nabuId,
  description,
  custom,
  rawLoading,
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

  const entityApi = yield quest.createFor(
    messageId,
    workitemId,
    messageId,
    {
      desktopId: finalDesktopId,
      id: messageId,
      nabuId,
      custom: custom || false,
      sources: [],
    },
    next
  );

  if (!custom) {
    const appName = quest.goblin.getX('appName');
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
        (source) =>
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
            .uniqBy((source) => getUniqueSourceString(source))
            .value(),
        },
        next
      );
    }
  }

  if (!rawLoading) {
    // TODO: optimize with delegator
    // TODO: also add message combinations?
    // Loading all context translations
    var arr = splitContext(nabuId);
    if (arr.length === 1) {
      // No context
      yield quest.me.loadTranslations({messageId, desktopId: finalDesktopId});
    } else {
      while (arr.length > 0) {
        const currMsgId = computeMessageId(nabuId);
        yield quest.me.loadTranslations({
          messageId: currMsgId,
          desktopId: finalDesktopId,
          ownerId: messageId,
        });
        arr = arr.slice(1);
      }
    }
  }
});

Goblin.registerQuest(goblinName, 'load-translations', function* (
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
      .forEach((locale) => {
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
            locale: locale.get('name'),
            desktopId: finalDesktopId,
          },
          next.parallel()
        );
      });
    yield next.sync();
  }
});

Goblin.registerQuest(goblinName, 'add-translatable-data', function* (
  quest,
  desktopId,
  entityId,
  nabuId,
  defaultTranslation,
  next
) {
  const storageAvailable = quest.goblin.getX('storageAvailable');
  if (!storageAvailable) {
    throw new Error(
      'Cannot add translatable data because storage is not available'
    );
  }

  if (!desktopId) {
    throw new Error(
      'Cannot add translatable data because no desktop id is provided'
    );
  }

  const messageId = computeMessageId(nabuId);

  yield quest.createFor(
    messageId,
    entityId || desktopId,
    messageId,
    {
      desktopId,
      id: messageId,
      nabuId,
      custom: true,
    },
    next
  );

  quest.goblin
    .getState()
    .get('locales')
    .forEach((locale) => {
      const translationId = computeTranslationId(messageId, locale.get('name'));

      quest.createFor(
        translationId,
        messageId,
        translationId,
        {
          id: translationId,
          messageId,
          locale: locale.get('name'),
          text: defaultTranslation,
          desktopId,
        },
        next.parallel()
      );
    });
  yield next.sync();
});

Goblin.registerQuest(
  goblinName,
  'set-translatable-data-translation',
  function* (quest, desktopId, nabuId, localeName, translation) {
    const storageAvailable = quest.goblin.getX('storageAvailable');
    if (!storageAvailable) {
      throw new Error(
        'Cannot set translatable data translation because storage is not available'
      );
    }

    if (!desktopId) {
      throw new Error(
        'Cannot set translatable data translation because no desktop id is provided'
      );
    }

    const messageId = computeMessageId(nabuId);
    const translationId = computeTranslationId(messageId, localeName);
    try {
      const api = yield quest.create(translationId, {
        id: translationId,
        messageId,
        locale: localeName,
        text: translation,
        desktopId,
      });
      yield api.change({path: 'text', newValue: translation});
    } finally {
      yield quest.kill([translationId]);
    }
  }
);

Goblin.registerQuest(goblinName, 'reset-translations', function* (
  quest,
  desktopId,
  ownerId,
  messageId,
  next
) {
  const storageAvailable = quest.goblin.getX('storageAvailable');
  if (!storageAvailable) {
    throw new Error(
      'Cannot remove message translations because storage is not available'
    );
  }

  if (messageId) {
    const r = quest.getStorage('rethink');
    const nabuTranslations = yield r.getAll(
      {
        table: 'nabuTranslation',
        filter: {messageId},
      },
      next
    );

    for (let nabuTranslation of nabuTranslations) {
      const entity = yield quest.createFor(
        nabuTranslation.id,
        ownerId || desktopId,
        nabuTranslation.id,
        {
          id: nabuTranslation.id,
          desktopId,
        },
        next
      );
      yield entity.hardDeleteEntity({}, next);
    }
  }
});

Goblin.registerQuest(goblinName, 'extract-messages', extractMessages);

Goblin.registerQuest(goblinName, 'pack-messages', packMessages);

Goblin.registerQuest(goblinName, 'unpack-messages', unpackMessages);

Goblin.registerQuest(
  goblinName,
  'import-packed-messages',
  importPackedMessages
);

//Dynamic API see reducers for params
for (const action of Object.keys(logicHandlers)) {
  switch (action) {
    case 'set-locales':
    case 'hide-locales':
    case 'set-translations':
      Goblin.registerQuest(goblinName, action, function (quest) {
        quest.do();
      });
      continue;
  }
}

Goblin.registerQuest(goblinName, 'configureNewDesktopSession', function* (
  quest,
  desktopId
) {
  const desk = quest.getAPI(desktopId);
  const nabuContext = {contextId: 'nabu', name: 'Nabu'};
  yield desk.addContext(nabuContext);
});

Goblin.registerQuest(goblinName, 'configureDesktop', function (
  quest,
  clientSessionId,
  labId,
  desktopId,
  session,
  username,
  locale,
  configuration
) {
  quest.goblin.setX('configuration', configuration);
  return {defaultTheme: 'default', themeContext: 'theme'};
});

// Singleton
module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
Goblin.createSingle(goblinName);
