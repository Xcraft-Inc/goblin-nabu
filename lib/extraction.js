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

const _extractFileMessages = watt(function*(
  quest,
  desktopId,
  babelCore,
  filePath,
  appName,
  wrapper,
  next
) {
  const relativePath = path.relative(projectPath, filePath);

  const opts = {
    presets: ['react', ['env', {targets: {node: 10}}]],
    plugins: [
      [
        './lib/goblin-nabu/lib/extractor/babel-plugin-extractor.js',
        {appName, file: relativePath},
      ],
      'transform-object-rest-spread',
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
            notificationId: `extraction-notif`,
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
        message: T(`Error processing file {filePath}: {error}`, '', {
          filePath: relativePath,
          error: err,
        }),
      });
    } else {
      quest.log.warn(`Error processing file ${relativePath}: ${err}`);
    }
  }
});

const extractMessages = function*(quest, desktopId, next) {
  const storageAvailable = quest.goblin.getX('storageAvailable');
  if (!storageAvailable) {
    throw new Error('Cannot extract messages because storage is not available');
  }

  const babelCore = require('babel-core');

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
  const appName = quest.goblin.getX('appName');
  const paths = retrieveJsFiles();
  const messagesWrapper = {
    messages: [],
    lastNotifMsgLength: 0,
  };

  yield $(paths)
    .map(filePath => n => {
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
  })).map(message => {
    // marking persisted sources as old
    message.sources = message.sources.map(source => ({
      isOld: true,
      ...source,
    }));

    return message;
  });

  const persistedMessagesIds = persistedMessages.map(msg => msg.id);
  const messagesIds = messagesWrapper.messages.map(msg => msg.id);

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
    .groupBy(msg => msg.id)
    .map(group => {
      return {
        id: group[0].id,
        nabuId: group[0].nabuId,
        sources: updateSources(
          _(group)
            .flatMap(group => group.sources)
            .value(),
          appName
        ),
      };
    })
    .value()
    .forEach(msg => (messagesMap[msg.id] = msg));

  for (let msgId of messagesToDelete) {
    deleteMessage(
      quest,
      messagesMap[msgId],
      desktopId,
      appName,
      next.parallel()
    );
  }

  for (let msgId of messagesToAdd) {
    addMessage(quest, messagesMap[msgId], desktopId, next.parallel());
  }

  for (let msgId of messagesToPatch) {
    patchMessage(quest, messagesMap[msgId], desktopId, next.parallel());
  }

  yield next.sync();
  if (quest.hasAPI('desktop')) {
    const deskAPI = quest.getAPI(desktopId).noThrow();
    yield deskAPI.addNotification({
      color: 'green',
      message: T(`{msgNbr} messages à traduire ont été extraits`, '', {
        msgNbr: messagesWrapper.messages.length,
      }),
      glyph: 'solid/check',
    });
  } else {
    quest.log.info(
      `${messagesWrapper.messages.length} messages à traduire ont été extraits`
    );
  }
};

module.exports = {
  extractMessages,
};
