'use strict';

function isMarkDownWithRefs(summary) {
  return typeof summary === 'object' && summary._type === 'markdownWithRefs';
}

/* input:
{
  _type='markdownWithRefs',
  _string: 'abc@{ref}xyz',
  _refs: {ref:{...}}
}
*/
function applySplitTransform(summary) {
  var pattern = /((.*?)(@\{.+?\}))*/g;
  return {
    _type: summary._type,
    _array: summary._string.match(pattern).slice(1),
    _refs: summary._refs,
  };
}

/* input:
{
  _type='markdownWithRefs',
  _array: ['abc', '@{ref}', 'xyz'],
  _refs: {ref:{...}}
}
*/
function applyDereferenceTransform(summary) {
  return summary;
}

function dereferenceSummary(summary) {
  if (!isMarkDownWithRefs(summary)) {
    return summary;
  } else {
    const splittedSummary = applySplitTransform(summary);
    const dereferencedSummary = applyDereferenceTransform(splittedSummary);

    /*
    {
      _type='markdownWithRefs',
      _array: ['abc', {...}, 'xyz'],
      _refs: {ref:{...}}
    }
    */
    return dereferencedSummary._array;
  }
}

function dereferenceSummaries(summaries) {
  const newSummaries = {};

  for (let key of Object.keys(summaries)) {
    newSummaries[key] = dereferenceSummary(summaries[key]);
  }

  return newSummaries;
}

//-----------------------------------------------------------------------------

module.exports = dereferenceSummaries;
