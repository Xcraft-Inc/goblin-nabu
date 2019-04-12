'use strict';
const {isShredder, isImmutable} = require('xcraft-core-shredder');
const flatten = require('lodash/flatten');

function isTranslatableMarkdown(summary) {
  return (
    typeof summary === 'object' && summary._type === 'translatableMarkdown'
  );
}

/* input:
{
  _type='translatableMarkdown',
  _string: 'abc@{ref}xyz',
  _refs: {ref:{...}}
}
*/
function applySplitTransform(summary) {
  const globalPattern = /(?:.*?(?:@{.+?}))/gs;
  const subPattern = /(.*?)(@{.+?})/s;
  let lastPart = '';
  const matches = summary._string.match(globalPattern).map(match => {
    const res = match.match(subPattern);
    return [res[1], res[2]];
  });

  if (matches.length > 0) {
    const lastRefId = matches[matches.length - 1][1];
    const index = summary._string.lastIndexOf(lastRefId);
    lastPart = summary._string.slice(index + lastRefId.length);
  }

  const res = flatten(matches);
  res.push(lastPart);

  return {
    _type: summary._type,
    _array: res,
    _refs: summary._refs,
  };
}

/* input:
{
  _type='translatableMarkdown',
  _array: ['abc', '@{ref}', 'xyz'],
  _refs: {ref:{...}}
}
*/
function applyDereferenceTransform(summary) {
  return {
    _type: summary._type,
    _array: summary._array.map(item => {
      if (item.startsWith('@{') && item.endsWith('}')) {
        return summary._refs[item.slice(2, item.length - 1)];
      } else {
        return item;
      }
    }),
  };
}

function dereferenceSummary(summary) {
  if (isShredder(summary) || isImmutable(summary)) {
    summary = summary.toJS();
  }

  if (!isTranslatableMarkdown(summary)) {
    return summary;
  } else {
    const splittedSummary = applySplitTransform(summary);
    const dereferencedSummary = applyDereferenceTransform(splittedSummary);

    /*
    {
      _type='translatableMarkdown',
      _array: ['abc', {...}, 'xyz'],
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
