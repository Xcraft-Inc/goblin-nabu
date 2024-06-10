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

Goblin.registerQuest(goblinName, 'init', async (quest, $msg) => {
  quest.defer(() => quest.cmd('shutdown'));

  const desktopId = 'nabu-tools@nabu';
  quest.goblin.setX('desktopId', desktopId);
  const goblinOrcId = `goblin-orc@${$msg.orcName}`;

  await quest.warehouse.feedSubscriptionAdd({
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

  await quest.cmd('nabu.init', {
    configuration,
    desktopId,
    appName: 'nabu',
  });

  const locales = await quest.cmd('nabu-store.load-locales', {desktopId});
  await quest.cmd('nabu.set-locales', {
    id: 'nabu',
    locales,
  });

  const bootArgs = appArgs();
  if (bootArgs.extract) {
    await quest.me.extract({appid: bootArgs.appid});
  }
  if (bootArgs.translate) {
    await quest.me.translate({appid: bootArgs.appid});
  }
  if (bootArgs.pack) {
    await quest.me.pack({appid: bootArgs.appid});
  }
});

Goblin.registerQuest(goblinName, 'extract', async (quest, appid) => {
  const {apps} = appid
    ? {apps: [appid]}
    : require('xcraft-core-etc')().load('goblin-nabu');
  const {projectPath} = require('xcraft-core-host');
  const path = require('path');
  for (const app of apps) {
    quest.log.dbg(`Extracting ${app}...`);
    await quest.cmd('nabu.extract-messages', {
      desktopId: quest.getDesktop(),
      $appName: app,
      $appId: app,
      $outputFile: path.join(projectPath, `${app}.json`),
    });
    quest.log.dbg(`Extracting ${app}...[DONE]`);
  }
});

Goblin.registerQuest(goblinName, 'translate', async (quest, appid) => {
  const {apps} = appid
    ? {apps: [appid]}
    : require('xcraft-core-etc')().load('goblin-nabu');
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

  await quest.cmd('nabu.try-add-locales', {
    desktopId: quest.getDesktop(),
    mandate: 'nabu',
    locales: defaultLocales,
  });

  for (const app of apps) {
    quest.log.dbg(`Translating ${app}...`);
    const fileName = path.join(projectPath, `${app}.json`);
    if (!fse.existsSync(fileName)) {
      quest.log.warn(`File not found: ${fileName}`);
      continue;
    }

    const {removeContext} = require('goblin-nabu/lib/gettext.js');
    const rows = fse.readJsonSync(fileName);
    const promises = [];
    for (const row of rows) {
      const {source, id, ...locales} = row;
      for (const [locale, translation] of Object.entries(locales)) {
        promises.push(
          quest.cmd('nabu.set-translatable-data-translation', {
            desktopId: quest.getDesktop(),
            nabuId: source,
            localeName: locale,
            translation: removeContext(translation),
          })
        );
      }
    }
    await Promise.all(promises);

    quest.log.dbg(`Translating ${app}...[DONE]`);
  }
});

Goblin.registerQuest(goblinName, 'pack', async (quest, appid) => {
  const {apps} = appid
    ? {apps: [appid]}
    : require('xcraft-core-etc')().load('goblin-nabu');
  for (const app of apps) {
    quest.log.dbg(`Packing ${app}...`);
    await quest.cmd('nabu.pack-messages', {
      desktopId: quest.getDesktop(),
      force: true,
      $appName: app,
      $appId: app,
    });
    quest.log.dbg(`Packing ${app}...[DONE]`);
  }
});

Goblin.registerQuest(goblinName, 'addNotification', async (quest, message) => {
  const Tr = require('goblin-nabu/lib/tr.js');
  const text = await Tr(quest, `fr_CH`, message, true);
  quest.log.dbg(text);
});

// Singleton
module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
Goblin.createSingle(goblinName);
