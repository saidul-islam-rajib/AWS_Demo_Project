export const CHIP_CSS = `
  /* ---------- chip input ---------- */
  .chip-input {
    display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem;
    padding: 0.45rem 0.5rem; min-height: 42px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; cursor: text;
  }
  .chip-input.focused {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
  }
  .chip {
    display: inline-flex; align-items: center; gap: 0.35rem;
    background: var(--accent); color: var(--accent-ink);
    border-radius: 5px; padding: 0.2rem 0.3rem 0.2rem 0.55rem;
    font-size: 0.84rem; line-height: 1.4; max-width: 100%;
  }
  .chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chip button {
    background: transparent; border: 0; cursor: pointer;
    color: inherit; opacity: 0.75; font-size: 1rem; line-height: 1;
    padding: 0 0.25rem; font-family: inherit;
  }
  .chip button:hover { opacity: 1; }
  .chip-input input {
    flex: 1; min-width: 120px; border: 0; outline: 0; padding: 0.2rem;
    background: transparent; color: var(--ink); font-size: 0.92rem;
    font-family: inherit; box-shadow: none;
  }
  .chip-input input:focus { box-shadow: none; border: 0; }
  .chip-count { font-size: 0.72rem; color: var(--ink-3); }
`;

export const CHIP_JS = `
<script>
(function () {
  document.querySelectorAll('.chip-input').forEach(function (box) {
    var hidden = document.getElementById(box.getAttribute('data-target'));
    var sep = box.getAttribute('data-sep') === 'newline' ? '\\n' : ', ';
    var splitter = box.getAttribute('data-sep') === 'newline' ? /\\n/ : /,/;
    var max = parseInt(box.getAttribute('data-max') || '99', 10);
    var input = box.querySelector('input[type=text]');
    var counter = box.parentNode.querySelector('.chip-count');

    var items = (hidden.value || '')
      .split(splitter)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);

    function sync() {
      hidden.value = items.join(sep);
      if (counter) counter.textContent = items.length + ' / ' + max;
      input.placeholder = items.length >= max ? 'Limit reached' : input.getAttribute('data-placeholder');
    }

    function render() {
      box.querySelectorAll('.chip').forEach(function (c) { c.remove(); });

      items.forEach(function (value, index) {
        var chip = document.createElement('span');
        chip.className = 'chip';

        var label = document.createElement('span');
        label.textContent = value;
        chip.appendChild(label);

        var x = document.createElement('button');
        x.type = 'button';
        x.textContent = '×';
        x.setAttribute('aria-label', 'Remove ' + value);
        x.addEventListener('click', function () {
          items.splice(index, 1);
          render();
        });
        chip.appendChild(x);

        box.insertBefore(chip, input);
      });

      sync();
    }

    function add(raw) {
      raw.split(splitter).forEach(function (part) {
        var value = part.trim();
        if (!value) return;
        if (items.length >= max) return;
        // Case-insensitive duplicate check, first spelling wins.
        var exists = items.some(function (i) { return i.toLowerCase() === value.toLowerCase(); });
        if (exists) return;
        items.push(value);
      });
      input.value = '';
      render();
    }

    input.setAttribute('data-placeholder', input.placeholder);

    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ',') {
        ev.preventDefault();
        add(input.value);
      } else if (ev.key === 'Backspace' && input.value === '' && items.length) {
        items.pop();
        render();
      }
    });

    input.addEventListener('blur', function () { add(input.value); });
    input.addEventListener('paste', function (ev) {
      ev.preventDefault();
      add((ev.clipboardData || window.clipboardData).getData('text'));
    });

    box.addEventListener('click', function (ev) {
      if (ev.target === box) input.focus();
    });
    input.addEventListener('focus', function () { box.classList.add('focused'); });
    input.addEventListener('blur', function () { box.classList.remove('focused'); });

    // The form may submit while text is still in the box.
    var form = box.closest('form');
    if (form) form.addEventListener('submit', function () { add(input.value); });

    render();
  });
})();
</script>`;
