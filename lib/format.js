'use strict';

const MessageFormat = require('messageformat');

const ESCAPED_CHARS = {
  '&': '&amp;',
  '>': '&gt;',
  '<': '&lt;',
  '"': '&quot;',
  "'": '&#x27;',
};

const UNSAFE_CHARS_REGEX = /[&><"']/g;

function escape(str) {
  return ('' + str).replace(UNSAFE_CHARS_REGEX, match => ESCAPED_CHARS[match]);
}

function escapeValues(rawValues) {
  return Object.keys(rawValues).reduce((escaped, name) => {
    const value = rawValues[name];
    escaped[name] = typeof value === 'string' ? escape(value) : value;
    return escaped;
  }, {});
}

function formatMessage(locale, html, message, values) {
  const formatter = new MessageFormat(locale).compile(message);
  return html ? formatter(escapeValues(values)) : formatter(values);
}

module.exports = formatMessage;
