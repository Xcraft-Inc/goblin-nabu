//T:2019-02-27
import React from 'react';

import T from 't';
import {InfoLabel} from './labels';
import TranslationFieldConnected from '../translation-field/widget.js';
import HighlightLabel from '../highlight-label/widget.js';
import Button from 'gadgets/button/widget';
const {computeTranslationId} = require('goblin-nabu/lib/helpers.js');

// ------------------------------------------------------------

function renderMissingTranslationsRowCell(id, datagridId) {
  return (
    <InfoLabel
      messageId={id}
      datagridId={datagridId}
      spacing="overlap"
      tooltip={T(
        "Certaines locales n'ont pas encore été traduites",
        'In Nabu window'
      )}
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

function renderLocaleRowCell(id, locale, datagrid, onDrillDown) {
  if (locale) {
    const translationId = computeTranslationId(id, locale);

    return (
      <TranslationFieldConnected
        translationId={translationId}
        component={datagrid}
        onDrillDown={onDrillDown}
        msgId={id}
        locale={locale}
        labelWidth="0px"
        spacing="compact"
        width="200%"
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
      return renderMissingTranslationsRowCell(
        props.id,
        props.datagrid.props.id
      );
    case 'openExtern':
      return renderOpenExternRowCell(props.id, props.doAsDatagrid);
    case 'nabuId':
      return renderNabuIdRowCell(props.id, props.datagrid);
    case 'locale_1':
    case 'locale_2':
      return renderLocaleRowCell(
        props.id,
        props.column.get('field'),
        props.datagrid,
        props.onDrillDown
      );
    default:
      return <div />;
  }
}

export default {renderRowCell: renderRowCell};
