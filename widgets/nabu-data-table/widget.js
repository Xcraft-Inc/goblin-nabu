import React from 'react';
import Widget from 'laboratory/widget';
import Label from 'gadgets/label/widget';
import Button from 'gadgets/button/widget';

/******************************************************************************/

export default class NabuDataTable extends Widget {
  constructor() {
    super(...arguments);
  }

  renderTextButton(rowKey, colKey) {
    //valueName == message //index = 0 (=client)
    return (
      <Button
        kind="check-button"
        glyph="solid/pencil"
        tooltip="Message pour salaires"
        active={'true'}
        onClick={() => this.props.onTextButton(rowKey, colKey)}
      />
    );
  }

  renderCell(row, id, cellId) {
    if (id === 'nabuId') {
      return row.get(id);
    }

    return (
      <input
        type="text"
        id={cellId}
        defaultValue={row.get(id)}
        onKeyUp={() =>
          this.props.onUpdateTranslation(
            row,
            id,
            document.getElementById(cellId).value
          )
        }
      />
    );
  }

  renderRows() {
    const rows = this.props.nabuData.get('rows');
    const headers = this.props.nabuData.get('header');

    return rows.map((row, index) => {
      const rowForHead = headers.map((header, inx) => {
        const id = header.get('name');
        const cellId = index + '-' + inx;
        return <td key={cellId}>{this.renderCell(row, id, cellId)}</td>;
      });
      return <tr key={index}>{rowForHead}</tr>;
    });
  }

  renderHeaders() {
    const headers = this.props.nabuData.get('header');
    const headersRow = headers.map((header, index) => {
      return <th key={header.get('name')}>{header.get('description')}</th>;
    });
    return <tr>{headersRow}</tr>;
  }

  render() {
    const {onUpdateTranslation, nabuData, ...otherProps} = this.props;
    return (
      <div className={this.styles.classNames.container}>
        <table className={this.styles.classNames.table}>
          <tbody>
            {this.renderHeaders()}
            {this.renderRows()}
          </tbody>
        </table>
      </div>
    );
  }
}
