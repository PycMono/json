'use strict';
// JSON Patch — RFC 6902 operations

function initToolOptions() {
  const opts = document.getElementById('inputOptions');
  if (opts) {
    opts.innerHTML =
      '<select id="patchOp" class="jt-options-select jt-options-select" onchange="updatePatchInput()">' +
        '<option value="apply">' + (i18n('json.patch.apply') || 'Apply patch') + '</option>' +
        '<option value="generate">' + (i18n('json.patch.generate') || 'Generate patch') + '</option>' +
      '</select>';
  }
  updatePatchInput();
}

function updatePatchInput() {
  const op = document.getElementById('patchOp')?.value || 'apply';
  const inputPane = document.querySelector('.jt-editor-pane--input .jt-editor-pane__label');
  if (inputPane) {
    if (op === 'apply') {
      inputPane.textContent = i18n('json.patch.json_patch') || 'JSON + 补丁';
    } else {
      inputPane.textContent = i18n('json.patch.original') || '原始 JSON';
    }
  }
}

function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-patch');
  clearErrorPanel();
  const op = document.getElementById('patchOp')?.value || 'apply';
  const raw = getInput().trim();
  if (!raw) { showToast(i18n('json.common.error.empty') || '请先输入内容', 'error'); return; }

  if (op === 'apply') {
    applyPatch(raw);
  } else {
    generatePatch(raw);
  }
}

function applyPatch(raw) {
  // Expect: either a single JSON with { "data": ..., "patch": [...] }
  // or two JSONs separated by ---
  let data, patch;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.data && parsed.patch) {
      data = parsed.data;
      patch = parsed.patch;
    } else if (Array.isArray(parsed) && parsed.length === 2) {
      data = parsed[0];
      patch = parsed[1];
    } else {
      showToast(i18n('json.patch.input_format') || 'Input must be {data, patch} or array [data, patch]', 'error');
      return;
    }
  } catch(e) {
    // Try --- separator
    const parts = raw.split('\n---\n');
    if (parts.length === 2) {
      try { data = JSON.parse(parts[0]); patch = JSON.parse(parts[1]); }
      catch(e2) { showErrorPanel(e2, raw); return; }
    } else {
      showErrorPanel(e, raw); return;
    }
  }

  if (!Array.isArray(patch)) { showToast(i18n('json.patch.array_required') || 'Patch must be an array of operations', 'error'); return; }

  try {
    const result = applyJsonPatch(data, patch);
    setOutput(JSON.stringify(result, null, 2), 'json');
    const el = document.getElementById('outputStats');
    if (el) el.innerHTML = '<span class="jt-success-badge">✅ ' + patch.length + ' ' + (i18n('json.patch.operations_applied') || 'operations applied') + '</span>';
  } catch(e) {
    showErrorPanel(e, JSON.stringify(patch));
  }
}

function applyJsonPatch(doc, patch) {
  let result = JSON.parse(JSON.stringify(doc));
  for (const op of patch) {
    result = applyOnePatch(result, op);
  }
  return result;
}

function applyOnePatch(doc, op) {
  const path = op.path || '';
  const parts = path.split('/').filter(Boolean);
  let target = doc;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (Array.isArray(target)) {
      const idx = part === '-' ? target.length : parseInt(part);
      target = target[idx];
    } else {
      target = target[part];
    }
  }
  const key = parts[parts.length - 1] || '';
  switch(op.op) {
    case 'add':
      if (Array.isArray(target)) {
        const idx = key === '-' ? target.length : parseInt(key);
        target.splice(idx, 0, op.value);
      } else {
        target[key] = op.value;
      }
      break;
    case 'remove':
      if (Array.isArray(target)) {
        target.splice(parseInt(key), 1);
      } else {
        delete target[key];
      }
      break;
    case 'replace':
      if (Array.isArray(target)) {
        target[parseInt(key)] = op.value;
      } else {
        target[key] = op.value;
      }
      break;
    case 'move':
      const srcParts = (op.from || '').split('/').filter(Boolean);
      let srcTarget = doc;
      for (let i = 0; i < srcParts.length - 1; i++) srcTarget = srcTarget[srcParts[i]];
      const srcKey = srcParts[srcParts.length - 1];
      const val = Array.isArray(srcTarget) ? srcTarget.splice(parseInt(srcKey), 1)[0] : srcTarget[srcKey];
      if (Array.isArray(target)) {
        target.splice(parseInt(key), 0, val);
      } else {
        target[key] = val;
      }
      if (!Array.isArray(srcTarget)) delete srcTarget[srcKey];
      break;
    case 'copy':
      const copySrcParts = (op.from || '').split('/').filter(Boolean);
      let copySrcTarget = doc;
      for (let i = 0; i < copySrcParts.length - 1; i++) copySrcTarget = copySrcTarget[copySrcParts[i]];
      const copySrcKey = copySrcParts[copySrcParts.length - 1];
      const copyVal = copySrcTarget[copySrcKey];
      if (Array.isArray(target)) {
        target.splice(parseInt(key), 0, JSON.parse(JSON.stringify(copyVal)));
      } else {
        target[key] = JSON.parse(JSON.stringify(copyVal));
      }
      break;
    case 'test':
      const testVal = Array.isArray(target) ? target[parseInt(key)] : target[key];
      if (JSON.stringify(testVal) !== JSON.stringify(op.value)) {
        throw new Error((i18n('json.patch.test_failed') || 'Test failed at path') + ' ' + path);
      }
      break;
    default:
      throw new Error((i18n('json.patch.unknown_op') || 'Unknown operation') + ': ' + op.op);
  }
  return doc;
}

function generatePatch(raw) {
  // Expect two JSONs separated by ---
  const parts = raw.split('\n---\n');
  if (parts.length !== 2) {
    showToast(i18n('json.patch.separator_hint') || 'Enter original JSON --- modified JSON (use --- as separator)', 'error');
    return;
  }
  let original, modified;
  try {
    original = JSON.parse(parts[0]);
    modified = JSON.parse(parts[1]);
  } catch(e) {
    showErrorPanel(e, raw); return;
  }

  const patch = diffToPatch(original, modified, '');
  setOutput(JSON.stringify(patch, null, 2), 'json');
  const el = document.getElementById('outputStats');
  if (el) el.innerHTML = '<span class="jt-success-badge">✅ ' + patch.length + ' ' + (i18n('json.patch.operations_generated') || 'patch operations') + '</span>';
}

function diffToPatch(a, b, basePath) {
  const patch = [];
  if (a === b) return patch;
  if (typeof a !== typeof b || (Array.isArray(a) !== Array.isArray(b))) {
    patch.push({ op: 'replace', path: basePath || '/', value: b });
    return patch;
  }
  if (Array.isArray(a)) {
    // Compare arrays
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const path = basePath + '/' + i;
      if (i >= a.length) {
        patch.push({ op: 'add', path: path, value: b[i] });
      } else if (i >= b.length) {
        patch.push({ op: 'remove', path: path });
      } else {
        patch.push(...diffToPatch(a[i], b[i], path));
      }
    }
  } else if (typeof a === 'object' && a !== null && b !== null) {
    // Compare objects
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of allKeys) {
      const path = basePath + '/' + key;
      if (!(key in a)) {
        patch.push({ op: 'add', path: path, value: b[key] });
      } else if (!(key in b)) {
        patch.push({ op: 'remove', path: path });
      } else {
        patch.push(...diffToPatch(a[key], b[key], path));
      }
    }
  } else {
    patch.push({ op: 'replace', path: basePath || '/', value: b });
  }
  return patch;
}