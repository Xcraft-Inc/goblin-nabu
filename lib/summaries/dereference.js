'use strict';

function dereferenceSummary(summary) {}

function dereferenceSummaries(summaries) {
  const newSummaries = {};

  for (let key of Object.keys(summaries)) {
    newSummaries[key] = dereferenceSummary(summaries[key]);
  }
}

//-----------------------------------------------------------------------------

module.exports = dereferenceSummaries;
