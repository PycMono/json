'use strict';
// escape
function initToolOptions() {}
function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-escape');
  clearErrorPanel();
  const raw = getInput().trim(); if (!raw) return;
  try {
    JSON.parse(raw);
    const escaped = raw.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n').replace(/\r/g,'\\r').replace(/\t/g,'\\t');
    setOutput(escaped, 'plaintext');
  if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('json-tool-escape', 1, Date.now() - _gaStart);
    const el = document.getElementById('outputStats');
    if (el) el.innerHTML = '<span class="jt-success-badge">✅ 转义完成</span>';
  } catch(e) { showErrorPanel(e, raw); }
}
