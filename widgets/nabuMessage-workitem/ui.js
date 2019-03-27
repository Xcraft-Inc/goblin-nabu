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

/******************************************************************************/
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

    return (
      <Container kind="column">
        {sources.map((source, index) => {
          return (
            <Container kind="pane" key={`source_${index}`}>
              <Container kind="row-pane">
                <Label
                  kind="title"
                  text={T(`Source {sourceNo}`, '', {sourceNo: index + 1})}
                />
              </Container>
              <Container kind="row-pane">
                <Label
                  text={
                    source.get('path')
                      ? `${source.get('path')}:${source.getIn([
                          'location',
                          'start',
                          'line',
                        ])};${source.getIn(['location', 'start', 'column'])}`
                      : ''
                  }
                />
              </Container>
              <Container kind="row-pane">
                <Label text={source.get(`description`)} />
              </Container>
            </Container>
          );
        })}
      </Container>
    );
  }

  renderTranslations() {
    const {locales} = this.props;

    return (
      <Container kind="column">
        {locales.map(l => {
          const translationId = computeTranslationId(
            this.props.entityId,
            l.get('name')
          );

          return (
            <Container kind="row" key={translationId}>
              <TranslationFieldConnected
                translationId={translationId}
                labelText={l.get('name')}
                verticalSpacing="5px"
                width={this.props.width || '600px'}
                rows="5"
              />
            </Container>
          );
        })}
      </Container>
    );
  }

  render() {
    const {nabuId} = this.props;
    const Form = this.Form;

    if (!this.props.entityId) {
      return (
        <div>
          <Label text={T('No entity Id in props')} />
        </div>
      );
    }

    return (
      <Container kind="column">
        <Form {...this.formConfig} model={`backend.${this.props.entityId}`}>
          <Container kind="row">
            <Label text={T('Message original')} width="80px" />
            <Button
              glyph="solid/copy"
              tooltip={T('Copy to clipboard')}
              onClick={this.copyNabuIdToClipboard}
            />
            <Label text={nabuId} />
          </Container>
        </Form>
        {this.renderTranslations()}
        {this.renderSources()}
      </Container>
    );
  }
}

const NabuMessageConnected = Widget.connect((state, props) => ({
  nabuId: state.get(`backend.${props.entityId}.nabuId`),
  locales: state.get(`backend.nabu.locales`),
  sources: state.get(`backend.${props.entityId}.sources`),
}))(NabuMessage);

function renderPanel(props) {
  return <NabuMessageConnected entityId={props.entityId} id={props.id} />;
}

/******************************************************************************/
export default {
  panel: {
    readonly: renderPanel,
    edit: renderPanel,
  },
  plugin: {
    readonly: {
      compact: renderPanel,
      extend: renderPanel,
    },
    edit: {
      compact: renderPanel,
      extend: renderPanel,
    },
  },
};
