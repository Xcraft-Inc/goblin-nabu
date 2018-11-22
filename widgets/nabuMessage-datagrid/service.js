'use strict';

const watt = require('gigawatts');
const {buildWorkitem} = require('goblin-workshop');
const {
  buildFilterReql,
  buildOrderByReql,
} = require('goblin-rethink/helpers.js');

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
      customSort: true,
    },
    {
      name: 'locale_2',
      sortable: true,
      filterable: true,
      customFilter: true,
      customSort: true,
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
      //const r = require ('rethinkdb');

      //const oldValue = quest.goblin.getState ().get (`filters.${field}`);
      if (value !== undefined) {
        yield quest.me.change(
          {
            path: `filters.${field}`,
            newValue: value,
          },
          next
        );
      }

      yield quest.me.toggleSort({field: field}, next);

      const filters = quest.goblin.getState().get('filters');
      const sort = quest.goblin.getState().get('sort');

      const idsGetter = watt(function*() {
        const joinRequest = (r, orderFunc, filterFunc) => {
          let q = r
            .table('nabuTranslation')
            .eqJoin('messageId', r.table('nabuMessage'))
            .zip()
            .eqJoin('localeId', r.table('locale'))
            .zip()
            .map(function(item) {
              return r
                .expr([
                  ['id', item('messageId')],
                  ['nabuId', item('nabuId')],
                  [item('name'), item('text')],
                ])
                .coerceTo('OBJECT');
            })
            .group('id')
            .reduce(function(item1, item2) {
              return item1.merge(item2);
            })
            .ungroup()
            .getField('reduction');

          if (orderFunc) {
            q = q.orderBy(orderFunc);
          }
          if (filterFunc) {
            q = q.filter(filterFunc);
          }

          return (q = q.getField('id'));
        };

        const sortKey = sort.get('key');
        let orderFunc =
          sortKey && sortKey !== ''
            ? buildOrderByReql(sortKey, sort.get('dir'))
            : null;

        let filterFunc = filters
          ? buildFilterReql(filters.toJS(), value => '(?i).*' + value + '.*')
          : null;

        const query = joinRequest.toString();
        const listIds = yield r.query({
          query,
          args: [orderFunc, filterFunc],
        });

        // foreach listId in listIds{nabu.loadTranslations(listId) }
        quest.me.loadTranslations({listIds}, next);

        return listIds;
      });

      yield listAPI.customizeVisualization({listIdsGetter: idsGetter}, next);

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
