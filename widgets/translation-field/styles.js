//T:2019-02-27

export default function styles() {
  const bottomLine = {
    border: 'hidden',
    borderBottom: 'solid thin #c1d1e0',
    width: '100%',
  };

  const collapsible = {
    backgroundColor: '#777',
    color: 'white',
    cursor: 'pointer',
    padding: '18px',
    width: '100%',
    border: 'none',
    textAlign: 'left',
    outline: 'none',
    fontSize: '15px',
  };

  const content = {
    padding: '0 18px',
    display: 'none',
    overflow: 'hidden',
    backgroundColor: '#f1f1f1',
  };

  return {
    bottomLine,
    collapsible,
    content,
  };
}
