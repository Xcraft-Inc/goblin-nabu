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
    if (path.isExpressionStatement()) {
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
    return getTvalue(arg, name).trim();
  }

  function createTdescriptor(path, options) {
    if (!options) {
      options = {};
    }

    return {
      nabuId: extractArg(path, 0, 'nabuId'),
      description: extractArg(path, 1, 'description'),
      values: extractArg(path, 2, 'values'),
      html: extractArg(path, 3, 'html'),
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

  function argumentsCorrect(path) {
    if (
      path.node.arguments.length === 1 &&
      path.get('arguments.0').isSpreadElement()
    ) {
      return false; // We just ignore it in this case
    }

    return true;
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
        if (isBaseT(path, state) && argumentsCorrect(path)) {
          const descriptor = createTdescriptor(path);
          storeMessage(descriptor, path, state);
        }
      },
    },
  };
};
