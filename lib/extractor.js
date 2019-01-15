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

  function createTdescriptor(path, info) {
    if (!info) {
      info = {};
    }
    const {isT, ...other} = info;

    return {
      nabuId: extractArg(path, 0, 'nabuId'),
      sources: [
        {
          description: extractArg(path, 1, 'description'),
          ...other,
        },
      ],
    };
  }

  function extractJsxComponent(path) {
    if (path) {
      if (path.isClassDeclaration()) {
        const id = path.get('id');
        if (id.isIdentifier()) {
          return id.node.name;
        }
      } else if (path.isCallExpression()) {
        const callee = path.get('callee');
        if (callee.isIdentifier() && callee.node.name === '_createClass') {
          const arg = path.get('arguments.0');
          if (arg.isIdentifier()) {
            return arg.node.name;
          }
        }
      }

      return extractJsxComponent(path.parentPath);
    }
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

  function isThisT(path) {
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

  function isImportedT(path) {
    const callee = path.get('callee');

    return isImported(callee, T_SOURCE_NAME, T_COMPONENT_NAMES, false);
  }

  function isWidgetT(path) {
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

  function isGlobalT(path) {
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
    const file = state.opts ? state.opts.file : null;
    const appName = state.opts ? state.opts.appName : null;
    const res = {
      isT: false,
      appName,
      path: file,
      location: path.node.loc,
    };

    if (isImportedT(path)) {
      res.isT = true;

      if (state.importsExist) {
        res.process = 'frontend';
        res.component = extractJsxComponent(path);
      } else {
        res.process = 'backend';
      }
    } else if (isWidgetT(path) || isThisT(path)) {
      res.isT = true;
      res.process = 'frontend';
      res.component = extractJsxComponent(path);
    } else if (isGlobalT(path)) {
      res.isT = true;
      res.process = 'backend';
    }

    return res;
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

      ImportDeclaration(path, state) {
        state.importsExist = true;
      },

      CallExpression(path, state) {
        const info = extract(path, state);

        if (info.isT && argumentsCorrect(path)) {
          const descriptor = createTdescriptor(path, info);
          storeMessage(descriptor, path, state);
        }
      },
    },
  };
};
