import React from 'react';
import Widget from 'laboratory/widget';

import Connect from 'laboratory/connect';
import Container from 'gadgets/container/widget';
import Table from 'gadgets/table/widget';
import Field from 'gadgets/field/widget';
import Label from 'gadgets/label/widget';
import TextFieldCombo from 'gadgets/text-field-combo/widget';

class NabuData extends Widget {
  constructor() {
    super(...arguments);
    this.tooltips = {
      asc: {
        id: 'ascending order',
      },
      desc: {
        id: 'descending order',
      },
    };
  }

  render() {
    const {rowsNumber, selectedLocalesNumber, locales, id} = this.props;
    const self = this;

    function renderSortingHeader(field) {
      return (
        <Connect
          glyph={() => {
            const key = self.getModelValue(`.form.sort.key`);
            const dir = self.getModelValue(`.form.sort.dir`);

            if (key === field) {
              return dir === 'asc' ? 'solid/arrow-up' : 'solid/arrow-down';
            } else {
              return 'solid/circle';
            }
          }}
          tooltip={() => {
            const key = self.getModelValue(`.form.sort.key`);
            const dir = self.getModelValue(`.form.sort.dir`);

            if (key === field) {
              return dir === 'asc' ? self.tooltips.asc : self.tooltips.desc;
            } else {
              return null;
            }
          }}
        >
          <Label
            onClick={() => self.props.do('toggleSort', {field})}
            spacing="overlap"
          />
        </Connect>
      );
    }

    function buildTableData() {
      const localesList = locales.map(l => l.get('name')).toJS();
      const localeColumnsNumber = selectedLocalesNumber + 1; // + nabuId
      const fixedWidth = 5.0; // width reserved for other columns
      const localeColumnWidth =
        (100.0 - fixedWidth) / localeColumnsNumber + '%';

      const headers = [
        {
          name: 'missingTranslations',
          width: '2.5%',
        },
        {
          name: 'nabuId',
          description: () => (
            <div style={{display: 'flex'}}>
              <Label
                spacing="overlap"
                text={{
                  id: 'Message original',
                }}
              />
              {renderSortingHeader('nabuId')}
            </div>
          ),
          textAlign: 'left',
          width: localeColumnWidth,
        },
      ];

      const postHeaders = [
        {
          names: ['nabuId'],
          description: () => (
            <Field
              model=".form.filters.nabuId"
              grow="1"
              labelWidth="0px"
              onDebouncedChange={value =>
                self.props.do('filter', {field: `nabuId`, value})
              }
            />
          ),
        },
      ];

      Array.apply(null, {length: selectedLocalesNumber}).map((_, i) => {
        headers.push({
          name: 'locale_' + i,
          width: localeColumnWidth,
          description: () => (
            <div style={{display: 'flex'}}>
              <TextFieldCombo
                model={`.form.selectedLocales[${i}]`}
                readonly="true"
                grow="1"
                list={localesList}
                menuType="wrap"
                defaultValue={''}
                comboTextTransform="none"
                onSetText={locale => {
                  self.props.do('changeSelectedLocale', {index: i, locale});
                }}
              />
              {renderSortingHeader('locale_' + i)}
            </div>
          ),
        });

        postHeaders.push({
          names: ['locale_' + i],
          description: () => (
            <Field
              model={`.form.filters.locale_${i}`}
              grow="1"
              labelWidth="0px"
              onDebouncedChange={value =>
                self.props.do('filter', {field: `locale_${i}`, value})
              }
            />
          ),
        });
      });

      return {
        header: headers,
        'post-header': postHeaders,
        rows: Array.apply(null, {length: rowsNumber}).map((_, index) => {
          const row = {
            missingTranslations: () => (
              <Connect
                glyph={() => {
                  const message = self.getModelValue(
                    `.form.messages[${index}]`
                  );

                  if (message) {
                    return locales
                      .map(l => message.get(l.get('name')))
                      .some(
                        translation =>
                          translation == undefined || translation === ''
                      )
                      ? 'solid/exclamation-triangle'
                      : null;
                  }
                }}
              >
                <Label
                  spacing="overlap"
                  tooltip={{
                    id: "Certaines locales n'ont pas encore été traduites",
                    description: 'In Nabu window',
                  }}
                />
              </Connect>
            ),
            nabuId: () => (
              <div style={{display: 'flex'}}>
                <Field
                  kind="label"
                  grow="1"
                  labelWidth="0px"
                  model={`.form.messages[${index}].nabuId`}
                />
                <Connect
                  glyph={() => {
                    const message = self.getModelValue(
                      `.form.messages[${index}]`
                    );

                    if (message) {
                      const desc = message.get('description');
                      return desc && desc !== ''
                        ? 'solid/info' // not contained in standard icons
                        : null;
                    }
                  }}
                  tooltip={() => {
                    const message = self.getModelValue(
                      `.form.messages[${index}]`
                    );

                    if (message) {
                      return message.get('description');
                    }
                  }}
                >
                  <Label spacing="overlap" />
                </Connect>
              </div>
            ),
          };

          Array.apply(null, {length: selectedLocalesNumber}).map((_, i) => {
            row['locale_' + i] = () => (
              <Connect
                hidden={() => {
                  const message = self.getModelValue(
                    `.form.messages[${index}]`
                  );

                  return !message;
                }}
              >
                <Field
                  model={() => {
                    const locale = self.getModelValue(
                      `.form.selectedLocales[${i}]`
                    );

                    if (locale) {
                      return `backend.${id}.form.messages[${index}].${locale}`;
                    }
                  }}
                  grow="1"
                  labelWidth="0px"
                  onDebouncedChange={() =>
                    self.props.do('updateMessage', {rowIndex: index})
                  }
                />
              </Connect>
            );
          });
          return row;
        }),
      };
    }

    return (
      <Container kind="pane">
        <Container kind="row-pane">
          <Container kind="push-to-edge">
            <Table
              id={id}
              data={buildTableData()}
              height="500px"
              selectionMode="none"
            />
          </Container>
        </Container>
      </Container>
    );
  }
}

const NabuDataConnected = Widget.connect((state, props) => ({
  rowsNumber: state.get(`backend.${props.id}.form.rowsNumber`),
  selectedLocalesNumber: state.get(`backend.${props.id}.form.columnsNumber`),
  locales: state.get(`backend.nabu.locales`),
}))(NabuData);

class ShowMessages extends Widget {
  constructor() {
    super(...arguments);
  }

  render() {
    return <NabuDataConnected id={this.props.id} do={this.props.do} />;
  }
}

/******************************************************************************/
export default {
  showMessages: ShowMessages,
};
