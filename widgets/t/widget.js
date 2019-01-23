'use strict';

const crypto = require('xcraft-core-utils/lib/crypto.js');
import Widget from 'laboratory/widget';
import _ from 'lodash';
import React from 'react';
import Text from 'nabu/text/widget';
import {isShredder, isImmutable} from 'xcraft-core-shredder';
const {getToolbarId} = require('goblin-nabu/widgets/helpers/t.js');

const TextConnected = Widget.connect((state, props) => {
  const localeId = state.get('backend.nabuConfiguration@main.localeId');

  let locale = null;
  let translation = null;
  let cachedTranslation = null;
  let wiring = {};

  if (localeId) {
    const locales = state.get('backend.nabu.locales');

    if (locales) {
      locale = locales.find(locale => locale.get('id') === localeId);

      if (locale) {
        if (locale.get('name')) {
          translation = state.get(
            `backend.nabuTranslation@${locale.get('name')}-${
              props.hashedMsgId.split('@')[1]
            }`
          );

          cachedTranslation = state.get(
            `backend.nabu.translations.${props.hashedMsgId}.${locale.get(
              'name'
            )}`
          );
        }
      }
    }
  }

  const toolbarId = getToolbarId(props.workitemId);
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
    message: state.get(`backend.${props.hashedMsgId}`),
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
        '%cNabu Warning',
        'font-weight: bold;',
        `malformed message: '${JSON.stringify(msg)}' found`
      );
      return null;
    }

    const hashedMsgId = `nabuMessage@${crypto.sha256(msg.nabuId)}`;

    return (
      <TextConnected
        hashedMsgId={hashedMsgId}
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
