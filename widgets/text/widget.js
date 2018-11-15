'use strict';
import Widget from 'laboratory/widget';
import React from 'react';
import formatMessage from '../../lib/format.js';

class NabuText extends Widget {
  constructor() {
    super(...arguments);
    this.onMouseEnter = this.onMouseEnter.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);

    this.getText = this.getText.bind(this);
    this.getSelectionModeStyle = this.getSelectionModeStyle.bind(this);
    this.getStyle = this.getStyle.bind(this);
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

  mustTranslate(message, translation) {
    return !message || !translation;
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

  componentDidMount() {
    this.mustAdd(this.props);
  }

  onMouseEnter() {
    if (this.props.selectionModeEnabled && this.props.message) {
      this.timeout = setTimeout(() => {
        if (this.props.enabled) {
          this.cmd('nabu.set-selected-item', {
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
      enabled && message && translation && locale ? translation : nabuId;

    return locale
      ? formatMessage(locale, html, translatedMessage, values || [])
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
    const {focus, message, selectionModeEnabled, locale, marker} = this.props;

    let style = {};

    const markerOn = this.mustTranslate(message, locale) && marker;
    if (markerOn) {
      style = Object.assign(style, this.highliteStyle);
    }
    if (selectionModeEnabled) {
      style = Object.assign(style, this.getSelectionModeStyle());
    }

    if (focus && message && message.get('id') === focus) {
      style = Object.assign(style, this.focusStyle);
    }
    return style;
  }

  highliteStyle = {
    outline: 'none',
    backgroundColor: 'rgba(10, 200, 100, .8)',
  };

  focusStyle = {
    boxShadow: '0 0 10px 5px rgba(200, 0, 0, .8)',
  };

  render() {
    const {...other} = this.props;

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

export default Widget.Wired(NabuText)('nabu');
