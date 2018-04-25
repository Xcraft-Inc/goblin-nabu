'use strict';
import Widget from 'laboratory/widget';
import React from 'react';
import Text from 'nabu/text/widget';

class T extends Widget {
  static get wiring() {
    return {
      id: 'id',
    };
  }

  render() {
    const {id, msgid, ...other} = this.props;
    if (!id) {
      return null;
    }
    if (
      !msgid ||
      typeof msgid !== 'string' ||
      (typeof msgid === 'string' && msgid.length === 0)
    ) {
      console.warn(
        '%cNabu Warning',
        'font-weight: bold;',
        `malformed message id: '${msgid}' found`
      );
      return null;
    }
    const WiredText = this.WithState(Text, messages => {
      const msg = messages.get(msgid);
      console.dir(msg);
      return {
        message: msg ? msg : null,
      };
    })('.messages');
    return <WiredText msgid={msgid} {...other} />;
  }
}

export default Widget.Wired(T)('nabu');
