'use strict';
//T:2019-02-27

const T = require('goblin-nabu/widgets/helpers/t.js');
const watt = require('gigawatts');
const {buildWorkitem} = require('goblin-workshop');
const {getToolbarId} = require('goblin-nabu/lib/helpers.js');

function isEmptyOrSpaces(str) {
  return !str || str.length === 0 || /^\s*$/.test(str);
}

const config = {
  type: 'nabuMessage',
  kind: 'datagrid',
  initialState: {
    hasTranslations: {},
    needColumns: ['missingTranslations'],
  },
  dialog: {
    height: '700px',
  },
  listStatus: ['draft', 'published'],
  listOrderBy: 'value.keyword',
  listType: 'uniform',
  columns: [
    {
      name: 'missingTranslations',
      width: '40px',
    },
    {
      name: 'nabuId',
      field: 'nabuId',
      sortable: true,
      sortKey: 'value.keyword',
      customSort: true,
    },
    {
      name: 'locale_1',
      sortable: true,
      customSort: true,
    },
    {
      name: 'locale_2',
      sortable: true,
      customSort: true,
    },
    {
      name: 'openExtern',
      width: '40px',
    },
  ],
  hinter: {
    type: 'nabuMessage',
    subTypes: ['nabuTranslation'],
    subJoins: ['messageId'],
    field: 'id',
    fields: ['info'],
    title: T('Messages'),
  },
  afterCreate: function*(quest, next) {
    // Setting correct selected locales
    const nabuApi = quest.getAPI('nabu');
    const toolbarApi = quest.getAPI(getToolbarId(quest.me.id));
    const locales = (yield nabuApi.get()).get('locales');

    const currentLocaleId = (yield toolbarApi.get()).get('selectedLocaleId');
    const currentLocale = locales.find(
      locale => locale.get('id') === currentLocaleId
    );

    var firstLocale = locales.size > 0 ? `${locales.first().get('name')}` : '';
    var secondLocale = locales.size > 1 ? `${locales.get(1).get('name')}` : '';

    var firstColumn = currentLocale
      ? `${currentLocale.get('name')}`
      : firstLocale;

    var secondColumn = firstColumn === firstLocale ? secondLocale : firstLocale;

    yield quest.me.change({
      path: 'columns[2].field',
      newValue: firstColumn,
      muteChanged: true,
    });
    yield quest.me.change({
      path: 'columns[2].sortKey',
      newValue: `${firstColumn}-value.keyword`,
      muteChanged: true,
    });

    yield quest.me.change({
      path: 'columns[3].field',
      newValue: secondColumn,
      muteChanged: true,
    });
    yield quest.me.change({
      path: 'columns[3].sortKey',
      newValue: `${secondColumn}-value.keyword`,
      muteChanged: true,
    });

    yield quest.me.change({
      path: `searchValue`,
      newValue: '',
    });

    yield quest.me.loadEntities();
    yield quest.me.setNeedTranslation();
  },
  afterFetch: function*(quest) {
    quest.defer(() => quest.me.loadEntities());
  },
  quests: {
    openSingleEntity: function(quest, entityId) {
      const toolbarApi = quest.getAPI(getToolbarId(quest.me.id));
      toolbarApi.openSingleEntity({entityId});
    },
    loadEntities: function*(quest, next) {
      const listId = quest.goblin.getX('listId');
      const listApi = quest.getAPI(listId);

      const ids = yield listApi.getListIds(next);

      ids.forEach(id => quest.me.loadEntity({entityId: id}, next.parallel()));
      yield next.sync();

      quest.defer(() => quest.me.loadTranslations({listIds: ids}));
    },
    loadTranslations: function*(quest, listIds, next) {
      const nabuApi = quest.getAPI('nabu');
      // TODO: optimize with delegator
      for (const messageId of listIds) {
        nabuApi.loadTranslations(
          {messageId, ownerId: quest.me.id},
          next.parallel()
        );
      }
      yield next.sync();
    },
    changeSelectedLocale: function*(quest, index, locale, next) {
      const currentLocale = quest.goblin
        .getState()
        .get(`columns[${index}].field`);

      if (currentLocale === locale) {
        return;
      }

      yield quest.me.change(
        {
          path: `columns[${index}].field`,
          newValue: locale,
          muteChanged: true,
        },
        next
      );
      yield quest.me.change({
        path: `columns[${index}].sortKey`,
        newValue: `${locale}-value.keyword`,
      });

      const sort = quest.goblin.getState().get('sort');

      if (sort.get('key') === currentLocale) {
        yield quest.me.resetListVisualization();
      }

      yield quest.me.setNeedTranslation();
      yield quest.me.loadEntities();
    },
    applyElasticVisualization: function*(quest, value, sort, next) {
      if (value === undefined) {
        yield quest.me.toggleSort({field: sort}, next);
        return;
      }

      yield quest.me.change({
        path: `searchValue`,
        newValue: value,
      });

      if (isEmptyOrSpaces(value)) {
        yield quest.me.resetListVisualization();
        return;
      }

      yield quest.me.changeData();
      yield quest.me.loadEntities();
    },
    setNeedTranslation: function*(quest) {
      const getNrTranslaton = watt(function*() {
        const getTranslationQuery = (r, id) => {
          return r.table('nabuTranslation').filter(
            r
              .row('localeId')
              .match(id)
              .and(
                r
                  .row('text')
                  .match('.')
                  .not()
              )
          );
        };

        const r = quest.getStorage('rethink');
        const query = getTranslationQuery.toString();

        const nabuApi = quest.getAPI('nabu');
        const locales = (yield nabuApi.get()).get('locales');
        const nrLocales = locales.size;
        let i = 0;
        let needTranslation = {};
        while (i < nrLocales) {
          const locale = locales.get(i);

          const args = [locale.get('id')];
          const localTranslation = yield r.query({query, args});

          let value = false;
          if (localTranslation.length > 0) {
            value = true;
          }

          needTranslation[locale.get('name')] = value;

          i++;
        }

        return needTranslation;
      });

      const toChange = yield getNrTranslaton();

      yield quest.me.change({
        path: 'hasTranslations',
        newValue: toChange,
      });
    },
  },
};

module.exports = buildWorkitem(config);
