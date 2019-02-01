import Widget from 'laboratory/widget';
import Label from 'gadgets/label/widget';

const InfoLabel = Widget.connect((state, props) => {
  const message = state.get(`backend.${props.id}`);

  const locale1 = props.locale1;
  const locale2 = props.locale2;
  const translation1 = state.get(
    `backend.nabuTranslation@${locale1}-${props.id.split('@')[1]}`
  );
  const translation2 = state.get(
    `backend.nabuTranslation@${locale2}-${props.id.split('@')[1]}`
  );

  let glyph = null;
  let tooltip = null;

  if (message) {
    // Description label
    if (props.checkDescription) {
      const sources = message.get('sources');
      if (sources) {
        const source = sources.first();
        if (source && source.get('description')) {
          glyph = 'regular/info-circle';
          tooltip = source.get('description');
        }
      }
    } else if (
      (translation1 && !translation1.get('text')) ||
      (translation2 && !translation2.get('text'))
    ) {
      glyph = 'solid/exclamation-triangle';
      tooltip = props.tooltip;
    }
  }

  return {
    glyph,
    tooltip,
  };
})(Label);

const SortLabel = Widget.connect((state, props) => {
  const search = state.get(`backend.${props.id}.searchValue`);
  if (search) {
    return {};
  }

  const key = state.get(`backend.${props.id}.sort.key`);
  const dir = state.get(`backend.${props.id}.sort.dir`);

  let glyph = 'solid/sort';
  let tooltip = null;

  let sortKey = props.column.get('sortKey')
    ? props.column.get('sortKey')
    : props.column.get('field');
  if (key === sortKey) {
    if (dir === 'asc') {
      glyph = 'solid/sort-alpha-up';
      tooltip = props.tooltips.asc;
    } else {
      glyph = 'solid/sort-alpha-down';
      tooltip = props.tooltips.desc;
    }
  }

  return {glyph: glyph, tooltip: tooltip};
})(Label);

module.exports = {InfoLabel, SortLabel};
