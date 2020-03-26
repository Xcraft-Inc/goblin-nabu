//T:2019-02-27

import React from 'react';
import Form from 'laboratory/form';

import Field from 'gadgets/field/widget';
import Widget from 'laboratory/widget';
import HighlightLabel from '../highlight-label/widget.js';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import IcuMessage from '../icu-message/widget.js';
import Container from 'gadgets/container/widget';
import Button from 'gadgets/button/widget';

import T from 't';

class TranslationField extends Form {
  constructor() {
    super(...arguments);

    this.onUpdate = this.onUpdate.bind(this);
    this.renewTTL = this.renewTTL.bind(this);
    this._renewInterval = null;

    this.renderIcuMessage = this.renderIcuMessage.bind(this);
    this.toggleIcu = this.toggleIcu.bind(this);

    this.state = {
      showField: false,
      showIcu: false,
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

  onUpdate() {
    this.setState({showField: true});
  }

  toggleIcu() {
    this.setState({showIcu: !this.state.showIcu});
  }

  renderIcuMessage() {
    const isIcu = this.props.text
      ? this.props.text.indexOf('{') > -1
        ? this.props.text.indexOf('}') > -1
          ? true
          : false
        : false
      : false;
    if (!this.props.showIcuButton || !isIcu) {
      return;
    }

    return (
      <Container className={this.styles.classNames.showIcuButton}>
        <Button text={T('Icu')} onClick={this.toggleIcu} />
        {this.state.showIcu ? (
          <IcuMessage
            locale={this.props.locale}
            translationId={this.props.id}
          />
        ) : null}
      </Container>
    );
  }

  render() {
    const {
      id,
      translationId,
      msgId,
      locale,
      datagridId,
      rows,
      verticalSpacing,
      grow,
      highlight,
      text,
      ...other
    } = this.props;
    const loaded = translationId && id;

    if (this.props.onDrillDown && translationId) {
      const entityInfo = {
        entityId: translationId,
        messageId: msgId,
        locale,
      };

      setTimeout(this.props.onDrillDown, 0, entityInfo);
      this.renewTTL(entityInfo);
      this._requestedId = id;
    }

    if (!loaded) {
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
          datagridId={datagridId}
          insideButton={false}
          onClick={this.onUpdate}
          underline={true}
          {...other}
        />
      );
    }

    return (
      <Container>
        <Form {...this.formConfigWithoutStyle}>
          <Field
            model={`backend.${id}.text`}
            grow={grow || '1'}
            verticalSpacing={verticalSpacing || 'compact'}
            rows={rows || '1'}
            className={
              this.props.labelText
                ? this.props.style
                : this.styles.classNames.bottomLine
            }
            width={this.props.width}
            {...other}
          />
        </Form>
        {this.renderIcuMessage()}
      </Container>
    );
  }
}

export default Widget.connect((state, props) => {
  const highlight = state.get(`backend.list@${props.datagridId}.highlights`);

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
