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
    subJoins: ['messageId'],
    fields: ['info'],
    title: 'Messages',
  });
};
