'use strict';

const {buildWorkitem} = require('goblin-workshop');

const config = {
  type: 'nabuMessage',
  kind: 'datagrid',
  initialStatuses: ['draft', 'published'],
  initialState: {},
  listOrderBy: 'nabuId',
  columns: [
    {
      name: 'missingTranslations',
    },
    {
      name: 'nabuId',
      field: 'nabuId',
      sortable: true,
      filterable: true,
    },
    {
      name: 'locale_1',
      sortable: true,
      filterable: true,
    },
    {
      name: 'locale_2',
      sortable: true,
      filterable: true,
    },
  ],
  afterCreate: function*(quest) {
    const nabuApi = quest.getAPI('nabu');
    const configApi = quest.getAPI('nabuConfiguration@main');

    const locales = (yield nabuApi.get()).get('locales');
    const currentLocaleId = (yield configApi.get()).get('localeId');
    const currentLocale = locales.find(
      locale => locale.get('id') === currentLocaleId
    );

    var firstLocale =
      locales.size > 0 ? `translations.${locales.first().get('name')}` : '';

    quest.me.change({
      path: 'columns[2].field',
      newValue: currentLocale
        ? `translations.${currentLocale.get('name')}`
        : firstLocale,
    });
    quest.me.change({
      path: 'columns[3].field',
      newValue: firstLocale,
    });
  },
  quests: {
    changeSelectedLocale: function(quest, index, locale) {
      quest.me.change({
        path: `columns[${index}].field`,
        newValue: locale,
      });
      /*
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
      }*/
    },
  },
};

module.exports = buildWorkitem(config);
