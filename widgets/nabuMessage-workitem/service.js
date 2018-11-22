const {buildWorkitem} = require('goblin-workshop');

const config = {
  type: 'nabuMessage',
  kind: 'workitem',
  hinters: {},
  quests: {},
};

// LoadTranslation (?? -> nabuTranslation@locales-messageGuid)

module.exports = buildWorkitem(config);
