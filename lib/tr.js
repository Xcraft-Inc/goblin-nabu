'use strict';

const watt = require('gigawatts');
const {formatMessage} = require('goblin-nabu/lib/format.js');
const {isShredder, isImmutable} = require('xcraft-core-shredder');
const {
  computeMessageId,
  computeTranslationId,
} = require('goblin-nabu/lib/helpers.js');
const {
  translationWithContextAndSublocaleAsync,
  removeContext,
} = require('goblin-nabu/lib/gettext.js');

const retrieveEntity = watt(function* (r, table, documentId, next) {
  try {
    return yield r.get({
      table,
      documentId,
      privateState: true, // hack so that it does not crash if document is not found
    });
  } catch (err) {
    // TODO: fix goblin-rethink 'get' quest: if document does not exist, it crashes on a 'without' operator
    return null;
  }
});

function getText(props) {
  const {
    message,
    nabuId,
    localeName,
    html,
    values,
    custom,
    cachedTranslation,
    translation,
  } = props;

  if (!custom && cachedTranslation) {
    return formatMessage(localeName, html, cachedTranslation, values || {});
  } else {
    const translatedMessage =
      message && translation && translation.text
        ? translation.text
        : removeContext(nabuId);

    return formatMessage(localeName, html, translatedMessage, values || {});
  }
}

let storageAvailable = null;
let storageRethink = null;

const Tr = watt(function* (quest, localeName, msg, fromCache, next) {
  if (!msg || typeof msg !== 'object') {
    return msg;
  }

  if (isShredder(msg) || isImmutable(msg)) {
    msg = msg.toJS();
  }

  if (msg._type === 'translatableString') {
    const translatedMsg = [];

    for (let item of msg._string) {
      translatedMsg.push(yield Tr(quest, localeName, item, fromCache));
    }

    return translatedMsg.join('');
  }

  if (!msg.nabuId) {
    console.error(msg);
    throw new Error('Error calling Tr. Cannot resolve object');
  }

  if (!localeName) {
    return formatMessage(
      null,
      msg.html,
      removeContext(msg.nabuId),
      msg.values || {}
    );
  }

  const nabuApi = quest.getAPI('nabu');
  if (!nabuApi) {
    console.warn(`Error calling Tr. Goblin Nabu is unavailable`);
    return msg.nabuId;
  }

  if (typeof storageAvailable !== 'boolean') {
    storageAvailable = yield nabuApi.isStorageAvailable();
    storageRethink = storageAvailable ? quest.getStorage('rethink') : null;
  }

  const messageId = computeMessageId(msg.nabuId);
  const translated = yield nabuApi.get({path: `translations.${messageId}`});
  const message = storageRethink
    ? translated ||
      (yield retrieveEntity(storageRethink, 'nabuMessage', messageId, next))
    : translated;

  let cachedTranslation = null;
  if (fromCache) {
    cachedTranslation = yield translationWithContextAndSublocaleAsync(
      msg.nabuId,
      localeName,
      (nabuId) => computeMessageId(nabuId),
      (translation) => translation,
      function* (msgId, lclName) {
        return msgId === messageId && translated
          ? message.get(lclName)
          : yield nabuApi.get({path: `translations.${msgId}.${lclName}`});
      },
      next
    );
  }

  const translation =
    !fromCache || msg.custom
      ? yield translationWithContextAndSublocaleAsync(
          msg.nabuId,
          localeName,
          (nabuId) => computeMessageId(nabuId),
          (translation) => translation && translation.text,
          function* (msgId, lclName, cb) {
            return storageAvailable
              ? yield retrieveEntity(
                  storageRethink,
                  'nabuTranslation',
                  computeTranslationId(msgId, lclName),
                  cb
                )
              : null;
          },
          next
        )
      : null;

  return getText({
    nabuId: msg.nabuId,
    html: msg.html,
    values: msg.values,
    custom: msg.custom,
    message,
    cachedTranslation,
    translation,
    localeName,
  });
});

//-----------------------------------------------------------------------------

module.exports = Tr;
