import React from 'react';
import Widget from 'laboratory/widget';
import formatMessage from './format.js';
import {isShredder, isImmutable} from 'xcraft-core-shredder';
const {
  getToolbarId,
  computeMessageId,
  computeTranslationId,
} = require('goblin-nabu/lib/helpers.js');

function getLocaleName(state, toolbar) {
  const localeId = toolbar ? toolbar.get('selectedLocaleId') : null;
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

function getToolbar(state, widget) {
  const getNearestId = widget.getNearestId.bind(widget);
  const workitemId = getNearestId();
  const toolbarId = getToolbarId(widget.context.desktopId || workitemId);

  return toolbarId ? state.get(`backend.${toolbarId}`) : null;
}

function Message(text, state) {
  const msgId = computeMessageId(text.nabuId);
  return state.get(`backend.${msgId}`);
}

function Translation(text, state, enabled, locale) {
  const msgId = computeMessageId(text.nabuId);

  if (enabled && !state.get(`backend.${msgId}`)) {
    return text.nabuId;
  }

  if (!locale) {
    return text.nabuId;
  }

  if (!enabled) {
    const cachedTranslation = state.get(
      `backend.nabu.translations.${msgId}.${locale}`
    );

    return cachedTranslation || text.nabuId;
  }

  const translationId = computeTranslationId(msgId, locale);
  const translatedMessage = state.get(`backend.${translationId}`);

  return translatedMessage && translatedMessage.get('text')
    ? translatedMessage.get('text')
    : text.nabuId;
}

function Format(translation, locale, text) {
  if (!translation || !text) {
    return null;
  }

  if (!locale) {
    return translation;
  }

  if (isShredder(text) || isImmutable(text)) {
    text = text.toJS();
  }

  return formatMessage(locale, text.html, translation, text.values || []);
}

/**************************************************************************/

class Item extends Widget {
  constructor() {
    super(...arguments);
    this.mustAdd = this.mustAdd.bind(this);
  }

  componentDidMount() {
    this.mustAdd();
  }

  componentDidUpdate() {
    this.mustAdd();
  }

  mustAdd() {
    const {enabled, message, text, widget} = this.props;

    if (
      enabled &&
      !message &&
      text &&
      typeof text !== 'string' &&
      text.nabuId
    ) {
      const getNearestId = widget.getNearestId.bind(widget);
      const workitemId = getNearestId();

      this.cmd('nabu.add-message', {
        nabuId: text.nabuId,
        description: text.description,
        workitemId,
        desktopId: widget.context.desktopId,
      });
    }
  }

  render() {
    const {
      enabled,
      locale,
      message,
      translation,
      text,
      widget,
      dispatch,
      children,
      renderElement,
      ...other
    } = this.props;

    return renderElement(Format(translation, locale, text), children, other);
  }
}

function connectItem(item, renderElement) {
  return Widget.connect((state, props) => {
    const {tooltip, self, ...other} = props;
    let text = tooltip;

    if (!text || typeof text === 'string') {
      return {
        text: text,
        renderElement,
        ...other,
      };
    }

    if (isShredder(text) || isImmutable(text)) {
      text = text.toJS();
    }

    if (!text.nabuId) {
      console.warn(
        '%cNabu Tooltip Warning',
        'font-weight: bold;',
        `malformed message: '${JSON.stringify(text)}' found (missing nabuId)`
      );
      return {
        text: text,
        renderElement,
        ...other,
      };
    }

    if (!self) {
      console.warn(
        '%cNabu Tooltip Warning',
        'font-weight: bold;',
        'widget has not been provided'
      );
      return {
        text: text.nabuId,
        renderElement,
        ...other,
      };
    }

    const toolbar = getToolbar(state, self);
    const enabled = toolbar ? toolbar.get('enabled') : false;
    const locale = enabled ? getLocaleName(state, toolbar) : null;

    return {
      enabled,
      locale,
      message: Message(text, state),
      translation: Translation(text, state, enabled, locale),
      text,
      widget: self,
      renderElement,
      ...other,
    };
  })(item);
}

const ConnectedDiv = connectItem(Item, (tooltip, children, props) => (
  <div title={tooltip} {...props}>
    {children}
  </div>
));
const ConnectedA = connectItem(Item, (tooltip, children, props) => (
  <a title={tooltip} {...props}>
    {children}
  </a>
));

//-----------------------------------------------------------------------------

module.exports = {
  ConnectedDiv,
  ConnectedA,
};
