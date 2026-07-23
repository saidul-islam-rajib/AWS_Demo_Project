export const UI_COMPONENTS_CSS = `
.ui-pill {
  display: inline-block; font-size: 0.68rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.05em;
  padding: 0.15rem 0.55rem; border-radius: 100px;
  border: 1px solid currentColor; white-space: nowrap;
}
.ui-pill--accent { color: var(--accent); }
.ui-pill--good { color: var(--good); }
.ui-pill--warn { color: var(--warn); }
.ui-pill--danger { color: var(--danger); }
.ui-pill--muted { color: var(--ink-3); }

.ui-banner {
  display: flex; gap: 0.55rem; align-items: flex-start;
  border-radius: 10px; padding: 0.7rem 0.9rem;
  font-size: 0.86rem; line-height: 1.5; margin-bottom: 1.25rem;
  border: 1px solid var(--border);
}
.ui-banner--error {
  border-color: var(--danger); color: var(--danger);
  background: color-mix(in srgb, var(--danger) 8%, transparent);
}
.ui-banner--error::before { content: "!"; font-weight: 700; }
.ui-banner--ok {
  border-color: color-mix(in srgb, var(--good) 45%, var(--border));
  color: var(--good);
  background: color-mix(in srgb, var(--good) 8%, transparent);
}
.ui-banner--info { color: var(--ink-2); background: var(--surface-2); }

.ui-field { margin-bottom: 1.15rem; }
.ui-field label {
  display: block; font-size: 0.82rem; font-weight: 600;
  margin-bottom: 0.4rem; color: var(--ink-2);
}
.ui-hint { font-size: 0.78rem; color: var(--ink-3); margin-top: 0.4rem; }

.ui-panel {
  border: 1px solid var(--border); border-radius: 12px;
  padding: 1.1rem 1.15rem; margin-bottom: 1.1rem; background: var(--surface-2);
}
.ui-panel--accent {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.ui-panel__title {
  font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.07em;
  color: var(--ink-3); margin-bottom: 0.85rem;
}

.ui-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; }
.ui-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.ui-table th {
  text-align: left; font-size: 0.72rem; text-transform: uppercase;
  letter-spacing: 0.07em; color: var(--ink-3); font-weight: 700;
  padding: 0.6rem 0.7rem; border-bottom: 1px solid var(--border);
}
.ui-table td { padding: 0.75rem 0.7rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
.ui-table tr:hover td { background: var(--surface-2); }
.ui-table .is-end { text-align: right; }
.ui-table .t { color: var(--ink); font-weight: 600; display: block; }
.ui-table .s { font-size: 0.8rem; color: var(--ink-3); display: block; }

.ui-empty {
  text-align: center; padding: 3rem 1.5rem; color: var(--ink-3);
  border: 1px dashed var(--border); border-radius: 12px;
}

.ui-toolbar {
  display: flex; align-items: flex-start; gap: 0.75rem;
  margin-bottom: 1.5rem; flex-wrap: wrap;
}
.ui-toolbar__title {
  font-family: var(--serif); font-size: 1.9rem; letter-spacing: -0.02em;
  margin-bottom: 0.15rem;
}
.ui-toolbar__sub { font-size: 0.86rem; color: var(--ink-3); }
.ui-toolbar__actions { margin-left: auto; display: flex; gap: 0.5rem; flex-wrap: wrap; }
.ui-back { font-size: 0.84rem; color: var(--ink-3); display: inline-block; margin-bottom: 0.4rem; }
.ui-back:hover { color: var(--accent); }

.ui-code {
  font-family: var(--mono); font-size: clamp(0.95rem, 3.2vw, 1.3rem);
  letter-spacing: 0.08em; text-align: center; word-break: break-word;
  padding: 1.15rem 0.75rem; margin: 1.5rem 0 0.5rem;
  border: 1px dashed var(--accent); border-radius: 12px;
  background: color-mix(in srgb, var(--accent) 6%, transparent); color: var(--ink);
}
.ui-copy-row {
  display: flex; align-items: center; justify-content: center;
  gap: 0.6rem; margin: 0 0 1.5rem;
}
.ui-copy {
  background: transparent; border: 1px solid var(--border);
  color: var(--ink-2); border-radius: 100px; cursor: pointer;
  font-family: inherit; font-size: 0.78rem; padding: 0.3rem 0.85rem;
}
.ui-copy:hover { border-color: var(--accent); color: var(--accent); }
`;

export const UI_COPY_JS = `
(function () {
  document.querySelectorAll('[data-copy]').forEach(function (button) {
    var source = document.getElementById(button.getAttribute('data-copy'));

    if (!source || !navigator.clipboard) {
      button.remove();
      return;
    }

    var idle = button.textContent;

    button.addEventListener('click', function () {
      navigator.clipboard.writeText(source.textContent.trim()).then(
        function () {
          button.textContent = 'Copied';
          window.setTimeout(function () { button.textContent = idle; }, 2000);
        },
        function () { button.textContent = 'Copy failed'; }
      );
    });
  });
})();
`;
