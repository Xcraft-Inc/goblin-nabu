//T:2019-02-27

import React from 'react';
import Widget from 'laboratory/widget';
import formatMessage from 'goblin-nabu/lib/format.js';

const {
  getToolbarId,
  computeMessageId,
  computeTranslationId,
  resolvePlainMessage,
} = require('goblin-nabu/lib/helpers.js');
const {
  translationWithContextAndSublocale,
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

function translate(text, state, enabled, locale) {
  if (!locale) {
    return text.nabuId;
  }

  if (enabled || text.custom) {
    const translatedMessage = translationWithContextAndSublocale(
      text.nabuId,
      locale,
      nabuId => computeMessageId(nabuId),
      translation => translation && translation.get('text'),
      (msgId, localeName) =>
        state.get(`backend.${computeTranslationId(msgId, localeName)}`)
    );

    return translatedMessage && translatedMessage.get('text')
      ? translatedMessage.get('text')
      : text.nabuId;
  } else {
    const cachedTranslation = translationWithContextAndSublocale(
      text.nabuId,
      locale,
      nabuId => computeMessageId(nabuId),
      translation => translation,
      (msgId, localeName) =>
        state.get(`backend.nabu.translations.${msgId}.${localeName}`)
    );

    return cachedTranslation || text.nabuId;
  }
}

function format(translation, locale, text) {
  if (!text) {
    return null;
  }

  const txt =
    translation && typeof translation === 'string' ? translation : text.nabuId;

  return formatMessage(locale, text.html, txt, text.values || {});
}

function getTranslationInfo(text, enabled, locale, state) {
  if (typeof text === 'string') {
    return {
      translatableElements: [],
      translation: text,
    };
  } else if (text.nabuId) {
    return {
      translatableElements: [
        {
          nabuObject: text,
          message: state.get(`backend.${computeMessageId(text.nabuId)}`),
        },
      ],
      translation: format(
        translate(text, state, enabled, locale),
        locale,
        text
      ),
    };
  } else {
    // translatable string
    const infos = text._string.map(item =>
      getTranslationInfo(item, enabled, locale, state)
    );
    return {
      translatableElements: infos.map(item => item.translatableElements).flat(),
      translation: infos.map(item => item.translation).join(''),
    };
  }
}

/**************************************************************************/

class TranslatableElement extends Widget {
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
    const {enabled, translatableElements, widget} = this.props;

    if (widget) {
      const getNearestId = widget.getNearestId.bind(widget);
      const workitemId = getNearestId();
      const desktopId = widget.context.desktopId;

      for (let element of translatableElements) {
        if (
          (enabled || element.nabuObject.custom) &&
          element.nabuObject &&
          element.nabuObject.nabuId &&
          !element.message
        ) {
          this.cmd('nabu.add-message', {
            nabuId: element.nabuObject.nabuId,
            description: element.nabuObject.description,
            custom: element.nabuObject.custom,
            workitemId,
            desktopId,
          });
        }
      }
    }
  }

  render() {
    const {
      enabled,
      translatableElements,
      translation,
      widget,
      dispatch,
      children,
      renderElement,
      self,
      onRef,
      ...other
    } = this.props;

    return renderElement(translation, children, onRef, other);
  }
}

function connectTranslatableElement(renderElement) {
  return Widget.connect((state, props) => {
    const {msgid, self, ...other} = props;
    let text = msgid;

    if (!self) {
      throw new Error(
        `Error in Translatable Element: widget (self property) has not been provided`
      );
    }

    if (React.isValidElement(text)) {
      throw new Error(
        `Error in Translatable Element: a React component has been provided`
      );
    }

    if (!text || typeof text !== 'object') {
      return {
        translatableElements: [],
        translation: text,
        renderElement,
        ...other,
      };
    }

    text = resolvePlainMessage(text);

    if (text._type === 'translatableMarkdown') {
      throw new Error(
        `Cannot render markdown in Translatable Element. Markdown is ${JSON.stringify(
          text
        )}`
      );
    } else if (!text.nabuId && text._type !== 'translatableString') {
      console.err(text);
      throw new Error('Cannot render object in Translatable Element');
    }

    const toolbar = getToolbar(state, self);
    const enabled = toolbar ? toolbar.get('enabled') : false;
    const locale = getLocaleName(state, toolbar);

    const translationInfo = getTranslationInfo(text, enabled, locale, state);

    return {
      enabled,
      widget: self,
      renderElement,
      ...translationInfo,
      ...other,
    };
  })(TranslatableElement);
}

const TranslatableDiv = connectTranslatableElement(
  (tooltip, children, onRef, props) => (
    <div ref={onRef} title={tooltip} {...props}>
      {children}
    </div>
  )
);

const TranslatableA = connectTranslatableElement(
  (tooltip, children, onRef, props) => (
    <a ref={onRef} title={tooltip} {...props}>
      {children}
    </a>
  )
);

const TranslatableTextarea = connectTranslatableElement(
  (placeholder, children, onRef, props) => (
    <textarea ref={onRef} placeholder={placeholder} {...props} />
  )
);

const TranslatableInput = connectTranslatableElement(
  (placeholder, children, onRef, props) => (
    <input ref={onRef} placeholder={placeholder} {...props} />
  )
);

//-----------------------------------------------------------------------------

module.exports = {
  TranslatableDiv,
  TranslatableA,
  TranslatableTextarea,
  TranslatableInput,
};
