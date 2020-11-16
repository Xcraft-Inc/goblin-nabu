'use strict';

/**
 * Retrieve the inquirer definition for xcraft-core-etc
 */
module.exports = [
  {
    type: 'confirm',
    name: 'storageAvailable',
    message: 'Storage available',
    default: true,
  },
  {
    type: 'checkbox',
    name: 'locales',
    message: 'list of loaded locales',
    choices: [],
    default: ['fr_CH', 'de_CH'],
  },
];
