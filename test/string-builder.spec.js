'use strict';

const assert = require('assert');
const StringBuilder = require('../lib/string-builder.js');
const T = require('goblin-nabu/widgets/helpers/t.js');

describe('goblin.nabu', function () {
  describe('StringBuilder Combine', function () {
    it('Strings', function () {
      const result = StringBuilder.combine('a', 'b', 'c');
      assert.strictEqual(result, 'abc');
    });

    it('Numbers', function () {
      const result = StringBuilder.combine(1, 2, 3);
      assert.strictEqual(result, '123');
    });

    it('NullsAndStringw', function () {
      const result = StringBuilder.combine('a', null, 'c');
      assert.strictEqual(result, 'ac');
    });

    it('NullsAndStrings2', function () {
      const result = StringBuilder.combine(null, 'b', 'c');
      assert.strictEqual(result, 'bc');
    });

    it('StringsAndT', function () {
      const result = StringBuilder.combine('hello ', T('world'));
      assert.strictEqual(result._type, 'translatableString');
      assert.ok(result._string);
      assert.strictEqual(result._string.length, 2);
    });

    it('NullAndT', function () {
      const result = StringBuilder.combine(null, T('world'));
      assert.strictEqual(result._type, 'translatableString');
      assert.ok(result._string);
      assert.strictEqual(result._string.length, 1);
    });

    it('MultipleTAndStrings', function () {
      const result = StringBuilder.combine(T('hello'), T('world'), '!!!');
      assert.strictEqual(result._type, 'translatableString');
      assert.ok(result._string);
      assert.strictEqual(result._string.length, 3);
    });

    it('MultipleTranslatableStrings', function () {
      const result1 = StringBuilder.combine(T('hello'), ',', ' ');
      const result2 = StringBuilder.combine(T('world'), '!!!');
      const result3 = StringBuilder.combine(result1, result2);
      assert.strictEqual(result3._type, 'translatableString');
      assert.ok(result3._string);
      assert.strictEqual(result3._string.length, 4);
    });
  });

  describe('StringBuilder Join', function () {
    it('Strings', function () {
      const result = StringBuilder.join(['a', 'b', 'c'], ',');
      assert.strictEqual(result, 'a,b,c');
    });

    it('Nulls', function () {
      const result = StringBuilder.join([null, null], ',');
      assert.strictEqual(result, '');
    });

    it('StringsAndNulls', function () {
      const result = StringBuilder.joinSentences([null, 'a', null, 'b']);
      assert.strictEqual(result, 'a, b');
    });

    it('StringsAndT', function () {
      const result = StringBuilder.joinSentences([null, 'a', T('b'), 'c']);
      assert.strictEqual(result._type, 'translatableString');
      assert.ok(result._string);
      assert.strictEqual(result._string.length, 3);
    });

    it('TAndTranslatableStrings', function () {
      const result = StringBuilder.joinSentences([null, 'a', T('b'), 'c']);
      const result2 = StringBuilder.joinSentences([result, null, T('d')]);
      assert.strictEqual(result2._type, 'translatableString');
      assert.ok(result2._string);
      assert.strictEqual(result2._string.length, 4);
    });

    // prettier-ignore
    it('MultipleTranslatableStrings', function() {
    const result1 = StringBuilder.joinSentences([null, 'a', T('b'), 'c']);
    const result2 = StringBuilder.joinSentences([null, 'd', T('e'), 'f']);
    const result3 = StringBuilder.joinSentences([result1, result2, 'g', 'h', T('i'),]);
    assert.strictEqual(result3._type, 'translatableString');
    assert.ok(result3._string);
    assert.strictEqual(result3._string.length, 6);
  });

    // prettier-ignore
    it('joinWords', function() {
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.joinWords(['a',   'b']      )), "a b");
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.joinWords( 'a',   'b'       )), "a b");
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.joinWords(['a',   'b',  'c'])), "a b c");
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.joinWords( 'a',   'b',  'c' )), "a b c");
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.joinWords(['a', T('b'), 'c'])), "a @{b} c");
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.joinWords( 'a', T('b'), 'c' )), "a @{b} c");
  });
  });

  // prettier-ignore
  describe('StringBuilder mix', function() {
  it('mix 1', function() {
    const x = StringBuilder.joinWords(T('a'), 'b');
    const y = StringBuilder.joinWords('c', 'd');
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.joinWords(x, y)), '@{a} b c d');
  });

  it('mix 2', function() {
    const x = StringBuilder.joinWords('a', T('b'));
    const y = StringBuilder.joinWords('c', 'd');
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.joinWords(x, y)), 'a @{b} c d');
  });

  it('mix 3', function() {
    const x = StringBuilder.joinWords('a', 'b');
    const y = StringBuilder.joinWords(T('c'), 'd');
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.joinWords(x, y)), 'a b @{c} d');
  });

  it('mix 4', function() {
    const x = StringBuilder.joinWords('a', 'b');
    const y = StringBuilder.joinWords('c', T('d'));
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.joinWords(x, y)), 'a b c @{d}');
  });

  it('mix 5', function() {
    const x = StringBuilder.joinWords(T('a'), T('b'));
    const y = StringBuilder.joinWords('c', 'd');
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.joinWords(x, y)), '@{a} @{b} c d');
  });

  it('mix 6', function() {
    const x = StringBuilder.joinWords('a', 'b');
    const y = StringBuilder.joinWords(T('c'), T('d'));
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.joinWords(x, y)), 'a b @{c} @{d}');
  });

  it('mix full', function() {
    const x = StringBuilder.joinWords(T('a'), T('b'));
    const y = StringBuilder.joinWords(T('c'), T('d'));
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.joinWords(x, y)), '@{a} @{b} @{c} @{d}');
  });

});

  describe('StringBuilder _toFlatten', function () {
    it('empty', function () {
      assert.strictEqual(StringBuilder._toFlatten(''), '');
    });

    // prettier-ignore
    it('single', function() {
    assert.strictEqual(StringBuilder._toFlatten(  "coucou" ),                            "coucou");
    assert.strictEqual(StringBuilder._toFlatten(T("coucou")),                            "@{coucou}");
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.join([  "coucou" ], ".")), "coucou");
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.join([T("coucou")], ".")), "@{coucou}");
    assert.strictEqual(StringBuilder._toFlatten(T("a|b|coucou")),                        "@{a|b|coucou}");
  });

    // prettier-ignore
    it('mix', function() {
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.join([  "a",    "b" ], ".")), "a.b");
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.join([T("a"), T("b")], ".")), "@{a}.@{b}");
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.join([T("a"),   "b" ], ".")), "@{a}.b");
    assert.strictEqual(StringBuilder._toFlatten(StringBuilder.join([  "a",  T("b")], ".")), "a.@{b}");
  });
  });
});
