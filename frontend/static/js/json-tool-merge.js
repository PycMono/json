'use strict';
// JSON Merge — shallow and deep merge of multiple JSON objects

function initToolOptions() {
  const opts = document.getElementById('inputOptions');
  if (opts) {
    opts.innerHTML =
      '<select id="mergeStrategy" class="jt-options-select jt-options-select">' +
        '<option value="deep">Deep merge</option>' +
        '<option value="shallow">Shallow merge</option>' +
        '<option value="concat">Concat arrays</option>' +
      '</select>';
  }
}

function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-merge');
  clearErrorPanel();
  const raw = getInput().trim();
  if (!raw) { showToast(i18n('json.common.error.empty') || '请先输入内容', 'error'); return; }

  let objects;
  try {
    const parsed = JSON.parse(raw);
    objects = Array.isArray(parsed) ? parsed : [parsed];
  } catch(e) {
    // Try parsing as multiple JSON objects separated by newlines or --- separator
    const parts = raw.split(/\n---\n|\n\n(?=\{)/).filter(s => s.trim());
    objects = [];
    for (const part of parts) {
      try { objects.push(JSON.parse(part.trim())); }
      catch(e2) { showErrorPanel(e2, part); return; }
    }
  }

  if (objects.length < 2) {
    showToast('Need at least 2 JSON objects to merge (use array or --- separator)', 'error');
    return;
  }

  const strategy = (document.getElementById('mergeStrategy')?.value) || 'deep';
  let result;
  if (strategy === 'shallow') {
    result = Object.assign({}, ...objects);
  } else if (strategy === 'concat') {
    result = objects.reduce((acc, obj) => deepMergeConcat(acc, obj), {});
  } else {
    result = objects.reduce((acc, obj) => deepMerge(acc, obj), {});
  }

  setOutput(JSON.stringify(result, null, 2), 'json');
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
        result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function deepMergeConcat(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (Array.isArray(source[key]) && Array.isArray(result[key])) {
      result[key] = result[key].concat(source[key]);
    } else if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
               result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = deepMergeConcat(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
