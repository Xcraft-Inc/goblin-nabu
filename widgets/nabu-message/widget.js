//T:2019-02-27

import T from 't';
import React from 'react';
import Widget from 'laboratory/widget';
import Form from 'laboratory/form';

import Container from 'gadgets/container/widget';
import Label from 'gadgets/label/widget';
import Button from 'gadgets/button/widget';
import TranslationFieldConnected from '../translation-field/widget.js';
const {computeTranslationId} = require('goblin-nabu/lib/helpers.js');

class NabuMessage extends Form {
  constructor() {
    super(...arguments);

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
    this.copyTextToClipboard(nabuId);
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
        {locales.map(l => {
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
              verticalSpacing="5px"
              width="100%"
              rows="5"
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
        {this.renderTranslations()}
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
