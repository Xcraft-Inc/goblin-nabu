'use strict';

const {buildWorkitem} = require('goblin-workshop');

const config = {
  type: 'nabuMessage',
  kind: 'datagrid',
};

module.exports = buildWorkitem(config);
