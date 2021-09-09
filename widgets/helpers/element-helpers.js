//T:2019-02-27

import React from 'react';
import Widget from 'goblin-laboratory/widgets/widget/index.js';
import {formatMessage} from 'goblin-nabu/lib/format.js';
const {fromJS} = require('immutable');
const {isShredder, isImmutable} = require('xcraft-core-shredder');

const {
  getToolbarId,
  computeMessageId,
  computeTranslationId,
} = require('goblin-nabu/lib/helpers.js');
const {
  translationWithContextAndSublocale,
  removeContext,
} = require('goblin-nabu/lib/gettext.js');

const get = (obj, key) =>
  isShredder(obj) || isImmutable(obj) ? obj.get(key) : obj[key];

function getToolbar(state, workitemId) {
  const toolbarId = getToolbarId(workitemId);
  return toolbarId ? state.get(`backend.${toolbarId}`) : null;
}

function translate(text, state, enabled, locale) {
  const nabuId = get(text, 'nabuId');

  if (!locale) {
    return removeContext(nabuId);
  }

  const isCustom = get(text, 'custom');

  if (enabled || isCustom) {
    const translatedMessage = translationWithContextAndSublocale(
      nabuId,
      locale,
      (nabuId) => computeMessageId(nabuId),
      (translation) => translation && translation.get('text'),
      (msgId, localeName) =>
        state.get(`backend.${computeTranslationId(msgId, localeName)}`)
    );

    let fallback = isCustom ? '' : removeContext(nabuId);

    return translatedMessage && translatedMessage.get('text')
      ? translatedMessage.get('text')
      : fallback;
  } else {
    const cachedTranslation = translationWithContextAndSublocale(
      nabuId,
      locale,
      (nabuId) => computeMessageId(nabuId),
      (translation) => translation,
      (msgId, localeName) =>
        state.get(`backend.nabu.translations.${msgId}.${localeName}`)
    );

    return cachedTranslation || removeContext(nabuId);
  }
}

function format(translation, locale, text) {
  if (!text) {
    return null;
  }

  const txt =
    translation && typeof translation === 'string'
      ? translation
      : text.get('nabuId');

  const values = text.get('values') ? text.get('values').toJS() : {};

  return formatMessage(locale, text.get('html'), txt, values);
}

function getTranslatableElements(text, enabled, locale, state) {
  if (typeof text === 'string') {
    return [
      {
        translation: text,
      },
    ];
  }

  const nabuId = get(text, 'nabuId');
  if (nabuId) {
    return [
      {
        nabuObject: text,
        message: state.get(`backend.${computeMessageId(nabuId)}`),
        translation: translate(text, state, enabled, locale),
      },
    ];
  }

  // translatable string
  return get(text, '_string')
    .map((item) => getTranslatableElements(item, enabled, locale, state))
    .flat();
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
    const {enabled, translatableElements, workitemId} = this.props;

    if (workitemId && translatableElements) {
      for (let element of translatableElements) {
        const nabuObject = element.get('nabuObject');
        if (nabuObject) {
          const custom = nabuObject.get('custom');
          const nabuId = nabuObject.get('nabuId');
          if ((enabled || custom) && nabuId && !element.get('message', null)) {
            this.cmd('nabu.add-message', {
              nabuId,
              description: nabuObject.get('description'),
              custom,
              workitemId,
            });
          }
        }
      }
    }
  }

  render() {
    const {
      enabled,
      translatableElements,
      locale,
      dispatch,
      children,
      renderElement,
      onRef,
      ...other
    } = this.props;
    const translation = translatableElements
      ? translatableElements
          .map((element) =>
            element.get('nabuObject', null)
              ? format(
                  element.get('translation'),
                  locale,
                  element.get('nabuObject')
                )
              : element.get('translation')
          )
          .toJS()
          .join('')
      : this.props.msgid;

    return renderElement(translation, children, onRef, other);
  }
}

function connectTranslatableElement(renderElement) {
  return Widget.connect((state, props) => {
    const {msgid, workitemId, ...other} = props;
    let text = msgid;

    if (React.isValidElement(text)) {
      throw new Error(
        `Error in Translatable Element: a React component has been provided`
      );
    }

    if (!text) {
      return {
        renderElement,
        ...other,
      };
    }

    if (typeof text !== 'object') {
      return {
        translatableElements: fromJS([
          {
            translation: text,
          },
        ]),
        renderElement,
        ...other,
      };
    }

    const type = get(text, '_type');
    const nabuId = get(text, 'nabuId');

    if (type === 'translatableMarkdown') {
      throw new Error(
        `Cannot render markdown in Translatable Element. Markdown is ${
          isShredder(text) || isImmutable(text) ? text : JSON.stringify(text)
        }`
      );
    }

    if (!nabuId && type !== 'translatableString') {
      console.error(text);
      throw new Error('Cannot render object in Translatable Element');
    }

    const toolbar = getToolbar(state, workitemId);
    const enabled = toolbar ? toolbar.get('enabled') : false;
    const locale = Widget.getUserSession(state).get('locale');

    const translatableElements = fromJS(
      getTranslatableElements(text, enabled, locale, state)
    );

    return {
      enabled,
      renderElement,
      locale,
      translatableElements,
      ...other,
    };
  })(TranslatableElement);
}

const renderDiv = (tooltip, children, onRef, props) => {
  const {workitemId, ...otherProps} = props;
  return (
    <div ref={onRef} title={tooltip} {...otherProps}>
      {children}
    </div>
  );
};

const renderA = (tooltip, children, onRef, props) => {
  const {workitemId, ...otherProps} = props;
  return (
    <a ref={onRef} title={tooltip} {...otherProps}>
      {children}
    </a>
  );
};

const renderTextarea = (placeholder, children, onRef, props) => {
  const {workitemId, ...otherProps} = props;
  return <textarea ref={onRef} placeholder={placeholder} {...otherProps} />;
};

function withoutProp(Component, propName) {
  return React.forwardRef((props, ref) => {
    const {[propName]: prop, ...otherProps} = props;
    return <Component ref={ref} {...otherProps} />;
  });
}

export const withT = (
  Component,
  textPropName,
  servicePropName,
  refPropName
) => {
  const TranslatableComponent = connectTranslatableElement(
    (translation, children, onRef, props) => {
      const {msgid, [refPropName]: ref, ...otherProps} = props;
      return (
        <Component
          ref={refPropName ? ref : onRef}
          {...{[textPropName]: translation}}
          {...otherProps}
        >
          {children}
        </Component>
      );
    }
  );
  return (props) => {
    const {[textPropName]: msgid, ...otherProps} = props;
    return (
      <TranslatableComponent
        msgid={msgid}
        workitemId={props[servicePropName]}
        {...otherProps}
      />
    );
  };
};

//-----------------------------------------------------------------------------

export const TranslatableDiv = withT(
  withoutProp('div', 'workitemId'),
  'title',
  'workitemId',
  'divRef'
);
export const TranslatableA = connectTranslatableElement(renderA);
export const TranslatableTextarea = connectTranslatableElement(renderTextarea);
export const TranslatableVideo = withT(
  withoutProp('video', 'workitemId'),
  'src',
  'workitemId',
  'videoRef'
);
// export const TranslatableInput = connectTranslatableElement(renderInput);
export const TranslatableInput = withT(
  withT(withoutProp('input', 'workitemId'), 'value', 'workitemId', 'inputRef'),
  'placeholder',
  'workitemId'
);
