const {extractDesktopId} = require('goblin-nabu/lib/helpers.js');

function ToNabuObject(nabuId, description, values, html) {
  return {
    nabuId,
    description,
    html,
    values,
  };
}

function getToolbarId(widgetId) {
  const desktopId = extractDesktopId(widgetId);

  if (!desktopId) {
    console.warn(`cannot extract desktopId from widget ${widgetId}`);
    return 'nabu-toolbar';
  }

  return `nabu-toolbar@${desktopId}`;
}

//-----------------------------------------------------------------------------

module.exports = {
  T: ToNabuObject,
  getToolbarId,
};
