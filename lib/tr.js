'use strict';

const watt = require('watt');
const formatMessage = require('goblin-nabu/lib/format.js');
const {isShredder, isImmutable} = require('xcraft-core-shredder');
const {
  getToolbarId,
  computeMessageId,
  computeTranslationId,
} = require('goblin-nabu/lib/helpers.js');

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

const Tr = watt(function*(quest, msg, workitemId, next) {
  if (!msg || typeof msg === 'string') {
    return msg;
  }

  if (isShredder(msg) || isImmutable(msg)) {
    msg = msg.toJS();
  }

  if (!msg.nabuId) {
    return msg;
  }

  const msgId = computeMessageId(msg.nabuId);
  const toolbarId = getToolbarId(workitemId || quest.getDesktop());

  const r = quest.getStorage('rethink');
  const nabuApi = quest.getAPI('nabu');
  const toolbarApi = toolbarId ? quest.getAPI(toolbarId) : null;

  if (!r) {
    console.warn(`Error calling Tr. Goblin Rethink is unavailable`);
    return;
  }
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

  const nabu = yield nabuApi.get();
  const toolbar = toolbarId ? yield toolbarApi.get() : null;

  const message = yield r.get(
    {
      table: 'nabuMessage',
      documentId: msgId,
    },
    next
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
        translation = yield r.get(
          {
            table: 'nabuTranslation',
            documentId: computeTranslationId(msgId, locale.get('name')),
          },
          next
        );

        cachedTranslation = nabu.get(
          `translations.${msgId}.${locale.get('name')}`
        );
      }
    }
  }

  return getText({
    enabled: toolbar ? toolbar.get('enabled') : false,
    nabuId: msg.nabuId,
    html: msg.html,
    values: msg.values,
    message,
    cachedTranslation,
    translation,
    locale,
  });
});

//-----------------------------------------------------------------------------

module.exports = Tr;
