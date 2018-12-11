'use strict';
const {buildHinter} = require('goblin-elasticsearch');
/**
 * Retrieve the list of available commands.
 *
 * @returns {Object} The list and definitions of commands.
 */
exports.xcraftCommands = function() {
  return buildHinter({
    type: 'nabuMessage',
    subTypes: ['nabuTranslation'],
    subJoins: ['ownerId'],
    fields: ['info', 'text'],
    title: 'Messages',
    newWorkitem: {
      name: 'nabuMessage-workitem',
      newEntityType: 'nabuMessage',
      view: 'default',
      icon: 'solid/map',
      mapNewValueTo: 'nabuId',
      kind: 'tab',
      isClosable: true,
      navigate: true,
    },
    newButtonTitle: 'Nouveaux message',
  });
};
