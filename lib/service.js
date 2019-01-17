'use strict';

const goblinName = 'nabu';

const watt = require('watt');
const _ = require('lodash');
const {crypto} = require('xcraft-core-utils');
const Goblin = require('xcraft-core-goblin');
const {extractDesktopId} = require('./helpers.js');

// Define initial logic values
const logicState = {
  id: goblinName,
  locales: [],
};

// Define logic handlers according rc.json
const logicHandlers = {
  'set-locales': (state, action) => {
    return state.set('locales', action.get('locales'));
  },
};

function getUniqueSourceString(source) {
  // we can't just perform a JSON.stringify because the order of elements might change
  return `${source.appName}.${source.path}.${source.description}.${
    source.process
  }.${source.component}.{${source.location.start.line},${
    source.location.start.column
  },${source.location.end.line},${source.location.end.column}}`;
}

function updateSources(sources, appName) {
  // order is important because as in oldSources we return the reference of source,
  // the isOld field would not have been available for newSources if the order
  // was exchanged
  const newSources = sources.filter(source => !source.isOld);
  const oldSources = sources
    .filter(source => source.isOld)
    .map(source => {
      delete source.isOld;
      return source;
    });

  const updatedSources = oldSources
    .filter(source => source.appName !== appName)
    .concat(newSources);

  return _(updatedSources)
    .uniqBy(source => getUniqueSourceString(source))
    .value();
}

const deleteMessage = watt(function*(quest, message, desktopId, appName, next) {
  const entity = yield quest.createFor(
    message.id,
    desktopId,
    message.id,
    {
      desktopId,
      ...message,
    },
    next
  );

  const persistedSources = yield entity.get({path: 'sources'}, next);
  const relevantSources = persistedSources.filter(
    source => source.get('appName') === appName
  );

  if (relevantSources.size > 0) {
    // appName found, we should delete the message only if it isn't used by other apps
    if (persistedSources.size === relevantSources.size) {
      // only sources of this app exist, we delete the entity
      yield entity.hardDeleteEntity({}, next);
    } else {
      // sources of this and another app exist, we remove only the relevant sources
      yield entity.change(
        {
          path: 'sources',
          newValue: persistedSources
            .filter(source => source.get('appName') !== appName)
            .toJS(),
        },
        next
      );
    }
  }

  // appName not found, therefore this message belongs other apps and we should not delete it
});

const patchMessage = watt(function*(quest, message, desktopId, next) {
  const entity = yield quest.createFor(
    message.id,
    desktopId,
    message.id,
    {
      desktopId,
      ...message,
    },
    next
  );

  yield entity.change(
    {
      path: 'sources',
      newValue: updateSources(message.sources),
    },
    next
  );
});

const addMessage = watt(function*(quest, message, desktopId, next) {
  yield quest.createFor(
    message.id,
    desktopId,
    message.id,
    {
      desktopId,
      ...message,
    },
    next
  );
});

const loadLocales = watt(function*(quest, next) {
  // Locale handling
  const r = quest.getStorage('rethink');

  const locales = yield r.getAll({
    table: 'locale',
  });

  yield quest.me.setLocales({locales}, next);
});

const loadEntities = watt(function*(quest, desktopId, enabled, next) {
  const toolbarId = `nabu-toolbar@${desktopId}`;
  yield quest.createFor(
    'desktop',
    desktopId,
    'nabu-toolbar',
    {
      id: toolbarId,
      desktopId,
      enabled,
    },
    next
  );

  yield quest.createFor(
    'desktop',
    desktopId,
    'nabuConfiguration',
    {
      id: 'nabuConfiguration@main',
      desktopId,
    },
    next
  );

  loadLocales(quest);
});

Goblin.registerQuest(goblinName, 'get', function(quest) {
  return quest.goblin.getState();
});

Goblin.registerQuest(goblinName, 'init', function*(
  quest,
  appName,
  desktopId,
  disabled,
  next
) {
  if (!appName) {
    throw new Error('Nabu init-error: required appName parameter');
  }
  if (!desktopId) {
    throw new Error('Nabu init-error: required desktopId parameter');
  }

  quest.goblin.setX('appName', appName);
  yield loadEntities(quest, desktopId, !disabled, next);

  if (!disabled) {
    console.log('\x1b[32m%s\x1b[0m', '\u048a\u023a\u0243\u054d [ENABLED]');
  } else {
    console.log('\x1b[31m%s\x1b[0m', '\u048a\u023a\u0243\u054d [DISABLED]');
  }
});

Goblin.registerQuest(goblinName, 'reset-index', function(quest) {
  const e = quest.getAPI('elastic@nabu');
  e.resetIndex();
  console.log('\x1b[31m%s\x1b[0m', '\u048a\u023a\u0243\u054d index [RESETED]');
});

