'use strict';

const watt = require('gigawatts');
const {buildWorkitem} = require('goblin-workshop');

function isEmptyOrSpaces(str) {
  return !str || str.length === 0 || /^\s*$/.test(str);
}

const config = {
  type: 'nabuMessage',
  kind: 'datagrid',
  initialState: {
    hasTranslations: {},
  },
  listStatus: ['draft', 'published'],
  listOrderBy: 'nabuId',
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
  ],
  hinter: {
    type: 'nabuMessage',
    subTypes: ['nabuTranslation'],
    subJoins: ['ownerId'],
    field: 'id',
    fields: ['info'],
    title: 'Messages',
  },
  afterCreate: function*(quest, next) {
    // Setting correct selected locales
    const nabuApi = quest.getAPI('nabu');
    const configApi = quest.getAPI('nabuConfiguration@main');
    const locales = (yield nabuApi.get()).get('locales');

    var types = {'value.keyword': 'nabuMessage'};
    locales.forEach(locale => {
      types[`${locale.get('name')}-value.keyword`] = 'nabuTranslation';
    });

    const currentLocaleId = (yield configApi.get()).get('localeId');
    const currentLocale = locales.find(
      locale => locale.get('id') === currentLocaleId
    );

    var firstLocale = locales.size > 0 ? `${locales.first().get('name')}` : '';
    var secondLocale = locales.size > 1 ? `${locales.get(1).get('name')}` : '';

    var firstColumn = currentLocale
      ? `${currentLocale.get('name')}`
      : firstLocale;

    var secondColumn = firstColumn === firstLocale ? secondLocale : firstLocale;

    quest.me.change({
      path: 'columns[2].field',
      newValue: firstColumn,
    });
    quest.me.change({
      path: 'columns[3].field',
      newValue: secondColumn,
    });
    quest.me.change({
      path: `searchValue`,
      newValue: '',
    });

    yield quest.me.loadEntities({}, next);
    yield quest.me.setNeedTranslation();
  },
  afterFetch: function*(quest) {
    yield quest.me.loadEntities();
  },
  quests: {
    loadEntities: function*(quest, next) {
      const listId = quest.goblin.getX('listId');
      const listApi = quest.getAPI(listId);

      const ids = yield listApi.getListIds(next);
      const iterableIds = Object.values(ids);

      iterableIds.forEach(id => {
        if (id) {
          quest.me.loadEntity({entityId: id}, next.parallel());
        }
      });
      yield next.sync();

      quest.defer(() => quest.me.loadTranslations({listIds: iterableIds}));
    },
    loadTranslations: function(quest, listIds) {
      const nabuApi = quest.getAPI('nabu');

      const ownerId = quest.me.id
        .split('@')
        .slice(1)
        .join('@');
      for (const messageId of listIds) {
        if (messageId) {
          quest.defer(() => nabuApi.loadTranslations({messageId, ownerId}));
        }
      }
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
        },
        next
      );

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

      quest.me.change({
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

      quest.me.change({
        path: 'hasTranslations',
        newValue: toChange,
      });
    },
  },
};

module.exports = buildWorkitem(config);
