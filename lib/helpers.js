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

//-----------------------------------------------------------------------------

module.exports = {
  extractDesktopId,
  getToolbarId,
  computeMessageId,
  computeTranslationId,
};
