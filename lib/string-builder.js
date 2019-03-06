'use strict';

const crypto = require('xcraft-core-utils/lib/crypto.js');
const fasterStringify = require('faster-stable-stringify');

function isTranslatableString(text) {
  return (
    text && typeof text === 'object' && text._type === 'translatableString'
  );
}

function isNabu(text) {
  return text && typeof text === 'object' && text.nabuId;
}

function isString(text) {
  return text && typeof text === 'string';
}

function isEmpty(text) {
  return !text || !text.length === 0;
}

class TranslatableString {
  constructor(text) {
    this._type = 'translatableString';
    this._string = '';
    this._refs = {};

    this.append(text);
  }

  append(text) {
    if (isEmpty(text)) {
      return;
    } else if (isString(text)) {
      this._string += text;
    } else if (isNabu(text)) {
      this._addTranslation(text);
    } else if (isTranslatableString(text)) {
      this._mergeRefs(text);
      this._string += text._string;
    } else {
      throw new Error(
        `Cannot append to TranslatableString the following object: ${JSON.stringify(
          text
        )}`
      );
    }
  }

  toString() {
    if (Object.keys(this._refs).length > 0) {
      return this;
    } else {
      return this._string;
    }
  }

  _addTranslation(text) {
    // TODO: other way to avoid fasterStringify???
    const plainRef = `${text.nabuId}.${text.description || ''}.${
      text.values && Object.keys(text.values).length > 0
        ? fasterStringify(text.values)
        : ''
    }.${text.html || ''}`;

    const refId = crypto.md5(plainRef).slice(0, 16);
    const refWrapper = `@{${refId}}`;

    this._string += refWrapper;

    if (!this._refs[refId]) {
      this._refs[refId] = text;
    }

    return refWrapper;
  }

  _mergeRefs(text) {
    for (let refId of Object.keys(text._refs)) {
      if (!this._refs[refId]) {
        this._refs[refId] = text._refs[refId];
      }
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
      return args[0];
    } else {
      const firstString = args[0];
    }

    if (MarkdownBuilder._isEmpty(title)) {
      return;
    }
    if (
      MarkdownBuilder._isMarkdown(title) ||
      MarkdownBuilder._isTranslatableMarkdown(title)
    ) {
      throw new Error(`Markdown not accepted in title: ${title}`);
    }
    if (MarkdownBuilder._isNabu(title)) {
      this._formatted += `# `;
      this._addNabuRef(title);
      this._formatted += `\n`;
      return;
    }
    this._formatted += `# ${title}\n`;
  }

  static _join(array, separator) {
    if (!array || array.length === 0) {
      return null;
    }
    return array
      .filter(item => !!item)
      .map(item => {
        if (MarkdownBuilder._isNabu(item)) {
          return this._addNabuRef(item, true);
        } else {
          return item;
        }
      })
      .join(separator);
  }
}

module.exports = StringBuilder;
