const _ = require('lodash');
const validate = require('uuid-validate');

function _isUuid(str) {
  return validate(str, 4);
}

function ToNabuObject(nabuId, description, values, html) {
  return {
    nabuId,
    description,
    html,
    values,
  };
}

function getToolbarId(widgetId) {
  // [other components]@desktop@[lower components]@[desktopId]@[other uuids]

  const elementsAfterDesktop = _.takeRightWhile(
    widgetId.split('@'),
    element => element !== 'desktop'
  ); // we take elements after desktop

  const elementsBeforeFirstUuid = _.takeWhile(
    elementsAfterDesktop,
    element => !_isUuid(element)
  ); // we take elements after desktop but before first uuid

  const firstUuid = _.find(elementsAfterDesktop, element => _isUuid(element)); // this is the desktop id

  return (
    'nabu-toolbar@desktop@' +
    elementsBeforeFirstUuid.join('@') +
    '@' +
    firstUuid
  );
}

//-----------------------------------------------------------------------------

module.exports = {
  T: ToNabuObject,
  getToolbarId,
};
