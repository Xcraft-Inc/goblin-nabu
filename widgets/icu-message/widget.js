//T:2019-04-11

import React from 'react';
import Widget from 'goblin-laboratory/widgets/widget';
import Container from 'goblin-gadgets/widgets/container/widget';

import Label from 'goblin-gadgets/widgets/label/widget';

const T = require('goblin-nabu/widgets/helpers/t.js');
const {formatMessage, parseParameters} = require('goblin-nabu/lib/format.js');

class IcuMessage extends Widget {
  constructor() {
    super(...arguments);

    this.parseTranslation = this.parseTranslation.bind(this);
    this.getFormattedText = this.getFormattedText.bind(this);
    this.getIcuError = this.getIcuError.bind(this);
  }

  parseTranslation() {
    try {
      return formatMessage(
        this.props.locale,
        false,
        this.props.translation,
        this.props.originalIcuParameters.toJS()
      );
    } catch (err) {
      throw err.message || err;
    }
  }

  getFormattedText() {
    try {
      return this.parseTranslation();
    } catch (err) {
      return null;
    }
  }

  getIcuError() {
    try {
      this.parseTranslation();

      // No icu error, then check for missmatching parameters
      const missmatchingParameters = parseParameters(
        this.props.translation
      ).parameters.filter(
        (translationParameter) =>
          !this.props.originalIcuParameters.has(translationParameter)
      );

      if (missmatchingParameters.length > 0) {
        return (
          'The following parameters do not exist in the original nabu id: ' +
          missmatchingParameters.join(', ')
        );
      }

      return null;
    } catch (err) {
      return err;
    }
  }

  render() {
    return (
      <Container className={this.styles.classNames.container}>
        {this.props.originalIcuParameters &&
        this.props.originalIcuParameters.size > 0 ? (
          <Container className={this.styles.classNames.element}>
            <Label
              text={T('Result')}
              className={this.styles.classNames.label}
            />
            <Label
              text={this.getFormattedText()}
              className={this.styles.classNames.input}
            />
          </Container>
        ) : null}
        <Label
          text={this.getIcuError()}
          className={this.styles.classNames.errorElement}
        />
      </Container>
    );
  }
}

export default Widget.connect((state, props) => {
  return {
    translation: state.get(`backend.${props.translationId}.text`),
  };
})(IcuMessage);
