'use strict';

import Widget from 'laboratory/widget';
import _ from 'lodash';
import React from 'react';
import Text from 'nabu/text/widget';
import {isShredder, isImmutable} from 'xcraft-core-shredder';
const {
  getToolbarId,
  computeMessageId,
  computeTranslationId,
} = require('goblin-nabu/lib/helpers.js');

const TextConnected = Widget.connect((state, props) => {
  const toolbarId = getToolbarId(props.workitemId);
  const localeId = toolbarId
    ? state.get(`backend.${toolbarId}.selectedLocaleId`)
    : null;

  let locale = null;
  let translation = null;
  let cachedTranslation = null;
  let wiring = {};

  if (localeId) {
    const locales = state.get('backend.nabu.locales');

    if (locales) {
      locale = locales.find(locale => locale.get('id') === localeId);

      if (locale && locale.get('name')) {
        translation = state.get(
          `backend.${computeTranslationId(props.msgId, locale.get('name'))}`
        );

        cachedTranslation = state.get(
          `backend.nabu.translations.${props.msgId}.${locale.get('name')}`
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
    message: state.get(`backend.${props.msgId}`),
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
      return null;
    }

    if (typeof msg === 'string') {
      return <span {...other}>{msg}</span>;
    }

    if (isShredder(msg) || isImmutable(msg)) {
      msg = msg.toJS();
    }

    if (!msg.nabuId) {
      console.warn(
        '%cNabu T Warning',
        'font-weight: bold;',
        `malformed message found (missing nabuId)`
      );
      console.warn(msg);
      return msg;
    }

    return (
      <TextConnected
        msgId={computeMessageId(msg.nabuId)}
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
