'use strict';

const {buildWorkitem} = require('goblin-workshop');

const config = {
  type: 'locale',
  kind: 'workitem',
  quests: {},
  hinters: {},
};

module.exports = buildWorkitem(config);
