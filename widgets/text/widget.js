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
    return mustTranslate || !locale
      ? true
      : !message.get(`translations.${locale}`);
  }

  mustAdd(props) {
    const {nabuId, description, enabled, workitemId} = props;
    if (enabled) {
      this.cmd('nabu.add-message', {
        nabuId,
        description,
        workitemId,
      });
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
      workitemId,
      message,
      nabuId,
      locale,
      html,
      values,
      selectedItem,
      selectionModeEnabled,
      dispatch,
      ...other
    } = this.props;

    const translatedMessage =
      enabled && message && locale
        ? message.get(`translations.${locale}`, nabuId)
        : nabuId;
    const finalMessage = translatedMessage !== '' ? translatedMessage : nabuId;

    const text = locale
      ? formatMessage(locale, html, finalMessage, values)
      : nabuId;

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
        getSelectionModeStyle(selectedItem === nabuId)
      );
    }

    // wrong nabuId...
    if (focus && nabuId === focus) {
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
