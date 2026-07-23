import { route, withQuery } from './route';

describe('route', () => {
  it('exposes its template', () => {
    expect(route('/account/reset').template).toBe('/account/reset');
  });

  it('fills a named parameter', () => {
    const detail = route<['id']>('/admin/accounts/:id');

    expect(detail.path({ id: 'abc' })).toBe('/admin/accounts/abc');
  });

  it('encodes a parameter value', () => {
    const detail = route<['id']>('/admin/accounts/:id');

    expect(detail.path({ id: 'a/b' })).toBe('/admin/accounts/a%2Fb');
  });
});

describe('withQuery', () => {
  it('appends encoded query pairs', () => {
    expect(withQuery('/x', { q: 'a b', page: 2 })).toBe('/x?q=a%20b&page=2');
  });

  it('drops undefined and empty values', () => {
    expect(withQuery('/x', { a: undefined, b: '', c: '1' })).toBe('/x?c=1');
  });

  it('returns the bare path when nothing is left', () => {
    expect(withQuery('/x', { a: undefined })).toBe('/x');
  });
});
