'use strict';
// JSON to .env — Convert flat JSON to KEY=VALUE format

function initToolOptions() {
  const opts = document.getElementById('inputOptions');
  if (opts) {
    opts.innerHTML =
      '<span class="jt-options-label">' + (i18n('json.to_env.separator') || '分隔符') + '</span>' +
      '<select id="envSeparator" class="jt-options-select jt-options-select">' +
        '<option value="_">' + (i18n('json.to_env.underscore') || '_ (下划线)') + '</option>' +
        '<option value=".">' + (i18n('json.to_env.dot') || '. (点)') + '</option>' +
        '<option value="-">' + (i18n('json.to_env.dash') || '- (破折号)') + '</option>' +
      '</select>' +
      '<label style="display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;margin-left:8px">' +
        '<input type="checkbox" id="envUpper" checked> ' + (i18n('json.to_env.upper_case') || '大写') +
      '</label>' +
      '<label style="display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;margin-left:8px">' +
        '<input type="checkbox" id="envQuote"> ' + (i18n('json.to_env.quote_values') || '值加引号') +
      '</label>';
  }
}

function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-to-env');
  clearErrorPanel();
  const parsed = parseInput();
  if (parsed === null) return;

  const sep = document.getElementById('envSeparator')?.value || '_';
  const upper = document.getElementById('envUpper')?.checked !== false;
  const quote = document.getElementById('envQuote')?.checked || false;

  // Flatten the JSON first
  const flat = flattenObject(parsed, '', sep);
  const lines = [];
  for (const [key, value] of Object.entries(flat)) {
    const envKey = upper ? key.toUpperCase() : key;
    const val = value === null ? '' : String(value);
    lines.push(envKey + '=' + (quote ? '"' + val + '"' : val));
  }
  setOutput(lines.join('\n'), 'plaintext');
}

function flattenObject(obj, prefix, sep) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? prefix + sep + key : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey, sep));
    } else if (Array.isArray(value)) {
      result[newKey] = JSON.stringify(value);
    } else {
      result[newKey] = value;
    }
  }
  return result;
}
