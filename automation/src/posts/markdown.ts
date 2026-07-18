import { marked } from 'marked';

/** Local rather than imported from the views, to keep posts free of them. */
function attr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const renderer = new marked.Renderer();

/**
 * Article images carry the loading skeleton and are deferred.
 *
 * Building the tag here rather than post-processing the rendered HTML means
 * the attributes are added once, at the only place images are created, and
 * no regex has to be trusted against arbitrary markup. Escaping is ours to
 * do now that marked is no longer writing the tag.
 */
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

/**
 * Column blocks.
 *
 *   :::columns
 *   ![Diagram](/uploads/a.png)
 *   |||
 *   Text beside it, **markdown still works**.
 *   :::
 *
 * Cells are separated by `|||`. Each cell is rendered as markdown in its own
 * right, which plain HTML in a markdown document would not allow.
 */
const COLUMN_BLOCK = /^:::columns[ \t]*\n([\s\S]*?)^:::[ \t]*$/gm;

/**
 * `==text==` becomes a highlight. Not part of GitHub Flavored Markdown, but
 * widely recognised and the natural way to express "mark this".
 *
 * Applied before parsing so marked still escapes the text inside.
 */
const HIGHLIGHT = /==([^=\n]+)==/g;

export function renderMarkdown(source: string): string {
  const withHighlights = (source ?? '').replace(HIGHLIGHT, '<mark>$1</mark>');

  const withColumns = withHighlights.replace(
    COLUMN_BLOCK,
    (_match, body: string) => {
      const cells = String(body)
        .split(/^\|\|\|[ \t]*$/m)
        .map((cell) => marked.parse(cell.trim()));

      // Single-cell blocks would be a pointless grid; render the content plainly.
      if (cells.length < 2) return cells.join('');

      const inner = cells
        .map((html) => `<div class="md-col">${html}</div>`)
        .join('');
      return `<div class="md-columns" data-cols="${cells.length}">${inner}</div>`;
    },
  );

  return marked.parse(withColumns);
}
