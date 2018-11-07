import formatMessage from '../../lib/format.js';
const crypto = require('xcraft-core-utils/lib/crypto.js');
import {isShredder, isImmutable} from 'xcraft-core-shredder';

function T(state, text, widget) {
  if (!text || typeof text === 'string') {
    return text;
  }

  if (isShredder(text) || isImmutable(text)) {
    text = text.toJS();
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

  if (widget) {
    const cmd = widget.cmd.bind(widget);
    const getNearestId = widget.getNearestId.bind(widget);
    cmd('nabu.add-message', {
      nabuId: text.nabuId,
      description: text.description,
      workitemId: getNearestId(),
    });
  }

  const hashedMsgId = `nabuMessage@${crypto.sha256(text.nabuId)}`;
  const message = state.get(`backend.${hashedMsgId}`);

  if (!message) {
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

  const translatedMessage = message.get(
    `translations.${locale.get('name')}`,
    text.nabuId
  );
  const finalMessage =
    translatedMessage !== '' ? translatedMessage : text.nabuId;

  return formatMessage(locale.get('name'), null, finalMessage, []);
}

//-----------------------------------------------------------------------------

module.exports = {
  T,
};
