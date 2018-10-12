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

    return (
      <Container kind="column">
        <Container kind="pane">
          <TextFieldCombo
            model=".localeId"
            readonly="true"
            grow="1"
            list={locales.toJS()}
            menuType="wrap"
            defaultValue={'-'}
            comboTextTransform="none"
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
  return <NabuConfigurationConnected id={this.props.id} do={this.props.do} />;
}

function renderReadonly(props) {
  return <Container kind="row" />;
}

function renderExtend(props) {
  return <NabuConfigurationConnected id={this.props.id} do={this.props.do} />;
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
