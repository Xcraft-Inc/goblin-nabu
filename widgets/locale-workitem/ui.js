import React from 'react';

import Container from 'gadgets/container/widget';
import Field from 'gadgets/field/widget';
import Label from 'gadgets/label/widget';

function renderPanelReadonly(props) {
  return (
    <Container kind="column" grow="1">
      <Container kind="pane">
        <Container kind="row-pane">
          <Label text="Locale" grow="1" kind="title" />
        </Container>

        <Container kind="column">
          <Field grow="1" labelText="Nom" model=".name" />
        </Container>
      </Container>
    </Container>
  );
}

function renderPanelEdit(props) {
  return (
    <Container kind="column" grow="1">
      <Container kind="pane">
        <Container kind="row-pane">
          <Label text="Locale" grow="1" kind="title" />
        </Container>

        <Field grow="1" labelText="Nom" model=".name" />
      </Container>
    </Container>
  );
}

/******************************************************************************/
export default {
  panel: {
    readonly: renderPanelReadonly,
    edit: renderPanelEdit,
  },
  plugin: {
    readonly: {
      compact: renderPanelReadonly,
      extend: renderPanelEdit,
    },
    edit: {
      compact: renderPanelReadonly,
      extend: renderPanelEdit,
    },
  },
};
