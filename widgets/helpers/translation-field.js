import React from 'react';
import Form from 'laboratory/form';

import Field from 'gadgets/field/widget';
import Widget from 'laboratory/widget';
const {getToolbarId} = require('goblin-nabu/widgets/helpers/t.js');

class TranslationField extends Form {
  constructor() {
    super(...arguments);

    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
  }

  static get wiring() {
    return {
      id: 'id',
    };
  }

  onFocus() {
    if (!this.props.datagrid) {
      return;
    }

    const getNearestId = this.props.datagrid.getNearestId.bind(
      this.props.datagrid
    );
    const toolbarId = getToolbarId(getNearestId());

    if (toolbarId) {
      this.props.datagrid.doFor(toolbarId, 'set-focus', {
        messageId: this.props.msgId,
        value: true,
      });
    }
  }

  onBlur() {
    if (!this.props.datagrid) {
      return;
    }

    const getNearestId = this.props.datagrid.getNearestId.bind(
      this.props.datagrid
    );
    const toolbarId = getToolbarId(getNearestId());

    if (toolbarId) {
      this.props.datagrid.doFor(toolbarId, 'set-focus', {
        messageId: this.props.msgId,
        value: false,
      });
    }
  }

  render() {
    const {id, ...other} = this.props;

    if (!id) {
      return <div />;
    }

    const Form = this.Form;

    return (
      <Form {...this.formConfig}>
        <Field
          model={`backend.${id}.text`}
          grow="1"
          verticalSpacing="compact"
          labelWidth={this.props.labelWidth}
          onFocus={this.onFocus}
          onBlur={this.onBlur}
          rows={this.props.rows ? this.props.rows : '1'}
          {...other}
        />
      </Form>
    );
  }
}

export default Widget.connect((state, props) => {
  return {
    id: state.get(`backend.${props.translationId}`)
      ? props.translationId
      : null,
  };
})(TranslationField);
