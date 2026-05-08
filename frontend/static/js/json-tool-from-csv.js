'use strict';
// from-csv (requires PapaParse)
function initToolOptions() {
  document.getElementById('inputOptions').innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;font-size:0.8125rem">
      <input id="dynamicTyping" type="checkbox" checked>
      <span>自动识别数字类型</span>
    </label>`;
}
function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-from-csv');
  clearErrorPanel();
  const raw = getInput().trim(); if (!raw) return;
  const dynamicTyping = document.getElementById('dynamicTyping')?.checked !== false;
  let result;
  if (typeof Papa !== 'undefined') {
    result = Papa.parse(raw, {
      header: true,
      dynamicTyping: dynamicTyping,
      skipEmptyLines: true,
    });
    if (result.errors.length > 0) {
      const fakeErr = new SyntaxError(result.errors[0].message);
      showErrorPanel(fakeErr, raw);
      return;
    }
    setOutput(JSON.stringify(result.data, null, 2));
  } else {
    result = builtinCsvParse(raw, { header: true, dynamicTyping: dynamicTyping, skipEmptyLines: true });
    setOutput(JSON.stringify(result, null, 2));
  }
  const el = document.getElementById('outputStats');
  if (el) {
    const data = Array.isArray(result) ? result : (result.data || []);
    el.innerHTML = `<span class="jt-success-badge">✅ 转换成功，共 ${data.length} 行</span>`;
  }
}
