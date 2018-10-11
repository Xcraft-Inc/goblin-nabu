'use strict';
const {buildWizard} = require('goblin-desktop');
const {crypto} = require('xcraft-core-utils');
const Shredder = require('xcraft-core-shredder');

function buildMessages(messages, locales) {
  const data = {
    header: [
      {
        name: 'nabuId',
        description: 'Id de traduction original',
        grow: '1',
        textAlign: 'left',
      },
    ],
    rows: [],
  };

  for (const locale of locales) {
    data.header.push({
      name: locale.name,
      description: locale.name,
      grow: '1',
      textAlign: 'left',
    });
  }

  data.rows = messages
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

  return data;
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
        path: `form.table.rows[${rowIndex}].updated`,
        newValue: true,
      });
    },
    updateLocal: function(quest, index, newLocal) {
      quest.me.change({
        path: `form.selectedLocales[${index}]`,
        newValue: newLocal,
      });
    },
  },
  steps: {
    showMessages: {
      mainButton: function(quest, form) {
        return {
          glyph: 'solid/arrow-right',
          text: `Save`,
          grow: '2',
        };
      },
      form: {},
      quest: function*(quest, form, next) {
        const r = quest.getStorage('rethink');

        const locales = yield r.getAll({
          table: 'locale',
        });

        var firstLocale = locales[0] ? locales[0].name : 'no locale';
        const nrColumn = 2;
        quest.me.change({
          path: 'form.nrColumn',
          newValue: nrColumn,
        });

        var selectedLocales = [];
        for (var i = 0; i < nrColumn; i++) {
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

        const nabuData = buildMessages(nabuMessages, locales);
        quest.me.change({
          path: 'form.table',
          newValue: nabuData,
        });

        quest.me.change({
          path: 'form.rowsNumber',
          newValue: nabuData.rows.length,
        });
      },
    },
    finish: {
      form: {},
      quest: function*(quest, form, next) {
        const r = quest.getStorage('rethink');

        const locales = yield r.getAll({
          table: 'locale',
        });

        for (const row of form.table.rows) {
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
