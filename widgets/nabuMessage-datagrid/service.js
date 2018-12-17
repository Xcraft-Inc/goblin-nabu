'use strict';

const watt = require('gigawatts');
const {buildWorkitem} = require('goblin-workshop');

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

    // Loading translations
    const hinter = {
      type: 'nabuMessage',
      subTypes: ['nabuTranslation'],
      subJoins: ['ownerId'],
      field: 'id',
      fields: ['info'],
      title: 'Messages',
    };

    const listIds = yield quest.me.returnSearch({
      hinter,
      sort: {key: 'value.keyword', dir: 'asc'},
    });
    yield quest.me.loadTranslations({listIds}, next);
    yield quest.me.setNeedTranslation();
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
    returnSearch: function*(quest, hinter, value, sort) {
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
        sort,
        from: 0,
        size: 200,
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

        results.hits.hits.forEach(hit => {
          let value = hit._id;
          if (hinter.subJoins) {
            hinter.subJoins.forEach(subJoin => {
              const join = hit._source[subJoin];
              if (join) {
                value = join;
              }
            });
          }
          if (!values.includes(value)) {
            values.push(value);
          }
        });
      }

      return values;
    },
    applyElasticVisualization: function*(quest, value, sort, next) {
      if (value !== undefined) {
        quest.me.change({
          path: `searchValue`,
          newValue: value,
        });

        if (isEmptyOrSpaces(value)) {
          yield quest.me.resetListVisualization(next);
          return;
        }
      } else {
        yield quest.me.toggleSort({field: sort}, next);
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
        const sortValue = quest.goblin.getState().get('sort');
        let key = 'value.keyword';
        const sortKey = sortValue.get('key');
        if (sortKey !== 'nabuId') {
          key = `${sortKey}-value.keyword`;
        }

        const searchValue = quest.goblin.getState().get('searchValue');

        return yield quest.me.returnSearch({
          hinter,
          value: searchValue,
          sort: {
            key,
            dir: sortValue.get('dir'),
          },
        });
      });

      const datagridId = quest.goblin.getX('datagridId');
      const datagridAPI = quest.getAPI(datagridId);
      yield datagridAPI.customizeVisualization(
        {listIdsGetter: idsGetter},
        next
      );
      //quest.defer (() => quest.me.loadMessages ());
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
