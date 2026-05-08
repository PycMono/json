'use strict';
// to-url-params — Convert JSON object to URL query string

function initToolOptions() {
  const el = document.getElementById('inputOptions');
  if (!el) return;
  el.innerHTML = `
    <span class="jt-options-label">编码选项</span>
    <div class="jt-options-row">
      <label class="jt-checkbox">
        <input type="checkbox" id="optEncode" checked>
        <span>URL 编码值</span>
      </label>
      <label class="jt-checkbox">
        <input type="checkbox" id="optFlatten" checked>
        <span>扁平化嵌套对象</span>
      </label>
      <label class="jt-checkbox">
        <input type="checkbox" id="optArrayNotation" checked>
        <span>使用数组表示法</span>
      </label>
    </div>
  `;
}

function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-to-url-params');
  clearErrorPanel();
  const parsed = parseInput();
  if (parsed === null) return;

  const encode = document.getElementById('optEncode')?.checked ?? true;
  const flatten = document.getElementById('optFlatten')?.checked ?? true;
  const arrayNotation = document.getElementById('optArrayNotation')?.checked ?? true;

  try {
    const queryString = jsonToQueryString(parsed, { encode, flatten, arrayNotation, prefix: '' });
    setOutput(queryString, 'text');
  if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('json-tool-to-url-params', 1, Date.now() - _gaStart);
    const statsEl = document.getElementById('outputStats');
    if (statsEl) {
      const paramCount = queryString.split('&').filter(p => p).length;
      statsEl.innerHTML = `<span class="jt-success-badge">✅ 生成 ${paramCount} 个查询参数</span>`;
    }
  } catch (err) {
    showError('转换失败: ' + err.message);
  }
}

function jsonToQueryString(obj, opts) {
  const { encode, flatten, arrayNotation, prefix } = opts;
  const pairs = [];

  function process(value, key) {
    if (value === null || value === undefined) {
      pairs.push(`${key}=`);
      return;
    }

    if (Array.isArray(value)) {
      if (flatten) {
        if (arrayNotation) {
          value.forEach((item, index) => {
            process(item, `${key}[${index}]`);
          });
        } else {
          value.forEach((item) => {
            process(item, key);
          });
        }
      } else {
        const str = JSON.stringify(value);
        pairs.push(`${key}=${encode ? encodeURIComponent(str) : str}`);
      }
      return;
    }

    if (typeof value === 'object') {
      if (flatten) {
        Object.entries(value).forEach(([subKey, subVal]) => {
          const newKey = prefix ? `${key}.${subKey}` : `${key}[${subKey}]`;
          process(subVal, newKey);
        });
      } else {
        const str = JSON.stringify(value);
        pairs.push(`${key}=${encode ? encodeURIComponent(str) : str}`);
      }
      return;
    }

    // Primitive value
    const strVal = String(value);
    pairs.push(`${key}=${encode ? encodeURIComponent(strVal) : strVal}`);
  }

  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new Error('输入必须是 JSON 对象');
  }

  Object.entries(obj).forEach(([key, value]) => {
    process(value, key);
  });

  return pairs.join('&');
}

function showError(msg) {
  const panel = document.getElementById('errorPanel');
  if (panel) {
    panel.style.display = 'block';
    panel.innerHTML = `<div class="jt-error">${msg}</div>`;
  }
}