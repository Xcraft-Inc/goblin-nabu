'use strict';
const nabuConfig = require('xcraft-core-etc')().load('goblin-nabu');

if (nabuConfig.storageAvailable) {
  const {buildHinter} = require('goblin-elasticsearch');
  /**
   * Retrieve the list of available commands.
   *
   * @returns {Object} The list and definitions of commands.
   */
  exports.xcraftCommands = function() {
    return buildHinter({
      type: 'locale',
      fields: ['name'],
      title: 'Locales',
      newWorkitem: {
        name: 'locale-workitem',
        newEntityType: 'locale',
        view: 'default',
        icon: 'solid/map',
        mapNewValueTo: 'name',
        kind: 'tab',
        isClosable: true,
        navigate: true,
      },
      newButtonTitle: 'Nouvelle locale',
    });
  };
}
