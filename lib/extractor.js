const T_COMPONENT_NAMES = ['T'];
const WIDGET_COMPONENT_NAMES = ['Widget'];
const T_SOURCE_NAME = 'goblin-nabu/widgets/helpers/t.js';
const WIDGET_SOURCE_NAME = 'laboratory/widget';

const {
  dedup,
  extractStaticArg,
  argumentTypeCorrect,
  isMethod,
  isImported,
} = require('./extract-helpers.js');

module.exports = function() {
  function storeMessage(msg, path, state) {
    state.T.messages.push(msg);
  }

  function extractArg(path, index, name) {
    try {
      return extractStaticArg(path, index);
    } catch (err) {
      throw path.buildCodeFrameError(
        'Argument ' +
          name +
          ' in T function must be statically evaluate-able for extraction.'
      );
    }
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

  function isBaseT(path, state) {
    const callee = path.get('callee');

    return isImported(callee, T_SOURCE_NAME, T_COMPONENT_NAMES, false);
  }

  function recurseThisT(path) {
    if (path.isThisExpression()) {
      return true;
    } else if (path.isReferencedIdentifier()) {
      const binding = path.scope.getBinding(path.node.name);
      return recurseThisT(binding.path);
    } else if (path.isVariableDeclarator()) {
      return recurseThisT(path.get('init'));
    }

    return false;
  }

  function isThisT(path, state) {
    const callee = path.get('callee');

    if (callee.isMemberExpression()) {
      const obj = callee.get('object');
      const prop = callee.get('property');

      if (isMethod(prop, T_COMPONENT_NAMES) && recurseThisT(obj)) {
        return true;
      }
    }

    return false;
  }

  function isWidgetT(path, state) {
    const callee = path.get('callee');

    if (callee.isMemberExpression()) {
      const obj = callee.get('object');
      const prop = callee.get('property');

      if (
        isImported(obj, WIDGET_SOURCE_NAME, WIDGET_COMPONENT_NAMES, true) &&
        isMethod(prop, T_COMPONENT_NAMES)
      ) {
        return true;
      }
    }

    return false;
  }

  function isGlobalT(path, state) {
    const callee = path.get('callee');

    if (callee.isMemberExpression()) {
      const obj = callee.get('object');
      const prop = callee.get('property');

      if (
        obj.isIdentifier() &&
        obj.node.name === 'global' &&
        isMethod(prop, T_COMPONENT_NAMES)
      ) {
        return true;
      }
    }

    return false;
  }

  function argumentsCorrect(path) {
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

    throw path.buildCodeFrameError(
      'T arguments must be statically evaluate-able for extraction. Signature is (nabuid: string, desc: string, values: object, html: bool).'
    );
  }

  function extract(path, state) {
    const isT =
      isBaseT(path, state) ||
      isWidgetT(path, state) ||
      isGlobalT(path, state) ||
      isThisT(path, state);

    return {
      isT,
    };
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
        const info = extract(path, state);

        if (info.isT && argumentsCorrect(path)) {
          const descriptor = createTdescriptor(path, info.opts);
          storeMessage(descriptor, path, state);
        }
      },
    },
  };
};
