(function(){
  var btn = document.getElementById('imgTabsMoreBtn');
  var dropdown = document.getElementById('imgTabsDropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', function(e){
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', function(e){
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });

  // Close on Escape
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') dropdown.classList.remove('open');
  });
})();
