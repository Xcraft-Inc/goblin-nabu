function _value(path) {
  if (path.isJSXExpressionContainer()) {
    path = path.get('expression');
  }

  const evaluated = path.evaluate();
  if (!evaluated.confident) {
    throw path.buildCodeFrameError('value is not statically evaluate-able');
  }

  return evaluated.value;
}

function _isRequireStatement(path, moduleSource) {
  if (!path.isCallExpression()) return false;

  const callee = path.get('callee');
  return (
    callee.isIdentifier() &&
    callee.node.name === 'require' &&
    argumentTypeCorrect(path, 0, arg => _value(arg) === moduleSource)
  );
}

function _referencesDefaultImport(self, moduleSource, importName) {
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

function _referencesDefaultRequire(self, moduleSource, importName) {
  if (!self.isReferencedIdentifier()) return false;

  const binding = self.scope.getBinding(self.node.name);
  if (!binding) return false;

  const path = binding.path;
  const parent = path.parentPath;
  if (!parent.isVariableDeclaration()) return false;

  const id = path.get('id');
  const init = path.get('init');

  if (
    id.isIdentifier() &&
    id.node.name === importName &&
    _isRequireStatement(init, moduleSource)
  ) {
    return true;
  }

  return false;
}

function _referencesDestructuredRequire(self, moduleSource, importName) {
  if (!self.isReferencedIdentifier()) return false;

  const binding = self.scope.getBinding(self.node.name);
  if (!binding) return false;

  const path = binding.path;
  const parent = path.parentPath;
  if (!parent.isVariableDeclaration()) return false;

  const id = path.get('id');
  const init = path.get('init');

  if (
    id.isObjectPattern() &&
    id.get('properties').some(prop => {
      if (!prop.isObjectProperty()) return false;

      const key = prop.get('key');
      return key.isIdentifier() && key.node.name === importName;
    }) &&
    _isRequireStatement(init, moduleSource)
  ) {
    return true;
  }

  return false;
}

function _referencesImport(path, mod, importedNames, isDefault) {
  if (!path.isIdentifier()) {
    return false;
  }

  return importedNames.some(name =>
    isDefault
      ? _referencesDefaultImport(path, mod, name)
      : path.referencesImport(mod, name)
  );
}

function _referencesRequire(path, mod, importedNames, isDefault) {
  if (!path.isIdentifier()) {
    return false;
  }

  return importedNames.some(name =>
    isDefault
      ? _referencesDefaultRequire(path, mod, name)
      : _referencesDestructuredRequire(path, mod, name)
  );
}

function extractStaticArg(path, argIndex) {
  if (argIndex >= path.node.arguments.length) {
    // If it does not exist, then ignore
    return null;
  }

  const arg = path.get('arguments.' + argIndex);
  return _value(arg);
}

function dedup(arr) {
  var hashTable = {};

  return arr.filter(function(el) {
    var key = JSON.stringify(el);
    var match = Boolean(hashTable[key]);

    return match ? false : (hashTable[key] = true);
  });
}

function isImported(path, mod, importedNames, isDefault) {
  return (
    _referencesImport(path, mod, importedNames, isDefault) ||
    _referencesRequire(path, mod, importedNames, isDefault)
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

module.exports = {
  dedup,
  extractStaticArg,
  argumentTypeCorrect,
  isImported,
  isMethod,
};
