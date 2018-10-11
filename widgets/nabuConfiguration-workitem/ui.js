import React from 'react';

import Container from 'gadgets/container/widget';
import Field from 'gadgets/field/widget';

/******************************************************************************/

function renderPanel(props) {
  return (
    <Container kind="column">
      <Container kind="pane">
        <Field
          kind="combo-ids"
          model=".locales"
          targetModel=".selectedLocaleId"
          labelText="Langue"
          onChange={localeId => props.do('setLocale', {localeId})}
        />
      </Container>
    </Container>
  );
}

function renderReadonly(props) {
  return <Container kind="row" />;
}

function renderExtend(props) {
  return <Container kind="column" />;
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
