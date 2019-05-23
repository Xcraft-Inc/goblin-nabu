'use strict';

const assert = require('assert');
const StringBuilder = require('../lib/string-builder.js');
const T = require('goblin-nabu/widgets/helpers/t.js');

describe('StringBuilder Combine', function() {
  it('#Test Strings', function() {
    const result = StringBuilder.combine('a', 'b', 'c');
    assert.equal('abc', result);
  });

  it('#Test Numbers', function() {
    const result = StringBuilder.combine(1, 2, 3);
    assert.equal('123', result);
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
    assert.equal(2, result._string.length);
  });

  it('#Test NullAndT', function() {
    const result = StringBuilder.combine(null, T('world'));
    assert.equal('translatableString', result._type);
    assert.ok(result._string);
    assert.equal(1, result._string.length);
  });

  it('#Test MultipleTAndStrings', function() {
    const result = StringBuilder.combine(T('hello'), T('world'), '!!!');
    assert.equal('translatableString', result._type);
    assert.ok(result._string);
    assert.equal(3, result._string.length);
  });

  it('#Test MultipleTranslatableStrings', function() {
    const result1 = StringBuilder.combine(T('hello'), ',', ' ');
    const result2 = StringBuilder.combine(T('world'), '!!!');
    const result3 = StringBuilder.combine(result1, result2);
    assert.equal('translatableString', result3._type);
    assert.ok(result3._string);
    assert.equal(4, result3._string.length);
  });
});

describe('StringBuilder Join', function() {
  it('#Test Strings', function() {
    const result = StringBuilder.join(['a', 'b', 'c'], ',');
    assert.equal('a,b,c', result);
  });

  it('#Test Nulls', function() {
    const result = StringBuilder.join([null, null], ',');
    assert.equal(null, result);
  });

  it('#Test StringsAndNulls', function() {
    const result = StringBuilder.joinSentences([null, 'a', null, 'b']);
    assert.equal('a, b', result);
  });

  it('#Test StringsAndT', function() {
    const result = StringBuilder.joinSentences([null, 'a', T('b'), 'c']);
    assert.equal('translatableString', result._type);
    assert.ok(result._string);
    assert.equal(3, result._string.length);
  });

  it('#Test TAndTranslatableStrings', function() {
    const result = StringBuilder.joinSentences([null, 'a', T('b'), 'c']);
    const result2 = StringBuilder.joinSentences([result, null, T('d')]);
    assert.equal('translatableString', result2._type);
    assert.ok(result2._string);
    assert.equal(4, result2._string.length);
  });

  // prettier-ignore
  it('#Test MultipleTranslatableStrings', function() {
    const result1 = StringBuilder.joinSentences([null, 'a', T('b'), 'c']);
    const result2 = StringBuilder.joinSentences([null, 'd', T('e'), 'f']);
    const result3 = StringBuilder.joinSentences([result1, result2, 'g', 'h', T('i'),]);
    assert.equal('translatableString', result3._type);
    assert.ok(result3._string);
    assert.equal(6, result3._string.length);
  });

  // prettier-ignore
  it('#Test joinWords', function() {
    assert.equal(StringBuilder._toFlatten(StringBuilder.joinWords(['a',   'b']      )), "a b");
    assert.equal(StringBuilder._toFlatten(StringBuilder.joinWords( 'a',   'b'       )), "a b");
    assert.equal(StringBuilder._toFlatten(StringBuilder.joinWords(['a',   'b',  'c'])), "a b c");
    assert.equal(StringBuilder._toFlatten(StringBuilder.joinWords( 'a',   'b',  'c' )), "a b c");
    assert.equal(StringBuilder._toFlatten(StringBuilder.joinWords(['a', T('b'), 'c'])), "a @{b} c");
    assert.equal(StringBuilder._toFlatten(StringBuilder.joinWords( 'a', T('b'), 'c' )), "a @{b} c");
  });
});

describe('StringBuilder _toFlatten', function() {
  it('#Test empty', function() {
    assert.equal(StringBuilder._toFlatten(''), '');
  });

  // prettier-ignore
  it('#Test single', function() {
    assert.equal(StringBuilder._toFlatten(  "coucou" ),                            "coucou");
    assert.equal(StringBuilder._toFlatten(T("coucou")),                            "@{coucou}");
    assert.equal(StringBuilder._toFlatten(StringBuilder.join([  "coucou" ], ".")), "coucou");
    assert.equal(StringBuilder._toFlatten(StringBuilder.join([T("coucou")], ".")), "@{coucou}");
    assert.equal(StringBuilder._toFlatten(T("a|b|coucou")),                        "@{a|b|coucou}");
  });

  // prettier-ignore
  it('#Test mix', function() {
    assert.equal(StringBuilder._toFlatten(StringBuilder.join([  "a",    "b" ], ".")), "a.b");
    assert.equal(StringBuilder._toFlatten(StringBuilder.join([T("a"), T("b")], ".")), "@{a}.@{b}");
    assert.equal(StringBuilder._toFlatten(StringBuilder.join([T("a"),   "b" ], ".")), "@{a}.b");
    assert.equal(StringBuilder._toFlatten(StringBuilder.join([  "a",  T("b")], ".")), "a.@{b}");
  });
});
