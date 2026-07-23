export const CONDITIONAL_FIELDS_SCRIPT = `
<script>
(function () {
  var controls = document.querySelectorAll('[data-reveals]');
  if (!controls.length) return;

  function targetsOf(select) {
    var ids = [];

    for (var i = 0; i < select.options.length; i++) {
      var id = select.options[i].getAttribute('data-reveals');
      if (id && ids.indexOf(id) === -1) ids.push(id);
    }

    return ids;
  }

  function apply(select) {
    var wanted = select.options[select.selectedIndex]
      ? select.options[select.selectedIndex].getAttribute('data-reveals')
      : '';

    var ids = targetsOf(select);

    for (var i = 0; i < ids.length; i++) {
      var field = document.getElementById(ids[i]);
      if (field) field.hidden = ids[i] !== wanted;
    }
  }

  for (var i = 0; i < controls.length; i++) {
    var select = controls[i];
    if (select.tagName !== 'SELECT') continue;

    apply(select);
    select.addEventListener('change', function (e) {
      apply(e.target);
    });
  }
})();
</script>`;
