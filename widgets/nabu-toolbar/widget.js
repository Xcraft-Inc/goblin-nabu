'use strict';
//T:2019-05-24

import T from 't';
import Widget from 'goblin-laboratory/widgets/widget';
import React from 'react';
import Container from 'goblin-gadgets/widgets/container/widget';
import Button from 'goblin-gadgets/widgets/button/widget';
import {getToolbarId} from 'goblin-nabu/lib/helpers.js';

export default class NabuToolbar extends Widget {
  constructor() {
    super(...arguments);
    this.openSession = this.openSession.bind(this);
    this.openLocaleSearch = this.openLocaleSearch.bind(this);
    this.toggleEnabled = this.toggleEnabled.bind(this);
    this.toggleMarks = this.toggleMarks.bind(this);
    this.toggleSelectionMode = this.toggleSelectionMode.bind(this);
    this.openDatagrid = this.openDatagrid.bind(this);
    this.openSingleEntity = this.openSingleEntity.bind(this);
    this.openImportPacked = this.openImportPacked.bind(this);
    this.extract = this.extract.bind(this);
    this.pack = this.pack.bind(this);
  }

  static get wiring() {
    return {
      id: 'id',
      show: 'show',
      enabled: 'enabled',
      editor: 'editor',
      marker: 'marker',
      focus: 'focus',
      selectionMode: 'selectionMode.enabled',
      selectedItem: 'selectionMode.selectedItemId',
    };
  }

  static connectTo(instance) {
    return Widget.Wired(NabuToolbar)(getToolbarId(instance.props.id));
  }

  openSession() {
    this.do('open-session', {});
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

  openImportPacked() {
    this.do('open-importPackedMessages', {});
  }

  extract() {
    this.cmd('nabu.extract-messages', {
      desktopId: this.props.desktopId,
    });
  }

  pack() {
    this.cmd('nabu.pack-messages', {
      desktopId: this.props.desktopId,
    });
  }

  render() {
    const {
      show,
      enabled,
      marker,
      selectionMode,
      selectedItem,
      editor,
    } = this.props;

    if (!show) {
      return <div />;
    }

    if (enabled) {
      if (editor) {
        return (
          <Container kind="row">
            <Button
              kind="button-footer"
              text={T('Search locales')}
              onClick={this.openLocaleSearch}
            />

            <Button
              kind="button-footer"
              text={T(`Modify all messages`)}
              onClick={this.openDatagrid}
            />
            {process.env.NODE_ENV === 'development' ? (
              <Button
                kind="button-footer"
                text={T(`Extract all messages`)}
                onClick={this.extract}
              />
            ) : null}

            {process.env.NODE_ENV === 'development' ? (
              <Button
                kind="button-footer"
                text={T(`Pack all messages`)}
                onClick={this.pack}
              />
            ) : null}
            {process.env.NODE_ENV === 'development' ? (
              <Button
                kind="button-footer"
                text={T(`Import packed messages`)}
                onClick={this.openImportPacked}
              />
            ) : null}
          </Container>
        );
      } else {
        return (
          <Container kind="row">
            <Button
              kind="button-footer"
              text={T(`Open a Nabu Session`)}
              onClick={this.openSession}
            />
            <Button
              kind="button-footer"
              text={T('Marker {marker, select, false {on} other {off}}', null, {
                marker: !!marker,
              })}
              onClick={this.toggleMarks}
            />
            <Button
              kind="button-footer"
              text={T(
                'Select. mode {mode, select, false {on} other {off}}',
                null,
                {mode: !!selectionMode}
              )}
              onClick={this.toggleSelectionMode}
            />
            {selectedItem && selectionMode ? (
              <Button
                kind="button-footer"
                text={T(`Modify single message`)}
                onClick={() => this.openSingleEntity(selectedItem)}
              />
            ) : null}
          </Container>
        );
      }
    } else {
      return (
        <Container kind="row">
          {!editor ? (
            <Button
              kind="button-footer"
              text={T(`Open a Nabu Session`)}
              onClick={this.openSession}
            />
          ) : null}
        </Container>
      );
    }
  }
}
