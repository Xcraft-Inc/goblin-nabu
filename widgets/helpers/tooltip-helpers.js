import formatMessage from '../../lib/format.js';
const crypto = require('xcraft-core-utils/lib/crypto.js');
import {isShredder, isImmutable} from 'xcraft-core-shredder';

function Message(text, state, widget) {
  if (!text || typeof text === 'string') {
    return text;
  }

  if (isShredder(text) || isImmutable(text)) {
    text = text.toJS();
  }

  if (!widget) {
    return text.nabuId;
  }

  if (!state || !state.get('backend.nabu.enabled')) {
    return text.nabuId;
  }

  if (!text.nabuId) {
    console.warn(
      '%cNabu Warning',
      'font-weight: bold;',
      `malformed message in tooltip: '${JSON.stringify(text)}' found`
    );
    return text.nabuId;
  }

  const hashedMsgId = `nabuMessage@${crypto.sha256(text.nabuId)}`;
  const message = state.get(`backend.${hashedMsgId}`);

  if (!message) {
    const cmd = widget.cmd.bind(widget);
    const getNearestId = widget.getNearestId.bind(widget);

    cmd('nabu.add-message', {
      nabuId: text.nabuId,
      description: text.description,
      workitemId: getNearestId(),
    });

    return text.nabuId;
  }

  const localeId = state.get('backend.nabuConfiguration@main.localeId');

  if (!localeId) {
    return text.nabuId;
  }

  const locales = state.get('backend.nabu.locales');

  if (!locales) {
    return text.nabuId;
  }

  const locale = locales.find(locale => locale.get('id') === localeId);

  if (!locale) {
    return text.nabuId;
  }

  const translatedMessage = state.get(
    `backend.nabuTranslation@${locale.get('name')}-${hashedMsgId.split('@')[1]}`
  );

  return translatedMessage && translatedMessage.get('text')
    ? translatedMessage.get('text')
    : text.nabuId;
}

function Locale(state, text) {
  if (!text || typeof text === 'string') {
    return null;
  }

  if (!state || !state.get('backend.nabu.enabled')) {
    return null;
  }

  const localeId = state.get('backend.nabuConfiguration@main.localeId');

  if (!localeId) {
    return null;
  }

  const locales = state.get('backend.nabu.locales');

  if (!locales) {
    return null;
  }

  const locale = locales.find(locale => locale.get('id') === localeId);

  if (!locale) {
    return null;
  }

  return locale.get('name');
}

function Format(message, locale, text) {
  if (!message || !text) {
    return null;
  }

  if (!locale) {
    return message;
  }

  if (isShredder(text) || isImmutable(text)) {
    text = text.toJS();
  }

  return formatMessage(locale, text.html, message, text.values || []);
}

//-----------------------------------------------------------------------------

module.exports = {
  Message,
  Locale,
  Format,
};
