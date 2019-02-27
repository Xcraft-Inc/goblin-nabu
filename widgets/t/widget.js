'use strict';

import Widget from 'laboratory/widget';
import React from 'react';
import Text from 'nabu/text/widget';
import {isShredder, isImmutable} from 'xcraft-core-shredder';
import {
  getToolbarId,
  computeMessageId,
  computeTranslationId,
} from 'goblin-nabu/lib/helpers.js';
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

    if (!msg) {
      return <span {...other}>{msg}</span>;
    }

    if (typeof msg === 'string') {
      return <span {...other}>{msg}</span>;
    }

    if (isShredder(msg) || isImmutable(msg)) {
      msg = msg.toJS();
    }

    if (!msg.nabuId) {
      return <span {...other}>{msg}</span>;
    }

    return (
      <TextConnected
        nabuId={msg.nabuId}
        description={msg.description}
        html={msg.html}
        values={msg.values}
        workitemId={self.context.desktopId || self.getNearestId()}
        {...other}
      />
    );
  }
}

export default T;
