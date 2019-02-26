import React from 'react';

import Field from 'gadgets/field/widget';
import T from 't';
import {InfoLabel, HighlightLabel} from './labels';
import TranslationFieldConnected from '../helpers/translation-field';
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
      <HighlightLabel id={id} datagridId={datagrid.props.id} />
      <InfoLabel id={id} checkDescription="true" spacing="overlap" />
    </div>
  );
}

function renderLocaleRowCell(id, locale, datagrid) {
  if (locale) {
    const translationId = computeTranslationId(id, locale);

    return (
      <div
        style={{
          borderBottom: 'solid thin #c1d1e0',
          width: '280px',
        }}
      >
        <TranslationFieldConnected
          translationId={translationId}
          component={datagrid}
          msgId={id}
          labelWidth="0px"
          spacing="compact"
        />
      </div>
    );
  }

  return <div />;
}

// ------------------------------------------------------------

function renderRowCell(props) {
  switch (props.column.get('name')) {
    case 'missingTranslations':
      return renderMissingTranslationsRowCell(props.id, props);
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
