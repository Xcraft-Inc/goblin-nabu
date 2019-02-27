'use strict';

const watt = require('gigawatts');
const {isShredder, isImmutable} = require('xcraft-core-shredder');
const dereferenceSummaries = require('./summaries/dereference.js');
const buildMultiLanguageObject = require('./summaries/multilanguage.js');

function isMarkDownWithRefs(summary) {
  return typeof summary === 'object' && summary._type === 'markdownWithRefs';
}

function isNabu(summary) {
  return typeof summary === 'object' && summary.nabuId;
}

function joinSummaries(summaries) {
  for (let key of Object.keys(summaries)) {
    if (Array.isArray(summaries[key])) {
      summaries[key] = summaries[key].join();
    }
  }
}

const buildMultiLanguageSummaries = watt(function*(quest, summaries, next) {
  if (!summaries) {
    return summaries;
  }

  if (isShredder(summaries) || isImmutable(summaries)) {
    throw new Error(
      'Cannot build multilanguage summaries of an Immutable/Shredder object'
    );
  }

  const dereferencedSummaries = dereferenceSummaries(summaries);
  const translatedSummaries = yield buildMultiLanguageObject(
    quest,
    dereferencedSummaries,
    next
  );

  joinSummaries(translatedSummaries);
  return translatedSummaries;
});

//-----------------------------------------------------------------------------

module.exports = buildMultiLanguageSummaries;
