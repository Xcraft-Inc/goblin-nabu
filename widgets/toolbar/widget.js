'use strict';
import Widget from 'laboratory/widget';
import React from 'react';
import Container from 'gadgets/container/widget';
import Button from 'gadgets/button/widget';

class ToolBar extends Widget {
  constructor() {
    super(...arguments);
    this.toggleEnabled = this.toggleEnabled.bind(this);
    this.toggleMarks = this.toggleMarks.bind(this);
    this.toggleSelectionMode = this.toggleSelectionMode.bind(this);
    this.openDatagrid = this.openDatagrid.bind(this);
  }

  static get wiring() {
    return {
      id: 'id',
      enabled: 'enabled',
      locale: 'selectedLocale',
      marker: 'marker',
      focus: 'focus',
      selectionMode: 'selectionMode.enabled',
      selectedItem: 'selectionMode.selectedItemId',
    };
  }

  toggleEnabled() {
    this.cmd('nabu.toggle-enabled', {});
  }

  toggleMarks() {
    this.cmd('nabu.toggle-marks', {});
  }

  toggleSelectionMode() {
    this.cmd('nabu.toggle-selection-mode', {});
  }

  openDatagrid() {
    this.cmd('nabu.open-datagrid', {});
  }

  openSingleEntity(entityId) {
    this.cmd('nabu.open-single-entity', {entityId});
  }

  render() {
    const {enabled, marker, selectionMode, selectedItem} = this.props;

    if (enabled) {
      return (
        <Container kind="row">
          <Button
            kind="button-footer"
            text="&#x048a;&#x023a;&#x0243;&#x054d;"
            onClick={this.toggleEnabled}
          />
          <Button
            kind="button-footer"
            text={`Marker ${marker ? 'off' : 'on'}`}
            onClick={this.toggleMarks}
          />
          <Button
            kind="button-footer"
            text={`Select. mode ${selectionMode ? 'off' : 'on'}`}
            onClick={this.toggleSelectionMode}
          />
          <Button
            kind="button-footer"
            text={`Modify messages`}
            onClick={this.openDatagrid}
          />
          {selectedItem ? (
            <Button
              kind="button-footer"
              text={`Modify single message`}
              onClick={() => this.openSingleEntity(selectedItem)}
            />
          ) : null}
        </Container>
      );
    } else {
      return (
        <Container kind="row">
          <Button
            kind="button-footer"
            text="&#x048a;&#x023a;&#x0243;&#x054d;"
            onClick={this.toggleEnabled}
          />
        </Container>
      );
    }
  }
}

export default Widget.Wired(ToolBar)('nabu');
