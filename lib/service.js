'use strict';

const goblinName = 'nabu';
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

Goblin.registerQuest(goblinName, 'init', function* (
  quest,
  desktopId,
  appName,
  configuration
) {
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
    quest.goblin.defer(
      quest.sub('*::nabu-store.locales-loaded', function* (err, {msg, resp}) {
        yield resp.cmd('nabu.set-locales', {
          id: 'nabu',
          locales: msg.data.locales,
        });
      })
    );
    mandate = configuration.mandate;
  }

  yield quest.me.unpackMessages({
    desktopId,
    mandate,
  });
});

Goblin.registerQuest(goblinName, 'get', function (quest, path) {
  if (path) {
    return quest.goblin.getState().get(path, null);
  } else {
    return quest.goblin.getState();
  }
});

function simplifyName(localeName) {
  return localeName.toLowerCase().replace('-', '_');
}

function getLang(localeName) {
  return simplifyName(localeName).split('_')[0];
}

Goblin.registerQuest(goblinName, 'find-best-locale', function (quest, locale) {
  const locales = quest.goblin.getState().get('locales');
  // Compare name exacly
  let bestLocale = locales.find((l) => l.get('name') === locale);
  if (bestLocale) {
    return bestLocale.get('name');
  }
  // Compare name approximately (en_US matches en-us)
  bestLocale = locales.find(
    (l) => simplifyName(l.get('name')) === simplifyName(locale)
  );
  if (bestLocale) {
    return bestLocale.get('name');
  }
  // Compare lang exacly (en_US matches en but not en_GB)
  bestLocale = locales.find(
    (l) => simplifyName(l.get('name')) === getLang(locale)
  );
  if (bestLocale) {
    return bestLocale.get('name');
  }
  // Compare lang only (en_US matches en_GB)
  bestLocale = locales.find(
    (l) => simplifyName(getLang(l.get('name'))) === getLang(locale)
  );
  return bestLocale ? bestLocale.get('name') : null;
});

Goblin.registerQuest(goblinName, 'get-locales', function (quest) {
  return quest.goblin.getState().get('locales');
});

Goblin.registerQuest(goblinName, 'is-storage-available', function (quest) {
  return quest.goblin.getX('storageAvailable');
});

Goblin.registerQuest(goblinName, 'add-message', function* (
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

Goblin.registerQuest(goblinName, 'extract-messages', extractMessages);

Goblin.registerQuest(goblinName, 'pack-messages', packMessages);

Goblin.registerQuest(goblinName, 'unpack-messages', unpackMessages);

//Dynamic API see reducers for params
for (const action of Object.keys(logicHandlers)) {
  switch (action) {
    case 'set-locales':
    case 'set-translations':
      Goblin.registerQuest(goblinName, action, function (quest) {
        quest.do();
      });
      continue;
  }
}

// Singleton
module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
Goblin.createSingle(goblinName);
