export const AUTO_COMPLETE_DELAY_MS = 10000;

export const PROGRESS_TRACKER_SCRIPT = `
<script>
(function () {
  var KEY = 'tutorial-progress';
  var DWELL = ${AUTO_COMPLETE_DELAY_MS};

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

  var toggle = document.querySelector('[data-mark-done]');

  if (!toggle) {
    paint();
    return;
  }

  var id = toggle.getAttribute('data-mark-done');

  function sync() {
    var done = isDone(id);
    toggle.setAttribute('aria-pressed', done ? 'true' : 'false');

    var label = toggle.querySelector('[data-mark-label]');
    if (label) label.textContent = done ? 'Completed' : 'Mark as complete';

    var note = document.querySelector('[data-auto-note]');
    if (note) note.hidden = done;
  }

  function setDone(value) {
    if (value) {
      state[id] = true;
    } else {
      delete state[id];
    }
    write(state);
    sync();
    paint();
  }

  toggle.addEventListener('click', function () {
    setDone(!isDone(id));
  });

  var sentinel = document.querySelector('[data-lesson-end]');

  if (sentinel && typeof window.IntersectionObserver === 'function') {
    var timer = null;

    var observer = new window.IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          if (!isDone(id) && timer === null) {
            timer = window.setTimeout(function () {
              timer = null;
              if (!isDone(id)) setDone(true);
            }, DWELL);
          }
        } else if (timer !== null) {
          window.clearTimeout(timer);
          timer = null;
        }
      }
    });

    observer.observe(sentinel);
  }

  sync();
  paint();
})();
</script>`;
