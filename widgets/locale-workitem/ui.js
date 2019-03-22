//T:2019-02-27

import T from 't';
import React from 'react';

import Widget from 'laboratory/widget';
import Container from 'gadgets/container/widget';
import Field from 'gadgets/field/widget';
import Label from 'gadgets/label/widget';

function renderName(status) {
  if (status === 'draft') {
    return <Field grow="1" labelText={T('Nom')} model=".name" />;
  } else {
    return <Field grow="1" readonly labelText={T('Nom')} model=".name" />;
  }
}

function renderComponent(props) {
  return (
    <Container kind="column" grow="1">
      <Container kind="pane">
        <Container kind="row-pane">
          <Label text={T('Locale')} grow="1" kind="title" />
        </Container>

        <Container kind="column">
          {renderName(props.status)}
          <Field grow="1" labelText={T('Description')} model=".description" />
        </Container>
      </Container>
    </Container>
  );
}

const renderPanel = Widget.connect((state, props) => {
  const locale = state
    .get(`backend.nabu.locales`)
    .find(locale => locale.get('id') === props.entityId);

  return {
    status: locale ? locale.get('meta.status') : 'draft',
  };
})(renderComponent);

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
