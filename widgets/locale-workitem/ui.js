//T:2019-02-27

import T from 't';
import React from 'react';

import Container from 'gadgets/container/widget';
import Field from 'gadgets/field/widget';
import Label from 'gadgets/label/widget';

function renderPanel(props) {
  return (
    <Container kind="column" grow="1">
      <Container kind="pane">
        <Container kind="row-pane">
          <Label text={T('Locale')} grow="1" kind="title" />
        </Container>

        <Container kind="column">
          <Field grow="1" labelText={T('Nom')} model=".name" />
        </Container>
      </Container>
    </Container>
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
