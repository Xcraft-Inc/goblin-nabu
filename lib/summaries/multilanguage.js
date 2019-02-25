'use strict';

const watt = require('gigawatts');
const Tr = require('goblin-nabu/lib/tr.js');

const buildLanguageObjectRecursive = watt(function*(
  quest,
  field,
  localeName,
  next
) {
  if (!field) {
    return field;
  } else if (Array.isArray(field)) {
    const newList = [];

    for (let item of field) {
      newList.push(
        yield buildLanguageObjectRecursive(quest, item, localeName, next)
      );
    }
    return newList;
  } else if (typeof field === 'object' && !field.nabuId) {
    const newObj = {};

    for (let key of Object.keys(field)) {
      newObj[key] = yield buildLanguageObjectRecursive(
        quest,
        field[key],
        localeName,
        next
      );
    }
    return newObj;
  } else if (typeof field === 'object' && field.nabuId) {
    return yield Tr(quest, localeName, field, next);
  } else {
    return field;
  }
});

const buildLanguageObject = watt(function*(
  quest,
  obj,
  multiLanguageObj,
  localeName,
  next
) {
  multiLanguageObj[localeName] = yield buildLanguageObjectRecursive(
    quest,
    obj,
    localeName,
    next
  );
});

const buildMultiLanguageObject = watt(function*(quest, obj, next) {
  const nabuApi = quest.getAPI('nabu');
  if (!nabuApi) {
    return obj;
  }

  const nabu = yield nabuApi.get();
  if (!nabu) {
    return obj;
  }

  const locales = nabu.get('locales');
  if (!locales || locales.length === 0) {
    return obj;
  }

  const multiLanguageObj = {};

  for (let locale of locales) {
    buildLanguageObject(
      quest,
      obj,
      multiLanguageObj,
      locale.get('name'),
      next.parallel()
    );
  }
  yield next.sync();

  return multiLanguageObj;
});

//-----------------------------------------------------------------------------

module.exports = buildMultiLanguageObject;
