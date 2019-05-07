//T:2019-04-11

import React from 'react';
import Widget from 'laboratory/widget';
import Container from 'gadgets/container/widget';

import Label from 'gadgets/label/widget';

const T = require('goblin-nabu/widgets/helpers/t.js');
const formatMessage = require('goblin-nabu/lib/format.js');
const parse = require('format-message-parse');

class IcuMessage extends Widget {
  constructor() {
    super(...arguments);

    this.setValue = this.setValue.bind(this);
    this.setIcu = this.setIcu.bind(this);
    this.parseParameters = this.parseParameters.bind(this);
    this.parameterPanel = this.parameterPanel.bind(this);
    this.parameterArea = this.parameterArea.bind(this);

    this.state = {
      formattedText: '',
      parameters: [],
      error: '',
    };
  }

  static get wiring() {
    return {
      translation: 'translation',
    };
  }

  setValue(key, value) {
    let parameters = this.state.parameters;
    parameters[key] = value;

    this.setState({parameters: parameters});
    this.setIcu(parameters);
  }

  setIcu() {
    const paramState = this.state.parameters;

    let paramString = '{';
    Object.keys(paramState).forEach((param, index) => {
      if (index !== 0) {
        paramString += `, `;
      }
      paramString += `"${param}":"${paramState[param]}"`;
    });
    paramString += '}';

    try {
      const formatParams = JSON.parse(paramString);
      const formattedMex = formatMessage(
        this.props.locale,
        false,
        this.props.translation,
        formatParams
      );
      this.setState({formattedText: formattedMex, error: ''});
    } catch (err) {
      this.setState({error: err.message});
    }
  }

  parseParameters() {
    let tokens = [];
    parse(this.props.translation, {tagsType: null, tokens: tokens});

    let parameters = [];
    tokens.forEach(token => {
      if (token[0] === 'id') {
        parameters[token[1]] = '';
      }
    });

    this.setState({parameters: parameters});
  }

  componentDidMount() {
    this.parseParameters();
  }

  parameterPanel(paramKey, index) {
    return (
      <Container key={index} className={this.styles.classNames.element}>
        <Label text={paramKey} className={this.styles.classNames.label} />
        <input
          type="text"
          onChange={event => this.setValue(paramKey, event.target.value)}
          value={this.state.parameters[paramKey]}
          className={this.styles.classNames.input}
        />
      </Container>
    );
  }

  parameterArea() {
    return Object.keys(this.state.parameters).map((paramKey, index) => {
      return this.parameterPanel(paramKey, index);
    });
  }

  render() {
    return (
      <Container className={this.styles.classNames.container}>
        {this.parameterArea()}
        <Container className={this.styles.classNames.element}>
          <Label text={T('Result')} className={this.styles.classNames.label} />
          <Label
            text={this.state.formattedText}
            className={this.styles.classNames.input}
          />
        </Container>
        {this.state.error !== '' ? (
          <Label
            text={this.state.error}
            className={this.styles.classNames.errorElement}
          />
        ) : null}
      </Container>
    );
  }
}

export default IcuMessage;
