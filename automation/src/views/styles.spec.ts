import { readFileSync } from 'fs';
import { join } from 'path';
import { TUTORIALS_STYLES } from './public/tutorials.styles';
import { TUTORIALS_ADMIN_STYLES } from './admin/tutorials.styles';

const layoutSource = readFileSync(
  join(__dirname, 'shared', 'layout.ts'),
  'utf8',
);

const DEFINED = new Set(
  [...layoutSource.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]),
);

const sheets: [string, string][] = [
  ['public tutorials', TUTORIALS_STYLES],
  ['admin tutorials', TUTORIALS_ADMIN_STYLES],
];

describe('stylesheet integrity', () => {
  it('finds the custom properties the layout defines', () => {
    expect(DEFINED.has('--ink')).toBe(true);
    expect(DEFINED.has('--accent')).toBe(true);
    expect(DEFINED.size).toBeGreaterThan(10);
  });

  it.each(sheets)('%s references only defined custom properties', (_n, css) => {
    const used = [...css.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]);
    const unknown = [...new Set(used)].filter((name) => !DEFINED.has(name));

    expect(unknown).toEqual([]);
  });

  it.each(sheets)('%s has balanced braces', (_n, css) => {
    const opens = (css.match(/\{/g) ?? []).length;
    const closes = (css.match(/\}/g) ?? []).length;

    expect(opens).toBe(closes);
  });

  it.each(sheets)('%s emits exactly one style element', (_n, css) => {
    expect((css.match(/<style>/g) ?? []).length).toBe(1);
    expect((css.match(/<\/style>/g) ?? []).length).toBe(1);
  });
});

describe('clickable cards', () => {
  it('stretches the subject title link across the whole card', () => {
    expect(TUTORIALS_STYLES).toContain('.subj-card {\n    position: relative;');
    expect(TUTORIALS_STYLES).toContain(
      '.subj-card h2 a::after { content: ""; position: absolute; inset: 0;',
    );
  });

  it('stretches the lesson title link across the whole row', () => {
    expect(TUTORIALS_STYLES).toContain(
      '.lesson-item {\n    position: relative;',
    );
    expect(TUTORIALS_STYLES).toContain(
      '.lesson-body h3 a::after { content: ""; position: absolute; inset: 0;',
    );
  });

  it('shows the accent border when a card is focused by keyboard', () => {
    expect(TUTORIALS_STYLES).toContain('.subj-card:focus-within');
    expect(TUTORIALS_STYLES).toContain('.lesson-item:focus-within');
  });
});
