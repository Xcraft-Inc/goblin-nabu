'use strict';
//T:2019-02-27

import Widget from 'goblin-laboratory/widgets/widget';
import React from 'react';
import formatMessage from 'goblin-nabu/lib/format.js';
const {removeContext} = require('goblin-nabu/lib/gettext.js');

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

    this.highlitedStyle = {
      outline: 'none',
      backgroundColor: 'rgba(10, 200, 100, .8)',
    };

    this.focusStyle = {
      boxShadow: '0 0 10px 5px rgba(200, 0, 0, .8)',
    };
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
    const {
      message,
      nabuId,
      description,
      custom,
      enabled,
      workitemId,
    } = this.props;
    if ((enabled || custom) && !message) {
      this.cmd('nabu.add-message', {
        nabuId,
        description,
        custom,
        workitemId,
        desktopId: this.context.desktopId,
      });
    }
  }

  onMouseEnter() {
    if (
      this.props.enabled &&
      this.props.selectionModeEnabled &&
      this.props.message
    ) {
      this.timeout = setTimeout(() => {
        this.doFor(this.props.id, 'set-selected-item', {
          messageId: this.props.message.get('id'),
        });
      }, 300);
    }
  }

  onMouseLeave() {
    if (
      this.props.enabled &&
      this.props.selectionModeEnabled &&
      this.timeout !== undefined
    ) {
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
      custom,
      cachedTranslation,
      translation,
    } = this.props;

    const localeName = locale && locale.get('name');

    if (!enabled && !custom && cachedTranslation) {
      return formatMessage(
        localeName,
        html,
        cachedTranslation,
        values ? values.toJS() : {}
      );
    }

    const translatedMessage =
      (enabled || custom) &&
      message &&
      translation &&
      translation.get('text') &&
      localeName
        ? translation.get('text')
        : removeContext(nabuId);

    return formatMessage(
      localeName,
      html,
      translatedMessage,
      values ? values.toJS() : {}
    );
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
    const {
      enabled,
      focus,
      message,
      selectionModeEnabled,
      marker,
      cachedTranslation,
    } = this.props;

    let style = {};

    if (!enabled && cachedTranslation) {
      return style;
    }

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

  render() {
    const {
      id,
      enabled,
      marker,
      focus,
      children,
      workitemId,
      message,
      nabuId,
      custom,
      cachedTranslation,
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
