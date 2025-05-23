'use strict';

const watt = require('gigawatts');
const path = require('path');
const _ = require('lodash');
const xHost = require('xcraft-core-host');
const {modules} = require('xcraft-core-utils');

function getUniqueSourceString(source) {
  // we can't just perform a JSON.stringify because the order of elements might change
  return `${source.appName}.${source.path}.${source.description}.${source.process}.${source.component}.{${source.location.start.line},${source.location.start.column},${source.location.end.line},${source.location.end.column}}`;
}

function updateSources(sources, appName) {
  // order is important because as in oldSources we return the reference of source,
  // the isOld field would not have been available for newSources if the order
  // was exchanged
  const newSources = sources.filter((source) => !source.isOld);
  const oldSources = sources
    .filter((source) => source.isOld)
    .map((source) => {
      delete source.isOld;
      return source;
    });

  const updatedSources = oldSources
    .filter((source) => source.appName !== appName)
    .concat(newSources);

  return _(updatedSources)
    .uniqBy((source) => getUniqueSourceString(source))
    .value();
}

const deleteMessage = watt(function* (
  quest,
  message,
  desktopId,
  appName,
  $msg,
  next
) {
  const goblinOrcId = `goblin-orc@${$msg.orcName}`;
  const entity = yield quest.createFor(message.id, goblinOrcId, message.id, {
    desktopId,
    ...message,
  });

  const persistedSources = yield entity.get({path: 'sources'});
  const relevantSources = persistedSources.filter(
    (source) => source.get('appName') === appName
  );

  if (relevantSources.size > 0) {
    // sources of this and another app may exist, we remove only the relevant sources
    yield entity.change({
      path: 'sources',
      newValue: persistedSources
        .filter((source) => source.get('appName') !== appName)
        .toJS(),
    });
  }
});

const patchMessage = watt(function* (
  quest,
  message,
  desktopId,
  appName,
  $msg,
  next
) {
  const goblinOrcId = `goblin-orc@${$msg.orcName}`;
  const entity = yield quest.createFor(message.id, goblinOrcId, message.id, {
    desktopId,
    ...message,
  });

  yield entity.change({
    path: 'sources',
    newValue: updateSources(message.sources, appName),
  });
});

const addMessage = watt(function* (quest, message, desktopId, $msg, next) {
  const goblinOrcId = `goblin-orc@${$msg.orcName}`;
  yield quest.createFor(message.id, goblinOrcId, message.id, {
    desktopId,
    ...message,
  });
});

function retrieveJsFiles(appId, variantId) {
  const appDir = path.join(xHost.projectPath, 'app');
  const libDir = path.join(xHost.projectPath, 'node_modules');
  const configJson = modules.loadAppConfig(
    appId || xHost.appId,
    appDir,
    {},
    variantId || xHost.variantId
  );
  const deps = modules.extractAllDeps(appId || xHost.appId, libDir, configJson);

  return modules.extractAllJs(libDir, deps);
}

module.exports = {
  getUniqueSourceString,
  updateSources,

  addMessage,
  patchMessage,
  deleteMessage,

  retrieveJsFiles,
};
