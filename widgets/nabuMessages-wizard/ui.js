import React from 'react';
import Widget from 'laboratory/widget';

import Container from 'gadgets/container/widget';
import NabuDataTable from '../nabu-data-table/widget';

class NabuData extends Widget {
  constructor() {
    super(...arguments);
    this.updateTranslation = this.updateTranslation.bind(this);
  }

  updateTranslation(rowKey, colKey, newValue) {
    this.props.do('updateTranslation', {rowKey, colKey, newValue});
  }

  render() {
    return (
      <Container kind="row">
        <NabuDataTable
          nabuData={this.props.nabuData}
          onUpdateTranslation={this.updateTranslation}
        />
      </Container>
    );
  }
}

const NabuDataConnected = Widget.connectBackend({
  nabuData: 'form.table',
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
