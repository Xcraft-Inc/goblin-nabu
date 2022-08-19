'use strict';
//T:2019-02-27

import Widget from 'goblin-laboratory/widgets/widget';
import React from 'react';
import Text from '../text/widget';
import {
  getToolbarId,
  computeMessageId,
  computeTranslationId,
} from 'goblin-nabu/lib/helpers.js';
const {isShredder, isImmutable} = require('xcraft-core-shredder');
const {fromJS} = require('immutable');
import Markdown from 'goblin-gadgets/widgets/markdown/widget';
import {translationWithContextAndSublocale} from 'goblin-nabu/lib/gettext.js';

const TextConnected = Widget.connect((state, props) => {
  const toolbarId = getToolbarId(props.workitemId);
  const localeId = Widget.getUserSession(state).get('locale');

  let locale = null;
  let translation = null;
  let cachedTranslation = null;
  let wiring = {};
  const message = state.get(`backend.${computeMessageId(props.nabuId)}`);

  if (localeId) {
    const locales = state.get('backend.nabu.locales');

    if (locales) {
      locale = locales.find((locale) => locale.get('name') === localeId);

      if (locale && locale.get('name')) {
        translation = translationWithContextAndSublocale(
          props.nabuId,
          locale.get('name'),
          (nabuId) => computeMessageId(nabuId),
          (translation) => translation && translation.get('text'),
          (msgId, localeName) =>
            state.get(`backend.${computeTranslationId(msgId, localeName)}`)
        );

        cachedTranslation = translationWithContextAndSublocale(
          props.nabuId,
          locale.get('name'),
          (nabuId) => computeMessageId(nabuId),
          (translation) => translation,
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
    const {msgid, workitemId, ...other} = this.props;
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
          markdownVerticalSpacing={this.props.markdownverticalspacing}
          textColor={this.props.textcolor}
          source={msg._string
            .substring(3, msg._string.length - 3) /* remove triple back-tick */
            .replace(/(@{[^}]+})/g, '_$1_')}
          components={{
            em: (props) => {
              const r = props.children.map((child) => {
                if (
                  child &&
                  typeof child === 'string' &&
                  child.startsWith('@{') &&
                  child.endsWith('}')
                ) {
                  return (
                    <T
                      key={child}
                      msgid={msg._refs[child.slice(2, child.length - 1)]}
                    />
                  );
                }
                return child;
              });

              return <>{r}</>;
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
        workitemId={workitemId || self.context.desktopId || self.getNearestId()}
        {...other}
      />
    );
  }
}

export default T;
