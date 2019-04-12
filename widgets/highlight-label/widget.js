//T:2019-02-27

import React from 'react';
import Label from 'gadgets/label/widget';
import Widget from 'laboratory/widget';

class HighlightLabel extends Widget {
  constructor() {
    super(...arguments);
  }

  render() {
    const text = this.props.text;
    const oneLineText =
      text !== undefined ? text.replace(new RegExp('\n', 'g'), ' ') : text;

    return (
      <Label
        {...this.props}
        tooltip={text}
        text={oneLineText}
        className={
          this.props.underline && this.props.underline === true
            ? this.styles.classNames.highlight
            : undefined
        }
      />
    );
  }
}

export default Widget.connect((state, props) => {
  const highlight = state.get(`backend.list@${props.datagridId}.highlights`);
  const message = state.get(`backend.${props.id}`);

  let text = highlight ? highlight.get(props.id) : undefined;
  if (!text) {
    const nabuId = message.get('nabuId');
    const translation = message.get('text');
    text = nabuId || translation;
  }

  return {
    text,
  };
})(HighlightLabel);
