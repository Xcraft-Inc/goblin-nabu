'use strict';

const goblinName = 'nabu-tools';
const Goblin = require('xcraft-core-goblin');
const {appArgs} = require('xcraft-core-host');

const logicState = {
  id: goblinName,
};

const logicHandlers = {
  boot: (state) => {
    return state.set('id', goblinName);
  },
};

//////////////////////////////// STARTUP ////////////////////////////////
Goblin.registerQuest(goblinName, 'boot', function (quest) {
  quest.do();
});

Goblin.registerQuest(goblinName, 'init', function* (quest, $msg) {
  const desktopId = 'nabu-tools@nabu';
  quest.goblin.setX('desktopId', desktopId);
  const goblinOrcId = `goblin-orc@${$msg.orcName}`;

  yield quest.warehouse.feedSubscriptionAdd({
    feed: desktopId,
    branch: goblinOrcId,
    parents: 'goblin',
  });

  const configuration = {
    mandate: 'nabu',
    elasticsearchUrl: 'http://127.0.0.1:9200',
    rethinkdbHost: '127.0.0.1',
    useNabu: true,
    mainGoblin: 'nabu-store',
    defaultContextId: 'nabu',
  };
  quest.goblin.setX('configuration', configuration);

  yield quest.cmd('nabu.init', {
    configuration,
    desktopId,
    appName: 'nabu',
  });

  const bootArgs = appArgs();
  if (bootArgs.extract) {
    yield quest.me.extract();
  }
  if (bootArgs.translate) {
    yield quest.me.translate();
  }

  if (bootArgs.pack) {
    yield quest.me.pack();
  }
});

Goblin.registerQuest(goblinName, 'extract', function* (quest) {
  const {apps} = require('xcraft-core-etc')().load('goblin-nabu');
  const {projectPath} = require('xcraft-core-host');
  const path = require('path');
  for (const app of apps) {
    quest.log.dbg(`Extracting ${app}...`);
    yield quest.cmd('nabu.extract-messages', {
      desktopId: quest.getDesktop(),
      $appName: app,
      $appId: app,
      $outputFile: path.join(projectPath, `${app}.csv`),
    });
    quest.log.dbg(`Extracting ${app}...[DONE]`);
  }
});

Goblin.registerQuest(goblinName, 'translate', function* (quest, next) {
  const Papa = require('papaparse');
  const {apps} = require('xcraft-core-etc')().load('goblin-nabu');
  const fse = require('fs-extra');
  const {projectPath} = require('xcraft-core-host');
  const path = require('path');
  const defaultLocales = [
    {
      id: `locale@fr_CH`,
      name: 'fr_CH',
      description: '',
      text: 'Français',
    },
    {
      id: `locale@de_CH`,
      name: 'de_CH',
      description: '',
      text: 'Deutsch',
    },
  ];

  yield quest.cmd('nabu.try-add-locales', {
    desktopId: quest.getDesktop(),
    mandate: 'nabu',
    locales: defaultLocales,
  });

  for (const app of apps) {
    quest.log.dbg(`Translating ${app}...`);
    const fileName = path.join(projectPath, `${app}.csv`);
    if (!fse.existsSync(fileName)) {
      quest.log.warn(`File not found: ${fileName}`);
      continue;
    }

    const file = fse.createReadStream(fileName);
    const rows = [];

    Papa.parse(file, {
      header: true,
      transformHeader: (header) => header.replace(/^\uFEFF/gm, ''),
      step: (row) => rows.push(row),
      complete: next.parallel().arg(0),
    });

    yield next.sync();
    for (const row of rows) {
      const {id, source, fr_CH, de_CH} = row.data;
      quest.log.dbg(`translating message ${id}...`);
      yield quest.cmd('nabu.set-translatable-data-translation', {
        desktopId: quest.getDesktop(),
        nabuId: source,
        localeName: 'fr_CH',
        translation: fr_CH,
      });
      quest.log.dbg(`fr_CH: ${fr_CH}`);
      yield quest.cmd('nabu.set-translatable-data-translation', {
        desktopId: quest.getDesktop(),
        nabuId: source,
        localeName: 'de_CH',
        translation: de_CH,
      });
      quest.log.dbg(`de_CH: ${de_CH}`);
      quest.log.dbg(`translating message ${id}...[DONE]`);
    }

    quest.log.dbg(`Translating ${app}...[DONE]`);
  }
});

Goblin.registerQuest(goblinName, 'pack', function* (quest) {
  const {apps} = require('xcraft-core-etc')().load('goblin-nabu');
  for (const app of apps) {
    quest.log.dbg(`Packing ${app}...`);
    yield quest.cmd('nabu.pack-messages', {
      desktopId: quest.getDesktop(),
      $appName: app,
    });
    quest.log.dbg(`Packing ${app}...[DONE]`);
  }
});

Goblin.registerQuest(goblinName, 'addNotification', function* (quest, message) {
  const Tr = require('goblin-nabu/lib/tr.js');
  const text = yield Tr(quest, `fr_CH`, message, true);
  quest.log.dbg(text);
});
// Singleton
module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
Goblin.createSingle(goblinName);