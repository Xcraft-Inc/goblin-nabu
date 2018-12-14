const COMPONENT_NAMES = ['T'];
const DESCRIPTOR_PROPS = new Set(['msgid', 'desc']);
const MODULE_SOURCE_NAME = 'goblin-nabu/widgets/helpers/t.js';

module.exports = function() {
  function storeMessage(msg, path, state) {
    state.T.messages.push(msg);
  }

  function getModuleSourceName(opts) {
    return opts.moduleSourceName || MODULE_SOURCE_NAME;
  }

  function getTkey(path) {
    if (path.isIdentifier() || path.isJSXIdentifier()) {
      return path.node.name;
    }

    let evaluated = path.evaluate();
    if (evaluated.confident) {
      return evaluated.value;
    }

    throw path.buildCodeFrameError(
      '[T] msgid must be statically evaluate-able for extraction.'
    );
  }

  function getTvalue(path) {
    if (path.isJSXExpressionContainer()) {
      path = path.get('expression');
    }

    let evaluated = path.evaluate();
    if (evaluated.confident) {
      return evaluated.value;
    }

    throw path.buildCodeFrameError(
      '[T] msgid must be statically evaluate-able for extraction.'
    );
  }

  function createTdescriptor(propPaths, options) {
    if (!options) {
      options = {};
    }
    const isJSXSource = options.isJSXSource || false;

    return propPaths.reduce((hash, arr) => {
      let keyPath = arr[0];
      let valuePath = arr[1];
      let locPath = arr[2];

      let key = getTkey(keyPath);

      if (!DESCRIPTOR_PROPS.has(key)) {
        return hash;
      }

      hash[key] = {
        value: getTvalue(valuePath).trim(),
        loc: locPath.node,
      };
      return hash;
    }, {});
  }

  function referencesImport(path, mod, importedNames) {
    if (!path.isIdentifier()) {
      return false;
    }

    return importedNames.some(name => path.referencesImport(mod, name));
  }

  function referencesRequire(path, mod, importedNames) {
    return false; // TODO
  }

  function isBaseT(path, state) {
    const opts = state.opts;
    const moduleSourceName = getModuleSourceName(opts);

    const callee = path.get('callee');

    return (
      referencesImport(callee, moduleSourceName, COMPONENT_NAMES) ||
      referencesRequire(callee, moduleSourceName, COMPONENT_NAMES)
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

  function argumentsCorrect(path, state) {
    if (
      path.node.arguments.length === 1 &&
      path.get('arguments.0').isSpreadElement()
    ) {
      return false; // We do not throw any warning in this case, just ignoring it
    }

    if (
      argumentTypeCorrect(path, 0, arg => arg.isStringLiteral()) &&
      argumentTypeCorrect(path, 1, arg => arg.isStringLiteral()) &&
      argumentTypeCorrect(path, 2, arg => arg.isArrayExpression()) &&
      argumentTypeCorrect(path, 3, arg => arg.isBooleanLiteral())
    ) {
      return true;
    }

    throw path.buildCodeFrameError(
      'T arguments must be statically evaluable (strings) for extraction. Signature is (nabuid: string, desc: string, values: array, html: bool)'
    );
  }

  return {
    visitor: {
      Program: {
        enter(path, state) {
          state.T = {
            messages: [],
          };
        },

        exit(path, state) {
          const {file} = state;
          file.metadata['nabu'] = state.T;
        },
      },

      CallExpression(path, state) {
        if (isBaseT(path, state) && argumentsCorrect(path, state)) {
          console.log('base T');
          /*const attributes = path
            .get('attributes')
            .filter(attr => attr.isJSXAttribute());

          const descriptor = createTdescriptor(
            attributes.map(attr => [
              attr.get('name'),
              attr.get('value'),
              attr.get('loc'),
            ]),
            {
              isJSXSource: true,
            }
          );

          storeMessage(descriptor, path, state);*/
        }
      },
    },
  };
};
