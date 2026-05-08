'use strict';
// random — Generate random JSON data

function initToolOptions() {
  const el = document.getElementById('inputOptions');
  if (!el) return;
  el.innerHTML = `
    <span class="jt-options-label">生成选项</span>
    <div class="jt-options-row">
      <label class="jt-select-label">数据类型:</label>
      <select id="optDataType" class="jt-select">
        <option value="object">对象</option>
        <option value="array">数组</option>
        <option value="nested">嵌套结构</option>
        <option value="schema">JSON Schema 样式</option>
      </select>
    </div>
    <div class="jt-options-row">
      <label class="jt-input-label">数量/深度:</label>
      <input type="number" id="optCount" value="5" min="1" max="50" class="jt-input">
    </div>
    <div class="jt-options-row">
      <label class="jt-checkbox">
        <input type="checkbox" id="optIncludeNull" checked>
        <span>包含 null 值</span>
      </label>
      <label class="jt-checkbox">
        <input type="checkbox" id="optIncludeDates" checked>
        <span>包含日期</span>
      </label>
      <label class="jt-checkbox">
        <input type="checkbox" id="optIncludeEmails" checked>
        <span>包含邮箱</span>
      </label>
    </div>
    <button id="generateBtn" class="jt-button">🎲 生成随机数据</button>
  `;

  // Bind generate button click
  const generateBtn = document.getElementById('generateBtn');
  if (generateBtn) {
    generateBtn.addEventListener('click', generateRandomData);
  }
}

function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-random');
  generateRandomData();
}

function generateRandomData() {
  clearErrorPanel();
  // Wait for Monaco outputEditor to be ready
  if (!outputEditor) {
    setTimeout(generateRandomData, 200);
    return;
  }

  const dataType = document.getElementById('optDataType')?.value ?? 'object';
  const count = parseInt(document.getElementById('optCount')?.value ?? '5', 10);
  const includeNull = document.getElementById('optIncludeNull')?.checked ?? true;
  const includeDates = document.getElementById('optIncludeDates')?.checked ?? true;
  const includeEmails = document.getElementById('optIncludeEmails')?.checked ?? true;

  const options = {
    count,
    includeNull,
    includeDates,
    includeEmails,
    maxDepth: dataType === 'nested' ? Math.min(count, 5) : 1
  };

  try {
    let result;
    switch (dataType) {
      case 'array':
        result = generateRandomArray(count, options);
        break;
      case 'nested':
        result = generateNestedStructure(options);
        break;
      case 'schema':
        result = generateSchemaStyle(options);
        break;
      case 'object':
      default:
        result = generateRandomObject(count, options);
        break;
    }

    const output = JSON.stringify(result, null, 2);
    setOutput(output, 'json');
  if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('json-tool-random', 1, Date.now() - _gaStart);

    const statsEl = document.getElementById('outputStats');
    if (statsEl) {
      const size = new Blob([output]).size;
      statsEl.innerHTML = `<span class="jt-success-badge">✅ 生成 ${size} 字节随机数据</span>`;
    }
  } catch (err) {
    showError('生成失败: ' + err.message);
  }
}

function generateRandomObject(count, opts) {
  const obj = {};
  const keys = getRandomKeys(count);

  for (const key of keys) {
    obj[key] = generateRandomValue(opts);
  }

  return obj;
}

function generateRandomArray(count, opts) {
  const arr = [];

  for (let i = 0; i < count; i++) {
    arr.push(generateRandomValue(opts));
  }

  return arr;
}

function generateNestedStructure(opts, currentDepth = 0) {
  const { maxDepth, count } = opts;

  if (currentDepth >= maxDepth) {
    return generateRandomValue({ ...opts, maxDepth: 0 });
  }

  const structure = Math.random() > 0.5 ? {} : [];

  if (Array.isArray(structure)) {
    for (let i = 0; i < count; i++) {
      if (Math.random() > 0.3) {
        structure.push(generateNestedStructure(opts, currentDepth + 1));
      } else {
        structure.push(generateRandomValue(opts));
      }
    }
  } else {
    const keys = getRandomKeys(count);
    for (const key of keys) {
      if (Math.random() > 0.3) {
        structure[key] = generateNestedStructure(opts, currentDepth + 1);
      } else {
        structure[key] = generateRandomValue(opts);
      }
    }
  }

  return structure;
}

