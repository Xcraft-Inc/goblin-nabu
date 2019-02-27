'use strict';

const watt = require('gigawatts');
const dereferenceSummaries = require('./summaries/dereference.js');
const buildMultiLanguageObject = require('./summaries/multilanguage.js');

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
