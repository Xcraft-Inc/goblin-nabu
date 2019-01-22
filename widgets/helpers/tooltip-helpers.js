import React from 'react';
import Widget from 'laboratory/widget';
import formatMessage from './format.js';
const crypto = require('xcraft-core-utils/lib/crypto.js');
import {isShredder, isImmutable} from 'xcraft-core-shredder';
const {getToolbarId} = require('./t.js');

function Message(text, state, widget) {
  if (!text || typeof text === 'string') {
    return text;
  }

  if (isShredder(text) || isImmutable(text)) {
    text = text.toJS();
  }

  if (!text.nabuId) {
    console.warn(
      '%cNabu Tooltip Warning',
      'font-weight: bold;',
      `malformed message in tooltip: '${JSON.stringify(
        text
      )}' found (missing nabuId)`
    );
    return text.nabuId;
  }

  if (!widget || !state) {
    console.warn(
      '%cNabu Tooltip Warning',
      'font-weight: bold;',
      'widget or state arg have not been provided'
    );
    return text.nabuId;
  }

  const getNearestId = widget.getNearestId.bind(widget);
  const workitemId = getNearestId();
  const toolbarId = getToolbarId(widget.context.desktopId || workitemId);
  const hashedMsgId = `nabuMessage@${crypto.sha256(text.nabuId)}`;
  const enabled = state.get(`backend.${toolbarId}.enabled`);

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

  const cachedTranslation = state.get(
    `backend.nabu.translations.${hashedMsgId}.${locale.get('name')}`
  );

  if (!enabled) {
    return cachedTranslation || text.nabuId;
  }

  if (!state.get(`backend.${hashedMsgId}`)) {
    const cmd = widget.cmd.bind(widget);

    cmd('nabu.add-message', {
      nabuId: text.nabuId,
      description: text.description,
      workitemId,
      desktopId: widget.context.desktopId,
    });

    return text.nabuId;
  }

  const translatedMessage = state.get(
    `backend.nabuTranslation@${locale.get('name')}-${hashedMsgId.split('@')[1]}`
  );

  return translatedMessage && translatedMessage.get('text')
    ? translatedMessage.get('text')
    : text.nabuId;
}

function Locale(state, text, widget) {
  if (!text || typeof text === 'string') {
    return null;
  }

  if (!widget) {
    return null;
  }

  const getNearestId = widget.getNearestId.bind(widget);
  const workitemId = getNearestId();
  const toolbarId = getToolbarId(widget.context.desktopId || workitemId);

  if (!state || !state.get(`backend.${toolbarId}.enabled`)) {
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

/**************************************************************************/

const DivItem = props => {
  const {message, locale, tooltip, children, dispatch, ...other} = props;

  return (
    <div title={Format(message, locale, tooltip)} {...other}>
      {children}
    </div>
  );
};

const AItem = props => {
  const {message, locale, tooltip, children, dispatch, ...other} = props;

  return (
    <a title={Format(message, locale, tooltip)} {...other}>
      {children}
    </a>
  );
};

function connectItem(item) {
  return Widget.connect((state, props) => {
    return {
      message: Message(props.tooltip, state, props.this),
      locale: Locale(state, props.tooltip, props.this),
      tooltip: props.tooltip,
    };
  })(item);
}

const ConnectedDiv = connectItem(DivItem);
const ConnectedA = connectItem(AItem);

//-----------------------------------------------------------------------------

module.exports = {
  Message,
  Locale,
  Format,

  ConnectedDiv,
  ConnectedA,
};
