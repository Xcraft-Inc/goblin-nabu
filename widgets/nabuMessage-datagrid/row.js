import React from 'react';
import Widget from 'laboratory/widget';

import Field from 'gadgets/field/widget';

const {InfoLabel} = require('./labels.js');
import TranslationFieldConnected from '../helpers/translation-field';

// ------------------------------------------------------------

function renderMissingTranslationsRowCell(id, props) {
  return (
    <InfoLabel
      id={id}
      spacing="overlap"
      tooltip={Widget.T(
        "Certaines locales n'ont pas encore été traduites",
        'In Nabu window'
      )}
      locale1={props.columns.get('2').get('field')}
      locale2={props.columns.get('3').get('field')}
    />
  );
}

function renderNabuIdRowCell(id) {
  return (
    <div style={{display: 'flex'}}>
      <Field kind="label" grow="1" labelWidth="0px" model={`.nabuId`} />
      <InfoLabel id={id} checkDescription="true" spacing="overlap" />
    </div>
  );
}

function renderLocaleRowCell(id, field, datagrid) {
  if (field) {
    const translationId = `nabuTranslation@${field}-${id.split('@')[1]}`;

    return (
      <TranslationFieldConnected
        translationId={translationId}
        datagrid={datagrid}
        msgId={id}
        labelWidth="0px"
        width="280px"
        spacing="compact"
      />
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
      return renderNabuIdRowCell(props.id);
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
