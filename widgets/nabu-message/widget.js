//T:2019-02-27

import T from 't';
import React from 'react';
import Widget from 'goblin-laboratory/widgets/widget';
import Form from 'goblin-laboratory/widgets/form';

import Container from 'goblin-gadgets/widgets/container/widget';
import Label from 'goblin-gadgets/widgets/label/widget';
import Button from 'goblin-gadgets/widgets/button/widget';
import TranslationFieldConnected from 'goblin-nabu/widgets/translation-field/widget';
const {computeTranslationId} = require('goblin-nabu/lib/helpers.js');

class NabuMessage extends Form {
  constructor() {
    super(...arguments);

    this.renderTranslations = this.renderTranslations.bind(this);
    this.renderSources = this.renderSources.bind(this);

    this.renderIcuParameters = this.renderIcuParameters.bind(this);
    this.renderIcuParameter = this.renderIcuParameter.bind(this);

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
              icuParameters={this.props.icuParameters}
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

  renderIcuParameter(paramKey) {
    return (
      <Container key={paramKey} className={this.styles.classNames.element}>
        <Label text={paramKey} className={this.styles.classNames.label} />
        <input
          type="text"
          onChange={(event) =>
            this.doFor(this.props.id, 'changeIcuParameter', {
              parameterName: paramKey,
              value: event.target.value,
            })
          }
          value={this.props.icuParameters.get(paramKey)}
          className={this.styles.classNames.input}
        />
      </Container>
    );
  }

  renderIcuParameters() {
    const {icuParameters, nabuIdIcuError} = this.props;

    return (
      <Container>
        <Label
          text={T(`ICU parameters`)}
          className={this.styles.classNames.header}
        />
        {Object.keys(icuParameters.toJS()).map((icuParameterName) => {
          return this.renderIcuParameter(icuParameterName);
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
        <Container className={this.styles.classNames.content}>
          <Container className={this.styles.classNames.halfContent}>
            {this.renderTranslations()}
          </Container>
          <Container className={this.styles.classNames.halfContent}>
            {this.renderIcuParameters()}
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
  icuParameters: state.get(`backend.${props.id}.icuParameters`),
  nabuIdIcuError: state.get(`backend.${props.id}.nabuIdIcuError`),
}))(NabuMessage);
