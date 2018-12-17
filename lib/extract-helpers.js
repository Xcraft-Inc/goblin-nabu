function _referencesCustomDefaultImport(self, moduleSource, importName) {
  if (!self.isReferencedIdentifier()) return false;

  const binding = self.scope.getBinding(self.node.name);
  if (!binding || binding.kind !== 'module') return false;

  const path = binding.path;
  const parent = path.parentPath;
  if (!parent.isImportDeclaration()) return false;

  // check moduleSource
  if (parent.node.source.value === moduleSource) {
    if (!importName) return true;
  } else {
    return false;
  }

  if (path.isImportDefaultSpecifier()) {
    return true;
  }

  return false;
}

function _referencesImport(path, mod, importedNames) {
  if (!path.isIdentifier()) {
    return false;
  }

  return importedNames.some(
    name =>
      path.referencesImport(mod, name) ||
      _referencesCustomDefaultImport(path, mod, name)
  );
}

function _referencesRequire(path, mod, importedNames) {
  if (!path.isIdentifier()) {
    return false;
  }

  return false;
}

function _getStaticValue(path) {
  if (path.isJSXExpressionContainer()) {
    path = path.get('expression');
  }

  let evaluated = path.evaluate();
  if (evaluated.confident) {
    return evaluated.value;
  }

  throw 'value is not static';
}

function extractStaticArg(path, argIndex) {
  if (argIndex >= path.node.arguments.length) {
    // If it does not exist, then ignore
    return null;
  }

  const arg = path.get('arguments.' + argIndex);
  return _getStaticValue(arg);
}

function dedup(arr) {
  var hashTable = {};

  return arr.filter(function(el) {
    var key = JSON.stringify(el);
    var match = Boolean(hashTable[key]);

    return match ? false : (hashTable[key] = true);
  });
}

function isImported(path, mod, importedNames) {
  return (
    _referencesImport(path, mod, importedNames) ||
    _referencesRequire(path, mod, importedNames)
  );
}

function argumentTypeCorrect(path, argIndex, checkFunc) {
  if (argIndex >= path.node.arguments.length) {
    // If it does not exist, then ignore
    return true;
  }

  const arg = path.get('arguments.' + argIndex);
  return checkFunc(arg);
}

function isMethod(path, methodNames) {
  if (!path.isIdentifier()) {
    return false;
  }

  return methodNames.some(name => path.node.name === name);
}

module.exports.dedup = dedup;

module.exports.extractStaticArg = extractStaticArg;
module.exports.argumentTypeCorrect = argumentTypeCorrect;

module.exports.isImported = isImported;
module.exports.isMethod = isMethod;
