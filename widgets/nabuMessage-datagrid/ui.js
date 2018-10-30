import React from 'react';

import Field from 'gadgets/field/widget';
import Connect from 'laboratory/connect';
import Label from 'gadgets/label/widget';

function renderMissingTranslationsRowCell(id) {
  return (
    <Connect
      glyph={state => {
        const message = state.get(`backend.${id}`);
        const locales = state.get(`backend.nabu.locales`);

        if (message) {
          return locales
            .map(l => message.get(l.get('name')))
            .some(translation => translation == undefined || translation === '')
            ? 'solid/exclamation-triangle'
            : null;
        }
      }}
    >
      <Label
        spacing="overlap"
        tooltip={{
          id: "Certaines locales n'ont pas encore été traduites",
          description: 'In Nabu window',
        }}
      />
    </Connect>
  );
}

function renderNabuIdRowCell(id) {
  return (
    <div style={{display: 'flex'}}>
      <Field kind="label" grow="1" labelWidth="0px" model={`.nabuId`} />
      <Connect
        glyph={state => {
          const message = state.get(`backend.${id}`);

          if (message) {
            const desc = message.get('description');
            return desc && desc !== ''
              ? 'solid/info' // not contained in standard icons
              : null;
          }
        }}
        tooltip={state => {
          const message = state.get(`backend.${id}`);

          if (message) {
            return message.get('description');
          }
        }}
      >
        <Label spacing="overlap" />
      </Connect>
    </div>
  );
}

function renderLocaleRowCell(id, field) {
  return <Field model={`.${field}`} grow="1" labelWidth="0px" />;
}

function renderRowCell(props) {
  switch (props.column.get('name')) {
    case 'missingTranslations':
      return renderMissingTranslationsRowCell(props.id);
    case 'nabuId':
      return renderNabuIdRowCell(props.id);
    case 'locale_1':
    case 'locale_2':
      return renderLocaleRowCell(props.id, props.column.get('field'));
    default:
      return <div />;
  }
}

/******************************************************************************/
export default {
  rowCell: renderRowCell,
};
