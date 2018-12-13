'use strict';

const watt = require('gigawatts');
const {buildWorkitem} = require('goblin-workshop');
const {
  buildFilterReql,
  buildOrderByReql,
} = require('goblin-rethink/helpers.js');

function isEmptyOrSpaces(str) {
  return !str || str.length === 0 || /^\s*$/.test(str);
}

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
  hasTranslations: {},
  afterCreate: function*(quest, next) {
    // Loading translations
    const listId = quest.goblin.getX('listId');
    const listAPI = quest.getAPI(listId);

    const listIds = yield listAPI.getListIds();

    const iterableIds = Object.values(listIds);
    yield quest.me.loadTranslations({listIds: iterableIds}, next);
    yield quest.me.setNeedTranslation();

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
    quest.me.change({
      path: `searchValue`,
      newValue: '',
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

      yield quest.me.setNeedTranslation(next);
    },
    applyElasticVisualization: function*(quest, value, next) {
      quest.me.change({
        path: `searchValue`,
        newValue: value,
      });

      if (isEmptyOrSpaces(value)) {
        yield quest.me.resetListVisualization(next);
        return;
      }

      const idsGetter = watt(function*() {
        const hinter = {
          type: 'nabuMessage',
          subTypes: ['nabuTranslation'],
          subJoins: ['ownerId'],
          field: 'id',
          fields: ['info'],
          title: 'Messages',
        };

        const elastic = quest.getStorage('elastic');

        let type = hinter.type;
        const subTypes = hinter.subTypes;
        if (subTypes) {
          subTypes.forEach(subType => {
            type = `${type},${subType}`;
          });
        }

        const results = yield elastic.search({
          type,
          value,
        });

        let values = [];
        if (results) {
          results.hits.hits.map(hit => {
            if (!hit.highlight) {
              return hit._source.info;
            }

            let phonetic = false;
            let autocomplete = false;

            if (hit.highlight.searchPhonetic) {
              phonetic = true;
            }
            if (hit.highlight.searchAutocomplete) {
              autocomplete = true;
            }

            if (!phonetic && !autocomplete) {
              return hit._source.info;
            }

            // Prefer phonetic result if possible, but use autocomplete result
            // if there are more tags.
            if (phonetic && autocomplete) {
              const countPhonetic = (
                hit.highlight.searchPhonetic[0].match(/<em>/g) || []
              ).length;
              const countAutocomplete = (
                hit.highlight.searchAutocomplete[0].match(/<em>/g) || []
              ).length;
              if (countAutocomplete > countPhonetic) {
                phonetic = false;
              }
            }

            return phonetic
              ? hit.highlight.searchPhonetic[0].replace(/<\/?em>/g, '`')
              : hit.highlight.searchAutocomplete[0].replace(/<\/?em>/g, '`');
          });
          values = results.hits.hits.map(hit => {
            let value = hit._id;
            if (hinter.subJoins) {
              hinter.subJoins.forEach(subJoin => {
                const join = hit._source[subJoin];
                if (join) {
                  value = join;
                }
              });
            }
            return value;
          });
        }

        return values;
      });
      const listId = quest.goblin.getX('listId');
      const listAPI = quest.getAPI(listId);

      yield listAPI.customizeVisualization({listIdsGetter: idsGetter}, next);
      //quest.defer (() => quest.me.loadMessages ());
    },
    applyCustomVisualization: function*(quest, field, value, next) {
      const listId = quest.goblin.getX('listId');
      const listAPI = quest.getAPI(listId);
      const r = quest.getStorage('rethink');

      if (value !== undefined) {
        yield quest.me.change(
          {
            path: `filters.${field}`,
            newValue: value,
          },
          next
        );
      } else {
        yield quest.me.toggleSort({field: field}, next);
      }

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
        path: 'hasTranslation',
        newValue: toChange,
      });
    },
  },
};

module.exports = buildWorkitem(config);
