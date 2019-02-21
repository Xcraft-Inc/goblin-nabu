'use strict';

const watt = require('gigawatts');

function messageWithContext(nabuId, accessMsgIdFunc, accessMsgFunc) {
  const msgId = accessMsgIdFunc(nabuId);

  return {
    msgId,
    message: accessMsgFunc(msgId),
  };
}

const messageWithContextAsync = watt(function*(
  nabuId,
  accessMsgIdFunc,
  accessMsgGen,
  next
) {
  accessMsgGen = watt(accessMsgGen);
  const msgId = accessMsgIdFunc(nabuId);

  return {
    msgId,
    message: yield accessMsgGen(msgId, next),
  };
});

function translationWithSublocale(locale, accessTranslationFunc) {
  return accessTranslationFunc(locale);
}

const translationWithSublocaleAsync = watt(function*(
  locale,
  accessTranslationGen,
  next
) {
  accessTranslationGen = watt(accessTranslationGen);

  return yield accessTranslationGen(locale, next);
});

module.exports = {
  messageWithContext,
  messageWithContextAsync,
  translationWithSublocale,
  translationWithSublocaleAsync,
};
