'use strict';
// pretty
function initToolOptions() {
  const inputOpts = document.getElementById('inputOptions');
  if (inputOpts) {
    inputOpts.innerHTML = `
      <button onclick="jsonEscapeInput()" class="jt-btn jt-btn--ghost">转义</button>
      <button onclick="jsonUnescapeInput()" class="jt-btn jt-btn--ghost">反转义</button>
      <button onclick="jsonRepairInput()" class="jt-btn jt-btn--ghost">修复</button>
    `;
  }
  const suffix = document.getElementById('outputOptions');
  if (suffix) {
    suffix.innerHTML = `
      <span class="jt-options-label">缩进</span>
      <select id="indentSelect" class="jt-options-select">
        <option value="2" selected>2 空格</option>
        <option value="4">4 空格</option>
        <option value="tab">Tab</option>
      </select>
    `;
  }
}
function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-pretty');
  const parsed = parseInput();
  if (parsed === null) return;
  const v = document.getElementById('indentSelect')?.value || '2';
  setOutput(JSON.stringify(parsed, null, v === 'tab' ? '\t' : parseInt(v)));
  const el = document.getElementById('outputStats');
  if (el) el.innerHTML = '<span class="jt-success-badge">✅ 格式化完成</span>';
}

