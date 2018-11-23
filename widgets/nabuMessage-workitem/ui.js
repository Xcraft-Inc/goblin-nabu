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

    return (
      <Container kind="column">
        <Container kind="pane">
          <Form {...this.formConfig}>
            <Container kind="row-pane">
              <Field kind="label" grow="1" labelWidth="0px" model={`.nabuId`} />
            </Container>
            <Container kind="row-pane">
              <Field
                labelText="Description"
                model=".description"
                readonly={true}
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
                  width="600px"
                  multiline="true"
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
  return (
    <NabuMessageConnected
      entityId={props.entityId}
      id={props.id}
      do={props.do}
    />
  );
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
