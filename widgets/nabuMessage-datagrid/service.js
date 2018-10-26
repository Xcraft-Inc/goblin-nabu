'use strict';

const {buildWorkitem} = require('goblin-workshop');

const config = {
  type: 'nabuMessage',
  kind: 'datagrid',
  initialStatuses: ['draft', 'published'],
  pageSize: 15,
};

module.exports = buildWorkitem(config);
