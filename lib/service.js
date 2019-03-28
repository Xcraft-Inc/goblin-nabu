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

const trySetLocales = watt(function*(quest, locales, desktopId, next) {
  const storageAvailable = quest.goblin.getX('storageAvailable');
  const currLocales = quest.goblin.getState().get('locales');

  if (storageAvailable) {
    const localesToAdd = locales.filter(
      locale =>
        !currLocales.find(currLocale => currLocale.get('name') === locale.name)
    );

    // Important because the createFor indexes the locales, which
    // calls set-index, which calls buildMultiLanguageSummaries,
    // which needs the locales list in state!!
    yield quest.me.setLocales({
      locales: currLocales.toJS().concat(localesToAdd),
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

Goblin.registerQuest(goblinName, 'load-locales', function*(quest, desktopId) {
  const r = quest.getStorage('rethink');

  const locales = yield r.getAll({
    table: 'locale',
    status: ['published'],
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

    yield r.startQuestOnChanges({
      table: 'locale',
      onChangeQuest: `${goblinName}.load-locales`,
      onErrorQuest: `${goblinName}.stop-listen-locales`,
      goblinId: quest.goblin.id,
      questArgs: {desktopId},
      errorQuestArgs: {desktopId},
    });
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
