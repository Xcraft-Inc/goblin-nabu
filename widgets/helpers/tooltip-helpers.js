import formatMessage from '../../lib/format.js';
const {crypto} = require('xcraft-core-utils');

function T(state, text, widget) {
  if (!text || typeof text === 'string') {
    return text;
  }

  if (!state || !state.get('backend.nabu.enabled')) {
    return text.id;
  }

  if (text.id.length === 0) {
    console.warn(
      '%cNabu Warning',
      'font-weight: bold;',
      `malformed message id in tooltip: '${text.id}' found`
    );
    return text.id;
  }

  if (widget) {
    const cmd = widget.cmd.bind(widget);
    cmd('nabu.add-message', {
      messageId: text.id,
      description: text.description,
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

  const locale = state
    .get('backend.nabu.locales')
    .find(locale => locale.get('id') === localeId);

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
