import React from 'react';
import Widget from 'laboratory/widget';
import formatMessage from 'goblin-nabu/lib/format.js';
import {isShredder, isImmutable} from 'xcraft-core-shredder';
const {
  getToolbarId,
  computeMessageId,
  computeTranslationId,
} = require('goblin-nabu/lib/helpers.js');
const {
  messageWithContext,
  translationWithSublocale,
} = require('goblin-nabu/lib/gettext.js');

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
  return messageWithContext(
    text.nabuId,
    nabuId => computeMessageId(nabuId),
    msgId => state.get(`backend.${msgId}`)
  );
}

function Translation(text, state, enabled, msgId, locale) {
  if (enabled && !state.get(`backend.${msgId}`)) {
    return text.nabuId;
  }

  if (!locale) {
    return text.nabuId;
  }

  if (!enabled) {
    const cachedTranslation = translationWithSublocale(locale, localeName =>
      state.get(`backend.nabu.translations.${msgId}.${localeName}`)
    );

    return cachedTranslation || text.nabuId;
  }

  const translatedMessage = translationWithSublocale(locale, localeName =>
    state.get(`backend.${computeTranslationId(msgId, localeName)}`)
  );

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

    if (enabled && !message && text && text.nabuId) {
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

    return renderElement(
      typeof translation === 'string'
        ? Format(translation, locale, text)
        : text,
      children,
      other
    );
  }
}

function connectItem(item, renderElement) {
  return Widget.connect((state, props) => {
    const {tooltip, self, ...other} = props;
    let text = tooltip;

    if (!text || typeof text === 'string') {
      return {
        text,
        translation: text,
        renderElement,
        ...other,
      };
    }

    if (isShredder(text) || isImmutable(text)) {
      text = text.toJS();
    }

    if (!text.nabuId) {
      return {
        text,
        translation: text,
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
        text,
        translation: text.nabuId,
        renderElement,
        ...other,
      };
    }

    const toolbar = getToolbar(state, self);
    const enabled = toolbar ? toolbar.get('enabled') : false;
    const locale = enabled ? getLocaleName(state, toolbar) : null;
    const msgStruct = Message(text, state);

    return {
      enabled,
      locale,
      message: msgStruct.message,
      translation: Translation(text, state, enabled, msgStruct.msgId, locale),
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
