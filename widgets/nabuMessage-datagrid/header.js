import React from 'react';
import Widget from 'laboratory/widget';

import Label from 'gadgets/label/widget';
import HeaderComboConnected from '../nabuWidgets/headerCombo';

// ------------------------------------------------------------

function renderMissingTranslationsHeaderCell() {
  return <div />;
}

function renderNabuIdHeaderCell() {
  return <Label spacing="compact" text={Widget.T('Message original')} />;
}

function renderLocaleHeaderCell(id, index, doAsDatagrid) {
  return (
    <HeaderComboConnected id={id} index={index} doAsDatagrid={doAsDatagrid} />
  );
}

// ------------------------------------------------------------

function renderHeaderCell(props) {
  switch (props.column.get('name')) {
    case 'missingTranslations':
      return renderMissingTranslationsHeaderCell();
    case 'nabuId':
      return renderNabuIdHeaderCell();
    case 'locale_1':
    case 'locale_2':
      return renderLocaleHeaderCell(props.id, props.index, props.doAsDatagrid);
    default:
      return <div />;
  }
}

export default {renderHeaderCell: renderHeaderCell};
