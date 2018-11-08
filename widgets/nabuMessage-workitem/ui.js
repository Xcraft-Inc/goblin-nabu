import React from 'react';
import Widget from 'laboratory/widget';

import Container from 'gadgets/container/widget';
import Field from 'gadgets/field/widget';
import Label from 'gadgets/label/widget';

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
            return (
              <Field
                key={l.get('name')}
                grow="1"
                labelText={l.get('name')}
                model={`.translations.${l.get('name')}`}
              />
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
  return <NabuMessageConnected id={props.id} do={props.do} />;
}

function renderReadonly(props) {
  return <Container kind="row" grow="1" />;
}

function renderExtend(props) {
  return <Container kind="column" grow="1" />;
}

/******************************************************************************/
export default {
  panel: {
    readonly: renderPanel,
    edit: renderPanel,
  },
  plugin: {
    readonly: {
      compact: renderReadonly,
      extend: renderExtend,
    },
    edit: {
      compact: renderReadonly,
      extend: renderExtend,
    },
  },
};
