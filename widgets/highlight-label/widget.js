//T:2019-02-27

import React from 'react';
import Label from 'goblin-gadgets/widgets/label/widget';
import Widget from 'laboratory/widget';
import * as styles from './styles';

class HighlightLabel extends Widget {
  constructor() {
    super(...arguments);
    this.styles = styles;

    this.evaluateText = this.evaluateText.bind(this);
    this.shrinkText = this.shrinkText.bind(this);
  }

  evaluateText() {
    let text = this.props.highlight
      ? this.props.highlight.get(this.props.id)
      : undefined;
    if (!text) {
      const nabuId = this.props.message.get('nabuId');
      const translation = this.props.message.get('text');
      text = nabuId || translation;
    }

    return text;
  }

  shrinkText(text) {
    let oneLineText =
      text !== undefined ? text.replace(new RegExp('\n', 'g'), ' ') : text;
    if (text !== undefined && oneLineText.length > 40) {
      oneLineText = `${oneLineText.substring(0, 40)}...`;
    }

    return oneLineText;
  }

  render() {
    const text = this.evaluateText();
    const oneLineText = this.shrinkText(text);

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

  return {
    highlight,
    message,
  };
})(HighlightLabel);
