const {buildWorkitem} = require('goblin-workshop');

const config = {
  type: 'nabuMessage',
  kind: 'workitem',
  hinters: {},
  quests: {},
};

module.exports = buildWorkitem(config);
