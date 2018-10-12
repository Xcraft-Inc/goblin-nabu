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
    const {selectedLocales, rowsNumber, locales, id} = this.props;
    const self = this;

    function buildTableData() {
      const head = [
        {
          name: 'nabuId',
          description: 'Id de traduction original',
          grow: '1',
          textAlign: 'left',
          width: '33%',
        },
      ];

      var localsList = [];
      locales.linq.select(x => {
        localsList.push(x.get('name'));
      });
      head[1] = {
        name: selectedLocales.get(`0`),
        description: () => (
          <TextFieldCombo
            model={`.form.selectedLocales[0]`}
            readonly="true"
            grow="1"
            list={localsList}
            menuType="wrap"
            defaultValue={`${selectedLocales.get(`0`)}`}
            comboTextTransform="none"
            onSetText={newLocal => {
              self.props.do('updateLocal', {index: 0, newLocal});
            }}
          />
        ),
        width: '33%',
      };
      head[2] = {
        name: selectedLocales.get(`1`),
        description: () => (
          <TextFieldCombo
            model={`.form.selectedLocales[1])`}
            readonly="true"
            grow="1"
            list={localsList}
            menuType="wrap"
            defaultValue={`${selectedLocales.get(`1`)}`}
            comboTextTransform="none"
            onSetText={newLocal => {
              self.props.do('updateLocal', {index: 1, newLocal});
            }}
          />
        ),
        width: '33%',
      };

      return {
        header: head,
        rows: Array.apply(null, {length: rowsNumber}).map((_, index) => {
          const row = {
            nabuId: () => (
              <Field
                kind="label"
                grow="1"
                labelWidth="0px"
                model={`.form.table.rows[${index}].nabuId`}
              />
            ),
          };

          for (const locale of locales.toJS()) {
            row[locale.name] = () => (
              <Field
                model={`.form.table.rows[${index}].${locale.name}`}
                grow="1"
                labelWidth="0px"
                onDebouncedChange={() =>
                  self.props.do('updateMessage', {rowIndex: index})
                }
              />
            );
          }
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
  headers: state.get(`backend.${props.id}.form.table.header`),
  rowsNumber: state.get(`backend.${props.id}.form.rowsNumber`),

  nrColumn: state.get(`backend.${props.id}.form.nrColumn`),
  selectedLocales: state.get(`backend.${props.id}.form.selectedLocales`),

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
