'use strict';
// stringify
function initToolOptions() {}
function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-stringify');
  clearErrorPanel();
  const parsed = parseInput(); if (parsed === null) return;
  setOutput(JSON.stringify(JSON.stringify(parsed)), 'plaintext');
  const el = document.getElementById('outputStats');
  if (el) el.innerHTML = '<span class="jt-success-badge">✅ 序列化完成</span>';
}
