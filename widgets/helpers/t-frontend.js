//T:2019-02-27
const {fromJS} = require('immutable');
const ToNabuObject = require('./t.js');

module.exports = function (...args) {
  return fromJS(ToNabuObject(...args));
};
