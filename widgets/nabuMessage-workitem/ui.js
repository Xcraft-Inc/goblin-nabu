import React from 'react';
import Widget from 'laboratory/widget';

import Container from 'gadgets/container/widget';
import Field from 'gadgets/field/widget';
import TranslationFieldConnected from '../nabuMessage-datagrid/TranslationField';

/******************************************************************************/
class NabuMessage extends Widget {
  constructor() {
    super(...arguments);
  }

  render() {
    const {locales} = this.props;

    return (
      <Container kind="column">
        <Container kind="pane">
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
                  labelWidth="100px"
                />
              </Container>
            );
          })}
        </Container>
      </Container>
    );
  }
}

const NabuMessageConnected = Widget.connect((state, props) => ({
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
