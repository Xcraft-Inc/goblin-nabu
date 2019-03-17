'use strict';

const watt = require('gigawatts');
const formatMessage = require('goblin-nabu/lib/format.js');
const {
  computeMessageId,
  computeTranslationId,
  resolvePlainMessage,
} = require('goblin-nabu/lib/helpers.js');
const {
  translationWithContextAndSublocale,
  translationWithContextAndSublocaleAsync,
} = require('goblin-nabu/lib/gettext.js');

const retrieveEntity = watt(function*(r, table, documentId, next) {
  try {
    return yield r.get(
      {
        table,
        documentId,
        privateState: true, // hack so that it does not crash if document is not found
      },
      next
    );
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
    cachedTranslation,
    translation,
  } = props;

  if (cachedTranslation) {
    return formatMessage(localeName, html, cachedTranslation, values || {});
  } else {
    const translatedMessage =
      message && translation && translation.text ? translation.text : nabuId;

    return formatMessage(localeName, html, translatedMessage, values || {});
  }
}

const Tr = watt(function*(quest, localeName, msg, fromCache, next) {
  if (!msg || typeof msg !== 'object') {
    return msg;
  }

  msg = resolvePlainMessage(msg);

  if (!msg.nabuId) {
    console.err(msg);
    throw new Error('Error calling Tr. Cannot resolve object');
  }

  if (!localeName) {
    console.warn(`Error calling Tr. No locale name is specified`);
    return msg.nabuId;
  }

  const nabuApi = quest.getAPI('nabu');
  if (!nabuApi) {
    console.warn(`Error calling Tr. Goblin Nabu is unavailable`);
    return msg.nabuId;
  }

  const storageAvailable = yield nabuApi.isStorageAvailable();
  const r = storageAvailable ? quest.getStorage('rethink') : null;
  const nabu = yield nabuApi.get();

  const messageId = computeMessageId(msg.nabuId);
  const message = r
    ? nabu.get(`translations.${messageId}`) ||
      (yield retrieveEntity(r, 'nabuMessage', messageId, next))
    : nabu.get(`translations.${messageId}`);

  const cachedTranslation = fromCache
    ? translationWithContextAndSublocale(
        msg.nabuId,
        localeName,
        nabuId => computeMessageId(nabuId),
        translation => translation,
        (msgId, lclName) => nabu.get(`translations.${msgId}.${lclName}`)
      )
    : null;

  const translation = !fromCache
    ? yield translationWithContextAndSublocaleAsync(
        msg.nabuId,
        localeName,
        nabuId => computeMessageId(nabuId),
        translation => translation && translation.text,
        function*(msgId, lclName, cb) {
          return storageAvailable
            ? yield retrieveEntity(
                r,
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
    message,
    cachedTranslation,
    translation,
    localeName,
  });
});

//-----------------------------------------------------------------------------

module.exports = Tr;
