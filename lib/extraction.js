'use strict';

const $ = require('highland');
const watt = require('gigawatts');
const path = require('path');
const fse = require('fs-extra');
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
    const content = fse.readFileSync(filePath);
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
            `${wrapper.messages.length} messages à traduire trouvés...`
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

const _deleteMessage = watt(function* (
  quest,
  messagesMap,
  msgId,
  desktopId,
  appName,
  $msg
) {
  yield deleteMessage(quest, messagesMap[msgId], desktopId, appName, $msg);
  delete messagesMap[msgId];
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

  for (const msgId of messagesToDelete) {
    _deleteMessage(
      quest,
      messagesMap,
      msgId,
      desktopId,
      appName,
      $msg,
      next.parallel()
    );
  }

  yield next.sync();

  for (const msgId of messagesToAdd) {
    addMessage(quest, messagesMap[msgId], desktopId, $msg, next.parallel());
  }

  yield next.sync();

  for (let msgId of messagesToPatch) {
    patchMessage(
      quest,
      messagesMap[msgId],
      desktopId,
      appName,
      $msg,
      next.parallel()
    );
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
    //TODO: configurable locales in output file

    /* Retrieve the translated data from the file which was sent to the
     * translators. Here we take the translations provided by this file
     * in front of the translations provided by the nabu-thrall server.
     * This step is useful in order to extract again all strings when we
     * have received the new translated strings.
     */
    let translatedData = {};
    if (fse.existsSync($outputFile)) {
      translatedData = fse.readJSONSync($outputFile).reduce((state, e) => {
        state[e.id] = e;
        return state;
      }, {});
    }

    const dataToSerialize = messages
      .map((m) => {
        return {
          id: m.id,
          source: m.nabuId,
          fr_CH:
            translatedData?.[m.id]?.fr_CH ||
            translations[`fr_CH@${m.id}`] ||
            '',
          de_CH:
            translatedData?.[m.id]?.de_CH ||
            translations[`de_CH@${m.id}`] ||
            '',
        };
      })
      .sort((msgA, msgB) => msgA.id.localeCompare(msgB.id));

    fse.writeFileSync($outputFile, JSON.stringify(dataToSerialize, null, 2));

    //this file is usefull for developpers,
    //showing what's has been extracted
    const devDataToSerialize = messages
      .map((m) => {
        return {
          id: m.id,
          nabuId: m.nabuId,
          sources: m.sources,
        };
      })
      .sort((msgA, msgB) => msgA.id.localeCompare(msgB.id));
    const dirName = path.dirname($outputFile);
    const baseName = path.basename($outputFile);
    fse.writeFileSync(
      path.join(dirName, `dev-${baseName}`),
      JSON.stringify(devDataToSerialize, null, 2)
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
