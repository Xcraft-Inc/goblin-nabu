'use strict';

const MessageFormat = require('messageformat');
const parse = require('format-message-parse');

const ESCAPED_CHARS = {
  '&': '&amp;',
  '>': '&gt;',
  '<': '&lt;',
  '"': '&quot;',
  "'": '&#x27;',
};

const UNSAFE_CHARS_REGEX = /[&><"']/g;

function escape(str) {
  return ('' + str).replace(
    UNSAFE_CHARS_REGEX,
    (match) => ESCAPED_CHARS[match]
  );
}

function escapeValues(rawValues) {
  return Object.keys(rawValues).reduce((escaped, name) => {
    const value = rawValues[name];
    escaped[name] = typeof value === 'string' ? escape(value) : value;
    return escaped;
  }, {});
}

function formatMessage(locale, html, message, values) {
  try {
    const formatter = new MessageFormat(locale).compile(message);
    return html ? formatter(escapeValues(values)) : formatter(values);
  } catch (err) {
    throw new Error(
      `Error during translation: wrong ICU for message "${message}", locale "${locale}", values ${JSON.stringify(
        values
      )}`
    );
  }
}

function parseParameters(message) {
  try {
    const tokens = [];
    parse(message, {tagsType: null, tokens: tokens});

    const parameters = tokens
      .filter((token) => token[0] === 'id')
      .map((token) => parameters.push(token[1]));

    return {
      error: null,
      parameters,
    };
  } catch (err) {
    return {
      error: err.message || err,
      parameters: [],
    };
  }
}

module.exports = {
  formatMessage,
  parseParameters,
};
