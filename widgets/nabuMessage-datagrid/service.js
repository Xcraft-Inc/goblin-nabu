'use strict';

const {buildWorkitem} = require('goblin-workshop');

const config = {
  type: 'nabuMessage',
  kind: 'datagrid',
  initialState: {},
  listStatus: ['draft', 'published'],
  listOrderBy: 'nabuId',
  listType: 'uniform',
  columns: [
    {
      name: 'missingTranslations',
      width: '40px',
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
    var secondLocale =
      locales.size > 1 ? `translations.${locales.get(1).get('name')}` : '';

    var firstColumn = currentLocale
      ? `translations.${currentLocale.get('name')}`
      : firstLocale;

    var secondColumn = firstColumn === firstLocale ? secondLocale : firstLocale;

    quest.me.change({
      path: 'columns[2].field',
      newValue: firstColumn,
    });
    quest.me.change({
      path: 'columns[3].field',
      newValue: secondColumn,
    });
  },
  quests: {
    changeSelectedLocale: function*(quest, index, locale, next) {
      const currentLocale = quest.goblin
        .getState()
        .get(`columns[${index}].field`);

      yield quest.me.change(
        {
          path: `columns[${index}].field`,
          newValue: locale,
        },
        next
      );

      const filters = quest.goblin.getState().get(`filters`);
      const sort = quest.goblin.getState().get('sort');

      if (
        (filters.get(currentLocale) != undefined &&
          filters.get(currentLocale) !== '') ||
        sort.get('key') === currentLocale
      ) {
        yield quest.me.resetListVisualization(next);
      }
    },
  },
};

module.exports = buildWorkitem(config);
