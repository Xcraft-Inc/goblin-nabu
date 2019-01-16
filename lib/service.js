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

  const appName = quest.goblin.getX('appName');

  yield quest.createFor(
    messageId,
    workitemId,
    messageId,
    {
      id: messageId,
      nabuId,
      desktopId: finalDesktopId,
      sources: [
        {
          description: description || '',
          appName,
          process: 'frontend', // only frontend messages can be added by this way. the others have to be added by the extractor
        },
      ],
    },
    next
  );

  quest.defer(() =>
    quest.me.loadTranslations({messageId, desktopId: finalDesktopId})
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
        description: '',
        appName: '...',
        path: '...',
        process: 'frontend' | 'backend',
        component: '<JSX Component>'
      }
  */

  const opts = {
    presets: ['es2015', 'react', 'stage-0'],
    plugins: [['./lib/goblin-nabu/lib/extractor.js']],
  };
  const paths = ['./test.jsx'];
  let messages = [];

  for (let path of paths) {
    try {
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
  const currentMessages = yield r.getAll({
    table: 'nabuMessage',
  });

  const newMessages = _(currentMessages.concat(messages))
    .groupBy(msg => msg.nabuId)
    .map(group => {
      const messageId = `nabuMessage@${crypto.sha256(group[0].nabuId)}`;
      return {
        id: messageId,
        nabuId: group[0].nabuId,
        sources: _(group)
          .flatMap(group => group.sources)
          .uniqBy(source => JSON.stringify(source))
          .value(),
      };
    })
    .value();

  //yield r.set({table: 'nabuMessage', documents: newMessages}, next);
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
