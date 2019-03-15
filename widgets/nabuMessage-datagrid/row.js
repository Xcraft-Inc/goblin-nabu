import React from 'react';

import T from 't';
import {InfoLabel} from './labels';
import TranslationFieldConnected from '../translation-field/widget.js';
import HighlightLabel from '../highlight-label/widget.js';
import Button from 'gadgets/button/widget';
const {computeTranslationId} = require('goblin-nabu/lib/helpers.js');

// ------------------------------------------------------------

function renderMissingTranslationsRowCell(id, props) {
  return (
    <InfoLabel
      id={id}
      spacing="overlap"
      tooltip={T(
        "Certaines locales n'ont pas encore été traduites",
        'In Nabu window'
      )}
      locale1={props.columns.get('2').get('field')}
      locale2={props.columns.get('3').get('field')}
    />
  );
}

function renderNabuIdRowCell(id, datagrid) {
  return (
    <div style={{display: 'flex'}}>
      <HighlightLabel
        id={id}
        datagridId={datagrid.props.id}
        underline="false"
      />
      <InfoLabel id={id} checkDescription="true" spacing="overlap" />
    </div>
  );
}

function renderLocaleRowCell(id, locale, datagrid) {
  if (locale) {
    const translationId = computeTranslationId(id, locale);

    return (
      <TranslationFieldConnected
        translationId={translationId}
        component={datagrid}
        msgId={id}
        labelWidth="0px"
        spacing="compact"
      />
    );
  }

  return <div />;
}

function renderOpenExternRowCell(id, doAsDatagrid) {
  return (
    <Button
      glyph="solid/pencil"
      tooltipText="Open single translation"
      onClick={() => doAsDatagrid('openSingleEntity', {entityId: id})}
    />
  );
}

// ------------------------------------------------------------

function renderRowCell(props) {
  switch (props.column.get('name')) {
    case 'missingTranslations':
      return renderMissingTranslationsRowCell(props.id, props);
    case 'openExtern':
      return renderOpenExternRowCell(props.id, props.doAsDatagrid);
    case 'nabuId':
      return renderNabuIdRowCell(props.id, props.datagrid);
    case 'locale_1':
    case 'locale_2':
      return renderLocaleRowCell(
        props.id,
        props.column.get('field'),
        props.datagrid
      );
    default:
      return <div />;
  }
}

export default {renderRowCell: renderRowCell};
