'use strict';

const {crypto} = require('xcraft-core-utils');
import Widget from 'laboratory/widget';
import Connect from 'laboratory/connect';
import React from 'react';
import Text from 'nabu/text/widget';

class T extends Widget {
  static get wiring() {
    return {
      id: 'id',
      enabled: 'enabled',
    };
  }

  render() {
    const {id, enabled, msgid, dispatch, ...other} = this.props;
    if (!id || !enabled) {
      return <span {...other}>{msgid}</span>;
    }

    if (!msgid || typeof msgid !== 'string') {
      console.warn(
        '%cNabu Warning',
        'font-weight: bold;',
        `malformed message id: '${msgid}' found`
      );
      return null;
    }

    if (typeof msgid === 'string' && msgid.length === 0) {
      return null;
    }

    const WiredText = this.WithState(Text, messages => {
      const hashedMsgId = `nabuMessage@${crypto.sha256(msgid)}`;
      const msg = messages.get(hashedMsgId);
      console.dir(msg);
      return {
        message: msg ? msg : null,
      };
    })('.messages');

    return (
      <Connect
        locale={state => {
          const localeId = state.get('backend.nabuConfiguration@main.localeId');

          if (localeId != undefined && localeId !== '') {
            return state
              .get('backend.nabu.locales')
              .find(locale => locale.get('id') === localeId)
              .get('name');
          }
        }}
      >
        <WiredText msgid={msgid} {...other} />
      </Connect>
    );
  }
}

export default Widget.Wired(T)('nabu');
