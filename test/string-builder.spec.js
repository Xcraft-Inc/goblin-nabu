'use strict';

// To run test:
// npm test xcraft-core-converters

const assert = require('assert');
const StringBuilder = require('../lib/string-builder.js');
const T = require('goblin-nabu/widgets/helpers/t.js');

describe('String Builder', function() {
  it('#Test combineStrings', function() {
    const result = StringBuilder.combine('a', 'b', 'c');
    assert.equal('abc', result);
  });

  it('#Test combineNullsAndStringw', function() {
    const result = StringBuilder.combine('a', null, 'c');
    assert.equal('ac', result);
  });

  it('#Test combineNullsAndStrings2', function() {
    const result = StringBuilder.combine(null, 'b', 'c');
    assert.equal('bc', result);
  });

  it('#Test combineStringsAndT', function() {
    const result = StringBuilder.combine('hello ', T('world'));
    assert.equal('translatableString', result._type);
    assert.ok(result._string);
    assert.ok(result._refs);
    assert.equal(1, Object.keys(result._refs).length);
  });
});
