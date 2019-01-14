'use strict';
import Widget from 'laboratory/widget';
import React from 'react';
import Container from 'gadgets/container/widget';
import Button from 'gadgets/button/widget';

export default class NabuToolbar extends Widget {
  constructor() {
    super(...arguments);
    this.openMessageSearch = this.openMessageSearch.bind(this);
    this.openLocaleSearch = this.openLocaleSearch.bind(this);
    this.toggleEnabled = this.toggleEnabled.bind(this);
    this.toggleMarks = this.toggleMarks.bind(this);
    this.toggleSelectionMode = this.toggleSelectionMode.bind(this);
    this.openDatagrid = this.openDatagrid.bind(this);
    this.openSingleEntity = this.openSingleEntity.bind(this);
    this.extract = this.extract.bind(this);
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

  static connectTo(instance) {
    return Widget.Wired(NabuToolbar)(`nabu-toolbar@${instance.props.id}`);
  }

  openMessageSearch() {
    this.do('open-message-search', {});
  }

  openLocaleSearch() {
    this.do('open-locale-search', {});
  }

  localeSearch() {
    this.do('open-locale-search', {});
  }

  toggleEnabled() {
    this.do('toggle-enabled', {});
  }

  toggleMarks() {
    this.do('toggle-marks', {});
  }

  toggleSelectionMode() {
    this.do('toggle-selection-mode', {});
  }

  openDatagrid() {
    this.do('open-datagrid', {});
  }

  openSingleEntity(entityId) {
    this.do('open-single-entity', {entityId});
  }

  extract() {
    this.do('extract-messages', {});
  }

  render() {
    const {enabled, marker, selectionMode, selectedItem} = this.props;

    if (enabled) {
      return (
        <Container kind="row">
          <Button
            kind="button-footer"
            text="Search messages"
            onClick={this.openMessageSearch}
          />
          <Button
            kind="button-footer"
            text="Search locales"
            onClick={this.openLocaleSearch}
          />
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
            text={`Modify all messages`}
            onClick={this.openDatagrid}
          />
          {selectedItem && selectionMode ? (
            <Button
              kind="button-footer"
              text={`Modify single message`}
              onClick={() => this.openSingleEntity(selectedItem)}
            />
          ) : null}
          <Button
            kind="button-footer"
            text={`Extract all messages`}
            onClick={this.extract}
          />
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
