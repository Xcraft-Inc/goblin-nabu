'use strict';

const watt = require('gigawatts');
const {isGenerator} = require('xcraft-core-utils/lib/js.js');

function wattify(handler) {
  if (isGenerator(handler)) {
    return watt(handler);
  }

  return handler;
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
      array.slice(0, -1).join('/'),
      msgId,
      translationValidFunc,
      accessTranslationFunc
    );
  }
}

const translationWithSublocaleAsync = watt(function*(
  locale,
  msgId,
  translationValidFunc,
  accessTranslationGen,
  next
) {
  accessTranslationGen = wattify(accessTranslationGen);
  const array = locale.split('/');
  const translation = yield accessTranslationGen(msgId, locale, next);

  if (array.length === 1 || translationValidFunc(translation)) {
    // No sublocales or translation found
    return translation;
  } else {
    return yield translationWithSublocaleAsync(
      array.slice(0, -1).join('/'),
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
  const array = nabuId.split('|');
  const msgId = accessMsgIdFunc(nabuId);
  const translation = translationWithSublocale(
    locale,
    msgId,
    translationValidFunc,
    accessTranslationFunc
  );

  if (array.length === 1 || translationValidFunc(translation)) {
    // No context or a translation found for given context
    return translation;
  } else {
    return translationWithContextAndSublocale(
      array.slice(1).join('|'),
      locale,
      accessMsgIdFunc,
      translationValidFunc,
      accessTranslationFunc
    );
  }
}

const translationWithContextAndSublocaleAsync = watt(function*(
  nabuId,
  locale,
  accessMsgIdFunc,
  translationValidFunc,
  accessTranslationGen,
  next
) {
  const array = nabuId.split('|');
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
      array.slice(1).join('|'),
      locale,
      accessMsgIdFunc,
      translationValidFunc,
      accessTranslationGen,
      next
    );
  }
});

module.exports = {
  translationWithContextAndSublocale,
  translationWithContextAndSublocaleAsync,
};
