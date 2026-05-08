/* =============================================================
   AI Tool Navigation — ai-tool-nav.js
   Unified dropdown handler for hub-tabs navigation
   ============================================================= */
(function () {
  'use strict';

  function initHubTabs() {
    var more = document.getElementById('hubTabsMore');
    if (!more) return;

    var btn = more.querySelector('.hub-tab--more');
    var dropdown = document.getElementById('hubTabsDropdown');
    if (!btn || !dropdown) return;

    // Toggle dropdown
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = more.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen);

      if (isOpen) {
        var rect = btn.getBoundingClientRect();
        dropdown.style.top = (rect.bottom + 4) + 'px';
        dropdown.style.left = '';
        dropdown.style.right = (window.innerWidth - rect.right) + 'px';
      }
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!more.contains(e.target)) {
        more.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && more.classList.contains('open')) {
        more.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHubTabs);
  } else {
    initHubTabs();
  }
})();
