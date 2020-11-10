'use strict';

const $ = require('highland');
const watt = require('gigawatts');
const path = require('path');
const fs = require('fs-extra');
const {resourcesPath} = require('xcraft-core-host');
const Goblin = require('xcraft-core-goblin');
const T = require('goblin-nabu/widgets/helpers/t.js');

const cacheFileName = 'translations.json';

const _trySetLocales = watt(function* (
  quest,
  locales,
  desktopId,
  mandate,
  next
) {
  const storageAvailable = quest.goblin.getX('storageAvailable');
  const currLocales = quest.goblin.getState().get('locales');

  if (storageAvailable) {
    const configuration = quest.goblin.getX('configuration');
    const localesToAdd = locales.filter(
      (locale) =>
        !currLocales.find(
          (currLocale) => currLocale.get('name') === locale.name
        )
    );

    // Important because the createFor indexes the locales, which
    // calls set-index, which calls buildMultiLanguageSummaries,
    // which needs the locales list in state!!
    locales = currLocales.toJS().concat(localesToAdd);
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

const _retrieveMessageTranslations = watt(function* (
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
        translations[nabuTranslation.locale] = nabuTranslation.text;
      }
    }

    if (Object.keys(translations).length > 0)
      wrapper[message.id] = translations;
  }
});

const packMessages = function* (quest, desktopId, next) {
  const stringify = require('json-stable-stringify');

  const deskAPI = quest.getAPI(desktopId).noThrow();
  const storageAvailable = quest.goblin.getX('storageAvailable');
  if (!storageAvailable) {
    yield deskAPI.addNotification({
      color: 'red',
      glyph: 'solid/exclamation-triangle',
      message: T(`Cannot pack messages because storage is not available`),
    });
    return;
  }

  if (process.env.NODE_ENV !== 'development') {
    yield deskAPI.addNotification({
      color: 'red',
      glyph: 'solid/exclamation-triangle',
      message: T(`Cannot pack messages in production mode`),
    });
    return;
  }

  const appName = quest.goblin.getX('appName');
  const r = quest.getStorage('rethink');
  const translatedMessages = {};

  const messages = (yield r.getAll({
    table: 'nabuMessage',
  })).filter(
    (message) =>
      !message.custom &&
      message.sources.filter((source) => source.appName === appName).length > 0
  );

  yield $(messages)
    .map((message) => (n) => {
      _retrieveMessageTranslations(quest, message, translatedMessages, n);
    })
    .nfcall([])
    .parallel(10)
    .done(next);

  quest.log.info(
    `found ${Object.keys(translatedMessages).length} messages with translations`
  );

  if (Object.keys(messages).length > 0) {
    yield fs.ensureDir(resourcesPath, next);
    yield fs.writeFile(
      path.resolve(resourcesPath, cacheFileName),
      stringify(
        {
          app: appName,
          locales: quest.goblin
            .getState()
            .get('locales')
            .map((locale) => ({
              id: locale.get('id'),
              name: locale.get('name'),
              text: locale.get('text'),
              description: locale.get('description'),
            }))
            .toJS(),
          translations: translatedMessages,
        },
        {space: 2}
      ),
      next
    );
  }

  yield deskAPI.addNotification({
    color: 'green',
    message: T(`{msgNbr} messages avec traductions ont été packagés`, '', {
      msgNbr: Object.keys(translatedMessages).length,
    }),
    glyph: 'solid/check',
  });
};

const unpackMessages = function* (quest, desktopId, mandate, next) {
  // TODO: optimize with delegator
  // FIXME: with node prod (thrall) the resources are not deployed
  const translationsPath = path.resolve(resourcesPath, cacheFileName);

  try {
    const content = JSON.parse(yield fs.readFile(translationsPath, next));
    yield _trySetLocales(quest, content.locales, desktopId, mandate, next);
    yield quest.me.setTranslations(
      {translations: Goblin.Shredder.fromJS(content.translations)},
      next
    );
  } catch (err) {
    if (err.code === 'ENOENT') {
      quest.log.warn(
        `translations file (at ${translationsPath}) not found, fallback to mandate translations`
      );
      return;
    }
    throw err;
  }
};

// Singleton
module.exports = {
  packMessages,
  unpackMessages,
};
