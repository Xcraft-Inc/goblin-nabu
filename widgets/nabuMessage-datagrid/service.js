'use strict';

const {buildWorkitem} = require('goblin-workshop');

const config = {
  type: 'nabuMessage',
  kind: 'datagrid',
  initialStatuses: ['draft', 'published'],
  initialState: {},
  pageSize: 15,
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

    var firstLocale = locales.size > 0 ? locales.first().get('name') : '';

    quest.me.change({
      path: 'columns[2].field',
      newValue: currentLocale ? currentLocale.get('name') : firstLocale,
    });
    quest.me.change({
      path: 'columns[3].field',
      newValue: firstLocale,
    });
  },
};

module.exports = buildWorkitem(config);
