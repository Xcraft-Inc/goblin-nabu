import Widget from 'laboratory/widget';
import Label from 'gadgets/label/widget';

const label = Widget.connect((state, props) => {
  const message = state.get(`backend.${props.id}`);
  //const locales = state.get(`backend.nabu.locales`);

  let glyph = null;
  let tooltip = null;

  if (message) {
    if (props.checkDescription) {
      // Description label
      const desc = message.get('description');
      if (desc) {
        glyph = 'regular/info-circle';
        tooltip = desc;
      }
    } /*else if (
        locales // Missing translations label
          .map (l => message.get (`translations.${l.get ('name')}`))
          .some (translation => !translation)
      ) {
        glyph = 'solid/exclamation-triangle';
        tooltip = props.tooltip;
      }*/
  }

  return {
    glyph,
    tooltip,
  };
})(Label);

const sort = Widget.connect((state, props) => {
  const key = state.get(`backend.${props.id}.sort.key`);
  const dir = state.get(`backend.${props.id}.sort.dir`);

  let glyph = 'solid/sort';
  let tooltip = null;

  if (key === props.column.get('field')) {
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

export default {label, sort};
