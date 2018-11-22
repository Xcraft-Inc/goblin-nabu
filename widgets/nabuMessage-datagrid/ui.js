import React from 'react';
import Widget from 'laboratory/widget';

import Field from 'gadgets/field/widget';
import Label from 'gadgets/label/widget';
import TextFieldCombo from 'gadgets/text-field-combo/widget';
import Container from 'gadgets/container/widget';

import TranslationFieldConnected from './TranslationField';

const LabelConnected = Widget.connect((state, props) => {
  const message = state.get(`backend.${props.id}`);
  //const locales = state.get(`backend.nabu.locales`);

  let glyph = null;
  let tooltip = null;

  if (message) {
    if (props.checkDescription) {
      // Description label
      const desc = message.get('description');
      if (desc) {
        glyph = 'regular/info-circle';
        tooltip = desc;
      }
    } /*else if (
      locales // Missing translations label
        .map (l => message.get (`translations.${l.get ('name')}`))
        .some (translation => !translation)
    ) {
      glyph = 'solid/exclamation-triangle';
      tooltip = props.tooltip;
    }*/
  }

  return {
    glyph,
    tooltip,
  };
})(Label);

// ------------------------------------------------------------

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

const HeaderComboConnected = Widget.connect(state => {
  return {
    locales: state.get(`backend.nabu.locales`),
  };
})(HeaderCombo);

function renderMissingTranslationsHeaderCell() {
  return <div />;
}

function renderNabuIdHeaderCell() {
  return <Label spacing="overlap" text={Widget.T('Message original')} />;
}

function renderLocaleHeaderCell(id, index, doAsDatagrid) {
  return <HeaderComboConnected index={index} doAsDatagrid={doAsDatagrid} />;
}

// ------------------------------------------------------------

function renderMissingTranslationsRowCell(id) {
  return (
    <LabelConnected
      id={id}
      spacing="overlap"
      tooltip={Widget.T(
        "Certaines locales n'ont pas encore été traduites",
        'In Nabu window'
      )}
    />
  );
}

function renderNabuIdRowCell(id) {
  return (
    <div style={{display: 'flex'}}>
      <Field kind="label" grow="1" labelWidth="0px" model={`.nabuId`} />
      <LabelConnected id={id} checkDescription="true" spacing="overlap" />
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
      />
    );
  }

  return <div />;
}

// ------------------------------------------------------------

function renderLocaleFilterCell(doAsDatagrid, field) {
  return (
    <Field
      model={`.filters.${field}`}
      grow="1"
      labelWidth="0px"
      onDebouncedChange={value =>
        doAsDatagrid('applyCustomVisualization', {field, value})
      }
      hintText={`Search on ${field}`}
    />
  );
}

// ------------------------------------------------------------

const SortConnected = Widget.connect((state, props) => {
  const key = state.get(`backend.${props.id}.sort.key`);
  const dir = state.get(`backend.${props.id}.sort.dir`);

  let glyph = 'solid/sort';
  let tooltip = null;

  if (key === props.column.get('field')) {
    if (dir === 'asc') {
      glyph = 'solid/sort-alpha-up';
      tooltip = props.tooltips.asc;
    } else {
      glyph = 'solid/sort-alpha-down';
      tooltip = props.tooltips.desc;
    }
  }

  return {glyph: glyph, tooltip: tooltip};
})(Label);

const tooltips = {
  asc: Widget.T('ascending order'),
  desc: Widget.T('descending order'),
};

function renderLocaleSortCell(doAsDatagrid, column, datagridId) {
  return (
    <SortConnected
      tooltips={tooltips}
      id={datagridId}
      column={column}
      onClick={() =>
        doAsDatagrid('applyCustomVisualization', {
          field: column.get('field'),
        })
      }
      spacing="overlap"
    />
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

function renderFilterCell(props) {
  switch (props.column.get('name')) {
    case 'nabuId':
    case 'locale_1':
    case 'locale_2':
      return renderLocaleFilterCell(
        props.doAsDatagrid,
        props.column.get('field')
      );
    default:
      return <div />;
  }
}

function renderSortCell(props) {
  switch (props.column.get('name')) {
    case 'nabuId':
    case 'locale_1':
    case 'locale_2':
      return renderLocaleSortCell(
        props.doAsDatagrid,
        props.column,
        props.datagrid.props.id
      );
    default:
      return <div />;
  }
}

/******************************************************************************/
export default {
  headerCell: renderHeaderCell,
  rowCell: renderRowCell,
  filterCell: renderFilterCell,
  sortCell: renderSortCell,
};
