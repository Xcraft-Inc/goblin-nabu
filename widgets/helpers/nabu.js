import {computeMessageId} from '../../lib/helpers.js';
import Widget from 'goblin-laboratory/widgets/widget/index.js';
import {translationWithContextAndSublocale} from '../../lib/gettext.js';
import Shredder from 'xcraft-core-shredder';
import {formatMessage} from '../../lib/format.js';

const T = function (nabuId, description, values = {}) {
  const state = new Shredder(window.renderer.store.getState());

  let locale = null;
  const localeId = Widget.getUserSession(state).get('locale');
  if (!localeId) {
    return formatMessage(null, true, nabuId, values);
  }

  const locales = state.get('backend.nabu.locales');
  if (!locales) {
    return formatMessage(null, true, nabuId, values);
  }

  locale = locales.find((locale) => locale.get('name') === localeId);
  if (!locale || !locale.get('name')) {
    return formatMessage(null, true, nabuId, values);
  }

  locale = locale.get('name');
  const translation = translationWithContextAndSublocale(
    nabuId,
    locale,
    (nabuId) => computeMessageId(nabuId),
    (translation) => translation,
    (msgId, localeName) =>
      state.get(`backend.nabu.translations.${msgId}.${localeName}`)
  );
  return formatMessage(locale, true, translation || nabuId, values);
};

export default T;
