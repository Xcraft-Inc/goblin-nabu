//T:2019-02-27

export default function styles() {
  const container = {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '15px',
    marginTop: '15px',
  };

  const element = {
    display: 'flex',
    flexDirection: 'row',
    paddingBottom: '15px',
  };

  const errorElement = {
    display: 'flex',
    flexDirection: 'row',
    paddingBottom: '15px',
    color: 'rgb(190, 0, 0)',
  };

  const label = {
    display: 'flex',
    width: '120px',
  };
  const input = {
    display: 'flex',
    height: '25px',
    width: '90%',
    border: 'solid thin #c1d1e0',
  };

  return {
    container,
    element,
    errorElement,
    label,
    input,
  };
}
