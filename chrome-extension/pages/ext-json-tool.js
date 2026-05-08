// JSON Tool — globals and overrides ONLY
// Per-tool JS loading is handled by ext-json-tool-events.js (runs last)

window.JT_EXT_MODE = true;

var toolKey = new URLSearchParams(location.search).get('tool') || 'validate';
window.JT_TOOL = toolKey;

if (!window.JT_LANG) {
  var bl = (navigator.language || 'en').split('-')[0];
  window.JT_LANG = (bl === 'zh') ? 'zh' : 'en';
}
if (!window.JT_I18N) window.JT_I18N = {};

// Override navigation functions
window.selectTool = function(key) {
  location.href = 'json-tool.html?tool=' + key;
};
window.swapEditors = function(reverseTool) {
  location.href = 'json-tool.html?tool=' + reverseTool + '&lang=' + (window.JT_LANG || 'en');
};
window.recordVisit = function() {};
window.recordHistory = function() {};
window.clearHistory = function() {};
