module.exports = function ToNabuObject(nabuId, description, values, html) {
  return {
    nabuId,
    description,
    html,
    values,
  };
};
