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
    default: [],
  },
  {
    type: 'checkbox',
    name: 'apps',
    message: 'list of apps to handle',
    choices: [],
    default: [],
  },
];
