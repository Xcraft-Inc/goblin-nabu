import React from 'react';

import Container from 'gadgets/container/widget';
import Field from 'gadgets/field/widget';

function renderRow(props) {
  return (
    <Container kind="row">
      <Field kind="label" grow="1" labelWidth="0px" model=".nabuId" />
      <Field model=".description" grow="1" labelWidth="0px" />
    </Container>
  );
}

/******************************************************************************/
export default {
  row: renderRow,
};
