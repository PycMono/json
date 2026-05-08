'use strict';
// minify
function initToolOptions() {}
function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-minify');
  clearErrorPanel();
  const parsed = parseInput();
  if (parsed === null) return;
  const minified = JSON.stringify(parsed);
  setOutput(minified);
  if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('json-tool-minify', 1, Date.now() - _gaStart);
  const original = new Blob([getInput()]).size;
  const compact  = new Blob([minified]).size;
  const saved    = Math.round((1 - compact / original) * 100);
  const el = document.getElementById('outputStats');
  if (el) el.innerHTML = `<span class="jt-success-badge">✅ 压缩完成</span> <span style="margin-left:6px;opacity:.7">节省 ${saved}%（${formatBytes(original)} → ${formatBytes(compact)}）</span>`;
}
