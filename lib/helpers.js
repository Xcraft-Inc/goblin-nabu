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
  const canonicalizedLocaleName = canonicalizeLocaleName(localeName);

  if (canonicalizedLocaleName.includes('/')) {
    const locale = canonicalizedLocaleName.split('/')[0];
    const sublocale = canonicalizedLocaleName.split('/').slice(1).join('/');

    return `${locale.split('_')[0]}/${sublocale}`;
  } else {
    return canonicalizedLocaleName.split('_')[0];
  }
}

function findBestLocale(locales, localeName, avoidCompareLanguages) {
  // Compare name exactly
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

  if (!avoidCompareLanguages) {
    // Compare lang exactly (en_US matches en but not en_GB)
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
    if (bestLocale) {
      return bestLocale.get('name');
    }
    // Last resort, take the first available locale
    bestLocale = locales.size > 0 ? locales.first() : null;
    return bestLocale ? bestLocale.get('name') : null;
  } else {
    return null;
  }
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
