//T:2019-04-11

import React from 'react';
import Widget from 'laboratory/widget';
import Container from 'gadgets/container/widget';

import Label from 'gadgets/label/widget';
import Button from 'gadgets/button/widget';

const T = require('goblin-nabu/widgets/helpers/t.js');
const formatMessage = require('goblin-nabu/lib/format.js');

class IcuMessage extends Widget {
  constructor() {
    super(...arguments);

    this.setKey = this.setKey.bind(this);
    this.setValue = this.setValue.bind(this);
    this.setIcu = this.setIcu.bind(this);

    this.state = {
      formattedText: '',
      parameterKey: '',
      parameterValue: '',
    };
  }

  setKey(value) {
    this.setState({parameterKey: value});
    this.setIcu(value, this.state.parameterValue);
  }

  setValue(value) {
    this.setState({parameterValue: value});
    this.setIcu(this.state.parameterKey, value);
  }

  setIcu(parameterKey, parameterValue) {
    var parse = require('format-message-parse');
    var tokens = [];
    var pattern = this.props.translation;
    const ast = parse(pattern, {
      tagsType: null,
      tokens: tokens,
    });
    console.log(ast);

    const formatParams = JSON.parse(`{"${parameterKey}":${parameterValue}}`);

    const formattedMex = formatMessage(
      this.props.locale,
      false,
      this.props.translation,
      formatParams
    );

    this.setState({formattedText: formattedMex});
  }

  render() {
    return (
      <Container className={this.styles.classNames.container}>
        <Container className={this.styles.classNames.element}>
          <Label text={T('Key')} className={this.styles.classNames.label} />
          <input
            type="text"
            onChange={event => this.setKey(event.target.value)}
            value={this.state.parameterKey}
            className={this.styles.classNames.input}
          />
        </Container>

        <Container className={this.styles.classNames.element}>
          <Label text={T('Value')} className={this.styles.classNames.label} />
          <input
            type="text"
            onChange={event => this.setValue(event.target.value)}
            value={this.state.parameterValue}
            className={this.styles.classNames.input}
          />
        </Container>

        <Container className={this.styles.classNames.element}>
          <Label text={T('Result')} className={this.styles.classNames.label} />
          <Label
            text={this.state.formattedText}
            className={this.styles.classNames.input}
          />
        </Container>
      </Container>
    );
  }
}

export default IcuMessage;
