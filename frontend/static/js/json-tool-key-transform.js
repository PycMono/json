'use strict';
// JSON Key Transformer — Batch convert key case (camelCase, snake_case, PascalCase, kebab-case)

function initToolOptions() {
  const opts = document.getElementById('inputOptions');
  if (opts) {
    opts.innerHTML =
      '<span class="jt-options-label">To</span>' +
      '<select id="keyTargetCase" class="jt-options-select jt-options-select">' +
        '<option value="camel">camelCase</option>' +
        '<option value="snake">snake_case</option>' +
        '<option value="pascal">PascalCase</option>' +
        '<option value="kebab">kebab-case</option>' +
        '<option value="screaming">SCREAMING_SNAKE</option>' +
        '<option value="dot">dot.case</option>' +
      '</select>' +
      '<label style="display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;margin-left:8px">' +
        '<input type="checkbox" id="keyRecursive" checked> Recursive' +
      '</label>';
  }
}

function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-key-transform');
  clearErrorPanel();
  const parsed = parseInput();
  if (parsed === null) return;

  const targetCase = document.getElementById('keyTargetCase')?.value || 'camel';
  const recursive = document.getElementById('keyRecursive')?.checked !== false;

  const result = transformKeys(parsed, targetCase, recursive);
  setOutput(JSON.stringify(result, null, 2), 'json');

  const el = document.getElementById('outputStats');
  if (el) {
    const count = countTransformedKeys(parsed, targetCase);
    el.innerHTML = '<span class="jt-success-badge">✅ ' + count + ' keys converted to ' + targetCase + '</span>';
  }
}

function transformKeys(data, targetCase, recursive) {
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return recursive ? data.map(item => transformKeys(item, targetCase, recursive)) : data;
  }
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    const newKey = convertCase(key, targetCase);
    result[newKey] = (recursive && value && typeof value === 'object') ? transformKeys(value, targetCase, recursive) : value;
  }
  return result;
}

function convertCase(str, target) {
  // First, split the string into words
  const words = splitWords(str);
  switch(target) {
    case 'camel': return words.map((w, i) => i === 0 ? w.toLowerCase() : capitalize(w)).join('');
    case 'snake': return words.map(w => w.toLowerCase()).join('_');
    case 'pascal': return words.map(w => capitalize(w)).join('');
    case 'kebab': return words.map(w => w.toLowerCase()).join('-');
    case 'screaming': return words.map(w => w.toUpperCase()).join('_');
    case 'dot': return words.map(w => w.toLowerCase()).join('.');
    default: return str;
  }
}

function splitWords(str) {
  // Handle camelCase, PascalCase, snake_case, kebab-case, SCREAMING_SNAKE, dot.case
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase split
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')  // XMLParser → XML Parser
    .replace(/[_\-\.]/g, ' ')  // snake/kebab/dot → space
    .split(/\s+/)
    .filter(Boolean);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function countTransformedKeys(data, targetCase) {
  let count = 0;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const key of Object.keys(data)) {
      if (convertCase(key, targetCase) !== key) count++;
    }
  }
  return count;
}
