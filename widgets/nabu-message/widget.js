//T:2019-02-27

import T from 't';
import React from 'react';
import Widget from 'goblin-laboratory/widgets/widget';
import * as styles from './styles';
import Form from 'goblin-laboratory/widgets/form';

import Container from 'goblin-gadgets/widgets/container/widget';
import Label from 'goblin-gadgets/widgets/label/widget';
import Button from 'goblin-gadgets/widgets/button/widget';
import TextFieldNC from 'goblin-gadgets/widgets/text-field-nc/widget';
import TranslationFieldConnected from 'goblin-nabu/widgets/translation-field/widget';
const {computeTranslationId} = require('goblin-nabu/lib/helpers.js');

class IcuParameter extends Form {
  constructor() {
    super(...arguments);
    this.styles = styles;
  }

  render() {
    const {icuParameterName, icuParameterValue} = this.props;

    return (
      <Container
        key={icuParameterName}
        className={this.styles.classNames.icuParameter}
      >
        <Label
          text={icuParameterName}
          className={this.styles.classNames.label}
        />
        <TextFieldNC
          shape="smooth"
          value={icuParameterValue}
          onChange={(value) =>
            this.doFor(this.props.id, 'changeIcuParameter', {
              parameterName: icuParameterName,
              value: value,
            })
          }
          grow="1"
          className={this.styles.classNames.input}
        />
      </Container>
    );
  }
}

const ConnectedIcuParameter = Widget.connect((state, props) => ({
  icuParameterValue: state.get(
    `backend.${props.id}.icuParameters.${props.icuParameterName}`
  ),
}))(IcuParameter);

class IcuParameters extends Widget {
  constructor() {
    super(...arguments);
    this.styles = styles;
  }

  render() {
    const {id, icuParameters, nabuIdIcuError} = this.props;

    return (
      <Container>
        <Label
          text={T(`ICU parameters`)}
          className={this.styles.classNames.header}
        />
        {icuParameters.map((icuParameterName) => {
          return (
            <ConnectedIcuParameter
              id={id}
              key={icuParameterName}
              icuParameterName={icuParameterName}
            />
          );
        })}
        {nabuIdIcuError ? (
          <Label
            text={nabuIdIcuError}
            className={this.styles.classNames.errorElement}
          />
        ) : null}
      </Container>
    );
  }
}

const ConnectedIcuParameters = Widget.connect((state, props) => ({
  icuParameters: state.get(`backend.${props.id}.icuParameters`).keySeq(),
  nabuIdIcuError: state.get(`backend.${props.id}.nabuIdIcuError`),
}))(IcuParameters);

class NabuMessage extends Form {
  constructor() {
    super(...arguments);
    this.styles = styles;

    this.renderTranslations = this.renderTranslations.bind(this);
    this.renderSources = this.renderSources.bind(this);

    this.copyNabuIdToClipboard = this.copyNabuIdToClipboard.bind(this);
  }

  static get wiring() {
    return {
      id: 'id',
    };
  }

  copyNabuIdToClipboard() {
    const {nabuId} = this.props;
    Form.copyTextToClipboard(nabuId);
  }

  renderSources() {
    const {sources} = this.props;

    if (sources.size === 0) {
      return;
    }

    return (
      <Container>
        <Label text={T(`Sources`)} className={this.styles.classNames.header} />
        <Container className={this.styles.classNames.sources}>
          {sources.map((source, index) => {
            return (
              <Container
                key={`source_${index}`}
                className={this.styles.classNames.sourceInfo}
              >
                <span>
                  {source.get('path')
                    ? `${String.raw`${source.get('path')}`}:${source.getIn([
                        'location',
                        'start',
                        'line',
                      ])};${source.getIn(['location', 'start', 'column'])}`
                    : ''}
                </span>
                <Label
                  text={source.get(`description`)}
                  className={this.styles.classNames.bottomLine}
                />
              </Container>
            );
          })}
        </Container>
      </Container>
    );
  }

  renderTranslations() {
    const {locales} = this.props;

    return (
      <Container>
        <Label
          text={T(`Translations`)}
          className={this.styles.classNames.header}
        />
        {locales.map((l) => {
          const translationId = computeTranslationId(
            this.props.entityId,
            l.get('name')
          );

          return (
            <TranslationFieldConnected
              style={this.styles.classNames.translationField}
              key={translationId}
              translationId={translationId}
              labelText={l.get('text')}
              workitemId={this.props.id}
              verticalSpacing="5px"
              width="100%"
              rows={5}
              locale={l.get('name')}
              showIcuButton={true}
            />
          );
        })}
      </Container>
    );
  }

  render() {
    const {nabuId} = this.props;
    const Form = this.Form;

    if (!this.props.entityId) {
      return <Label text={T('No entity Id in props')} />;
    }

    return (
      <Container>
        <Form
          {...this.formConfigWithoutStyle}
          model={`backend.${this.props.entityId}`}
          className={this.styles.classNames.titleHeader}
        >
          <Label
            text={nabuId}
            className={this.styles.classNames.originalMessage}
          />
          <Button
            glyph="light/copy"
            tooltip={T('Copy to clipboard')}
            onClick={this.copyNabuIdToClipboard}
          />
        </Form>
        <Container className={this.styles.classNames.contentContainer}>
          <Container className={this.styles.classNames.translationsContainer}>
            {this.renderTranslations()}
          </Container>
          <Container className={this.styles.classNames.icuParametersContainer}>
            <ConnectedIcuParameters id={this.props.id} />
          </Container>
        </Container>
        {this.renderSources()}
      </Container>
    );
  }
}

export default Widget.connect((state, props) => ({
  nabuId: state.get(`backend.${props.entityId}.nabuId`),
  locales: state.get(`backend.nabu.locales`),
  sources: state.get(`backend.${props.entityId}.sources`),
}))(NabuMessage);
