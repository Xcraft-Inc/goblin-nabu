'use strict';

const watt = require('gigawatts');
const path = require('path');
const fse = require('fs-extra');
const {resourcesPath, projectPath} = require('xcraft-core-host');
const Goblin = require('xcraft-core-goblin');
const T = require('goblin-nabu/widgets/helpers/t.js');
const {computeTranslationId} = require('./helpers.js');

const cacheFileName = 'translations.json';

const _retrieveMessageTranslations = watt(function* (
  quest,
  message,
  wrapper,
  next
) {
  const r = quest.getStorage('rethink');
  const nabuTranslations = yield r.getAll({
    table: 'nabuTranslation',
    filter: {messageId: message.id},
  });

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

const packMessages = function* (
  quest,
  desktopId,
  force,
  $appName,
  $appId,
  next
) {
  const safeStringify = require('safe-stable-stringify');

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

  if (!force && process.env.NODE_ENV !== 'development') {
    yield deskAPI.addNotification({
      color: 'red',
      glyph: 'solid/exclamation-triangle',
      message: T(`Cannot pack messages in production mode`),
    });
    return;
  }

  const appName = $appName || quest.goblin.getX('appName');
  const r = quest.getStorage('rethink');
  const translatedMessages = {};

  const messages = (yield r.getAll({
    table: 'nabuMessage',
  })).filter(
    (message) =>
      !message.custom &&
      message.sources.filter((source) => source.appName === appName).length > 0
  );

  for (const message of messages) {
    yield _retrieveMessageTranslations(quest, message, translatedMessages);
  }

  quest.log.info(
    `found ${Object.keys(translatedMessages).length} messages with translations`
  );
  let outputPath = path.resolve(resourcesPath, cacheFileName);
  if ($appId) {
    outputPath = path.resolve(
      projectPath,
      'app',
      $appId,
      'resources',
      cacheFileName
    );
  }
  const outputDir = path.dirname(outputPath);
  if (Object.keys(messages).length > 0) {
    fse.ensureDirSync(outputDir);
    fse.writeFileSync(
      outputPath,
      safeStringify(
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
        null,
        2
      )
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
    const content = JSON.parse(yield fse.readFile(translationsPath));
    yield quest.me.tryAddLocales({
      locales: content.locales,
      desktopId,
      mandate,
    });
    yield quest.me.setTranslations({
      translations: Goblin.Shredder.fromJS(content.translations),
    });
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

const importPackedMessages = function* (
  quest,
  desktopId,
  ownerId,
  packFilePath,
  next
) {
  // TODO: optimize with delegator
  // FIXME: with node prod (thrall) the resources are not deployed
  const deskAPI = quest.getAPI(desktopId).noThrow();
  const storageAvailable = quest.goblin.getX('storageAvailable');
  if (!storageAvailable) {
    yield deskAPI.addNotification({
      color: 'red',
      glyph: 'solid/exclamation-triangle',
      message: T(
        `Cannot import packed messages because storage is not available`
      ),
    });
    return;
  }
  if (process.env.NODE_ENV !== 'development') {
    yield deskAPI.addNotification({
      color: 'red',
      glyph: 'solid/exclamation-triangle',
      message: T(`Cannot import packed messages in production mode`),
    });
    return;
  }

  try {
    const content = JSON.parse(fse.readFileSync(packFilePath));

    if (!content.locales || !content.translations) {
      yield deskAPI.addNotification({
        color: 'red',
        glyph: 'solid/exclamation-triangle',
        message: T(`Translations file at {filePath} is corrupted`, '', {
          filePath: packFilePath,
        }),
      });
      return;
    }

    const configuration = quest.goblin.getX('configuration');
    if (configuration) {
      yield quest.me.tryAddLocales({
        locales: content.locales,
        desktopId,
        mandate: configuration.mandate,
      });
    }

    // for every message in pack file
    // Get entity
    // If entity does not exist, show notification asking for new extraction
    // If entity exists, erase existing translations and add those from pack file
    // We never erase custom translations
    // Reindex locale and nabuTranslation entities
    const r = quest.getStorage('rethink');
    let lastNotifMsgLength = 0;
    let missingMessages = [];
    let importedMessages = 0;
    let importedTranslations = 0;

    for (let messageId of Object.keys(content.translations)) {
      const exists = yield r.exist({
        table: 'nabuMessage',
        documentId: messageId,
      });

      if (exists) {
        yield quest.me.resetTranslations({messageId, ownerId, desktopId});

        // Import new translations
        for (let localeName of Object.keys(content.translations[messageId])) {
          const translationId = computeTranslationId(messageId, localeName);

          yield quest.createFor(
            translationId,
            ownerId || desktopId,
            translationId,
            {
              id: translationId,
              messageId,
              locale: localeName,
              desktopId,
              text: content.translations[messageId][localeName],
            }
          );
          importedTranslations++;
        }
        importedMessages++;

        // Notify progression
        if (importedMessages - lastNotifMsgLength >= 100) {
          lastNotifMsgLength = importedMessages;
          yield deskAPI.addNotification({
            notificationId: `nabu-importPackedMessages-progression`,
            color: 'green',
            glyph: 'solid/search',
            message: T(`{msgNbr} messages importés...`, '', {
              msgNbr: importedMessages,
            }),
          });
        }
      } else {
        missingMessages.push(messageId);
      }
    }

    if (missingMessages.length > 0) {
      yield deskAPI.addNotification({
        color: 'orange',
        message: T(
          `{msgNbr} messages n'ont pas été trouvés dans la base de données et leur traductions n'ont pas été importées. Il est recommandé d'effectuer une extraction, puis de relancer la procédure d'import. Les messages sont:\n{messages}`,
          '',
          {
            messages: missingMessages.join('\n'),
            msgNbr: missingMessages.length,
          }
        ),
        glyph: 'solid/check',
      });
    }

    // TODO: reindex locales and nabuTranslations
    return {importedMessages, importedTranslations};
  } catch (err) {
    if (err.code === 'ENOENT') {
      yield deskAPI.addNotification({
        color: 'red',
        glyph: 'solid/exclamation-triangle',
        message: T(`Translations file at {filePath} not found`, '', {
          filePath: packFilePath,
        }),
      });
    } else if (err.message && err.message.includes('Malformed JSON in file')) {
      yield deskAPI.addNotification({
        color: 'red',
        glyph: 'solid/exclamation-triangle',
        message: T(`Translations file at {filePath} is corrupted`, '', {
          filePath: packFilePath,
        }),
      });
    } else {
      throw err;
    }
  }
};

// Singleton
module.exports = {
  packMessages,
  unpackMessages,
  importPackedMessages,
};
