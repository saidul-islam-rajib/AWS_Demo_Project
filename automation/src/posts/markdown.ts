import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false });

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
