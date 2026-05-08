'use strict';
// to-csv (requires PapaParse)
function initToolOptions() {
  document.getElementById('inputOptions').innerHTML = `
    <span class="jt-options-label">分隔符</span>
    <select id="csvDelimiter" class="jt-options-select">
      <option value="," selected>逗号 (,)</option>
      <option value=";">分号 (;)</option>
      <option value="\t">Tab</option>
    </select>`;
}
function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-to-csv');
  clearErrorPanel();
  let parsed = parseInput(); if (parsed === null) return;
  if (!Array.isArray(parsed)) {
    if (typeof parsed === 'object' && parsed !== null) {
      parsed = [parsed];
    } else {
      showErrorPanel(new TypeError('输入必须为 JSON 数组（[...]）或对象（{...}）'), getInput().trim());
      return;
    }
  }
  const delimEl = document.getElementById('csvDelimiter');
  const delimiter = delimEl ? delimEl.value : ',';
  let csv;
  if (typeof Papa !== 'undefined') {
    csv = Papa.unparse(parsed, { quotes: true, delimiter: delimiter, header: true });
  } else {
    csv = builtinCsvUnparse(parsed, { delimiter: delimiter });
  }
  setOutput(csv, 'plaintext');
  if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('json-tool-to-csv', 1, Date.now() - _gaStart);
  const el = document.getElementById('outputStats');
  if (el) el.innerHTML = `<span class="jt-success-badge">✅ 转换成功，共 ${parsed.length} 行</span>`;
}
