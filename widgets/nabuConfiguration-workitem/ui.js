import React from 'react';
import Widget from 'laboratory/widget';

import Container from 'gadgets/container/widget';
import TextFieldCombo from 'gadgets/text-field-combo/widget';

/******************************************************************************/

class NabuConfiguration extends Widget {
  constructor() {
    super(...arguments);
  }

  render() {
    const {locales} = this.props;
    const self = this;

    return (
      <Container kind="column">
        <Container kind="pane">
          <TextFieldCombo
            model=".localeId"
            readonly="true"
            grow="1"
            list={locales
              .map(l => ({value: l.get('id'), text: l.get('name')}))
              .toJS()}
            menuType="wrap"
            defaultValue={''}
            onSetText={localeId => self.props.do('setLocale', {localeId})}
          />
        </Container>
      </Container>
    );
  }
}

const NabuConfigurationConnected = Widget.connect((state, props) => ({
  locales: state.get(`backend.nabu.locales`),
}))(NabuConfiguration);

function renderPanel(props) {
  return <NabuConfigurationConnected id={props.id} do={props.do} />;
}

function renderReadonly(props) {
  return <Container kind="row" />;
}

function renderExtend(props) {
  return <NabuConfigurationConnected id={props.id} do={props.do} />;
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
