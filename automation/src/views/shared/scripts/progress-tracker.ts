export const PROGRESS_TRACKER_SCRIPT = `
<script>
(function () {
  var KEY = 'tutorial-progress';

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function write(state) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      return;
    }
  }

  var state = read();

  function isDone(id) {
    return state[id] === true;
  }

  function paintList() {
    var items = document.querySelectorAll('[data-lesson-id]');
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      el.classList.toggle('done', isDone(el.getAttribute('data-lesson-id')));
    }
  }

  function paintProgress() {
    var bars = document.querySelectorAll('[data-progress-for]');
    for (var i = 0; i < bars.length; i++) {
      var bar = bars[i];
      var ids = (bar.getAttribute('data-progress-for') || '').split(',').filter(Boolean);
      var done = 0;
      for (var j = 0; j < ids.length; j++) {
        if (isDone(ids[j])) done++;
      }
      var pct = ids.length ? Math.round((done / ids.length) * 100) : 0;
      var fill = bar.querySelector('.progress-fill');
      if (fill) fill.style.width = pct + '%';
      var label = bar.querySelector('[data-progress-label]');
      if (label) {
        label.textContent = ids.length
          ? done + ' of ' + ids.length + ' complete'
          : 'No lessons yet';
      }
    }
  }

  function paint() {
    paintList();
    paintProgress();
  }

  var button = document.querySelector('[data-mark-done]');
  if (button) {
    var id = button.getAttribute('data-mark-done');
    var sync = function () {
      var done = isDone(id);
      button.setAttribute('aria-pressed', done ? 'true' : 'false');
      var text = button.querySelector('[data-mark-label]');
      if (text) text.textContent = done ? 'Completed' : 'Mark as complete';
    };

    button.addEventListener('click', function () {
      if (isDone(id)) {
        delete state[id];
      } else {
        state[id] = true;
      }
      write(state);
      sync();
      paint();
    });

    sync();
  }

  paint();
})();
</script>`;
