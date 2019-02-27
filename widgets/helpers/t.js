//T:2019-02-27

module.exports = function ToNabuObject(nabuId, description, values, html) {
  const nabuObject = {};

  // This is done so that we avoid having undefined fields (rethinkdb does not like it)
  if (nabuId) {
    nabuObject.nabuId = nabuId;
  }
  if (description) {
    nabuObject.description = description;
  }
  if (values) {
    nabuObject.values = values;
  }
  if (html) {
    nabuObject.html = html;
  }

  return nabuObject;
};
