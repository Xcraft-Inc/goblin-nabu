'use strict';

const watt = require('gigawatts');
const {buildWorkitem} = require('goblin-workshop');

const config = {
  type: 'nabuMessage',
  kind: 'datagrid',
  initialState: {},
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
      filterable: true,
      customFilter: true,
    },
    {
      name: 'locale_1',
      sortable: true,
      filterable: true,
      customFilter: true,
    },
    {
      name: 'locale_2',
      sortable: true,
      filterable: true,
      customFilter: true,
    },
  ],
  afterCreate: function*(quest, next) {
    // Loading translations
    const listId = quest.goblin.getX('listId');
    const listAPI = quest.getAPI(listId);

    const listIds = yield listAPI.getListIds();

    yield quest.me.loadTranslations({listIds}, next);

    // Setting correct selected locales
    const nabuApi = quest.getAPI('nabu');
    const configApi = quest.getAPI('nabuConfiguration@main');
    const locales = (yield nabuApi.get()).get('locales');
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
  },
  quests: {
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

      const filters = quest.goblin.getState().get(`filters`);
      const sort = quest.goblin.getState().get('sort');

      if (
        (filters.get(currentLocale) != undefined &&
          filters.get(currentLocale) !== '') ||
        sort.get('key') === currentLocale
      ) {
        yield quest.me.resetListVisualization(next);
      }
    },
    applyCustomVisualization: function*(quest, field, value, next) {
      const listId = quest.goblin.getX('listId');
      const listAPI = quest.getAPI(listId);
      const r = quest.getStorage('rethink');

      yield quest.me.change(
        {
          path: `filters.${field}`,
          newValue: value,
        },
        next
      );

      const filters = quest.goblin.getState().get('filters');
      const sort = quest.goblin.getState().get('sort');
      const sortKey = sort.get('key');

      yield listAPI.customizeVisualization(
        {
          listIdsGetter: watt(function*() {
            //query
            let q = r
              .table('nabuMessage', {readMode: 'outdated'})
              .eqJoin(
                'messageId',
                r.table('nabuTranslation', {readMode: 'outdated'})
              );

            let filterFunc = filters
              ? buildFilterReql(
                  filters.toJS(),
                  value => '(?i).*' + value + '.*'
                )
              : null;

            if (filterFunc) {
              q.filter(filterFunc);
            }

            let orderFunc =
              sortKey && sortKey !== ''
                ? buildOrderByReql(sortKey, sort.get('dir'))
                : null;

            if (orderFunc) {
              q.order(orderFunc);
            }

            q = q.map(row => row('left')('id')).distinct();

            const cursor = yield run(quest, q, next);
            const listIds = yield cursor.toArray(next);

            // foreach listId in listIds{nabu.loadTranslations(listId) }
            return listIds;
          }),

          /*orderBy:
            sortKey && sortKey !== ''
              ? buildOrderByReql(sortKey, sort.get('dir'))
              : null,
          filter: filters
            ? buildFilterReql(filters.toJS(), value => '(?i).*' + value + '.*')
            : null,*/
        },
        next
      );

      quest.defer(() => quest.me.loadMessages());
    },
    loadTranslations: function(quest, listIds) {
      const nabuApi = quest.getAPI('nabu');

      for (const messageId of listIds) {
        quest.defer(() =>
          nabuApi.loadTranslations({messageId, ownerId: quest.goblin.id})
        );
      }
    },
  },
};

module.exports = buildWorkitem(config);
