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

    if (typeof msgid === 'string') {
      return <span {...other}>{msgid}</span>;
    }

    if (!msgid) {
      return null;
    }

    if (!id || !enabled) {
      return <span {...other}>{msgid.id}</span>;
    }

    if (msgid.id.length === 0) {
      console.warn(
        '%cNabu Warning',
        'font-weight: bold;',
        `malformed message id: '${msgid.id}' found`
      );
      return null;
    }

    const WiredText = this.WithState(Text, messages => {
      const hashedMsgId = `nabuMessage@${crypto.sha256(msgid.id)}`;
      const msg = messages.get(hashedMsgId);

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
        <WiredText
          msgid={msgid.id}
          description={msgid.description}
          {...other}
        />
      </Connect>
    );
  }
}

export default Widget.Wired(T)('nabu');
