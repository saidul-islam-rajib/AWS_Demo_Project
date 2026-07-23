export const CERTIFICATE_SCRIPT = `
<script>
(function () {
  var KEY = 'tutorial-certificate';

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  var remembered = read();
  var fields = document.querySelectorAll('[data-cert-remember]');

  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    var name = field.getAttribute('data-cert-remember');

    if (remembered[name] && !field.value) field.value = remembered[name];

    field.addEventListener('change', function (e) {
      var store = read();
      store[e.target.getAttribute('data-cert-remember')] = e.target.value;
      try {
        window.localStorage.setItem(KEY, JSON.stringify(store));
      } catch (err) {
        return;
      }
    });
  }

  var form = document.querySelector('[data-cert-form]');
  var warning = document.querySelector('[data-cert-incomplete]');

  if (form && warning) {
    try {
      var progress = JSON.parse(
        window.localStorage.getItem('tutorial-progress') || '{}',
      );
      var ids = (form.getAttribute('data-cert-lessons') || '')
        .split(',')
        .filter(Boolean);

      var done = 0;
      for (var j = 0; j < ids.length; j++) {
        if (progress[ids[j]] === true) done++;
      }

      warning.hidden = ids.length === 0 || done === ids.length;
    } catch (e) {
      warning.hidden = true;
    }
  }

  var print = document.querySelector('[data-cert-print]');

  if (print) {
    print.addEventListener('click', function () {
      window.print();
    });
  }
})();
</script>`;
