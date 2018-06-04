'use strict';
import Widget from 'laboratory/widget';
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
      const msg = messages.get(msgid);
      return {
        message: msg ? msg : null,
      };
    })('.messages');
    return <WiredText msgid={msgid} {...other} />;
  }
}

export default Widget.Wired(T)('nabu');
