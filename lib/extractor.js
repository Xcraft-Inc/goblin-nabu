const COMPONENT_NAMES = ['T'];
const MODULE_SOURCE_NAME = 'goblin-nabu/widgets/helpers/t.js';

module.exports = function() {
  function storeMessage(msg, path, state) {
    state.T.messages.push(msg);
  }

  function dedup(arr) {
    var hashTable = {};

    return arr.filter(function(el) {
      var key = JSON.stringify(el);
      var match = Boolean(hashTable[key]);

      return match ? false : (hashTable[key] = true);
    });
  }

  function getModuleSourceName(opts) {
    return opts.moduleSourceName || MODULE_SOURCE_NAME;
  }

  function getTvalue(path, name) {
    if (path.isJSXExpressionContainer()) {
      path = path.get('expression');
    }

    let evaluated = path.evaluate();
    if (evaluated.confident) {
      return evaluated.value;
    }

    throw path.buildCodeFrameError(
      'Argument ' +
        name +
        ' in T function must be statically evaluate-able for extraction.'
    );
  }

  function extractArg(path, argIndex, name) {
    if (argIndex >= path.node.arguments.length) {
      // If it does not exist, then ignore
      return null;
    }

    const arg = path.get('arguments.' + argIndex);
    return getTvalue(arg, name);
  }

  function createTdescriptor(path, options) {
    if (!options) {
      options = {};
    }

    return {
      nabuId: extractArg(path, 0, 'nabuId'),
      description: extractArg(path, 1, 'description'),
    };
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

  function isWrappedT(path, state) {
    const callee = path.get('callee');

    if (callee.isMemberExpression()) {
      const prop = callee.get('property');

      if (
        prop.isIdentifier() &&
        COMPONENT_NAMES.some(name => prop.node.name === name)
      ) {
        return true;
      }
    }

    return false;
  }

  function argumentTypeCorrect(path, argIndex, checkFunc) {
    if (argIndex >= path.node.arguments.length) {
      // If it does not exist, then ignore
      return true;
    }

    const arg = path.get('arguments.' + argIndex);
    return checkFunc(arg);
  }

  function argumentsCorrect(path, throwEx) {
    if (
      path.node.arguments.length === 1 &&
      path.get('arguments.0').isSpreadElement()
    ) {
      return false; // We just ignore it in this case
    }

    if (
      argumentTypeCorrect(path, 0, arg => arg.isStringLiteral()) &&
      argumentTypeCorrect(path, 1, arg => arg.isStringLiteral()) &&
      argumentTypeCorrect(path, 2, arg => arg.isObjectExpression()) &&
      argumentTypeCorrect(path, 3, arg => arg.isBooleanLiteral())
    ) {
      return true;
    }

    if (throwEx) {
      throw path.buildCodeFrameError(
        'T arguments must be statically evaluate-able for extraction. Signature is (nabuid: string, desc: string, values: object, html: bool).'
      );
    }
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
          state.T.messages = dedup(state.T.messages);
          file.metadata['nabu'] = state.T;
        },
      },

      CallExpression(path, state) {
        if (
          (isBaseT(path, state) && argumentsCorrect(path, true)) ||
          (isWrappedT(path, state) && argumentsCorrect(path, false))
        ) {
          const descriptor = createTdescriptor(path);
          storeMessage(descriptor, path, state);
        }
      },
    },
  };
};
