const _ = require('lodash');
const validate = require('uuid-validate');

function _isUuid(str) {
  return validate(str, 4);
}

function extractDesktopId(id) {
  if (!id || !id.includes('desktop')) {
    return null;
  }

  // [higher components]@desktop@[lower components]@[desktopId]@[other uuids]

  const elementsAfterDesktop = _.takeRightWhile(
    id.split('@'),
    element => element !== 'desktop'
  ); // we take elements after desktop

  const elementsBeforeFirstUuid = _.takeWhile(
    elementsAfterDesktop,
    element => !_isUuid(element)
  ); // we take elements after desktop but before first uuid

  const firstUuid = _.find(elementsAfterDesktop, element => _isUuid(element)); // this is the desktop id

  return `desktop@${elementsBeforeFirstUuid.join('@')}@${firstUuid}`;
}

function getToolbarId(widgetId) {
  const desktopId = extractDesktopId(widgetId);

  if (!desktopId) {
    console.warn(`cannot extract desktopId from widget ${widgetId}`);
    return;
  }

  return `nabu-toolbar@${desktopId}`;
}

//-----------------------------------------------------------------------------

module.exports = {
  extractDesktopId,
  getToolbarId,
};
