'use strict';

const $ = require('highland');
const watt = require('gigawatts');
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const {projectPath} = require('xcraft-core-host');
const T = require('goblin-nabu/widgets/helpers/t.js');
const {
  updateSources,

  addMessage,
  patchMessage,
  deleteMessage,

  retrieveJsFiles,
} = require('./extractor/extract-helpers.js');

const _extractFileMessages = watt(function* (
  quest,
  desktopId,
  babelCore,
  filePath,
  appName,
  wrapper,
  next
) {
  const relativePath = path.relative(projectPath, filePath);
  const nabuPath = require.resolve('goblin-nabu');
  const nabuPluginPath = path.join(
    nabuPath,
    '..',
    '/extractor/babel-plugin-extractor.js'
  );
  const opts = {
    presets: [
      '@babel/preset-react',
      [
        '@babel/preset-env',
        {
          targets: {node: 14},
        },
      ],
    ],
    plugins: [
      [nabuPluginPath, {appName, file: relativePath}],
      '@babel/proposal-class-properties',
      '@babel/proposal-object-rest-spread',
      '@babel/proposal-function-bind',
    ],
  };

  try {
    const content = yield fs.readFile(filePath, next);
    const res = babelCore.transform(content, opts);

    if (res) {
      if (res.metadata['nabu'].messages.length > 0) {
        quest.log.dbg(
          `found ${res.metadata['nabu'].messages.length} messages in file ${relativePath}`
        );
      }

      wrapper.messages = wrapper.messages.concat(res.metadata['nabu'].messages);

      if (wrapper.messages.length - wrapper.lastNotifMsgLength >= 100) {
        wrapper.lastNotifMsgLength = wrapper.messages.length;
        if (quest.hasAPI('desktop')) {
          const deskAPI = quest.getAPI(desktopId).noThrow();
          yield deskAPI.addNotification({
            notificationId: `nabu-extraction-progression`,
            color: 'green',
            glyph: 'solid/search',
            message: T(`{msgNbr} messages à traduire trouvés...`, '', {
              msgNbr: wrapper.messages.length,
            }),
          });
        } else {
          quest.log.info(
            `${wrapper.messages.lengt} messages à traduire trouvés...`
          );
        }
      }
    }
  } catch (err) {
    if (quest.hasAPI('desktop')) {
      const deskAPI = quest.getAPI(desktopId).noThrow();
      yield deskAPI.addNotification({
        color: 'red',
        glyph: 'solid/exclamation-triangle',
        message: `Error processing file ${relativePath}: ${err}`,
      });
    } else {
      quest.log.warn(`Error processing file ${relativePath}: ${err}`);
    }
  }
});

const extractMessages = function* (
  quest,
  desktopId,
  $appName,
  $appId,
  $variantId,
  $outputFile,
  $msg,
  next
) {
  const storageAvailable = quest.goblin.getX('storageAvailable');
  if (!storageAvailable) {
    throw new Error('Cannot extract messages because storage is not available');
  }

  const babelCore = require('@babel/core');

  /*
      source: {
        appName: '...',
        description: '',
        path: '...',
        process: 'frontend' | 'backend',
        component: '<JSX Component>',
        location: {
          start: {
            line: '..',
            column: '..'
          },
          end: {
            line: '..',
            column: '..'
          }
        }
      }
  */
  const appName = $appName || quest.goblin.getX('appName');
  const paths = retrieveJsFiles($appId, $variantId);
  const messagesWrapper = {
    messages: [],
    lastNotifMsgLength: 0,
  };

  yield $(paths)
    .map((filePath) => (n) => {
      _extractFileMessages(
        quest,
        desktopId,
        babelCore,
        filePath,
        appName,
        messagesWrapper,
        n
      );
    })
    .nfcall([])
    .parallel(10)
    .done(next);

  const r = quest.getStorage('rethink');
  const persistedMessages = (yield r.getAll({
    table: 'nabuMessage',
  })).map((message) => {
    // marking persisted sources as old
    message.sources = message.sources.map((source) => ({
      isOld: true,
      ...source,
    }));

    return message;
  });

  const persistedMessagesIds = persistedMessages.map((msg) => msg.id);
  const messagesIds = messagesWrapper.messages.map((msg) => msg.id);

  const messagesToDelete = _.without.apply(
    _,
    [persistedMessagesIds].concat(messagesIds)
  );
  const messagesToAdd = _.without.apply(
    _,
    [messagesIds].concat(persistedMessagesIds)
  );
  const messagesToPatch = _.without.apply(
    _,
    [messagesIds].concat(messagesToAdd)
  );

  const messagesMap = {};
  _(persistedMessages.concat(messagesWrapper.messages))
    .groupBy((msg) => msg.id)
    .map((group) => {
      return {
        id: group[0].id,
        nabuId: group[0].nabuId,
        sources: updateSources(
          _(group)
            .flatMap((group) => group.sources)
            .value(),
          appName
        ),
      };
    })
    .value()
    .forEach((msg) => (messagesMap[msg.id] = msg));

  for (let msgId of messagesToDelete) {
    deleteMessage(
      quest,
      messagesMap[msgId],
      desktopId,
      appName,
      $msg,
      next.parallel()
    );
  }

  for (let msgId of messagesToAdd) {
    addMessage(quest, messagesMap[msgId], desktopId, $msg, next.parallel());
  }

  for (let msgId of messagesToPatch) {
    patchMessage(quest, messagesMap[msgId], desktopId, $msg, next.parallel());
  }

  yield next.sync();

  const messages = Object.values(messagesMap);
  if ($outputFile) {
    const r = quest.getStorage('rethink');
    const translations = (yield r.getAll({
      table: 'nabuTranslation',
    })).reduce((state, t) => {
      const key = `${t.locale}@${t.messageId}`;
      state[key] = t.text;
      return state;
    }, {});
    //this file is usefull for the translator,
    //todo: configurable locales in output file
    const dataToSerialize = messages.map((m) => {
      return {
        id: m.id,
        source: m.nabuId,
        fr_CH: translations[`fr_CH@${m.id}`] || '',
        de_CH: translations[`de_CH@${m.id}`] || '',
      };
    });

    const fse = require('fs-extra');
    yield fse.writeJSON($outputFile, dataToSerialize);

    //this file is usefull for developpers,
    //showing what's has been extracted
    const devDataToSerialize = messages.map((m) => {
      return {
        id: m.id,
        nabuId: m.nabuId,
        sources: m.sources,
      };
    });
    const dirName = path.dirname($outputFile);
    const baseName = path.basename($outputFile);
    yield fse.writeJSON(
      path.join(dirName, `dev-${baseName}`),
      devDataToSerialize
    );
  }
  if (quest.hasAPI('desktop')) {
    const deskAPI = quest.getAPI(desktopId).noThrow();
    yield deskAPI.addNotification({
      color: 'green',
      message: T(`{msgNbr} messages à traduire ont été extraits`, '', {
        msgNbr: messages.length,
      }),
      glyph: 'solid/check',
    });
  } else {
    quest.log.info(`${messages.length} messages à traduire ont été extraits`);
  }
};

module.exports = {
  extractMessages,
};
