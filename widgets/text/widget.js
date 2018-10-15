'use strict';
import Widget from 'laboratory/widget';
import React from 'react';
import formatMessage from '../../lib/format.js';

class NabuText extends Widget {
  constructor() {
    super(...arguments);
    this.onMouseEnter = this.onMouseEnter.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
  }

  static get wiring() {
    return {
      id: 'id',
      enabled: 'enabled',
      locale: 'selectedLocale',
      marker: 'marker',
      focus: 'focus',
      selectionModeEnabled: 'selectionMode.enabled',
      selectedItem: 'selectionMode.selectedItemId',
    };
  }

  mustTranslate(message, locale) {
    const mustTranslate = !message;
    return mustTranslate ? true : !message.get(`translations.${locale}`);
  }

  mustAdd(props) {
    const {msgid, desc, enabled} = props;
    if (enabled) {
      this.cmd('nabu.add-message', {messageId: msgid, description: desc});
    }
  }

  componentWillUpdate(nextProps) {
    this.mustAdd(nextProps);
  }

  componentDidMount() {
    this.mustAdd(this.props);
  }

  onMouseEnter() {
    if (this.props.selectionModeEnabled) {
      this.timeout = setTimeout(() => {
        if (this.props.enabled) {
          this.cmd('nabu.set-selected-item', {messageId: this.props.msgid});
        }
      }, 300);
    }
  }

  onMouseLeave() {
    if (this.props.selectionModeEnabled && this.timeout !== undefined) {
      clearTimeout(this.timeout);
    }
  }

  render() {
    const {
      enabled,
      marker,
      focus,
      children,
      message,
      msgid,
      locale,
      desc,
      html,
      values,
      selectedItem,
      selectionModeEnabled,
      dispatch,
      ...other
    } = this.props;

    const translatedMessage = message
      ? message.get(`translations.${locale}`, msgid)
      : msgid;

    const text = formatMessage(locale, html, translatedMessage, values);

    const markerOn = this.mustTranslate(message, locale) && marker;
    const highliteStyle = {
      outline: 'none',
      backgroundColor: 'rgba(10, 200, 100, .8)',
    };
    const focusStyle = {
      boxShadow: '0 0 10px 5px rgba(200, 0, 0, .8)',
    };
    function getSelectionModeStyle(selected) {
      const lineWidth = selected ? '2' : '1';
      const transparency = selected ? '1.0' : '0.4';

      return {
        boxShadow: `0 0 0 ${lineWidth}px rgba(200, 0, 0, ${transparency})`,
      };
    }

    let style = {};
    if (markerOn) {
      style = Object.assign(style, highliteStyle);
    }
    if (selectionModeEnabled) {
      style = Object.assign(
        style,
        getSelectionModeStyle(selectedItem === msgid)
      );
    }

    if (focus && msgid === focus) {
      style = Object.assign(style, focusStyle);
    }

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

export default Widget.Wired(NabuText)('nabu');
