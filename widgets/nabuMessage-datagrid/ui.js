import React from 'react';
import Widget from 'laboratory/widget';

import Field from 'gadgets/field/widget';
import NabuLabels from '../nabuWidgets/nabuLabels';

import header from './header';
import row from './row';

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
  headerCell: header.renderHeaderCell,
  rowCell: row.renderRowCell,
  filterCell: renderFilterCell,
  sortCell: renderSortCell,
};
