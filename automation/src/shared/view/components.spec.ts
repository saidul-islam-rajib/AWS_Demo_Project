import { toHtml } from './html';
import { banner, emptyState, pill, table } from './components';

describe('pill', () => {
  it('renders a toned pill with an escaped label', () => {
    expect(toHtml(pill({ label: 'A & B', tone: 'good' }))).toBe(
      '<span class="ui-pill ui-pill--good">A &amp; B</span>',
    );
  });
});

describe('banner', () => {
  it('uses alert role for errors and status otherwise', () => {
    expect(toHtml(banner({ kind: 'error', message: 'x' }))).toContain(
      'role="alert"',
    );
    expect(toHtml(banner({ kind: 'ok', message: 'x' }))).toContain(
      'role="status"',
    );
  });
});

describe('table', () => {
  interface Row {
    name: string;
  }

  const columns = [{ header: 'Name', cell: (row: Row) => row.name }];

  it('renders rows through the column cells', () => {
    const out = toHtml(
      table({ columns, rows: [{ name: 'Ada' }], empty: 'none' }),
    );

    expect(out).toContain('<th');
    expect(out).toContain('Ada');
  });

  it('shows the empty state when there are no rows', () => {
    const out = toHtml(table({ columns, rows: [], empty: 'Nobody here' }));

    expect(out).toBe(toHtml(emptyState('Nobody here')));
  });

  it('escapes cell content', () => {
    const out = toHtml(
      table({ columns, rows: [{ name: '<b>' }], empty: 'none' }),
    );

    expect(out).toContain('&lt;b&gt;');
  });
});