Goblin.registerQuest(goblinName, 'add-message', function*(
  quest,
  workitemId,
  desktopId,
  nabuId,
  description,
  next
) {
  const messageId = `nabuMessage@${crypto.sha256(nabuId)}`;

  if (messageId === workitemId) {
    // Rare case when the translatable text is embedded inside a widget
    // wired itself with the message entity.
    // In this case, this means the entity has already been loaded, so we don't
    // need to load it again (otherwise we generate a leak as its id and owner are the same).
    return;
  }

  const finalDesktopId = desktopId || extractDesktopId(workitemId);
  if (!finalDesktopId) {
    console.warn(
      `cannot extract desktopId from workitem ${workitemId} and none is provided`
    );
    return;
  }

  quest.defer(() =>
    quest.me.loadTranslations({messageId, desktopId: finalDesktopId})
  );

  const appName = quest.goblin.getX('appName');

  const entity = yield quest.createFor(
    messageId,
    workitemId,
    messageId,
    {
      id: messageId,
      nabuId,
      desktopId: finalDesktopId,
      sources: [],
    },
    next
  );

  const currentSources = [
    {
      appName,
      description: description || '',
      process: 'frontend', // only frontend messages can be added by this way. the others have to be added by the extractor
      path: '',
      location: {
        start: {
          line: '',
          column: '',
        },
        end: {
          line: '',
          column: '',
        },
      },
    },
  ];

  const persistedSources = (yield entity.get({path: 'sources'}, next)).toJS();

  yield entity.change(
    {
      path: 'sources',
      newValue: _(persistedSources.concat(currentSources))
        .uniqBy(source => getUniqueSourceString(source))
        .value(),
    },
    next
  );
});
/*
Goblin.registerQuest(goblinName, 'extract-messages-from-app', function(quest, appName) {
  // 1. Trouver la liste des modules (xcraft et goblin) de l'app
}*/

function getFileContent(path) {
  return `
    'use strict';
    const {T} = require('goblin-nabu/widgets/helpers/t.js');
    import Widget from 'laboratory/widget';
  
       class NabuTest extends Widget {
        render () {
          const self = this;
          const self2 = self;
          const a = 1 + 2;
          return (
            <div>
              <TextField
                {...email}
                ref="firstField"
                style={{width:'100%'}}
                defaultValue={login}
                hintText={login ? "" : T('Your email address', 'my desc', {path:'c:/', dyn: a})}
                floatingLabelText={Widget.T('Email')}
                type="email" />
              <TextField
                {...password}
                style={{width:'100%'}}
                ref="secondField"
                hintText={Widget.T('Your password')}
                floatingLabelText={self2.T('Password')}
                type="password"
                onEnterKeyDown={handleSubmit} />
            </div>
          )
        }
      }

      class CC2 extends Widget {
        render () {
          const self = this;
          const self2 = self;
          const a = 1 + 2;
          return (
            <div>
              <TextField
                {...email}
                ref="firstField"
                style={{width:'100%'}}
                defaultValue={login}
                floatingLabelText={Widget.T('Email')}
                type="email" />
            </div>
          )
        }
      }
    `;
}

Goblin.registerQuest(goblinName, 'extract-messages', function*(
  quest,
  desktopId,
  next
) {
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
  const opts = {
    presets: ['es2015', 'react', 'stage-0'],
    plugins: [['./lib/goblin-nabu/lib/extractor.js', {}]],
  };
  const paths = ['./test.jsx'];
  let messages = [];

  for (let path of paths) {
    try {
      opts.plugins[0][1] = {
        appName,
        file: path,
      };

      const content = getFileContent(path);
      const res = babelCore.transform(content, opts);

      if (res) {
        console.log(
          `found ${
            res.metadata['nabu'].messages.length
          } messages in file ${path}`
        );

        messages = messages.concat(res.metadata['nabu'].messages);
      }
    } catch (err) {
      console.warn(`error processing file ${path}: ${err}`);
    }
  }

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
  const messagesIds = messages.map(msg => msg.id);

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
  _(persistedMessages.concat(messages))
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
});

Goblin.registerQuest(
  goblinName,
  'load-translations',
  (quest, messageId, ownerId, desktopId) => {
    if (messageId) {
      const hashedNabuId = messageId.split('@')[1];
      const finalDesktopId = desktopId || extractDesktopId(ownerId);

      if (!finalDesktopId) {
        console.warn(
          `cannot extract desktopId from ownerId ${ownerId} and none is provided`
        );
        return;
      }

      quest.goblin
        .getState()
        .get('locales')
        .forEach(locale => {
          const translationId = `nabuTranslation@${locale.get(
            'name'
          )}-${hashedNabuId}`;

          quest.defer(() =>
            quest.createFor(
              translationId,
              ownerId || messageId,
              translationId,
              {
                id: translationId,
                messageId,
                localeId: locale.get('id'),
                desktopId: finalDesktopId,
              }
            )
          );
        });
    }
  }
);

//Dynamic API see reducers for params
for (const action of Object.keys(logicHandlers)) {
  switch (action) {
    case 'set-locales':
      Goblin.registerQuest(goblinName, action, function(quest) {
        quest.do();
      });
      continue;
  }
}

// Singleton
module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
Goblin.createSingle(goblinName);
