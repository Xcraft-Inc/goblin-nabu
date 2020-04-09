'use strict';

const watt = require('gigawatts');

function reduceContext(array) {
  if (array.length > 2) {
    // context with hierarchy (a|b|c|nabuId)
    const reducedContext = array.slice(0, -2);
    const text = array[array.length - 1];

    return reducedContext.join('|') + '|' + text;
  } else if (array.length === 2) {
    // context without hierarchy (a|nabuId)
    return array[1];
  } else {
    return array[0];
  }
}

function reduceLocale(array) {
  return array.slice(0, -1).join('/');
}

function translationWithSublocale(
  locale,
  msgId,
  translationValidFunc,
  accessTranslationFunc
) {
  const array = locale.split('/');
  const translation = accessTranslationFunc(msgId, locale);

  if (array.length === 1 || translationValidFunc(translation)) {
    // No sublocales or translation found
    return translation;
  } else {
    return translationWithSublocale(
      reduceLocale(array),
      msgId,
      translationValidFunc,
      accessTranslationFunc
    );
  }
}

const translationWithSublocaleAsync = watt(function* (
  locale,
  msgId,
  translationValidFunc,
  accessTranslationGen,
  next
) {
  const array = locale.split('/');
  const translation = yield* accessTranslationGen(msgId, locale, next);

  if (array.length === 1 || translationValidFunc(translation)) {
    // No sublocales or translation found
    return translation;
  } else {
    return yield translationWithSublocaleAsync(
      reduceLocale(array),
      msgId,
      translationValidFunc,
      accessTranslationGen,
      next
    );
  }
});

function translationWithContextAndSublocale(
  nabuId,
  locale,
  accessMsgIdFunc,
  translationValidFunc,
  accessTranslationFunc
) {
  const array = splitContext(nabuId);
  const msgId = accessMsgIdFunc(nabuId);
  const translation = translationWithSublocale(
    locale,
    msgId,
    translationValidFunc,
    accessTranslationFunc
  );

  if (array.length === 1 || translationValidFunc(translation)) {
    // No context or translation found for given context
    return translation;
  } else {
    return translationWithContextAndSublocale(
      reduceContext(array),
      locale,
      accessMsgIdFunc,
      translationValidFunc,
      accessTranslationFunc
    );
  }
}

const translationWithContextAndSublocaleAsync = watt(function* (
  nabuId,
  locale,
  accessMsgIdFunc,
  translationValidFunc,
  accessTranslationGen,
  next
) {
  const array = splitContext(nabuId);
  const msgId = accessMsgIdFunc(nabuId);
  const translation = yield translationWithSublocaleAsync(
    locale,
    msgId,
    translationValidFunc,
    accessTranslationGen,
    next
  );

  if (array.length === 1 || translationValidFunc(translation)) {
    // No context or a translation found for given context
    return translation;
  } else {
    return yield translationWithContextAndSublocaleAsync(
      reduceContext(array),
      locale,
      accessMsgIdFunc,
      translationValidFunc,
      accessTranslationGen,
      next
    );
  }
});

function splitContext(nabuId) {
  /* nabuId:
   *   'context 1|context 2|The string which is using a | for the example'
   * output:
   *   [ 'context 1',
   *     'context 2',
   *     'The string which is using a | for the example' ]
   */
  return nabuId.split('|').reduce((acc, val) => {
    if (/^(\s)/.test(val)) {
      acc[acc.length - 1] += `|${val}`;
    } else {
      acc.push(val);
    }
    return acc;
  }, []);
}

function removeContext(nabuId) {
  if (nabuId && nabuId.includes('|')) {
    // Remove possible context
    const array = splitContext(nabuId);
    if (array.length > 1) {
      return array[array.length - 1];
    }
  }

  return nabuId;
}

module.exports = {
  translationWithContextAndSublocale,
  translationWithContextAndSublocaleAsync,
  splitContext,
  removeContext,
};
