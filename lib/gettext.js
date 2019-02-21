'use strict';

const watt = require('gigawatts');
const {isGenerator} = require('xcraft-core-utils/lib/js.js');

function wattify(handler) {
  if (isGenerator(handler)) {
    return watt(handler);
  }

  return handler;
}

function messageWithContext(nabuId, accessMsgIdFunc, accessMsgFunc) {
  const array = nabuId.split('::');
  const msgId = accessMsgIdFunc(nabuId);
  const message = accessMsgFunc(msgId);

  if (array.length === 1 || message) {
    // No context or message found
    return {
      msgId,
      message,
    };
  } else {
    return messageWithContext(
      array.slice(1).join(),
      accessMsgIdFunc,
      accessMsgFunc
    );
  }
}

const messageWithContextAsync = watt(function*(
  nabuId,
  accessMsgIdFunc,
  accessMsgGen,
  next
) {
  accessMsgGen = wattify(accessMsgGen);
  const array = nabuId.split('::');
  const msgId = accessMsgIdFunc(nabuId);
  const message = yield accessMsgGen(msgId, next);

  if (array.length === 1 || message) {
    // No context or message found
    return {
      msgId,
      message,
    };
  } else {
    return yield messageWithContextAsync(
      array.slice(1).join(),
      accessMsgIdFunc,
      accessMsgGen,
      next
    );
  }
});

function translationWithSublocale(locale, accessTranslationFunc) {
  const array = locale.split('/');
  const translation = accessTranslationFunc(locale);

  if (array.length === 1 || (translation && translation.get('text'))) {
    // No sublocales or translation found
    return translation;
  } else {
    return translationWithSublocale(
      array.slice(0, -1).join(),
      accessTranslationFunc
    );
  }
}

const translationWithSublocaleAsync = watt(function*(
  locale,
  accessTranslationGen,
  next
) {
  accessTranslationGen = wattify(accessTranslationGen);
  const array = locale.split('/');
  const translation = yield accessTranslationGen(locale, next);

  if (array.length === 1 || (translation && translation.get('text'))) {
    // No sublocales or translation found
    return translation;
  } else {
    return yield translationWithSublocaleAsync(
      array.slice(0, -1).join(),
      accessTranslationGen,
      next
    );
  }
});

module.exports = {
  messageWithContext,
  messageWithContextAsync,
  translationWithSublocale,
  translationWithSublocaleAsync,
};
