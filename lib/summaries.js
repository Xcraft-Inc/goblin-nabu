'use strict';

const watt = require('gigawatts');
const {isShredder, isImmutable} = require('xcraft-core-shredder');
const dereferenceSummaries = require('./summaries/dereference.js');
const buildMultiLanguageObject = require('./summaries/multilanguage.js');

const buildMultiLanguageSummaries = watt(function*(quest, summaries, next) {
  if (isShredder(summaries) || isImmutable(summaries)) {
    throw new Error(
      'Cannot build multilanguage summaries of an Immutable/Shredder object'
    );
  }

  const dereferencedSummaries = dereferenceSummaries(summaries);

  return yield buildMultiLanguageObject(quest, dereferencedSummaries, next);
});

//-----------------------------------------------------------------------------

module.exports = buildMultiLanguageSummaries;
