'use strict';

const Shredder = require('xcraft-core-shredder');

function isImmutable(text) {
  return text && (Shredder.isShredder(text) || Shredder.isImmutable(text));
}

function isTranslatableString(text) {
  return (
    text && typeof text === 'object' && text._type === 'translatableString'
  );
}

function isNabu(text) {
  return text && typeof text === 'object' && text.nabuId;
}

function isPrimitive(text) {
  return text && typeof text !== 'object';
}

function isEmpty(text) {
  return !text || !text.length === 0;
}

function first(array) {
  return array[0];
}

function last(array) {
  return array[array.length - 1];
}

class TranslatableString {
  constructor(text) {
    this._type = 'translatableString';
    this._string = [];

    this.append(text);
  }

  append(text) {
    if (isImmutable(text)) {
      text = text.toJS();
    }

    if (isEmpty(text)) {
      return;
    } else if (isPrimitive(text)) {
      this._addText(text);
    } else if (isNabu(text)) {
      this._addTranslation(text);
    } else if (isTranslatableString(text)) {
      this._merge(text);
    } else {
      throw new Error(
        `Cannot append to TranslatableString the following object: ${JSON.stringify(
          text
        )}`
      );
    }
  }

  toString() {
    if (this._string.length === 0) {
      return null;
    } else if (this._string.length === 1 && isPrimitive(first(this._string))) {
      return first(this._string);
    } else {
      // Cannot return this, otherwise error with transit.js
      return {
        _type: this._type,
        _string: this._string,
      };
    }
  }

  _addText(text) {
    if (this._string.length === 0 || !isPrimitive(last(this._string))) {
      this._string.push(text.toString());
    } else {
      this._string[this._string.length - 1] += text.toString();
    }
  }

  _addTranslation(text) {
    this._string.push(text);
  }

  _merge(text) {
    if (
      this._string.length > 0 &&
      isPrimitive(last(this._string)) &&
      text._string.length > 0 &&
      isPrimitive(first(text._string))
    ) {
      this._string[this._string.length - 1] += first(text._string);
      this._string = this._string.concat(text._string.slice(1));
    } else {
      this._string = this._string.concat(text._string);
    }
  }
}

class StringBuilder {
  static joinWords(array) {
    return StringBuilder._join(array, ' ');
  }

  static joinSentences(array) {
    return StringBuilder._join(array, ', ');
  }

  static joinHyphen(array) {
    return StringBuilder._join(array, ' — '); // U+2014: tiret cadratin
  }

  static joinLines(array) {
    return StringBuilder._join(array, '\n\n');
  }

  static join(array, separator) {
    return StringBuilder._join(array, separator);
  }

  static combine(...args) {
    if (args.length === 0) {
      return null;
    } else if (args.length === 1) {
      if (isImmutable(args[0])) {
        return args[0].toJS();
      } else {
        return args[0];
      }
    } else {
      const trString = new TranslatableString(args[0]);
      for (let i = 1; i < args.length; i++) {
        trString.append(args[i]);
      }

      return trString.toString();
    }
  }

  // TODO: ugly, better way?
  static _join(array, separator) {
    if (!array || array.length === 0) {
      return null;
    }
    const items = array.filter(item => !!item);
    const trString = new TranslatableString(items[0]);

    for (let i = 1; i < items.length; i++) {
      trString.append(separator);
      trString.append(items[i]);
    }

    return trString.toString();
  }

  // WARNING: Use for test and debug only!
  static _toFlatten(result) {
    if (isEmpty(result)) {
      return '';
    } else if (isPrimitive(result)) {
      return result;
    } else if (isNabu(result)) {
      return `@{${result.nabuId}}`;
    } else if (isTranslatableString(result)) {
      result = result._string;
      if (result && typeof result === 'object') {
        let a = '';
        for (const s of result) {
          a += StringBuilder._toFlatten(s);
        }
        return a;
      }
      return StringBuilder._toFlatten(result);
    }
  }
}

module.exports = StringBuilder;
