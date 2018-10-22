'use strict';
const {buildWizard} = require('goblin-desktop');
const {crypto} = require('xcraft-core-utils');
const {buildRegexFilter} = require('goblin-rethink/helpers.js');
const Shredder = require('xcraft-core-shredder');
const watt = require('watt');

function buildMessages(messages, locales) {
  return messages
    .map(message => {
      const row = {
        nabuId: message.get('nabuId'),
        description: message.get('description'),
        updated: false,
      };

      for (const locale of locales.toJS()) {
        row[locale.name] = message.getIn(['translations', locale.name], '');
      }

      return row;
    })
    .toArray();
}

const retrieveMessages = watt(function*(quest, filters, next) {
  const nabuApi = quest.getAPI('nabu');
  const locales = (yield nabuApi.get()).get('locales');

  const r = quest.getStorage('rethink');
  let nabuMessages = [];

  if (!filters) {
    nabuMessages = Shredder.fromJS(
      yield r.getAll(
        {
          table: 'nabuMessage',
        },
        next
      )
    );
  } else {
    const selectedLocales = quest.goblin
      .getState()
      .get('form.selectedLocales')
      .toJS();

    nabuMessages = Shredder.fromJS(
      yield r.getAll(
        {
          table: 'nabuMessage',
          filter: buildRegexFilter(
            filters
              .mapEntries(entry => {
                if (entry[0].startsWith('locale_')) {
                  const localeKey =
                    'translations.' +
                    selectedLocales[parseInt(entry[0].replace('locale_', ''))];
                  if (localeKey && localeKey !== '') {
                    return [localeKey, entry[1]];
                  }
                }

                return entry;
              })
              .toJS(),
            value => '(?i).*' + value + '.*'
          ),
        },
        next
      )
    );
  }

  const messages = buildMessages(nabuMessages, locales);
  quest.me.change({
    path: 'form.messages',
    newValue: messages,
  });

  if (!filters) {
    quest.me.change({
      path: 'form.rowsNumber',
      newValue: messages.length,
    });
  }
});

const config = {
  name: 'nabuMessages',
  title: 'Affichage de toutes les traductions en cours',
  dialog: {
    width: '1000px',
  },

  quests: {
    updateMessage: function(quest, rowIndex) {
      quest.me.change({
        path: `form.messages[${rowIndex}].updated`,
        newValue: true,
      });
    },
    changeSelectedLocale: function*(quest, index, locale, next) {
      quest.me.change({
        path: `form.selectedLocales[${index}]`,
        newValue: locale,
      });

      const filters = quest.goblin.getState().get(`form.filters`);

      if (
        filters.get(`locale_${index}`) != undefined &&
        filters.get(`locale_${index}`) !== ''
      ) {
        quest.me.change({
          path: `form.filters.locale_${index}`,
          newValue: '',
        });

        yield retrieveMessages(quest, filters.set(`locale_${index}`, ''), next);
      }
    },
    filter: function*(quest, field, value, next) {
      const filters = quest.goblin.getState().get('form.filters');

      yield retrieveMessages(quest, filters.set(field, value), next);
    },
  },
  steps: {
    showMessages: {
      buttons: function(quest, buttons, form) {
        return buttons.set('main', {
          glyph: 'solid/arrow-right',
          text: 'Save',
          grow: '2',
        });
      },
      form: {
        filters: {},
      },
      quest: function*(quest, form, next) {
        const nabuApi = quest.getAPI('nabu');
        const configApi = quest.getAPI('nabuConfiguration@main');

        const locales = (yield nabuApi.get()).get('locales');
        const currentLocaleId = (yield configApi.get()).get('localeId');
        const currentLocale = locales.find(
          locale => locale.get('id') === currentLocaleId
        );

        var firstLocale = locales.size > 0 ? locales.first().get('name') : '';
        const columnsNumber = 2;
        quest.me.change({
          path: 'form.columnsNumber',
          newValue: columnsNumber,
        });

        var selectedLocales = [];
        selectedLocales[0] = currentLocale
          ? currentLocale.get('name')
          : firstLocale;

        for (var i = 1; i < columnsNumber; i++) {
          selectedLocales[i] = firstLocale;
        }
        quest.me.change({
          path: 'form.selectedLocales',
          newValue: selectedLocales,
        });

        yield retrieveMessages(quest, null, next);
      },
    },
    finish: {
      form: {},
      quest: function*(quest, form, next) {
        const r = quest.getStorage('rethink');
        const nabuApi = quest.getAPI('nabu');

        const locales = (yield nabuApi.get()).get('locales').toJS();

        for (const row of form.messages) {
          if (row.updated) {
            const msgId = `nabuMessage@${crypto.sha256(row.nabuId)}`;
            const translations = {};

            for (const locale of locales) {
              translations[locale.name] = row[locale.name];
            }

            yield r.setIn({
              table: 'nabuMessage',
              documentId: msgId,
              path: ['translations'],
              value: translations,
            });
          }
        }

        const desktop = quest.getAPI(quest.getDesktop());
        desktop.removeDialog({dialogId: quest.goblin.id});
      },
    },
  },
};

module.exports = buildWizard(config);
