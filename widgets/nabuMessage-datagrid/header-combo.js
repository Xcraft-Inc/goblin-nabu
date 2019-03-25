//T:2019-02-27
import React from 'react';
import Widget from 'laboratory/widget';

import TextFieldCombo from 'gadgets/text-field-combo/widget';

const {GlyphHelpers} = require('goblin-toolbox');

class HeaderCombo extends Widget {
  render() {
    const {locales, index, hasTranslation, doAsDatagrid} = this.props;
    const localesList = locales
      .map(l => {
        const localName = l.get('name');
        return {
          glyph:
            hasTranslation && hasTranslation.get(`${localName}`)
              ? GlyphHelpers.getComboGlyph('desk', 'warning')
              : '',
          text: localName,
        };
      })
      .toJS();

    return (
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
        onShowCombo={_ => {
          doAsDatagrid('setNeedTranslation');
        }}
        width={this.props.width}
      />
    );
  }
}

export default Widget.connect((state, props) => {
  return {
    locales: state.get(`backend.nabu.locales`),
    hasTranslation: state.get(`backend.${props.id}`).get('hasTranslations'),
  };
})(HeaderCombo);
