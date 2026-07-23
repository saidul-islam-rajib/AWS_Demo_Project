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

  function paintResume() {
    var resume = document.querySelector('[data-resume]');
    if (!resume) return;

    var ids = (resume.getAttribute('data-resume') || '').split(',').filter(Boolean);
    var hrefs = (resume.getAttribute('data-resume-urls') || '').split(',').filter(Boolean);
    if (!ids.length) return;

    var next = -1;
    for (var i = 0; i < ids.length; i++) {
      if (!isDone(ids[i])) { next = i; break; }
    }

    var label = resume.querySelector('[data-resume-label]');

    if (next === -1) {
      resume.setAttribute('href', hrefs[0]);
      if (label) label.textContent = 'Read again from the start';
      resume.classList.add('done');
      return;
    }

    resume.setAttribute('href', hrefs[next]);
    resume.classList.remove('done');
    if (label) {
      label.textContent = next === 0 ? 'Start the course' : 'Continue where you left off';
    }
  }

  function paintChapters() {
    var bars = document.querySelectorAll('[data-chapter-of]');
    for (var i = 0; i < bars.length; i++) {
      var bar = bars[i];
      var ids = (bar.getAttribute('data-chapter-of') || '').split(',').filter(Boolean);
      var done = 0;
      for (var j = 0; j < ids.length; j++) {
        if (isDone(ids[j])) done++;
      }
      bar.textContent = done + '/' + ids.length;
      bar.classList.toggle('complete', ids.length > 0 && done === ids.length);
    }
  }

  function paint() {
    paintList();
    paintProgress();
    paintResume();
    paintChapters();
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
    var seconds = parseInt(sentinel.getAttribute('data-dwell') || '', 10);
    var DWELL = (isNaN(seconds) || seconds <= 0 ? 30 : seconds) * 1000;
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
