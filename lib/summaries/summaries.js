'use strict';

const watt = require('gigawatts');
const {isShredder, isImmutable} = require('xcraft-core-shredder');
const Tr = require('goblin-nabu/lib/tr.js');

const buildLanguageSummariesRecursive = watt(function*(
  quest,
  field,
  localeName,
  next
) {
  if (Array.isArray(field)) {
    const newList = [];

    for (let item of field) {
      newList.push(
        yield buildLanguageSummariesRecursive(quest, item, localeName, next)
      );
    }
    return newList;
  } else if (typeof field === 'object' && !field.nabuId) {
    for (let key of Object.keys(field)) {
      field[key] = yield buildLanguageSummariesRecursive(
        quest,
        field[key],
        localeName,
        next
      );
    }
    return field;
  } else if (field.nabuId) {
    return yield Tr(quest, localeName, field, next);
  } else {
    return field;
  }
});

const buildLanguageSummaries = watt(function*(
  quest,
  summaries,
  multiLanguageSummaries,
  localeName,
  next
) {
  multiLanguageSummaries[localeName] = yield buildLanguageSummariesRecursive(
    quest,
    summaries,
    localeName,
    next
  );
});

const translateObject = watt(function*(quest, summaries, next) {
  const nabuApi = quest.getAPI('nabu');
  if (!nabuApi) {
    return summaries;
  }

  const nabu = yield nabuApi.get();
  if (!nabu) {
    return summaries;
  }

  const locales = nabu.get('locales');
  if (!locales || locales.length === 0) {
    return summaries;
  }

  const multiLanguageSummaries = {};

  for (let locale of locales) {
    buildLanguageSummaries(
      quest,
      summaries,
      multiLanguageSummaries,
      locale.get('name'),
      next.parallel()
    );
  }
  yield next.sync();

  return multiLanguageSummaries;
});

const buildMultiLanguageSummaries = watt(function*(quest, summaries, next) {
  if (isShredder(summaries) || isImmutable(summaries)) {
    throw new Error(
      'Cannot build multilanguage summaries of an Immutable/Shredder object'
    );
  }
});

//-----------------------------------------------------------------------------

module.exports = buildMultiLanguageSummaries;
