// Monaco AMD loader lock — force local paths
// Must load AFTER monaco-vs/loader.js but BEFORE json-tools-core.js
(function() {
  if (typeof require === 'undefined' || typeof require.config !== 'function') return;
  var _rc = require.config.bind(require);
  require.config = function(cfg) {
    if (cfg && cfg.paths && cfg.paths.vs) {
      cfg.paths.vs = '../static/vendor/monaco-vs';
    }
    return _rc(cfg);
  };
  require.config({ paths: { 'vs': '../static/vendor/monaco-vs' } });
})();
