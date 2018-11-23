import React from 'react';
import Form from 'laboratory/form';

import Field from 'gadgets/field/widget';
import Widget from 'laboratory/widget';

class TranslationField extends Form {
  constructor () {
    super (...arguments);

    this.onFocus = this.onFocus.bind (this);
    this.onBlur = this.onBlur.bind (this);
  }

  static get wiring () {
    return {
      id: 'id',
    };
  }

  onFocus () {
    if (!this.props.datagrid) {
      return;
    }

    this.props.datagrid.doFor ('nabu', 'set-focus', {
      messageId: this.props.msgId,
      value: true,
    });
  }

  onBlur () {
    if (!this.props.datagrid) {
      return;
    }

    this.props.datagrid.doFor ('nabu', 'set-focus', {
      messageId: this.props.msgId,
      value: false,
    });
  }

  render () {
    const {id, ...other} = this.props;

    if (!id) {
      return <div />;
    }

    const Form = this.Form;

    return (
      <Form {...this.formConfig}>
        <Field
          model={'.text'}
          grow="1"
          labelWidth={this.props.labelWidth}
          verticalSpacing="compact"
          onFocus={this.onFocus}
          onBlur={this.onBlur}
          rows={this.props.multiline ? '5' : '1'}
          {...other}
        />
      </Form>
    );
  }
}

export default Widget.connect ((state, props) => {
  return {
    id: state.get (`backend.${props.translationId}`)
      ? props.translationId
      : null,
  };
}) (TranslationField);
