// JSON Learn Hub — filter, search, progress tracking, language dropdown
(function() {
  var _learnCat = 'all', _learnLvl = 'all', _learnQ = '';
  var _searchTimer = null;

  function filterLearn(cat) {
    _learnCat = cat;
    document.querySelectorAll('.lrn-tab').forEach(function(b){ b.classList.toggle('lrn-tab--active', b.dataset.cat === cat); });
    applyLearnFilter();
  }
  function filterLevel(lvl) {
    _learnLvl = lvl;
    document.querySelectorAll('.lrn-level-btn').forEach(function(b){
      b.className = 'lrn-level-btn' + (b.dataset.lvl === lvl ? ' lrn-level-btn--active-' + lvl : '');
    });
    applyLearnFilter();
  }
  function searchLearn(q) {
    _learnQ = q.toLowerCase();
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(applyLearnFilter, 200);
  }
  function resetLearnFilters() {
    _learnCat = 'all'; _learnLvl = 'all'; _learnQ = '';
    var searchInput = document.getElementById('learnSearch');
    if (searchInput) searchInput.value = '';
    document.querySelectorAll('.lrn-tab').forEach(function(b){ b.classList.toggle('lrn-tab--active', b.dataset.cat === 'all'); });
    document.querySelectorAll('.lrn-level-btn').forEach(function(b){ b.className = 'lrn-level-btn' + (b.dataset.lvl === 'all' ? ' lrn-level-btn--active-all' : ''); });
    applyLearnFilter();
  }
  function applyLearnFilter() {
    var cards = document.querySelectorAll('#learnGrid .article-card');
    var visible = 0;
    cards.forEach(function(card, i) {
      var cat = card.dataset.category, lvl = card.dataset.level, title = (card.dataset.title || '').toLowerCase();
      var show = (_learnCat === 'all' || cat === _learnCat)
        && (_learnLvl === 'all' || lvl === _learnLvl)
        && (_learnQ === '' || title.includes(_learnQ));
      card.style.display = show ? '' : 'none';
      if (show) { card.style.animationDelay = (visible * 30) + 'ms'; visible++; }
    });
    var noRes = document.getElementById('learnNoResults');
    if (noRes) noRes.style.display = visible === 0 ? 'block' : 'none';
    var countEl = document.getElementById('learnCount');
    if (countEl) countEl.textContent = 'Showing ' + visible + ' of ' + cards.length;
  }

  // Expose globals for onclick handlers
  window.filterLearn = filterLearn;
  window.filterLevel = filterLevel;
  window.searchLearn = searchLearn;
  window.resetLearnFilters = resetLearnFilters;

  // Reading progress tracking
  (function() {
    var read = JSON.parse(localStorage.getItem('jt_read') || '{}');
    document.querySelectorAll('[data-slug]').forEach(function(el) {
      if (read[el.dataset.slug]) el.style.display = 'inline';
    });
    var levels = {beginner: 0, intermediate: 0, advanced: 0};
    var totals = {beginner: 10, intermediate: 21, advanced: 22};
    Object.keys(read).forEach(function(slug) {
      var safeSlug = slug.replace(/"/g, '');
      var card = document.querySelector('.article-card[data-slug="' + safeSlug + '"]');
      if (card) { var lvl = card.dataset.level; if (lvl && levels[lvl] !== undefined) levels[lvl]++; }
    });
    Object.keys(levels).forEach(function(lvl) {
      var bar = document.getElementById('progress-' + lvl);
      if (bar) bar.style.width = Math.round(levels[lvl] / totals[lvl] * 100) + '%';
    });
  })();

  // Init count
  applyLearnFilter();

  // Language dropdown - close on outside click
  document.addEventListener('click', function(e) {
    var sel = document.getElementById('learnLangSelect');
    if (sel && !sel.contains(e.target)) sel.classList.remove('open');
  });
})();
