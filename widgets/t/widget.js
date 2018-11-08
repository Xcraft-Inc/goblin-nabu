'use strict';

const crypto = require('xcraft-core-utils/lib/crypto.js');
import Widget from 'laboratory/widget';
import Connect from 'laboratory/connect';
import React from 'react';
import Text from 'nabu/text/widget';
import {isShredder, isImmutable} from 'xcraft-core-shredder';

class T extends Widget {
  render() {
    const {msgid, ...other} = this.props;
    const self = this;
    let msg = msgid;

    if (typeof msg === 'string') {
      return <span {...other}>{msg}</span>;
    }

    if (!msg) {
      return null;
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
      <Connect
        locale={state => {
          const localeId = state.get('backend.nabuConfiguration@main.localeId');

          if (localeId != undefined && localeId !== '') {
            const locales = state.get('backend.nabu.locales');

            if (locales) {
              const locale = locales.find(
                locale => locale.get('id') === localeId
              );

              if (locale) {
                return locale.get('name');
              }
            }
          }
        }}
        message={state => state.get(`backend.${hashedMsgId}`)}
      >
        <Text
          nabuId={msg.nabuId}
          description={msg.description}
          workitemId={self.getNearestId()}
          {...other}
        />
      </Connect>
    );
  }
}

export default T;
