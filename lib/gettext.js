'use strict';

const watt = require('gigawatts');
const {isGenerator} = require('xcraft-core-utils/lib/js.js');

function wattify(handler) {
  if (isGenerator(handler)) {
    return watt(handler);
  }

  return handler;
}

function translationWithSublocale(locale, msgId, accessTranslationFunc) {
  const array = locale.split('/');
  const translation = accessTranslationFunc(msgId, locale);

  if (array.length === 1 || (translation && translation.get('text'))) {
    // No sublocales or translation found
    return translation;
  } else {
    return translationWithSublocale(
      array.slice(0, -1).join('/'),
      msgId,
      accessTranslationFunc
    );
  }
}

const translationWithSublocaleAsync = watt(function*(
  locale,
  msgId,
  accessTranslationGen,
  next
) {
  accessTranslationGen = wattify(accessTranslationGen);
  const array = locale.split('/');
  const translation = yield accessTranslationGen(msgId, locale, next);

  if (array.length === 1 || (translation && translation.get('text'))) {
    // No sublocales or translation found
    return translation;
  } else {
    return yield translationWithSublocaleAsync(
      array.slice(0, -1).join('/'),
      msgId,
      accessTranslationGen,
      next
    );
  }
});

function translationWithContextAndSublocale(
  nabuId,
  locale,
  accessMsgIdFunc,
  accessTranslationFunc
) {
  const array = nabuId.split('::');
  const msgId = accessMsgIdFunc(nabuId);
  const translation = translationWithSublocale(
    locale,
    msgId,
    accessTranslationFunc
  );

  if (array.length === 1 || (translation && translation.get('text'))) {
    // No context or a translation found for given context
    return translation;
  } else {
    return translationWithContextAndSublocale(
      array.slice(1).join('::'),
      locale,
      accessMsgIdFunc,
      accessTranslationFunc
    );
  }
}

const translationWithContextAndSublocaleAsync = watt(function*(
  nabuId,
  locale,
  accessMsgIdFunc,
  accessTranslationGen,
  next
) {
  const array = nabuId.split('::');
  const msgId = accessMsgIdFunc(nabuId);
  const translation = yield translationWithSublocaleAsync(
    locale,
    msgId,
    accessTranslationGen,
    next
  );

  if (array.length === 1 || (translation && translation.get('text'))) {
    // No context or a translation found for given context
    return translation;
  } else {
    return yield translationWithContextAndSublocaleAsync(
      array.slice(1).join('::'),
      locale,
      accessMsgIdFunc,
      accessTranslationGen,
      next
    );
  }
});

module.exports = {
  translationWithContextAndSublocale,
  translationWithContextAndSublocaleAsync,
};
