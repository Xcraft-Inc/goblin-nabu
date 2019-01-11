const _ = require('lodash');

function ToNabuObject(nabuId, description, values, html) {
  return {
    nabuId,
    description,
    html,
    values,
  };
}

function getToolbarId(widgetId) {
  return (
    'nabu-toolbar@desktop@' +
    _.takeRightWhile(
      widgetId.split('@'),
      element => element !== 'desktop'
    ).join('@')
  );
}

//-----------------------------------------------------------------------------

module.exports = {
  T: ToNabuObject,
  getToolbarId,
};
