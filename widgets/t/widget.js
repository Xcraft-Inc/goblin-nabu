'use strict';

const {crypto} = require('xcraft-core-utils');
import Widget from 'laboratory/widget';
import Connect from 'laboratory/connect';
import React from 'react';
import Text from 'nabu/text/widget';

class T extends Widget {
  render() {
    const {id, msgid, ...other} = this.props;
    const self = this;

    if (typeof msgid === 'string') {
      return <span {...other}>{msgid}</span>;
    }

    if (!msgid) {
      return null;
    }

    if (msgid.id.length === 0) {
      console.warn(
        '%cNabu Warning',
        'font-weight: bold;',
        `malformed message id: '${msgid.id}' found`
      );
      return null;
    }

    const hashedMsgId = `nabuMessage@${crypto.sha256(msgid.id)}`;

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
        message={state => state.get(`backend.${hashedMsgId}`)}
      >
        <Text
          msgid={msgid.id}
          description={msgid.description}
          workitemId={self.getNearestId()}
          {...other}
        />
      </Connect>
    );
  }
}

export default T;
