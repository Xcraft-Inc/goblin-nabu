const MD5 = require('md5.js');

function extractDesktopId(id) {
  if (!id || !id.includes('desktop')) {
    return null;
  }

  //Handle desktop id itself
  if (id.startsWith('desktop@')) {
    return id;
  }

  // [higher components]@desktop@[mandate]@[session]@[other uuids]
  const parts = id.split('@');
  const mandate = parts[2];
  const session = parts[3];
  return `desktop@${mandate}@${session}`;
}

function getToolbarId(widgetId) {
  const desktopId = extractDesktopId(widgetId);

  if (!desktopId) {
    console.warn(`cannot extract desktopId from widget ${widgetId}`);
    return;
  }

  return `nabu-toolbar@${desktopId}`;
}

function computeMessageId(nabuId) {
  const id = new MD5().update(nabuId).digest('hex');
  return `nabuMessage@${id.slice(0, 16)}`;
}

function computeTranslationId(messageId, localeName) {
  return `nabuTranslation@${localeName}@${messageId.split('@')[1]}`;
}

function canonicalizeLocaleName(localeName) {
  return localeName.toLowerCase().replace('-', '_');
}

function getLocaleLanguage(localeName) {
  return canonicalizeLocaleName(localeName).split('_')[0];
}

function findBestLocale(locales, localeName) {
  // Compare name exacly
  let bestLocale = locales.find((l) => l.get('name') === localeName);
  if (bestLocale) {
    return bestLocale.get('name');
  }
  // Compare name approximately (en_US matches en-us)
  bestLocale = locales.find(
    (l) =>
      canonicalizeLocaleName(l.get('name')) ===
      canonicalizeLocaleName(localeName)
  );
  if (bestLocale) {
    return bestLocale.get('name');
  }
  // Compare lang exacly (en_US matches en but not en_GB)
  bestLocale = locales.find(
    (l) =>
      canonicalizeLocaleName(l.get('name')) === getLocaleLanguage(localeName)
  );
  if (bestLocale) {
    return bestLocale.get('name');
  }
  // Compare lang only (en_US matches en_GB)
  bestLocale = locales.find(
    (l) =>
      canonicalizeLocaleName(getLocaleLanguage(l.get('name'))) ===
      getLocaleLanguage(localeName)
  );
  return bestLocale ? bestLocale.get('name') : null;
}

//-----------------------------------------------------------------------------

module.exports = {
  extractDesktopId,
  getToolbarId,
  computeMessageId,
  computeTranslationId,

  findBestLocale,
  canonicalizeLocaleName,
  getLocaleLanguage,
};
