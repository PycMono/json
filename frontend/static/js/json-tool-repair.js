'use strict';
// repair - robust JSON repair with string-aware processing
function initToolOptions() {
  const inputOpts = document.getElementById('inputOptions');
  if (inputOpts) {
    inputOpts.innerHTML = `
      <button onclick="jsonEscapeInput()" class="jt-btn jt-btn--ghost">转义</button>
      <button onclick="jsonUnescapeInput()" class="jt-btn jt-btn--ghost">反转义</button>
    `;
  }
}

function validateRepairOutput() {
  clearErrorPanel();
  const val = getOutput().trim();
  if (!val) { showToast('输出为空', 'info'); return; }
  try {
    JSON.parse(val);
    showToast('JSON 格式正确', 'success');
  } catch(e) {
    showErrorPanel(e, val);
  }
}

function beautifyRepairOutput() {
  clearErrorPanel();
  const val = getOutput().trim();
  if (!val) { showToast('输出为空', 'info'); return; }
  try {
    const parsed = JSON.parse(val);
    setOutput(JSON.stringify(parsed, null, 2), 'json');
    showToast('美化完成', 'success');
  } catch(e) {
    showErrorPanel(e, val);
  }
}

function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-repair');
  clearErrorPanel();
  const raw = getInput().trim();
  if (!raw) return;
  try {
    const { result, fixes } = repairJsonWithReport(raw);
    setOutput(result);
  if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('json-tool-repair', 1, Date.now() - _gaStart);
    const el = document.getElementById('outputStats');
    const changed = raw.trim() !== result.trim();
    if (el) {
      el.innerHTML = changed
        ? '<span class="jt-success-badge">✅ ' + (i18n('json.repair.done') || '修复完成') + '</span>'
        : '<span class="jt-success-badge">✅ ' + (i18n('json.repair.no_fix') || 'JSON 无需修复') + '</span>';
    }
    // Show repair report if fixes were applied
    if (changed && fixes.length > 0) {
      showRepairReport(fixes);
      showRepairBadge(fixes.length);
    } else {
      const panel = document.getElementById('repairReportPanel');
      if (panel) panel.style.display = 'none';
    }
  } catch(e) {
    showErrorPanel(e, raw);
  }
}

