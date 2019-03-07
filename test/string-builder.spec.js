'use strict';

// To run test:
// npm test xcraft-core-converters

const assert = require('assert');
const StringBuilder = require('../lib/string-builder.js');
const T = require('goblin-nabu/widgets/helpers/t.js');

describe('String Builder Combine', function() {
  it('#Test Strings', function() {
    const result = StringBuilder.combine('a', 'b', 'c');
    assert.equal('abc', result);
  });

  it('#Test NullsAndStringw', function() {
    const result = StringBuilder.combine('a', null, 'c');
    assert.equal('ac', result);
  });

  it('#Test NullsAndStrings2', function() {
    const result = StringBuilder.combine(null, 'b', 'c');
    assert.equal('bc', result);
  });

  it('#Test StringsAndT', function() {
    const result = StringBuilder.combine('hello ', T('world'));
    assert.equal('translatableString', result._type);
    assert.ok(result._string);
    assert.ok(result._refs);
    assert.equal(1, Object.keys(result._refs).length);
  });

  it('#Test NullAndT', function() {
    const result = StringBuilder.combine(null, T('world'));
    assert.equal('translatableString', result._type);
    assert.ok(result._string);
    assert.ok(result._refs);
    assert.equal(1, Object.keys(result._refs).length);
  });

  it('#Test MultipleTAndStrings', function() {
    const result = StringBuilder.combine(T('hello'), T('world'), '!!!');
    assert.equal('translatableString', result._type);
    assert.ok(result._string);
    assert.ok(result._refs);
    assert.equal(2, Object.keys(result._refs).length);
  });

  it('#Test MultipleTranslatableStrings', function() {
    const result1 = StringBuilder.combine(T('hello'), ', ');
    const result2 = StringBuilder.combine(T('world'), '!!!');
    const result3 = StringBuilder.combine(result1, result2);
    assert.equal('translatableString', result3._type);
    assert.ok(result3._string);
    assert.ok(result3._refs);
    assert.equal(2, Object.keys(result3._refs).length);
  });
});

describe('String Builder Join', function() {
  it('#Test Strings', function() {
    const result = StringBuilder.join(['a', 'b', 'c'], ',');
    assert.equal('a,b,c', result);
  });

  it('#Test Nulls', function() {
    const result = StringBuilder.join([null, null], ',');
    assert.equal('', result);
  });

  it('#Test StringsAndNulls', function() {
    const result = StringBuilder.joinSentences([null, 'a', null, 'b']);
    assert.equal('a, b', result);
  });

  it('#Test StringsAndT', function() {
    const result = StringBuilder.joinSentences([null, 'a', T('b'), 'c']);
    assert.equal('translatableString', result._type);
    assert.ok(result._string);
    assert.ok(result._refs);
    assert.equal(1, Object.keys(result._refs).length);
  });

  it('#Test TAndTranslatableStrings', function() {
    const result = StringBuilder.joinSentences([null, 'a', T('b'), 'c']);
    const result2 = StringBuilder.joinSentences([result, null, T('d')]);
    assert.equal('translatableString', result2._type);
    assert.ok(result2._string);
    assert.ok(result2._refs);
    assert.equal(2, Object.keys(result2._refs).length);
  });
});
