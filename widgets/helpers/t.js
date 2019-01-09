function ToNabuObject(nabuId, description, values, html) {
  return {
    nabuId,
    description,
    html,
    values,
  };
}

//-----------------------------------------------------------------------------

module.exports = {
  T: ToNabuObject,
};
