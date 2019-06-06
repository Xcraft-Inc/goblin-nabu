'use strict';

const goblinName = 'nabu';

const watt = require('gigawatts');
const _ = require('lodash');
const Goblin = require('xcraft-core-goblin');
const {
  extractDesktopId,
  computeMessageId,
  computeTranslationId,
} = require('./helpers.js');
const {getUniqueSourceString} = require('./extractor/extract-helpers.js');
const {packMessages, unpackMessages} = require('./pack.js');
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
  'set-translations': (state, action) => {
    return state.set('translations', action.get('translations'));
  },
};

Goblin.registerQuest(goblinName, 'handle-elastic-indexes', function*(
  quest,
  mandate,
  reset,
  questInfo
) {
  const storageAvailable = quest.goblin.getX('storageAvailable');
  if (storageAvailable && questInfo.quest) {
    const locales = (yield quest.me.getLocales()).toArray();
    //Create one index per locale
    const multilanguageIndexes = [mandate].concat(
      locales.map(
        locale =>
          `${mandate}-${locale
            .get('name')
            .toLowerCase()
            .replace(/\//g, '-')}`
      )
    );

    const questArguments = {indexes: multilanguageIndexes, reset};
    if (questInfo.questArgs) {
      Object.keys(questInfo.questArgs).forEach(function(key) {
        questArguments[key] = questInfo.questArgs[key];
      });
    }

    yield quest.cmd(questInfo.quest, questArguments);
  }
});

Goblin.registerQuest(goblinName, 'load-locales', function*(quest, desktopId) {
  const r = quest.getStorage('rethink');

  const locales = yield r.getAll({
    table: 'locale',
    status: ['published'],
  });

  yield quest.me.setLocales({locales});
});

Goblin.registerQuest(goblinName, 'handle-locales-change', function*(
  quest,
  change,
  desktopId,
  mandate,
  elasticQuestInfo
) {
  if (change.type === 'state') {
    return;
  }
  yield quest.me.loadLocales({desktopId});
  yield quest.me.handleElasticIndexes({
    mandate,
    reset: false,
    questInfo: elasticQuestInfo,
  });
});

const loadToolbar = watt(function*(
  quest,
  desktopId,
  showToolbar,
  storageAvailable,
  next
) {
  const toolbarId = `nabu-toolbar@${desktopId}`;
  return yield quest.createFor(
    'nabu-toolbar',
    desktopId,
    'nabu-toolbar',
    {
      id: toolbarId,
      desktopId,
      enabled: false,
      show: storageAvailable && showToolbar,
      localeId: null,
    },
    next
  );
});

const loadEntities = watt(function*(quest, desktopId, storageAvailable, next) {
  if (storageAvailable) {
    const r = quest.getStorage('rethink');
    const entities = ['locale', 'nabuMessage', 'nabuTranslation'];

    for (const entity of entities) {
      r.ensureTable({table: entity}, next.parallel());
    }
    yield next.sync();
    for (const entity of entities) {
      r.ensureIndex({table: entity}, next.parallel());
    }
    yield next.sync();

    yield quest.me.loadLocales({desktopId});
  }
});

Goblin.registerQuest(goblinName, 'stop-listen-locales', function*(
  quest,
  desktopId,
  err
) {
  const r = quest.getStorage('rethink');
  yield r.stopOnChanges({
    table: 'locale',
    goblinId: quest.goblin.id,
  });
});

Goblin.registerQuest(goblinName, 'get', function(quest, path) {
  if (path) {
    return quest.goblin.getState().get(path, null);
  } else {
    return quest.goblin.getState();
  }
});

Goblin.registerQuest(goblinName, 'get-locales', function(quest) {
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
  mandate,
  reset,
  elastic,
  rethink,
  localeName,
  next
) {
  if (!appName) {
    throw new Error('Nabu init-error: required appName parameter');
  }
  if (!desktopId) {
    throw new Error('Nabu init-error: required desktopId parameter');
  }
  const storageAvailable = elastic !== undefined && rethink !== undefined;

  quest.goblin.setX('appName', appName);
  quest.goblin.setX('storageAvailable', storageAvailable);

  const toolbarAPI = yield loadToolbar(
    quest,
    desktopId,
    showToolbar,
    storageAvailable,
    next
  );
  yield loadEntities(quest, desktopId, storageAvailable, next);

  yield quest.me.handleElasticIndexes({mandate, reset, questInfo: elastic});

  if (storageAvailable && rethink.quest) {
    yield quest.cmd(rethink.quest, rethink.questArgs || {});
    yield loadEntities(quest, desktopId, storageAvailable, next);
  }

  yield quest.me.unpackMessages({
    desktopId,
    mandate,
    elasticQuestInfo: elastic,
  });

  if (localeName) {
    const localeSet = yield toolbarAPI.setLocaleFromName({
      name: localeName,
    });
    if (!localeSet) {
      quest.log.warn(`Cannot set unknown locale '${localeName}'`);
    }
  }

  if (storageAvailable) {
    const r = quest.getStorage('rethink');
    yield r.startQuestOnChanges({
      table: 'locale',
      onChangeQuest: `${goblinName}.handle-locales-change`,
      onErrorQuest: `${goblinName}.stop-listen-locales`,
      goblinId: quest.goblin.id,
      questArgs: {desktopId, mandate, elasticQuestInfo: elastic},
      errorQuestArgs: {desktopId},
    });
  }

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

Goblin.registerQuest(goblinName, 'dispose-desktop', function*(
  quest,
  desktopId
) {
  const storageAvailable = quest.goblin.getX('storageAvailable');
  if (storageAvailable) {
    yield quest.me.stopListenLocales({desktopId});
  }
});

Goblin.registerQuest(goblinName, 'add-message', function*(
  quest,
  workitemId,
  desktopId,
  nabuId,
  description,
  custom,
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
      desktopId: finalDesktopId,
      id: messageId,
      nabuId,
      custom: custom || false,
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
  // TODO: also add message combinations?
  // Loading all context translations
  var arr = splitContext(nabuId);
  if (arr.length === 1) {
    // No context
    yield quest.me.loadTranslations({messageId, desktopId: finalDesktopId});
  } else {
    while (arr.length > 0) {
      const currMsgId = computeMessageId(arr.join('|'));
      yield quest.me.loadTranslations({
        messageId: currMsgId,
        desktopId: finalDesktopId,
        ownerId: messageId,
      });
      arr = arr.slice(1);
    }
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
            locale: locale.get('name'),
            desktopId: finalDesktopId,
          },
          next.parallel()
        );
      });
    yield next.sync();
  }
});

Goblin.registerQuest(goblinName, 'extract-messages', extractMessages);

Goblin.registerQuest(goblinName, 'pack-messages', packMessages);

Goblin.registerQuest(goblinName, 'unpack-messages', unpackMessages);

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
