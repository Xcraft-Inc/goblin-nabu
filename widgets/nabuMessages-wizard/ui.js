import React from 'react';
import Widget from 'laboratory/widget';

import Connect from 'laboratory/connect';
import Container from 'gadgets/container/widget';
import Table from 'gadgets/table/widget';
import Field from 'gadgets/field/widget';
import Label from 'gadgets/label/widget';
import TextFieldCombo from 'gadgets/text-field-combo/widget';

class NabuData extends Widget {
  constructor() {
    super(...arguments);
  }

  render() {
    const {rowsNumber, selectedLocalesNumber, locales, id} = this.props;
    const self = this;

    function buildTableData() {
      const localesList = locales.map(l => l.get('name')).toJS();
      const localeColumnsNumber = selectedLocalesNumber + 1; // + nabuId
      const fixedWidth = 5.0; // width reserved for other columns
      const localeColumnWidth =
        (100.0 - fixedWidth) / localeColumnsNumber + '%';

      const headers = [
        {
          name: 'missingTranslations',
          grow: '1',
          width: '5%',
        },
        {
          name: 'nabuId',
          description: 'Message original',
          grow: '1',
          textAlign: 'left',
          width: localeColumnWidth,
        },
      ];

      Array.apply(null, {length: selectedLocalesNumber}).map((_, i) => {
        headers.push({
          name: 'locale_' + i,
          width: localeColumnWidth,
          description: () => (
            <TextFieldCombo
              model={`.form.selectedLocales[${i}]`}
              readonly="true"
              grow="1"
              list={localesList}
              menuType="wrap"
              defaultValue={''}
              comboTextTransform="none"
              onSetText={locale => {
                self.props.do('changeSelectedLocale', {index: i, locale});
              }}
            />
          ),
        });
      });

      return {
        header: headers,
        rows: Array.apply(null, {length: rowsNumber}).map((_, index) => {
          const row = {
            missingTranslations: () => (
              <Connect
                glyph={() => {
                  const message = self.getModelValue(
                    `.form.messages[${index}]`
                  );
                  return locales
                    .map(l => message.get(l))
                    .some(
                      translation =>
                        translation == undefined || translation === ''
                    )
                    ? 'solid/exclamation-triangle'
                    : null;
                }}
              >
                <Label
                  spacing="overlap"
                  tooltip="Certaines locales n'ont pas encore été traduites"
                />
              </Connect>
            ),
            nabuId: () => (
              <Field
                kind="label"
                grow="1"
                labelWidth="0px"
                model={`.form.messages[${index}].nabuId`}
              />
            ),
          };

          Array.apply(null, {length: selectedLocalesNumber}).map((_, i) => {
            row['locale_' + i] = () => (
              <Field
                model={() => {
                  const locale = self.getModelValue(
                    `.form.selectedLocales[${i}]`
                  );
                  return `backend.${id}.form.messages[${index}].${locale}`;
                }}
                grow="1"
                labelWidth="0px"
                onDebouncedChange={() =>
                  self.props.do('updateMessage', {rowIndex: index})
                }
              />
            );
          });
          return row;
        }),
      };
    }

    return (
      <Container kind="pane">
        <Container kind="row-pane">
          <Container kind="push-to-edge">
            <Table id={id} data={buildTableData()} height="500px" />
          </Container>
        </Container>
      </Container>
    );
  }
}

const NabuDataConnected = Widget.connect((state, props) => ({
  rowsNumber: state.get(`backend.${props.id}.form.rowsNumber`),
  selectedLocalesNumber: state.get(`backend.${props.id}.form.columnsNumber`),
  locales: state.get(`backend.nabu.locales`),
}))(NabuData);

class ShowMessages extends Widget {
  constructor() {
    super(...arguments);
  }

  render() {
    return <NabuDataConnected id={this.props.id} do={this.props.do} />;
  }
}

/******************************************************************************/
export default {
  showMessages: ShowMessages,
};
