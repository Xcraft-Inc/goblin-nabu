'use strict';

const crypto = require('xcraft-core-utils/lib/crypto.js');
import Widget from 'laboratory/widget';
import React from 'react';
import Text from 'nabu/text/widget';
import {isShredder, isImmutable} from 'xcraft-core-shredder';

const TextConnected = Widget.connect((state, props) => {
  const localeId = state.get('backend.nabuConfiguration@main.localeId');

  let localeName = null;
  if (localeId != undefined && localeId !== '') {
    const locales = state.get('backend.nabu.locales');

    if (locales) {
      const locale = locales.find(locale => locale.get('id') === localeId);

      if (locale) {
        localeName = locale.get('name');
      }
    }
  }

  return {
    message: state.get(`backend.${props.hashedmsgid}`),
    locale: localeName,
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
        hashedmsgid={hashedMsgId}
        nabuId={msg.nabuId}
        description={msg.description}
        html={msg.html}
        values={msg.values}
        workitemId={self.getNearestId()}
        {...other}
      />
    );
  }
}

export default T;
