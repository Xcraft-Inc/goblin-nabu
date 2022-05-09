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
  const bootArgs = appArgs();
  quest.log.dbg(bootArgs);
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

  const {apps} = require('xcraft-core-etc')().load('goblin-nabu');
  for (const app of apps) {
    quest.log.dbg(`Extracting ${app}...`);
    yield quest.cmd('nabu.extract-messages', {
      desktopId,
      $appName: app,
      $appId: app,
    });
    quest.log.dbg(`Extracting ${app}...[DONE]`);
  }
  quest.log.dbg('Finished');
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
