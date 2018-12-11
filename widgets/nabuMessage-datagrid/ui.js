import React from 'react';
import Widget from 'laboratory/widget';

import NabuLabels from '../nabuWidgets/nabuLabels';

import header from './header';
import row from './row';

// ------------------------------------------------------------

const tooltips = {
  asc: Widget.T('ascending order'),
  desc: Widget.T('descending order'),
};

function renderLocaleSortCell(doAsDatagrid, column, datagridId) {
  return (
    <NabuLabels.sort
      tooltips={tooltips}
      id={datagridId}
      column={column}
      onClick={() =>
        doAsDatagrid('applyCustomVisualization', {
          field: column.get('field'),
        })
      }
      spacing="compact"
    />
  );
}

// ------------------------------------------------------------

function renderHinter() {
  return <div>My Nice Hinter</div>;
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
  headerCell: header.renderHeaderCell,
  rowCell: row.renderRowCell,
  sortCell: renderSortCell,
  hinter: renderHinter,
};
