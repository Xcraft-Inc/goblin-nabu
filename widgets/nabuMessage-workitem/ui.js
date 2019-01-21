import React from 'react';
import Widget from 'laboratory/widget';
import Form from 'laboratory/form';

import Container from 'gadgets/container/widget';
import Field from 'gadgets/field/widget';
import TranslationFieldConnected from '../nabuWidgets/translationField';

/******************************************************************************/
class NabuMessage extends Form {
  constructor() {
    super(...arguments);
  }

  static get wiring() {
    return {
      id: 'id',
    };
  }

  render() {
    const {locales} = this.props;
    const Form = this.Form;

    if (!this.props.entityId) {
      return <div>No entity Id in props</div>;
    }

    return (
      <Container kind="column">
        <Container kind="pane">
          <Form {...this.formConfig} model={`backend.${this.props.entityId}`}>
            <Container kind="row-pane">
              <Field kind="title" grow="1" model={`.nabuId`} />
            </Container>
            <Container kind="row-pane">
              <Field
                width={this.props.width || '600px'}
                labelText="Description"
                model=".description"
                readonly={true}
                spacing="compact"
              />
            </Container>
          </Form>

          {locales.map(l => {
            const translationId = `nabuTranslation@${l.get('name')}-${
              this.props.entityId.split('@')[1]
            }`;

            return (
              <Container kind="row" key={translationId}>
                <TranslationFieldConnected
                  translationId={translationId}
                  id={translationId}
                  labelText={l.get('name')}
                  verticalSpacing="5px"
                  width={this.props.width || '600px'}
                  rows="5"
                />
              </Container>
            );
          })}
        </Container>
      </Container>
    );
  }
}

const NabuMessageConnected = Widget.connect(state => ({
  locales: state.get(`backend.nabu.locales`),
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
