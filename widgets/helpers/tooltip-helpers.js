import formatMessage from '../../lib/format.js';
const {crypto} = require('xcraft-core-utils');
import {isShredder, isImmutable} from 'xcraft-core-shredder';

function T(state, text, widget) {
  if (!text || typeof text === 'string') {
    return text;
  }

  if (!state || !state.get('backend.nabu.enabled')) {
    return text.id;
  }

  if (isShredder(text) || isImmutable(text)) {
    text = text.toJS();
  }

  if (!text.id || text.id.length === 0) {
    console.warn(
      '%cNabu Warning',
      'font-weight: bold;',
      `malformed message in tooltip: '${text}' found`
    );
    return text.id;
  }

  if (widget) {
    const cmd = widget.cmd.bind(widget);
    const getNearestId = widget.getNearestId.bind(widget);
    cmd('nabu.add-message', {
      messageId: text.id,
      description: text.description,
      workitemId: getNearestId(),
    });
  }

  const hashedMsgId = `nabuMessage@${crypto.sha256(text.id)}`;
  const message = state.get(`backend.nabu.messages.${hashedMsgId}`);

  if (!message) {
    return text.id;
  }

  const localeId = state.get('backend.nabuConfiguration@main.localeId');

  if (localeId == undefined || localeId === '') {
    return text.id;
  }

  const locales = state.get('backend.nabu.locales');

  if (!locales) {
    return text.id;
  }

  const locale = locales.find(locale => locale.get('id') === localeId);

  if (!locale) {
    return text.id;
  }

  const translatedMessage = message.get(
    `translations.${locale.get('name')}`,
    text.id
  );
  const finalMessage = translatedMessage !== '' ? translatedMessage : text.id;

  return formatMessage(locale.get('name'), null, finalMessage, []);
}

//-----------------------------------------------------------------------------

module.exports = {
  T,
};
