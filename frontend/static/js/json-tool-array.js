'use strict';
// JSON Array Utils — Sort, deduplicate, chunk, shuffle, group JSON arrays

function initToolOptions() {
  const opts = document.getElementById('inputOptions');
  if (opts) {
    opts.innerHTML =
      '<select id="arrayOp" class="jt-options-select jt-options-select" onchange="updateArrayOpInput()">' +
        '<option value="sort">Sort</option>' +
        '<option value="dedup">Deduplicate</option>' +
        '<option value="chunk">Chunk</option>' +
        '<option value="shuffle">Shuffle</option>' +
        '<option value="reverse">Reverse</option>' +
        '<option value="slice">Slice</option>' +
        '<option value="group">Group By</option>' +
        '<option value="flatten">Flatten</option>' +
        '<option value="unique">Unique Objects</option>' +
      '</select>' +
      '<input type="text" id="arrayOpInput" class="jt-options-input" style="width:120px;display:none" placeholder="Key">';
  }
}

function updateArrayOpInput() {
  const op = document.getElementById('arrayOp')?.value || 'sort';
  const input = document.getElementById('arrayOpInput');
  if (!input) return;
  const showInput = ['chunk', 'slice', 'group'].includes(op);
  input.style.display = showInput ? '' : 'none';
  if (op === 'chunk') input.placeholder = 'Size (e.g. 3)';
  else if (op === 'slice') input.placeholder = 'start:end';
  else if (op === 'group') input.placeholder = 'Key to group by';
}

function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-array');
  clearErrorPanel();
  const parsed = parseInput();
  if (parsed === null) return;
  if (!Array.isArray(parsed)) {
    showToast('Input must be a JSON array', 'error');
    return;
  }
  const op = document.getElementById('arrayOp')?.value || 'sort';
  const param = document.getElementById('arrayOpInput')?.value || '';

  let result;
  switch(op) {
    case 'sort':
      if (param) {
        result = [...parsed].sort((a, b) => compareBy(a[param], b[param]));
      } else {
        result = [...parsed].sort();
      }
      break;
    case 'dedup':
      result = parsed.filter((v, i, a) => a.findIndex(x => JSON.stringify(x) === JSON.stringify(v)) === i);
      break;
    case 'chunk':
      const size = parseInt(param) || 2;
      result = [];
      for (let i = 0; i < parsed.length; i += size) result.push(parsed.slice(i, i + size));
      break;
    case 'shuffle':
      result = [...parsed].sort(() => Math.random() - 0.5);
      break;
    case 'reverse':
      result = [...parsed].reverse();
      break;
    case 'slice':
      const [start, end] = param.split(':').map(Number);
      result = parsed.slice(start || 0, end || parsed.length);
      break;
    case 'group':
      const key = param || 'id';
      const groups = {};
      parsed.forEach(item => {
        const k = String(item[key]);
        if (!groups[k]) groups[k] = [];
        groups[k].push(item);
      });
      result = Object.entries(groups).map(([k, v]) => ({ [key]: k, items: v }));
      break;
    case 'flatten':
      result = parsed.flat(Infinity);
      break;
    case 'unique':
      const seen = new Set();
      result = parsed.filter(item => {
        const key = JSON.stringify(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      break;
    default:
      result = parsed;
  }
  setOutput(JSON.stringify(result, null, 2), 'json');
}

function compareBy(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
  if (a === null) return -1;
  if (b === null) return 1;
  return JSON.stringify(a).localeCompare(JSON.stringify(b));
}