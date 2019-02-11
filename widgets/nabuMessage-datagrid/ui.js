import React from 'react';
import Widget from 'laboratory/widget';

import LabelTextField from 'gadgets/label-text-field/widget';

import T from 'goblin-nabu/widgets/helpers/t.js';
import {SortLabel} from './labels';
import header from './header';
import row from './row';

// ------------------------------------------------------------

const tooltips = {
  asc: T('ascending order'),
  desc: T('descending order'),
};

function renderLocaleSortCell(doAsDatagrid, column, datagridId) {
  return (
    <SortLabel
      tooltips={tooltips}
      id={datagridId}
      column={column}
      onClick={() =>
        doAsDatagrid('applyElasticVisualization', {
          sort: column.get('field'),
        })
      }
      spacing="compact"
    />
  );
}

function renderHinterRow(doAsDatagrid) {
  return (
    <LabelTextField
      model={`.searchValue`}
      grow="1"
      labelGlyph="solid/search"
      onDebouncedChange={value =>
        doAsDatagrid('applyElasticVisualization', {value})
      }
      hintText={`Search message or translation`}
      width="95%"
      verticalSpacing="5px"
    />
  );
}
// ------------------------------------------------------------

function renderHinter(props) {
  return renderHinterRow(props.doAsDatagrid);
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
