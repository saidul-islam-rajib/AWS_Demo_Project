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

  var print = document.querySelector('[data-cert-print]');

  if (print) {
    print.addEventListener('click', function () {
      window.print();
    });
  }
})();
</script>`;
