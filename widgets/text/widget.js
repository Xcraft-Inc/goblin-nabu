'use strict';
import Widget from 'laboratory/widget';
import React from 'react';
import formatMessage from '../helpers/format.js';

export default class NabuText extends Widget {
  constructor() {
    super(...arguments);
    this.onMouseEnter = this.onMouseEnter.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);

    this.mustAdd = this.mustAdd.bind(this);
    this.mustTranslate = this.mustTranslate.bind(this);
    this.getText = this.getText.bind(this);
    this.getSelectionModeStyle = this.getSelectionModeStyle.bind(this);
    this.getStyle = this.getStyle.bind(this);
  }

  componentDidMount() {
    this.mustAdd();
  }

  componentDidUpdate() {
    this.mustAdd();
  }

  mustTranslate() {
    const {message, translation} = this.props;

    return !message || !translation || !translation.get('text');
  }

  mustAdd() {
    const {message, nabuId, description, enabled, workitemId} = this.props;
    if (enabled && !message) {
      this.cmd('nabu.add-message', {
        nabuId,
        description,
        workitemId,
        desktopId: this.context.desktopId,
      });
    }
  }

  onMouseEnter() {
    if (this.props.selectionModeEnabled && this.props.message) {
      this.timeout = setTimeout(() => {
        if (this.props.enabled) {
          this.doFor(this.props.id, 'set-selected-item', {
            messageId: this.props.message.get('id'),
          });
        }
      }, 300);
    }
  }

  onMouseLeave() {
    if (this.props.selectionModeEnabled && this.timeout !== undefined) {
      clearTimeout(this.timeout);
    }
  }

  getText() {
    const {
      enabled,
      message,
      nabuId,
      locale,
      html,
      values,
      translation,
    } = this.props;

    const translatedMessage =
      enabled &&
      message &&
      translation &&
      translation.get('text') &&
      locale &&
      locale.get('name')
        ? translation.get('text')
        : nabuId;

    return locale && locale.get('name')
      ? formatMessage(locale.get('name'), html, translatedMessage, values || [])
      : nabuId;
  }

  getSelectionModeStyle() {
    const {message, selectedItem} = this.props;

    const selected = message && selectedItem === message.get('id');

    const lineWidth = selected ? '2' : '1';
    const transparency = selected ? '1.0' : '0.4';

    return {
      boxShadow: `0 0 0 ${lineWidth}px rgba(200, 0, 0, ${transparency})`,
    };
  }

  getStyle() {
    const {enabled, focus, message, selectionModeEnabled, marker} = this.props;

    let style = {};

    const markerOn = marker && this.mustTranslate();
    if (enabled && markerOn) {
      style = Object.assign(style, this.highlitedStyle);
    }
    if (enabled && selectionModeEnabled) {
      style = Object.assign(style, this.getSelectionModeStyle());
    }

    if (enabled && focus && message && message.get('id') === focus) {
      style = Object.assign(style, this.focusStyle);
    }
    return style;
  }

  highlitedStyle = {
    outline: 'none',
    backgroundColor: 'rgba(10, 200, 100, .8)',
  };

  focusStyle = {
    boxShadow: '0 0 10px 5px rgba(200, 0, 0, .8)',
  };

  render() {
    const {
      id,
      enabled,
      marker,
      focus,
      children,
      workitemId,
      hashedMsgId,
      message,
      nabuId,
      translation,
      locale,
      html,
      values,
      selectedItem,
      selectionModeEnabled,
      dispatch,
      ...other
    } = this.props;

    const text = this.getText();
    const style = this.getStyle();

    return (
      <span
        style={style}
        dangerouslySetInnerHTML={{__html: text}}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        {...other}
      />
    );
  }
}
