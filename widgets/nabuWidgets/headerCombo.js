import React from 'react';
import Widget from 'laboratory/widget';

import TextFieldCombo from 'gadgets/text-field-combo/widget';
import Container from 'gadgets/container/widget';

class HeaderCombo extends Widget {
  render() {
    const {locales, index, doAsDatagrid} = this.props;
    const localesList = locales.map(l => l.get('name')).toJS();

    return (
      <Container kind="row">
        <TextFieldCombo
          model={`.columns[${index}].field`}
          readonly="true"
          grow="1"
          list={localesList}
          menuType="wrap"
          defaultValue={''}
          comboTextTransform="none"
          onSetText={locale => {
            doAsDatagrid('changeSelectedLocale', {index, locale});
          }}
        />
      </Container>
    );
  }
}

export default Widget.connect(state => {
  return {
    locales: state.get(`backend.nabu.locales`),
  };
})(HeaderCombo);
