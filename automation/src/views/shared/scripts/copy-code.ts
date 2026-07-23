export const COPY_CODE_CSS = `
  .copy-btn {
    background: transparent; border: 1px solid var(--border);
    color: var(--ink-2); border-radius: 100px; cursor: pointer;
    font-family: inherit; font-size: 0.78rem; padding: 0.3rem 0.85rem;
  }
  .copy-btn:hover { border-color: var(--accent); color: var(--accent); }
  .copy-row {
    display: flex; align-items: center; justify-content: center;
    gap: 0.6rem; margin: -0.75rem 0 1.5rem;
  }
`;

/*
 * A code that has to be typed by hand is a code that gets typed wrong, and a
 * wrong code reads as "your account is gone". The button is removed rather
 * than left broken where the clipboard is unavailable, so nobody presses
 * something that silently does nothing.
 */
export const COPY_CODE_SCRIPT = `
<script>
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
</script>`;
