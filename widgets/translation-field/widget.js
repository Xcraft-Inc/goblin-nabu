//T:2019-02-27

import React from 'react';
import Form from 'laboratory/form';

import Field from 'gadgets/field/widget';
import Widget from 'laboratory/widget';
import HighlightLabel from '../highlight-label/widget.js';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';

import {getToolbarId} from 'goblin-nabu/lib/helpers.js';

class TranslationField extends Form {
  constructor() {
    super(...arguments);

    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
    this.onUpdate = this.onUpdate.bind(this);
    this.renewTTL = this.renewTTL.bind(this);
    this._renewInterval = null;

    this.state = {
      showField: false,
    };
  }

  renewTTL(id) {
    if (this._renewInterval) {
      clearInterval(this._renewInterval);
    }
    this._renewInterval = setInterval(this.props.onDrillDown, 15000, id);
  }

  componentWillUnmount() {
    if (this._renewInterval) {
      clearInterval(this._renewInterval);
    }
  }

  static get wiring() {
    return {
      id: 'id',
    };
  }

  onFocus() {
    if (this.props.component) {
      const getNearestId = this.props.component.getNearestId.bind(
        this.props.component
      );
      const toolbarId = getToolbarId(
        this.props.component.context.desktopId || getNearestId()
      );

      if (toolbarId) {
        this.props.component.doFor(toolbarId, 'set-focus', {
          messageId: this.props.msgId,
          value: true,
        });
      }
    }

    if (this.props.onFocus) {
      this.props.onFocus();
    }
  }

  onBlur() {
    if (this.props.component) {
      const getNearestId = this.props.component.getNearestId.bind(
        this.props.component
      );
      const toolbarId = getToolbarId(
        this.props.component.context.desktopId || getNearestId()
      );

      if (toolbarId) {
        this.props.component.doFor(toolbarId, 'set-focus', {
          messageId: this.props.msgId,
          value: false,
        });
      }
    }

    if (this.props.onBlur) {
      this.props.onBlur();
    }
  }

  onUpdate() {
    this.setState({showField: true});
  }

  render() {
    const {
      id,
      translationId,
      model,
      onFocus,
      onBlur,
      component,
      rows,
      verticalSpacing,
      grow,
      highlight,
      text,
      ...other
    } = this.props;
    const loaded = translationId && id;

    if (!loaded) {
      if (this.props.onDrillDown & translationId) {
        setTimeout(this.props.onDrillDown, 0, translationId);
        this.renewTTL(translationId);
      }
      return <FontAwesomeIcon icon={[`fas`, 'spinner']} size={'1x'} pulse />;
    }

    const Form = this.Form;

    const highlightText = highlight ? highlight.get(id) : undefined;
    if (
      highlightText &&
      text === highlightText.replace(new RegExp('`', 'g'), '') &&
      !this.state.showField
    ) {
      return (
        <HighlightLabel
          id={id}
          datagridId={component.props.id}
          insideButton="false"
          onClick={this.onUpdate}
          underline={true}
          {...other}
        />
      );
    }

    return (
      <Form {...this.formConfig}>
        <Field
          model={`backend.${id}.text`}
          grow={grow || '1'}
          verticalSpacing={verticalSpacing || 'compact'}
          onFocus={this.onFocus}
          onBlur={this.onBlur}
          rows={rows || '1'}
          className={
            this.props.labelText ? undefined : this.styles.classNames.bottomLine
          }
          {...other}
        />
      </Form>
    );
  }
}

export default Widget.connect((state, props) => {
  const highlight = props.component
    ? state.get(`backend.list@${props.component.props.id}.highlights`)
    : undefined;

  return {
    id: state.get(`backend.${props.translationId}`)
      ? props.translationId
      : null,
    highlight,
    text: state.get(`backend.${props.translationId}`)
      ? state.get(`backend.${props.translationId}.text`)
      : undefined,
  };
})(TranslationField);
