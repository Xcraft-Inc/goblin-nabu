//T:2019-02-27

export default function styles() {
  const titleHeader = {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'end',
    paddingTop: '30px',
    paddingBottom: '30px',
  };

  const header = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '100%',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    paddingTop: '30px',
    paddingBottom: '30px',
  };
  const originalMessage = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '170%',
    fontWeight: 'bold',
  };

  const translationField = {
    border: 'solid thin #c1d1e0',
    width: '100%',
    alignItems: 'center',
  };

  const sources = {
    maxHeight: '100px',
    overflow: 'auto',
    marginBottom: '30px',
  };
  const sourceInfo = {
    display: 'flex',
    flexDirection: 'column',
    height: '50px',
  };
  const bottomLine = {
    border: 'hidden',
    borderBottom: 'solid thin #c1d1e0',
  };

  return {
    titleHeader,
    header,
    originalMessage,
    sourceInfo,
    translationField,
    sources,
    bottomLine,
  };
}
