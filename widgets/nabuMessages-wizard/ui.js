import React from 'react';
import Widget from 'laboratory/widget';

import Container from 'gadgets/container/widget';
import Table from 'gadgets/table/widget';
import Field from 'gadgets/field/widget';

class NabuData extends Widget {
  constructor() {
    super(...arguments);
    this.updateTranslation = this.updateTranslation.bind(this);
  }

  updateTranslation(rowKey, colKey, newValue) {
    this.props.do('updateTranslation', {rowKey, colKey, newValue});
  }

  render() {
    const {headers, rowsNumber, locales, id} = this.props;
    const self = this;

    function buildTableData() {
      return {
        header: headers.toJS(),
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

const NabuDataConnected = Widget.connectBackend({
  headers: 'form.table.header',
  rowsNumber: 'form.rowsNumber',
  locales: 'form.locales',
})(NabuData);

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
