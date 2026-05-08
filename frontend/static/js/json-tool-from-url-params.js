'use strict';
// from-url-params — Parse URL query parameters to JSON object

function initToolOptions() {
  const el = document.getElementById('inputOptions');
  if (!el) return;
  el.innerHTML = `
    <span class="jt-options-label">解析选项</span>
    <div class="jt-options-row">
      <label class="jt-checkbox">
        <input type="checkbox" id="optDecode" checked>
        <span>URL 解码值</span>
      </label>
      <label class="jt-checkbox">
        <input type="checkbox" id="optParseArrays" checked>
        <span>解析数组索引</span>
      </label>
      <label class="jt-checkbox">
        <input type="checkbox" id="optParseNumbers" checked>
        <span>解析数字</span>
      </label>
      <label class="jt-checkbox">
        <input type="checkbox" id="optParseBooleans" checked>
        <span>解析布尔值</span>
      </label>
    </div>
  `;
}

function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-from-url-params');
  clearErrorPanel();
  const input = document.getElementById('input').value.trim();
  if (!input) {
    showInfo('请输入 URL 查询字符串');
    return;
  }

  const decode = document.getElementById('optDecode')?.checked ?? true;
  const parseArrays = document.getElementById('optParseArrays')?.checked ?? true;
  const parseNumbers = document.getElementById('optParseNumbers')?.checked ?? true;
  const parseBooleans = document.getElementById('optParseBooleans')?.checked ?? true;

  try {
    const result = parseQueryStringToJSON(input, {
      decode,
      parseArrays,
      parseNumbers,
      parseBooleans
    });
    setOutput(JSON.stringify(result, null, 2), 'json');
    const statsEl = document.getElementById('outputStats');
    if (statsEl) {
      const paramCount = Object.keys(result).length;
      const valueCount = countValues(result);
      statsEl.innerHTML = `<span class="jt-success-badge">✅ 解析 ${paramCount} 个参数，${valueCount} 个值</span>`;
    }
  } catch (err) {
    showError('解析失败: ' + err.message);
  }
}

function parseQueryStringToJSON(queryString, opts) {
  const { decode, parseArrays, parseNumbers, parseBooleans } = opts;

  // Remove leading '?' if present
  let qs = queryString;
  if (qs.startsWith('?')) {
    qs = qs.substring(1);
  }

  const result = {};
  const pairs = qs.split('&');

  for (const pair of pairs) {
    if (!pair) continue;

    let [key, value] = pair.split('=');
    if (key === undefined) continue;

    // Decode key and value if option is enabled
    if (decode) {
      key = decodeURIComponent(key.replace(/\+/g, ' '));
      value = value !== undefined ? decodeURIComponent(value.replace(/\+/g, ' ')) : '';
    } else {
      value = value !== undefined ? value.replace(/\+/g, ' ') : '';
    }

    // Handle empty value
    if (value === undefined || value === '') {
      result[key] = '';
      continue;
    }

    // Parse value based on options
    let parsedValue = value;

    if (parseArrays) {
      // Handle array notation: key[0], key[1], etc.
      const arrayMatch = key.match(/^([^\[]+)\[(\d+)\]$/);
      if (arrayMatch) {
        const arrayKey = arrayMatch[1];
        const index = parseInt(arrayMatch[2], 10);

        if (!result[arrayKey]) {
          result[arrayKey] = [];
        }
        if (!Array.isArray(result[arrayKey])) {
          // Convert to array if needed
          result[arrayKey] = [result[arrayKey]];
        }
        result[arrayKey][index] = parseValue(value, parseNumbers, parseBooleans);
        continue;
      }
    }

    parsedValue = parseValue(value, parseNumbers, parseBooleans);

    // Handle duplicate keys - convert to array
    if (key in result) {
      if (Array.isArray(result[key])) {
        result[key].push(parsedValue);
      } else {
        result[key] = [result[key], parsedValue];
      }
    } else {
      result[key] = parsedValue;
    }
  }

  return result;
}

function parseValue(value, parseNumbers, parseBooleans) {
  let parsed = value;

  // Try to parse as boolean
  if (parseBooleans) {
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }
  }

  // Try to parse as number
  if (parseNumbers) {
    if (/^-?\d+\.?\d*$/.test(value)) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        parsed = num;
      }
    }
  }

  return parsed;
}

function countValues(obj) {
  let count = 0;

  function traverse(val) {
    if (val === null || val === undefined) return;
    if (Array.isArray(val)) {
      val.forEach(traverse);
    } else if (typeof val === 'object') {
      Object.values(val).forEach(traverse);
    } else {
      count++;
    }
  }

  traverse(obj);
  return count;
}

function showInfo(msg) {
  const panel = document.getElementById('errorPanel');
  if (panel) {
    panel.style.display = 'block';
    panel.innerHTML = `<div class="jt-info">${msg}</div>`;
  }
}