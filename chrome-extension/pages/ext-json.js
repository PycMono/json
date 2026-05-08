// JSON Home — page init (CSP-compliant: no inline scripts allowed)

document.addEventListener('DOMContentLoaded', function() {
  // Search filter
  var searchInput = document.getElementById('jtSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      filterJSONTools(this.value);
    });
  }

  function filterJSONTools(q) {
    q = (q || '').trim().toLowerCase();
    var anyVisible = false;
    document.querySelectorAll('.jt-group').forEach(function(group) {
      var groupVisible = false;
      group.querySelectorAll('.jt-card').forEach(function(card) {
        var match = !q || card.textContent.toLowerCase().includes(q);
        card.style.display = match ? '' : 'none';
        if (match) groupVisible = true;
      });
      group.style.display = groupVisible ? '' : 'none';
      if (groupVisible) anyVisible = true;
    });
    document.getElementById('jtNoResults').style.display = anyVisible ? 'none' : 'block';
  }
});
