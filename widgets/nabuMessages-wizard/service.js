'use strict';
const {buildWizard} = require('goblin-desktop');
const {crypto} = require('xcraft-core-utils');
const {
  buildFilterReql,
  buildOrderByReql,
} = require('goblin-rethink/helpers.js');
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

function computeHeaderField(selectedLocales, key) {
  if (key.startsWith('locale_')) {
    const localeKey = selectedLocales[parseInt(key.replace('locale_', ''))];

    if (localeKey && localeKey !== '') {
      return 'translations.' + localeKey;
    }
    return null;
  }

  return key;
}

const retrieveMessages = watt(function*(quest, filters, sort, next) {
  const nabuApi = quest.getAPI('nabu');
  const locales = (yield nabuApi.get()).get('locales');

  const r = quest.getStorage('rethink');
  let nabuMessages = [];

  const selectedLocales = quest.goblin
    .getState()
    .get('form.selectedLocales')
    .toJS();

  const sortKeyPath = computeHeaderField(selectedLocales, sort.get('key'));
  let sortKey = null;

  if (sortKeyPath) {
    const sortKeyArr = sortKeyPath.split('.');
    sortKey = sortKeyArr[sortKeyArr.length - 1];

    yield r.ensureSecondaryIndex(
      {
        table: 'nabuMessage',
        name: sortKey,
        path: sortKeyPath,
      },
      next
    );
  }

  if (!filters) {
    nabuMessages = Shredder.fromJS(
      yield r.getAll(
        {
          table: 'nabuMessage',
          orderBy: sortKey ? buildOrderByReql(sortKey, sort.get('dir')) : null,
        },
        next
      )
    );
  } else {
    nabuMessages = Shredder.fromJS(
      yield r.getAll(
        {
          table: 'nabuMessage',
          orderBy: sortKey ? buildOrderByReql(sortKey, sort.get('dir')) : null,
          filter: buildFilterReql(
            filters
              .mapEntries(entry => {
                return [
                  computeHeaderField(selectedLocales, entry[0]) || entry[0],
                  entry[1],
                ];
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
      const sort = quest.goblin.getState().get('form.sort');

      if (
        (filters.get(`locale_${index}`) != undefined &&
          filters.get(`locale_${index}`) !== '') ||
        sort.get('key') === 'locale_' + index
      ) {
        quest.me.change({
          path: `form.filters.locale_${index}`,
          newValue: '',
        });
        quest.me.change({
          path: `form.sort.key`,
          newValue: 'nabuId',
        });
        quest.me.change({
          path: `form.sort.dir`,
          newValue: 'asc',
        });

        yield retrieveMessages(
          quest,
          filters.set(`locale_${index}`, ''),
          sort.set('key', 'nabuId').set('dir', 'asc'),
          next
        );
      }
    },
    filter: function*(quest, field, value, next) {
      const filters = quest.goblin.getState().get('form.filters');
      const sort = quest.goblin.getState().get('form.sort');

      yield retrieveMessages(quest, filters.set(field, value), sort, next);
    },
    toggleSort: function*(quest, field, next) {
      const filters = quest.goblin.getState().get('form.filters');
      const sort = quest.goblin.getState().get('form.sort');

      const lastField = sort.get('key');
      const dir = sort.get('dir');
      let newDir = dir === 'asc' ? 'desc' : 'asc';

      if (field !== lastField) {
        newDir = 'asc'; // but if we sort by a new field, then by default an asc order is used
      }

      quest.me.change({
        path: `form.sort.key`,
        newValue: field,
      });

      quest.me.change({
        path: `form.sort.dir`,
        newValue: newDir,
      });

      yield retrieveMessages(
        quest,
        filters,
        sort.set('key', field).set('dir', newDir),
        next
      );
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
        sort: {
          key: 'nabuId',
          dir: 'asc',
        },
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

        yield retrieveMessages(
          quest,
          null,
          quest.goblin.getState().get('form.sort'),
          next
        );
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
