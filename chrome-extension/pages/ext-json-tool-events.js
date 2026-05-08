// Wire up event listeners for JSON tool page
// Per-tool JS is loaded statically via json-tools-bundle.js

(function() {
  function onClick(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  onClick('processBtn', function() { if (typeof runProcessJson === 'function') runProcessJson(); });
  onClick('swapBtn', function() { if (typeof swapEditors === 'function') swapEditors(); });
  onClick('loadExampleBtn', function() { if (typeof loadExample === 'function') loadExample(); });
  onClick('clearInputBtn', function() { if (typeof clearInput === 'function') clearInput(); });
  onClick('fetchUrlBtn', function() { if (typeof fetchJsonFromUrl === 'function') fetchJsonFromUrl(); });
  onClick('copyBtn', function() { if (typeof copyOutput === 'function') copyOutput(); });
  onClick('downloadBtn', function() { if (typeof downloadOutput === 'function') downloadOutput(); });
  onClick('fullscreenBtn', function() { if (typeof openFullscreen === 'function') openFullscreen(); });
  onClick('closeFullscreenBtn', function() { if (typeof closeFullscreen === 'function') closeFullscreen(); });
  onClick('sidebarToggle', function() { if (typeof toggleHistorySidebar === 'function') toggleHistorySidebar(); });
  onClick('closeSidebarBtn', function() { if (typeof toggleHistorySidebar === 'function') toggleHistorySidebar(); });
  onClick('clearHistoryBtn', function() { if (typeof clearHistory === 'function') clearHistory(); });
  onClick('closeErrorBtn', function() { if (typeof hideErrorPanel === 'function') hideErrorPanel(); });
  onClick('expandAllBtn', function() { if (typeof expandAllOutputTree === 'function') expandAllOutputTree(); });
  onClick('collapseAllBtn', function() { if (typeof collapseAllOutputTree === 'function') collapseAllOutputTree(); });

  // Fullscreen backdrop click
  var overlay = document.getElementById('fullscreenOverlay');
  if (overlay) overlay.addEventListener('click', function(e) {
    if (e.target === overlay && typeof closeFullscreen === 'function') closeFullscreen();
  });

  onClick('fullscreenProcessBtn', function() { if (typeof processJsonFullscreen === 'function') processJsonFullscreen(); });
  onClick('fullscreenSwapBtn', function() { if (typeof swapEditors === 'function') swapEditors(); });
  onClick('fullscreenCopyBtn', function() { if (typeof copyOutput === 'function') copyOutput(); });
  onClick('fullscreenDownloadBtn', function() { if (typeof downloadOutput === 'function') downloadOutput(); });

  // Tool selector
  onClick('toolSelector', function(e) {
    if (e.target.closest('#toolDropdown') || e.target.id === 'toolSearchInput') return;
    if (typeof toggleToolSelector === 'function') toggleToolSelector();
  });

  var searchInput = document.getElementById('toolSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function() { if (typeof filterToolDropdown === 'function') filterToolDropdown(this.value); });
    searchInput.addEventListener('keydown', function(e) { if (typeof handleToolSearchKeydown === 'function') handleToolSearchKeydown(e); });
  }

  var fileInput = document.getElementById('uploadInput');
  if (fileInput) fileInput.addEventListener('change', function() { if (typeof uploadFile === 'function') uploadFile(this); });

  // Close dropdown on outside click
  document.addEventListener('click', function(e) {
    var sel = document.getElementById('toolSelector');
    var dd = document.getElementById('toolDropdown');
    if (dd && sel && !sel.contains(e.target)) dd.style.display = 'none';
  });
})();
