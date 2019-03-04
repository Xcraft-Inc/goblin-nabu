'use strict';

const watt = require('gigawatts');
const Tr = require('goblin-nabu/lib/tr.js');

const buildLanguageObjectRecursive = watt(function*(
  quest,
  field,
  localeName,
  fromCache,
  next
) {
  if (!field) {
    return field;
  } else if (Array.isArray(field)) {
    const newList = [];

    for (let item of field) {
      newList.push(
        yield buildLanguageObjectRecursive(
          quest,
          item,
          localeName,
          fromCache,
          next
        )
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
        fromCache,
        next
      );
    }
    return newObj;
  } else if (typeof field === 'object' && field.nabuId) {
    return yield Tr(quest, localeName, field, fromCache, next);
  } else {
    return field;
  }
});

const buildLanguageObject = watt(function*(
  quest,
  obj,
  multiLanguageObj,
  localeName,
  fromCache,
  next
) {
  multiLanguageObj[localeName] = yield buildLanguageObjectRecursive(
    quest,
    obj,
    localeName,
    fromCache,
    next
  );
});

const buildMultiLanguageObject = watt(function*(quest, obj, fromCache, next) {
  const nabuApi = quest.getAPI('nabu');
  const nabu = yield nabuApi.get();
  const multiLanguageObj = {};

  const locales = nabu.get('locales');
  if (!locales) {
    return multiLanguageObj;
  }

  for (let locale of locales) {
    buildLanguageObject(
      quest,
      obj,
      multiLanguageObj,
      locale.get('name'),
      fromCache,
      next.parallel()
    );
  }
  yield next.sync();

  return multiLanguageObj;
});

//-----------------------------------------------------------------------------

module.exports = buildMultiLanguageObject;
