'use strict';
// JSONL Tools — format, validate, JSONL↔Array

function initToolOptions() {
  const opts = document.getElementById('inputOptions');
  if (opts) {
    opts.innerHTML =
      '<button onclick="jsonlToArray()" class="jt-btn jt-btn--ghost">JSONL → Array</button>' +
      '<button onclick="arrayToJsonl()" class="jt-btn jt-btn--ghost">Array → JSONL</button>' +
      '<button onclick="validateJsonl()" class="jt-btn jt-btn--ghost">Validate</button>';
  }
}

function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-jsonl');
  jsonlToArray();
}

function jsonlToArray() {
  clearErrorPanel();
  const raw = getInput().trim();
  if (!raw) { showToast(i18n('json.common.error.empty') || '请先输入内容', 'error'); return; }
  const lines = raw.split('\n').filter(l => l.trim());
  const result = [];
  const errors = [];
  lines.forEach((line, i) => {
    try {
      result.push(JSON.parse(line));
    } catch(e) {
      errors.push({ line: i + 1, error: e.message });
    }
  });
  if (errors.length > 0 && result.length === 0) {
    showErrorPanel(new Error('Line ' + errors[0].line + ': ' + errors[0].error), raw);
    return;
  }
  setOutput(JSON.stringify(result, null, 2), 'json');
  if (errors.length > 0) {
    const el = document.getElementById('outputStats');
    if (el) el.innerHTML = '<span class="jt-warning-badge">⚠ ' + errors.length + ' invalid lines skipped</span>';
  }
}

function arrayToJsonl() {
  clearErrorPanel();
  const parsed = parseInput();
  if (parsed === null) return;
  if (!Array.isArray(parsed)) {
    showToast('Input must be a JSON array', 'error');
    return;
  }
  const lines = parsed.map(item => JSON.stringify(item));
  setOutput(lines.join('\n'), 'plaintext');
}

function validateJsonl() {
  clearErrorPanel();
  const raw = getInput().trim();
  if (!raw) { showToast(i18n('json.common.error.empty') || '请先输入内容', 'error'); return; }
  const lines = raw.split('\n').filter(l => l.trim());
  const errors = [];
  lines.forEach((line, i) => {
    try { JSON.parse(line); } catch(e) { errors.push({ line: i + 1, error: e.message }); }
  });
  if (errors.length === 0) {
    setOutput(JSON.stringify({ valid: true, lines: lines.length, message: 'All ' + lines.length + ' lines are valid JSONL' }, null, 2), 'json');
  } else {
    setOutput(JSON.stringify({ valid: false, totalLines: lines.length, errorCount: errors.length, errors: errors.slice(0, 20) }, null, 2), 'json');
  }
}
