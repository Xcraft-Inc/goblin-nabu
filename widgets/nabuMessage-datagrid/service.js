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
      field: null,
      sortable: true,
      filterable: true,
    },
    {
      name: 'locale_2',
      field: null,
      sortable: true,
      filterable: true,
    },
  ],
  afterCreate: function(quest) {
    console.log('after create');
  },
};

module.exports = buildWorkitem(config);
