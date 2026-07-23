import { attributes, classes } from './attributes';
import { html, join, raw, toHtml, when } from './html';

describe('html template', () => {
  it('escapes interpolated values', () => {
    expect(toHtml(html`<p>${'<script>'}</p>`)).toBe('<p>&lt;script&gt;</p>');
  });

  it('escapes quotes and ampersands', () => {
    expect(toHtml(html`${'a & "b" \'c\''}`)).toBe(
      'a &amp; &quot;b&quot; &#39;c&#39;',
    );
  });

  it('leaves nested safe html unescaped', () => {
    const inner = html`<b>${'x'}</b>`;

    expect(toHtml(html`<p>${inner}</p>`)).toBe('<p><b>x</b></p>');
  });

  it('trusts raw content', () => {
    expect(toHtml(raw('<i>ok</i>'))).toBe('<i>ok</i>');
  });

  it('renders arrays by concatenation', () => {
    expect(toHtml(html`${[1, 2, 3]}`)).toBe('123');
  });

  it('drops null, undefined and false', () => {
    expect(toHtml(html`${null}${undefined}${false}`)).toBe('');
  });

  it('joins with a separator', () => {
    expect(toHtml(join(['a', 'b'], ', '))).toBe('a, b');
  });

  it('renders a branch only when the condition holds', () => {
    expect(toHtml(when(true, () => 'yes'))).toBe('yes');
    expect(toHtml(when(false, () => 'no'))).toBe('');
  });
});

describe('attributes', () => {
  it('escapes attribute values', () => {
    expect(toHtml(attributes({ title: '"x"' }))).toBe(' title="&quot;x&quot;"');
  });

  it('renders boolean true as a bare attribute and omits false', () => {
    expect(toHtml(attributes({ required: true, disabled: false }))).toBe(
      ' required',
    );
  });

  it('omits null and undefined', () => {
    expect(toHtml(attributes({ a: null, b: undefined, c: 'x' }))).toBe(
      ' c="x"',
    );
  });

  it('returns nothing when every value is dropped', () => {
    expect(toHtml(attributes({ a: false }))).toBe('');
  });
});

describe('classes', () => {
  it('joins strings and truthy conditional entries', () => {
    expect(classes('a', { b: true, c: false }, ['d'])).toBe('a b d');
  });

  it('drops falsy values', () => {
    expect(classes('a', false, null, undefined)).toBe('a');
  });
});
