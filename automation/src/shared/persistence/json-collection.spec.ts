import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { JsonCollection } from './json-collection';

interface Row {
  id: string;
  value: number;
}

const options = { file: 'rows.json', key: 'rows', label: 'row(s)' };

describe('JsonCollection', () => {
  let dir: string;

  const open = () => new JsonCollection<Row>(options);

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'json-collection-'));
    process.env.DATA_DIR = dir;
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  it('starts empty', () => {
    expect(open().all()).toEqual([]);
    expect(open().size).toBe(0);
  });

  it('adds and finds a row', () => {
    const store = open();
    store.add({ id: 'a', value: 1 });

    expect(store.find((r) => r.id === 'a')?.value).toBe(1);
    expect(store.size).toBe(1);
  });

  it('filters rows', () => {
    const store = open();
    store.add({ id: 'a', value: 1 });
    store.add({ id: 'b', value: 2 });

    expect(store.filter((r) => r.value > 1)).toHaveLength(1);
  });

  it('replaces the whole set', () => {
    const store = open();
    store.add({ id: 'a', value: 1 });
    store.replaceAll([{ id: 'b', value: 2 }]);

    expect(store.all()).toEqual([{ id: 'b', value: 2 }]);
  });

  it('persists across reopen', () => {
    open().add({ id: 'a', value: 1 });

    expect(open().all()).toEqual([{ id: 'a', value: 1 }]);
  });

  it('tolerates a corrupt file', () => {
    open().add({ id: 'a', value: 1 });
    writeFileSync(join(dir, 'rows.json'), 'not json', 'utf8');

    expect(open().all()).toEqual([]);
  });
});
