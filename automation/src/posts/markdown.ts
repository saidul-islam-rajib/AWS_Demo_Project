import { marked } from 'marked';

function attr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const renderer = new marked.Renderer();

renderer.image = (href: string | null, title: string | null, text: string) =>
  [
    `<img class="skel" src="${attr(href ?? '')}"`,
    `alt="${attr(text ?? '')}"`,
    title ? `title="${attr(title)}"` : '',
    'loading="lazy" decoding="async" />',
  ]
    .filter(Boolean)
    .join(' ');

marked.setOptions({ gfm: true, breaks: false, renderer });

const COLUMN_BLOCK = /^:::columns[ \t]*\n([\s\S]*?)^:::[ \t]*$/gm;

const HIGHLIGHT = /==([^=\n]+)==/g;

export function renderMarkdown(source: string): string {
  const withHighlights = (source ?? '').replace(HIGHLIGHT, '<mark>$1</mark>');

  const withColumns = withHighlights.replace(
    COLUMN_BLOCK,
    (_match, body: string) => {
      const cells = String(body)
        .split(/^\|\|\|[ \t]*$/m)
        .map((cell) => marked.parse(cell.trim()));

      if (cells.length < 2) return cells.join('');

      const inner = cells
        .map((html) => `<div class="md-col">${html}</div>`)
        .join('');
      return `<div class="md-columns" data-cols="${cells.length}">${inner}</div>`;
    },
  );

  return marked.parse(withColumns);
}
