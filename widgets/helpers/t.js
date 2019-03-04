//T:2019-02-27

const fasterStringify = require('faster-stable-stringify');

const cache = {};

module.exports = function ToNabuObject(nabuId, description, values, html) {
  if (!nabuId) {
    throw new Error('Error in function T: nabuId is undefined');
  }
  if (typeof nabuId !== 'string') {
    throw new Error('Error in function T: nabuId is not a string');
  }
  if (description && typeof description !== 'string') {
    throw new Error('Error in function T: description is not a string');
  }
  if (values && typeof values !== 'object') {
    throw new Error('Error in function T: values is not an object');
  }
  if (html && typeof html !== 'boolean') {
    throw new Error('Error in function T: html is not a boolean');
  }

  const refId = `${nabuId}.${description || ''}.${
    values && Object.keys(values).length > 0 ? fasterStringify(values) : ''
  }.${html || ''}`;

  if (!cache[refId]) {
    const nabuObject = {};

    // This is done so that we avoid having undefined fields (rethinkdb does not like it)
    nabuObject.nabuId = nabuId;

    if (description) {
      nabuObject.description = description;
    }
    if (values) {
      nabuObject.values = values;
    }
    if (html) {
      nabuObject.html = html;
    }

    cache[refId] = nabuObject;
  }

  return cache[refId];
};
