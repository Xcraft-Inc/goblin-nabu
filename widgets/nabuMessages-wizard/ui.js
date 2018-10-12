import React from 'react';
import Widget from 'laboratory/widget';

import Container from 'gadgets/container/widget';
import Table from 'gadgets/table/widget';
import Field from 'gadgets/field/widget';
import TextFieldCombo from 'gadgets/text-field-combo/widget';

class NabuData extends Widget {
  constructor() {
    super(...arguments);
  }

  render() {
    const {rowsNumber, columnsNumber, locales, id} = this.props;
    const self = this;

    function buildTableData() {
      const localesList = locales.map(l => l.get('name')).toJS();

      const headers = [
        {
          name: 'nabuId',
          description: 'Id de traduction original',
          grow: '1',
          textAlign: 'left',
          width: '33%',
        },
      ];

      Array.apply(null, {length: columnsNumber}).map((_, i) => {
        headers.push({
          name: 'locale_' + i,
          width: '33%',
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
            nabuId: () => (
              <Field
                kind="label"
                grow="1"
                labelWidth="0px"
                model={`.form.messages[${index}].nabuId`}
              />
            ),
          };

          Array.apply(null, {length: columnsNumber}).map((_, i) => {
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
  columnsNumber: state.get(`backend.${props.id}.form.columnsNumber`),
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
