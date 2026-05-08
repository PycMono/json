'use strict';
// JSON Redact — Auto-detect and redact sensitive data

function initToolOptions() {
  const opts = document.getElementById('inputOptions');
  if (opts) {
    opts.innerHTML =
      '<div class="jt-redact-options">' +
        '<span class="jt-options-label">脱敏类型</span>' +
        '<select id="redactType" class="jt-options-select jt-options-select" onchange="updateRedactOptions()">' +
          '<option value="all">全部类型</option>' +
          '<option value="email">Email</option>' +
          '<option value="phone">Phone</option>' +
          '<option value="ip">IP地址</option>' +
          '<option value="apikey">API密钥</option>' +
          '<option value="name">姓名</option>' +
          '<option value="creditcard">信用卡号</option>' +
        '</select>' +
      '</div>' +
      '<div class="jt-redact-replace">' +
        '<span class="jt-options-label">替换方式</span>' +
        '<select id="redactReplace" class="jt-options-select jt-options-select">' +
          '<option value="stars">***</option>' +
          '<option value="partial">部分保留</option>' +
          '<option value="hash">#哈希</option>' +
          '<option value="fake">假数据</option>' +
        '</select>' +
      '</div>';
  }
}

function updateRedactOptions() {
  // 自动应用新的选择
  // processJson 会在用户点击处理按钮时调用
}

function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-redact');
  clearErrorPanel();
  const parsed = parseInput();
  if (parsed === null) return;

  const redactType = document.getElementById('redactType')?.value || 'all';
  const replaceMode = document.getElementById('redactReplace')?.value || 'stars';

  const options = {
    email: redactType === 'all' || redactType === 'email',
    phone: redactType === 'all' || redactType === 'phone',
    ip: redactType === 'all' || redactType === 'ip',
    key: redactType === 'all' || redactType === 'apikey',
    name: redactType === 'all' || redactType === 'name',
    creditcard: redactType === 'all' || redactType === 'creditcard',
    replace: replaceMode,
  };

  let redactCount = 0;
  const result = redactData(parsed, options, function() { redactCount++; });
  setOutput(JSON.stringify(result, null, 2), 'json');
  const el = document.getElementById('outputStats');
  if (el) el.innerHTML = '<span class="jt-success-badge">🔒 ' + redactCount + ' fields redacted</span>';
}

function redactData(data, options, counter) {
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(item => redactData(item, options, counter));

  const result = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (typeof value === 'string') {
      let redacted = false;
      if (options.email && isEmailField(lowerKey) && /\S+@\S+\.\S+/.test(value)) {
        result[key] = redactValue(value, options.replace, 'email');
        redacted = true;
      } else if (options.phone && isPhoneField(lowerKey) && /\d{3,}/.test(value)) {
        result[key] = redactValue(value, options.replace, 'phone');
        redacted = true;
      } else if (options.ip && isIPField(lowerKey) && /^\d+\.\d+\.\d+\.\d+$/.test(value)) {
        result[key] = redactValue(value, options.replace, 'ip');
        redacted = true;
      } else if (options.key && isKeyField(lowerKey)) {
        result[key] = redactValue(value, options.replace, 'key');
        redacted = true;
      } else if (options.name && isNameField(lowerKey)) {
        result[key] = redactValue(value, options.replace, 'name');
        redacted = true;
      } else if (options.creditcard && /\d{13,16}/.test(value.replace(/\s|-/g, ''))) {
        result[key] = redactValue(value, options.replace, 'creditcard');
        redacted = true;
      }
      if (redacted) { counter(); continue; }
    }
    if (value && typeof value === 'object') {
      result[key] = redactData(value, options, counter);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function isEmailField(k) { return /email|e-mail|mail/.test(k); }
function isPhoneField(k) { return /phone|tel|mobile|cell/.test(k); }
function isIPField(k) { return /^ip$|ip_addr|ipaddress|remote_addr/.test(k); }
function isKeyField(k) { return /password|passwd|secret|token|api_key|apikey|access_key|private_key|credential|auth/.test(k); }
function isNameField(k) { return /^(first_name|last_name|fullname|full_name|name|username|user_name)$/.test(k); }

function redactValue(value, mode, type) {
  switch(mode) {
    case 'stars': return '***';
    case 'partial':
      if (type === 'email') {
        const parts = value.split('@');
        if (parts.length === 2) return parts[0][0] + '***@' + parts[1][0] + '***.' + parts[1].split('.').pop();
      }
      if (type === 'phone') return value.slice(0, 3) + '****' + value.slice(-2);
      if (type === 'creditcard') return '****-****-****-' + value.slice(-4).replace(/\D/g, '');
      return value.slice(0, 2) + '***';
    case 'hash': return '#' + simpleHash(value);
    case 'fake':
      if (type === 'email') return 'user@example.com';
      if (type === 'phone') return '000-000-0000';
      if (type === 'ip') return '0.0.0.0';
      if (type === 'key') return 'REDACTED_KEY';
      if (type === 'name') return 'Anonymous';
      if (type === 'creditcard') return '0000-0000-0000-0000';
      return 'REDACTED';
    default: return '***';
  }
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).slice(0, 8);
}