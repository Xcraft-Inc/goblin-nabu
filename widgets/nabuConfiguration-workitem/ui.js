import React from 'react';
import NabuConfigurationConnected from './component';

/******************************************************************************/

function renderPanel(props) {
  return <NabuConfigurationConnected id={props.id} do={props.do} />;
}

/******************************************************************************/
export default {
  panel: {
    readonly: renderPanel,
    edit: renderPanel,
  },
  plugin: {
    readonly: {
      compact: renderPanel,
      extend: renderPanel,
    },
    edit: {
      compact: renderPanel,
      extend: renderPanel,
    },
  },
};
