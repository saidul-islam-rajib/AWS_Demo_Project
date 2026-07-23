export const SORTABLE_SCRIPT = `
<script>
(function () {
  var list = document.querySelector('[data-sortable]');
  if (!list || typeof list.addEventListener !== 'function') return;

  var form = document.querySelector('[data-sortable-form]');
  var field = form ? form.querySelector('[data-sortable-order]') : null;
  var dragged = null;

  function rows() {
    return Array.prototype.slice.call(list.querySelectorAll('[data-sort-id]'));
  }

  function rowFrom(node) {
    while (node && node !== list) {
      if (node.nodeType === 1 && node.hasAttribute('data-sort-id')) return node;
      node = node.parentNode;
    }
    return null;
  }

  function renumber() {
    var all = rows();
    for (var i = 0; i < all.length; i++) {
      var badge = all[i].querySelector('[data-sort-number]');
      if (badge) badge.textContent = String(i + 1);
    }
  }

  function persist() {
    if (!form || !field) return;

    var ids = [];
    var all = rows();
    for (var i = 0; i < all.length; i++) {
      ids.push(all[i].getAttribute('data-sort-id'));
    }

    field.value = ids.join(',');
    form.submit();
  }

  list.addEventListener('dragstart', function (e) {
    var row = rowFrom(e.target);
    if (!row) return;

    dragged = row;
    row.classList.add('dragging');

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('text/plain', row.getAttribute('data-sort-id'));
      } catch (err) {
        return;
      }
    }
  });

  list.addEventListener('dragover', function (e) {
    if (!dragged) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

    var target = rowFrom(e.target);
    if (!target || target === dragged) return;

    var box = target.getBoundingClientRect();
    var below = e.clientY - box.top > box.height / 2;

    list.insertBefore(dragged, below ? target.nextSibling : target);
    renumber();
  });

  list.addEventListener('drop', function (e) {
    if (dragged) e.preventDefault();
  });

  list.addEventListener('dragend', function () {
    if (!dragged) return;

    dragged.classList.remove('dragging');
    dragged = null;

    renumber();
    persist();
  });
})();
</script>`;
