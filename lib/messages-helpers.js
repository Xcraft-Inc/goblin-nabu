'use strict';

const watt = require('watt');

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

module.exports = {
  getUniqueSourceString,
  updateSources,

  addMessage,
  patchMessage,
  deleteMessage,
};
