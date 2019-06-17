'use strict';
//T:2019-02-27

import Widget from 'laboratory/widget';
import React from 'react';
import Text from 'nabu/text/widget';
import {
  getToolbarId,
  computeMessageId,
  computeTranslationId,
} from 'goblin-nabu/lib/helpers.js';
const {isShredder, isImmutable} = require('xcraft-core-shredder');
const {fromJS} = require('immutable');
import Markdown from 'gadgets/markdown/widget';
import {translationWithContextAndSublocale} from 'goblin-nabu/lib/gettext.js';

const TextConnected = Widget.connect((state, props) => {
  const toolbarId = getToolbarId(props.workitemId);
  const localeId = toolbarId
    ? state.get(`backend.${toolbarId}.selectedLocaleId`)
    : null;

  let locale = null;
  let translation = null;
  let cachedTranslation = null;
  let wiring = {};
  const message = state.get(`backend.${computeMessageId(props.nabuId)}`);

  if (localeId) {
    const locales = state.get('backend.nabu.locales');

    if (locales) {
      locale = locales.find(locale => locale.get('id') === localeId);

      if (locale && locale.get('name')) {
        translation = translationWithContextAndSublocale(
          props.nabuId,
          locale.get('name'),
          nabuId => computeMessageId(nabuId),
          translation => translation && translation.get('text'),
          (msgId, localeName) =>
            state.get(`backend.${computeTranslationId(msgId, localeName)}`)
        );

        cachedTranslation = translationWithContextAndSublocale(
          props.nabuId,
          locale.get('name'),
          nabuId => computeMessageId(nabuId),
          translation => translation,
          (msgId, localeName) =>
            state.get(`backend.nabu.translations.${msgId}.${localeName}`)
        );
      }
    }
  }

  const toolbar = toolbarId ? state.get(`backend.${toolbarId}`) : null;

  if (toolbar) {
    wiring = {
      id: toolbarId,
      enabled: toolbar.get('enabled'),
      marker: toolbar.get('marker'),
      focus: toolbar.get('focus'),
      selectionModeEnabled: toolbar.get('selectionMode.enabled'),
      selectedItem: toolbar.get('selectionMode.selectedItemId'),
    };
  }

  return {
    message,
    cachedTranslation,
    translation,
    locale,
    ...wiring,
  };
})(Text);

class T extends Widget {
  render() {
    const {msgid, ...other} = this.props;
    const self = this;
    let msg = msgid;
    let values = null;

    if (!msg || typeof msg !== 'object') {
      return <span {...other}>{msg}</span>;
    }

    if (isShredder(msg) || isImmutable(msg)) {
      values = msg.get('values');
      msg = msg.toJS();
    } else if (msg.values) {
      values = fromJS(msg.values);
    }

    if (msg._type === 'translatableMarkdown') {
      return (
        <Markdown
          source={msg._string.substring(3, msg._string.length - 3)} // remove triple back-tick
          renderers={{
            text: text => {
              if (text.startsWith('@{') && text.endsWith('}')) {
                return (
                  <T
                    key={text}
                    msgid={msg._refs[text.slice(2, text.length - 1)]}
                  />
                );
              } else {
                return text;
              }
            },
          }}
        />
      );
    } else if (msg._type === 'translatableString') {
      return (
        <span {...other}>
          {msg._string.map((item, index) =>
            typeof item === 'string' ? item : <T key={index} msgid={item} />
          )}
        </span>
      );
    } else if (!msg.nabuId) {
      // All other objects
      return <span {...other}>{msg}</span>;
    }

    return (
      <TextConnected
        nabuId={msg.nabuId}
        description={msg.description}
        custom={msg.custom}
        html={msg.html}
        values={values}
        workitemId={self.context.desktopId || self.getNearestId()}
        {...other}
      />
    );
  }
}

export default T;
