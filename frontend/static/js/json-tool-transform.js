'use strict';
// JSON Transform — jq-style filter, map, select expressions

function initToolOptions() {
  const opts = document.getElementById('inputOptions');
  if (opts) {
    opts.innerHTML =
      '<span class="jt-options-label">' + (i18n('json.transform.expression') || '表达式') + '</span>' +
      '<input type="text" id="transformExpr" class="jt-options-input" placeholder="' + (i18n('json.transform.placeholder') || '.users | map(.name) | sort') + '" style="width:280px">';
  }
}

function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-transform');
  clearErrorPanel();
  const parsed = parseInput();
  if (parsed === null) return;
  const expr = (document.getElementById('transformExpr')?.value || '').trim();
  if (!expr) {
    showToast(i18n('json.transform.enter_expression') || 'Enter a transform expression', 'error');
    return;
  }
  try {
    const result = evaluateJqLike(parsed, expr);
    setOutput(JSON.stringify(result, null, 2), 'json');
  } catch(e) {
    showErrorPanel(e, expr);
  }
}

function evaluateJqLike(data, expr) {
  // Parse pipe-separated stages
  const stages = expr.split('|').map(s => s.trim()).filter(Boolean);
  let current = data;
  for (const stage of stages) {
    current = applyStage(current, stage);
  }
  return current;
}

function applyStage(data, stage) {
  // .key — access key
  if (/^\.[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(stage)) {
    const key = stage.slice(1);
    if (data === null || typeof data !== 'object') throw new Error('Cannot access .' + key + ' on non-object');
    return data[key];
  }
  // .[0] — array index
  if (/^\.\[-?\d+\]$/.test(stage)) {
    const idx = parseInt(stage.slice(2, -1));
    if (!Array.isArray(data)) throw new Error('Cannot index non-array');
    return data[idx < 0 ? data.length + idx : idx];
  }
  // map(expr) — transform each element
  if (/^map\((.+)\)$/.test(stage)) {
    const inner = RegExp.$1;
    if (!Array.isArray(data)) throw new Error('map() requires an array');
    return data.map(item => applyStage(item, inner));
  }
  // select(condition) — filter
  if (/^select\((.+)\)$/.test(stage)) {
    const cond = RegExp.$1;
    if (!Array.isArray(data)) throw new Error('select() requires an array');
    return data.filter(item => evaluateCondition(item, cond));
  }
  // sort, sort_by(.key)
  if (stage === 'sort') {
    if (!Array.isArray(data)) throw new Error('sort requires an array');
    return [...data].sort();
  }
  if (/^sort_by\((.+)\)$/.test(stage)) {
    const key = RegExp.$1.replace(/^\./, '');
    if (!Array.isArray(data)) throw new Error('sort_by requires an array');
    return [...data].sort((a, b) => {
      const va = a[key], vb = b[key];
      if (va < vb) return -1; if (va > vb) return 1; return 0;
    });
  }
  // reverse
  if (stage === 'reverse') {
    if (!Array.isArray(data)) throw new Error('reverse requires an array');
    return [...data].reverse();
  }
  // unique
  if (stage === 'unique') {
    if (!Array.isArray(data)) throw new Error('unique requires an array');
    return [...new Set(data.map(x => JSON.stringify(x)))].map(x => JSON.parse(x));
  }
  // flatten
  if (stage === 'flatten') {
    if (!Array.isArray(data)) throw new Error('flatten requires an array');
    return data.flat();
  }
  // length
  if (stage === 'length') {
    if (Array.isArray(data)) return data.length;
    if (typeof data === 'object') return Object.keys(data).length;
    if (typeof data === 'string') return data.length;
    return 0;
  }
  // keys, values
  if (stage === 'keys') {
    if (typeof data !== 'object' || data === null) throw new Error('keys requires an object');
    return Object.keys(data);
  }
  if (stage === 'values') {
    if (typeof data !== 'object' || data === null) throw new Error('values requires an object');
    return Object.values(data);
  }
  // first, last
  if (stage === 'first') { if (!Array.isArray(data)) throw new Error('first requires array'); return data[0]; }
  if (stage === 'last') { if (!Array.isArray(data)) throw new Error('last requires array'); return data[data.length - 1]; }
  // group_by(.key)
  if (/^group_by\((.+)\)$/.test(stage)) {
    const key = RegExp.$1.replace(/^\./, '');
    if (!Array.isArray(data)) throw new Error('group_by requires an array');
    const groups = {};
    data.forEach(item => {
      const k = String(item[key]);
      if (!groups[k]) groups[k] = [];
      groups[k].push(item);
    });
    return Object.values(groups);
  }
  throw new Error((i18n('json.transform.error_unknown') || 'Unknown expression') + ': ' + stage);
}

function evaluateCondition(item, cond) {
  // .key == "value", .key > 5, etc.
  const match = cond.match(/^\.(\w+)\s*(==|!=|>|<|>=|<=)\s*(.+)$/);
  if (match) {
    const key = match[1], op = match[2], val = match[3].trim();
    let rhs;
    try { rhs = JSON.parse(val); } catch(e) { rhs = val.replace(/^["']|["']$/g, ''); }
    const lhs = item[key];
    switch(op) {
      case '==': return lhs == rhs;
      case '!=': return lhs != rhs;
      case '>': return lhs > rhs;
      case '<': return lhs < rhs;
      case '>=': return lhs >= rhs;
      case '<=': return lhs <= rhs;
    }
  }
  return false;
}
