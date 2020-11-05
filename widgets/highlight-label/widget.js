//T:2019-02-27

import React from 'react';
import Label from 'goblin-gadgets/widgets/label/widget';
import Widget from 'goblin-laboratory/widgets/widget';

class HighlightLabel extends Widget {
  constructor() {
    super(...arguments);

    this.evaluateText = this.evaluateText.bind(this);
    this.shrinkText = this.shrinkText.bind(this);
  }

  evaluateText() {
    let text = undefined;
    const {id, message, highlight} = this.props;
    if (highlight) {
      if (highlight.get(id)) {
        const highLightSearch = highlight.get(id).get('auto');
        if (highLightSearch) {
          text = highLightSearch;
        }
      }
    }
    if (!text) {
      const nabuId = message.get('nabuId');
      const translation = message.get('text');
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
