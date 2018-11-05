import React from 'react';
import Widget from 'laboratory/widget';

import Field from 'gadgets/field/widget';
import Connect from 'laboratory/connect';
import Label from 'gadgets/label/widget';
import TextFieldCombo from 'gadgets/text-field-combo/widget';

// ------------------------------------------------------------
class HeaderCombo extends Widget {
  render() {
    const {locales, index, doAsDatagrid} = this.props;
    const localesList = locales
      .map(l => 'translations.' + l.get('name'))
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
      />
    );
  }
}

function renderMissingTranslationsHeaderCell() {
  return <div />;
}

function renderNabuIdHeaderCell() {
  return (
    <Label
      spacing="overlap"
      text={{
        nabuId: 'Message original',
      }}
    />
  );
}

function renderLocaleHeaderCell(id, index, doAsDatagrid) {
  return (
    <Connect locales={state => state.get(`backend.nabu.locales`)}>
      <HeaderCombo index={index} doAsDatagrid={doAsDatagrid} />
    </Connect>
  );
}

// ------------------------------------------------------------

function renderMissingTranslationsRowCell(id) {
  return (
    <Connect
      glyph={state => {
        const message = state.get(`backend.${id}`);
        const locales = state.get(`backend.nabu.locales`);

        if (message) {
          return locales
            .map(l => message.get(`translations.${l.get('name')}`))
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
            return desc && desc !== '' ? 'regular/info-circle' : null;
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

function setFocus(msgId, value, datagrid) {
  datagrid.doFor('nabu', 'set-focus', {messageId: msgId, value});
}

function renderLocaleRowCell(id, field, datagrid) {
  if (field !== '') {
    return (
      <Field
        model={`.${field}`}
        grow="1"
        labelWidth="0px"
        onFocus={() => setFocus(id, true, datagrid)}
        onBlur={() => setFocus(id, false, datagrid)}
      />
    );
  } else {
    return <div />;
  }
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

function renderRowCell(props) {
  switch (props.column.get('name')) {
    case 'missingTranslations':
      return renderMissingTranslationsRowCell(props.id);
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

/******************************************************************************/
export default {
  headerCell: renderHeaderCell,
  rowCell: renderRowCell,
};
