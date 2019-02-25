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
  translationWithContextAndSublocaleAsync,
} = require('goblin-nabu/lib/gettext.js');

const retrieveEntity = watt(function*(r, table, documentId, next) {
  try {
    return yield r.get(
      {
        table,
        documentId,
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
    enabled,
    message,
    nabuId,
    localeName,
    html,
    values,
    cachedTranslation,
    translation,
  } = props;

  if (!enabled && cachedTranslation) {
    return cachedTranslation;
  }

  const translatedMessage =
    enabled && message && translation && translation.text && localeName
      ? translation.text
      : nabuId;

  return localeName
    ? formatMessage(localeName, html, translatedMessage, values || [])
    : nabuId;
}

const Tr = watt(function*(quest, localeName, msg, next) {
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

  const messageId = computeMessageId(msg.nabuId);
  const message = r
    ? nabu.get(`translations.${messageId}`) ||
      (yield retrieveEntity(r, 'nabuMessage', messageId, next))
    : nabu.get(`translations.${messageId}`);

  let translation = null;
  let cachedTranslation = null;

  if (!localeName) {
    const localeId = toolbar ? toolbar.get('selectedLocaleId') : null;
    if (localeId) {
      const locales = nabu.get('locales');
      if (locales) {
        const locale = locales.find(locale => locale.get('id') === localeId);
        if (locale) {
          localeName = locale.get('name');
        }
      }
    }
  }

  if (localeName) {
    translation = yield translationWithContextAndSublocaleAsync(
      msg.nabuId,
      localeName,
      nabuId => computeMessageId(nabuId),
      translation => translation && translation.text,
      function*(msgId, lclName) {
        return storageAvailable
          ? yield retrieveEntity(
              r,
              'nabuTranslation',
              computeTranslationId(msgId, lclName),
              next
            )
          : null;
      }
    );

    cachedTranslation = translationWithContextAndSublocaleAsync(
      msg.nabuId,
      localeName,
      nabuId => computeMessageId(nabuId),
      translation => translation,
      (msgId, lclName) => nabu.get(`translations.${msgId}.${lclName}`)
    );
  }

  return getText({
    enabled: toolbar ? toolbar.get('enabled') : false,
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
