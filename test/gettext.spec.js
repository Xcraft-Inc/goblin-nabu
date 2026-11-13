'use strict';

const assert = require('assert');

describe('goblin.nabu', function () {
  describe('gettext', function () {
    const {splitContext} = require('../lib/gettext.js');

    it('splitContext', function () {
      const strings = {
        ['foobar']: 'foobar',
        ['foo bar']: 'foo bar',
        ['ctx|foobar']: 'foobar',
        ['ctx| foobar ']: ' foobar ',
        ['ctx 1|foobar']: 'foobar',
        ['ctx 1| foobar ']: ' foobar ',
        ['notctx | foobar ']: 'notctx | foobar ' /* It's not a context here */,
        ['ctx1|ctx2|foobar']: 'foobar',
        ['notctx1 |notctx2|foobar']: 'notctx1 |notctx2|foobar',
        [' notctx1|notctx2|foobar']: ' notctx1|notctx2|foobar',
        ['ctx1| notctx2|foobar']: ' notctx2|foobar',
        ['ctx1|notctx2 |foobar']: 'notctx2 |foobar',
        ['ctx 1| notctx 2|foobar']: ' notctx 2|foobar',
        ['ctx 1|notctx 2 |foobar']: 'notctx 2 |foobar',
        ['|foobar']: '|foobar',
        ['ctx||foobar']: '|foobar',
        ['']: '',
        ['|']: '|',
        ['||']: '||',
        ['| |']: '| |',
        ['ctx| |']: ' |',
      };

      for (const [input, output] of Object.entries(strings)) {
        const result = splitContext(input);
        assert.strictEqual(output, result[result.length - 1]);
      }
    });
  });
});
