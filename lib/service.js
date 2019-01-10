'use strict';

const goblinName = 'nabu';

const _ = require('lodash');
const watt = require('watt');
const {crypto} = require('xcraft-core-utils');
const Goblin = require('xcraft-core-goblin');

// Define initial logic values
const logicState = {
  id: goblinName,
  enabled: false,
  locales: [],
};

// /!\ We must take care of messageId with Shredder state,
// getter and setter can corrupt state if we use path descriptor
// ex. with messageId 'it'was... bad!'  -> state.set ('messages.it'was... bad!.translation')

// Define logic handlers according rc.json
const logicHandlers = {
  enable: state => {
    return state.set('enabled', true);
  },
  disable: state => {
    return state.set('enabled', false);
  },

  'toggle-enabled': state => {
    const newState = !state.get('enabled');
    return state.set('enabled', newState);
  },

  'set-locales': (state, action) => {
    return state.set('locales', action.get('locales'));
  },
};

const loadEntities = watt(function*(quest, desktopId, next) {
  const loadLocales = _.debounce(
    watt(function*(next) {
      // Locale handling
      const r = quest.getStorage('rethink');

      const locales = yield r.getAll({
        table: 'locale',
      });

      yield quest.me.setLocales({locales});
    }),
    500
  );

  yield quest.createFor('desktop', desktopId, 'nabuToolbar', {
    id: 'nabuToolbar@main',
    desktopId: desktopId,
  });

  yield quest.createFor('desktop', desktopId, 'nabuConfiguration', {
    id: 'nabuConfiguration@main',
    desktopId: desktopId,
  });

  loadLocales();
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

  quest.goblin.setX('appName', appName);
  quest.goblin.setX('desktopId', desktopId);

  const nabuElastic = `elastic@nabu`;
  const e = yield quest.create(nabuElastic, {
    id: nabuElastic,
    url: 'lab0.epsitec.ch:9200',
    index: `nabu`,
  });
  yield e.ensureIndex();
  yield e.ensureType({
    type: appName,
  });

  yield loadEntities(quest, desktopId, next);

  if (!disabled) {
    quest.me.enable();
  }
});

Goblin.registerQuest(goblinName, 'reset-index', function(quest) {
  const e = quest.getAPI('elastic@nabu');
  e.resetIndex();
});

Goblin.registerQuest(goblinName, 'add-message', function*(
  quest,
  workitemId,
  nabuId,
  description,
  next
) {
  const enabled = quest.goblin.getState().get('enabled');
  if (enabled) {
    const messageId = `nabuMessage@${crypto.sha256(nabuId)}`;

    if (messageId === workitemId) {
      // Rare case when the translatable text is embedded inside a widget
      // wired itself with the message entity.
      // In this case, this means the entity has already been loaded, so we don't
      // need to load it again (otherwise we generate a leak as its id and owner are the same).
      return;
    }

    yield quest.createFor(
      messageId,
      workitemId,
      messageId,
      {
        id: messageId,
        nabuId,
        description: description || '',
        desktopId: quest.getDesktop(),
      },
      next
    );

    quest.defer(() => quest.me.loadTranslations({messageId}));
  }
});
/*
Goblin.registerQuest(goblinName, 'extract-messages-from-app', function(quest, appName) {
  // 1. Trouver la liste des modules (xcraft et goblin) de l'app
}*/

Goblin.registerQuest(goblinName, 'extract-messages', function(quest) {
  const enabled = quest.goblin.getState().get('enabled');
  if (enabled) {
    const babelCore = require('babel-core');

    /*
    const opts = {
      presets: ['es2015', 'react', 'stage-0'],
      plugins: [['../../lib/extractor.js']],
    };

    const res = yield babelCore.transformFile(
      './lib/goblin-nabu/widgets/nabuMessage-datagrid/ui.js',
      opts,
      next
    );
"*/

    const opts = {
      presets: ['es2015', 'react', 'stage-0'],
      plugins: [['./lib/goblin-nabu/lib/extractor.js']],
    };

    const JSX = `
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

    const res = babelCore.transform(JSX, opts);
    if (res) {
      console.log('res');
    }
    console.log('asasas');
  }
});

Goblin.registerQuest(
  goblinName,
  'load-translations',
  (quest, messageId, ownerId) => {
    const enabled = quest.goblin.getState().get('enabled');
    if (enabled && messageId) {
      const hashedNabuId = messageId.split('@')[1];

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
    case 'enable':
    case 'disable':
    case 'toggle-enabled':
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
