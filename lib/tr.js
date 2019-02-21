'use strict';

const watt = require('gigawatts');
const formatMessage = require('goblin-nabu/lib/format.js');
const {isShredder, isImmutable} = require('xcraft-core-shredder');
const {
  getToolbarId,
  computeMessageId,
  computeTranslationId,
} = require('goblin-nabu/lib/helpers.js');
const {
  messageWithContextAsync,
  translationWithSublocale,
  translationWithSublocaleAsync,
} = require('goblin-nabu/lib/gettext.js');

function getText(props) {
  const {
    enabled,
    message,
    nabuId,
    locale,
    html,
    values,
    cachedTranslation,
    translation,
  } = props;

  if (!enabled && cachedTranslation) {
    return cachedTranslation;
  }

  const translatedMessage =
    enabled &&
    message &&
    translation &&
    translation.text &&
    locale &&
    locale.get('name')
      ? translation.text
      : nabuId;

  return locale && locale.get('name')
    ? formatMessage(locale.get('name'), html, translatedMessage, values || [])
    : nabuId;
}

const Tr = watt(function*(quest, msg, next) {
  if (!msg || typeof msg === 'string') {
    return msg;
  }

  if (isShredder(msg) || isImmutable(msg)) {
    msg = msg.toJS();
  }

  if (!msg.nabuId) {
    return msg;
  }

  const toolbarId = getToolbarId(quest.getDesktop());

  const nabuApi = quest.getAPI('nabu');
  const toolbarApi = toolbarId ? quest.getAPI(toolbarId) : null;
  const storageAvailable = yield nabuApi.isStorageAvailable();

  if (!nabuApi) {
    console.warn(`Error calling Tr. Goblin Nabu is unavailable`);
    return;
  }
  if (!toolbarApi) {
    console.warn(
      `Error calling Tr. Goblin Nabu Toolbar (${toolbarId}) is unavailable`
    );
    return;
  }

  const r = storageAvailable ? quest.getStorage('rethink') : null;
  const nabu = yield nabuApi.get();
  const toolbar = toolbarId ? yield toolbarApi.get() : null;

  const messageStruct = yield messageWithContextAsync(
    msg.nabuId,
    nabuId => computeMessageId(nabuId),
    function*(msgId) {
      return r
        ? nabu.get(`translations.${msgId}`) ||
            (yield r.get(
              {
                table: 'nabuMessage',
                documentId: msgId,
              },
              next
            ))
        : nabu.get(`translations.${msgId}`);
    }
  );

  const localeId = toolbar ? toolbar.get('selectedLocaleId') : null;

  let locale = null;
  let translation = null;
  let cachedTranslation = null;

  if (localeId) {
    const locales = nabu.get('locales');

    if (locales) {
      locale = locales.find(locale => locale.get('id') === localeId);

      if (locale && locale.get('name')) {
        translation = yield translationWithSublocaleAsync(
          locale.get('name'),
          function*(localeName) {
            return storageAvailable
              ? yield r.get(
                  {
                    table: 'nabuTranslation',
                    documentId: computeTranslationId(
                      messageStruct.msgId,
                      localeName
                    ),
                  },
                  next
                )
              : null;
          }
        );

        cachedTranslation = translationWithSublocale(
          locale.get('name'),
          localeName =>
            nabu.get(`translations.${messageStruct.msgId}.${localeName}`)
        );
      }
    }
  }

  return getText({
    enabled: toolbar ? toolbar.get('enabled') : false,
    nabuId: msg.nabuId,
    html: msg.html,
    values: msg.values,
    message: messageStruct.message,
    cachedTranslation,
    translation,
    locale,
  });
});

//-----------------------------------------------------------------------------

module.exports = Tr;
