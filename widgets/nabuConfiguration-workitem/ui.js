import React from 'react';
import Widget from 'laboratory/widget';

import Container from 'gadgets/container/widget';
import Field from 'gadgets/field/widget';

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
          <Field
            kind="combo"
            fieldWidth="200px"
            labelText={Widget.T('Locale')}
            tooltip={Widget.T('Choose your default locale')}
            list={locales
              .map(l => ({value: l.get('id'), text: l.get('name')}))
              .toJS()}
            comboReadonly="true"
            model=".localeId"
            onChange={localeId => self.props.do('setLocale', {localeId})}
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
