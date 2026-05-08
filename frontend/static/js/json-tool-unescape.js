'use strict';
// unescape
function initToolOptions() {}
function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-unescape');
  clearErrorPanel();
  const raw = getInput().trim(); if (!raw) return;
  try {
    const result = smartJsonUnescape(raw);
    // 尝试把结果格式化为 JSON（如果是合法 JSON）
    try {
      const parsed = JSON.parse(result);
      setOutput(JSON.stringify(parsed, null, 2));
    } catch (e) {
      setOutput(result);
  if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('json-tool-unescape', 1, Date.now() - _gaStart);
    }
    const el = document.getElementById('outputStats');
    if (el) el.innerHTML = '<span class="jt-success-badge">✅ 反转义完成</span>';
  } catch(e) {
    showErrorPanel(e, raw);
  }
}
function beautifyOutput() {
  if (!outputEditor) return;
  const raw = outputEditor.getValue().trim();
  if (!raw) { showToast('输出内容为空', 'info'); return; }
  try {
    const pretty = JSON.stringify(JSON.parse(raw), null, 2);
    outputEditor.setValue(pretty);
    showToast('美化完成', 'success');
  } catch(e) { showToast('JSON 格式错误，无法美化', 'error'); }
}
function loadExample() {
  if (inputEditor) {
    inputEditor.setValue('"{\\\"name\\\":\\\"Alice\\\",\\\"age\\\":30,\\\"city\\\":\\\"Beijing\\\"}"');
  }
  clearErrorPanel();
}
