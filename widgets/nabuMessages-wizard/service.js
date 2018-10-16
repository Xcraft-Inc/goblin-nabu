'use strict';
const {buildWizard} = require('goblin-desktop');
const {crypto} = require('xcraft-core-utils');
const Shredder = require('xcraft-core-shredder');

function buildMessages(messages, locales) {
  return messages
    .map(message => {
      const row = {
        nabuId: message.get('nabuId'),
        updated: false,
      };

      for (const locale of locales) {
        row[locale.name] = message.getIn(['translations', locale.name], '');
      }

      return row;
    })
    .toArray();
}

const config = {
  name: 'nabuMessages',
  title: 'Affichage de toutes les traductions en cours',
  dialog: {
    width: '800px',
  },

  quests: {
    updateMessage: function(quest, rowIndex) {
      quest.me.change({
        path: `form.messages[${rowIndex}].updated`,
        newValue: true,
      });
    },
    changeSelectedLocale: function(quest, index, locale) {
      quest.me.change({
        path: `form.selectedLocales[${index}]`,
        newValue: locale,
      });
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
      form: {},
      quest: function*(quest, form, next) {
        const nabuApi = quest.getAPI('nabu');
        const r = quest.getStorage('rethink');

        const locales = (yield nabuApi.get()).get('locales').toJS();

        var firstLocale = locales[0] ? locales[0].name : '';
        const columnsNumber = 2;
        quest.me.change({
          path: 'form.columnsNumber',
          newValue: columnsNumber,
        });

        var selectedLocales = [];
        for (var i = 0; i < columnsNumber; i++) {
          selectedLocales[i] = firstLocale;
        }
        quest.me.change({
          path: 'form.selectedLocales',
          newValue: selectedLocales,
        });

        const nabuMessages = Shredder.fromJS(
          yield r.getAll({
            table: 'nabuMessage',
          })
        );

        const messages = buildMessages(nabuMessages, locales);
        quest.me.change({
          path: 'form.messages',
          newValue: messages,
        });

        quest.me.change({
          path: 'form.rowsNumber',
          newValue: messages.length,
        });
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