function generateSchemaStyle(opts) {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: getRandomWord().toUpperCase(),
    description: `A randomly generated ${getRandomWord()} schema`,
    type: 'object',
    properties: generateRandomObject(Math.floor(opts.count / 2) + 1, opts),
    required: getRandomKeys(Math.floor(Math.random() * 3) + 1),
    additionalProperties: Math.random() > 0.5
  };
}

function generateRandomValue(opts) {
  const types = ['string', 'number', 'boolean', 'object'];

  if (opts.includeNull) {
    types.push('null');
  }

  if (opts.includeDates) {
    types.push('date');
  }

  if (opts.includeEmails) {
    types.push('email');
  }

  const type = types[Math.floor(Math.random() * types.length)];

  switch (type) {
    case 'string':
      return getRandomString();
    case 'number':
      return getRandomNumber();
    case 'boolean':
      return Math.random() > 0.5;
    case 'null':
      return null;
    case 'date':
      return getRandomDate();
    case 'email':
      return getRandomEmail();
    case 'object':
      return generateRandomObject(Math.floor(Math.random() * 3) + 1, opts);
    default:
      return '';
  }
}

function getRandomString() {
  const words = [
    'foo', 'bar', 'baz', 'qux', 'lorem', 'ipsum', 'dolor', 'sit',
    'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'eiusmod',
    'tempor', 'incididunt', 'labore', 'dolore', 'magna', 'aliqua'
  ];
  return words[Math.floor(Math.random() * words.length)];
}

function getRandomWord() {
  return getRandomString();
}

function getRandomKeys(count) {
  const keys = [];
  const adjectives = ['active', 'admin', 'api', 'auth', 'config', 'data', 'default', 'email', 'enabled', 'failed', 'id', 'image', 'last', 'list', 'login', 'name', 'new', 'old', 'password', 'profile', 'role', 'status', 'token', 'type', 'url', 'user', 'value'];
  const nouns = ['address', 'age', 'category', 'code', 'count', 'created', 'date', 'description', 'endpoint', 'field', 'group', 'header', 'index', 'key', 'level', 'message', 'metadata', 'name', 'object', 'option', 'param', 'path', 'permission', 'property', 'query', 'request', 'response', 'result', 'session', 'setting', 'state', 'status', 'string', 'text', 'timestamp', 'title', 'token', 'type', 'url', 'username', 'value', 'version'];

  for (let i = 0; i < count; i++) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    keys.push(`${adj}${noun.charAt(0).toUpperCase() + noun.slice(1)}`);
  }

  return keys;
}

function getRandomNumber() {
  const types = ['integer', 'float', 'negative'];
  const type = types[Math.floor(Math.random() * types.length)];

  switch (type) {
    case 'integer':
      return Math.floor(Math.random() * 1000);
    case 'float':
      return parseFloat((Math.random() * 100).toFixed(2));
    case 'negative':
      return -Math.floor(Math.random() * 100);
    default:
      return 0;
  }
}

function getRandomDate() {
  const start = new Date(2020, 0, 1);
  const end = new Date();
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function getRandomEmail() {
  const domains = ['example.com', 'test.org', 'demo.net', 'sample.io'];
  const users = ['user', 'admin', 'test', 'demo', 'sample', 'john', 'jane', 'bob'];
  const user = users[Math.floor(Math.random() * users.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const num = Math.floor(Math.random() * 100);
  return `${user}${num}@${domain}`;
}

function showError(msg) {
  const panel = document.getElementById('errorPanel');
  if (panel) {
    panel.style.display = 'block';
    panel.innerHTML = `<div class="jt-error">${msg}</div>`;
  }
}
