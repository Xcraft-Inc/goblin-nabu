'use strict';

const MessageFormat = require('@messageformat/core');
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
    if (locale) {
      locale = locale.replace(/_/g, '-');
    }
    const formatter = new MessageFormat(locale).compile(message);
    return html ? formatter(escapeValues(values)) : formatter(values);
  } catch (err) {
    throw new Error(
      `Error while formating ICU translation for message "${message}", locale "${locale}", values ${JSON.stringify(
        values
      )}. Original Error:\n${err}`
    );
  }
}

function parseParameters(message) {
  try {
    const tokens = [];
    parse(message, {tagsType: null, tokens: tokens});

    const parameters = tokens
      .filter((token) => token[0] === 'id')
      .map((token) => token[1]);

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
