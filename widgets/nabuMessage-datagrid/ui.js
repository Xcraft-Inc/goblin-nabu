import React from 'react';
import Widget from 'laboratory/widget';
import Form from 'laboratory/form';

import Field from 'gadgets/field/widget';
import Label from 'gadgets/label/widget';
import TextFieldCombo from 'gadgets/text-field-combo/widget';
import Container from 'gadgets/container/widget';

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
        .map(l => message.get(`translations.${l.get('name')}`))
        .some(translation => !translation)
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
class TranslationField extends Form {
  constructor() {
    super(...arguments);

    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
  }

  static get wiring() {
    return {
      id: 'id',
    };
  }

  onFocus() {
    this.props.datagrid.doFor('nabu', 'set-focus', {
      messageId: this.props.msgId,
      value: true,
    });
  }

  onBlur() {
    this.props.datagrid.doFor('nabu', 'set-focus', {
      messageId: this.props.msgId,
      value: false,
    });
  }

  render() {
    const {id} = this.props;

    if (!id) {
      return null;
    }

    const Form = this.Form;

    return (
      <Form {...this.formConfig}>
        <Field
          model={'.text'}
          grow="1"
          labelWidth="0px"
          verticalSpacing="compact"
          onFocus={this.onFocus}
          onBlur={this.onBlur}
        />
      </Form>
    );
  }
}

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
    const localeId = datagrid
      .getState()
      .backend.getIn(['nabu', 'locales'])
      .find(locale => locale.get('name') === field)
      .get('id');

    if (datagrid.getState().backend.get(translationId)) {
      return (
        <TranslationField id={translationId} datagrid={datagrid} msgId={id} />
      );
    } else {
      datagrid.doFor('nabu', 'add-translation', {
        id: translationId,
        messageId: id,
        localeId,
      });
    }
  }

  return <div />;
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
