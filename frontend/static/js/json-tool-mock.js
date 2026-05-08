'use strict';
// JSON Mock Generator — generate random mock data from JSON schema

function initToolOptions() {
  const opts = document.getElementById('inputOptions');
  if (opts) {
    opts.innerHTML =
      '<span class="jt-options-label">Count</span>' +
      '<input type="number" id="mockCount" class="jt-options-input" value="5" min="1" max="100" style="width:60px">';
  }
}

function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-mock');
  clearErrorPanel();
  const raw = getInput().trim();
  if (!raw) { showToast(i18n('json.common.error.empty') || '请先输入内容', 'error'); return; }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch(e) {
    showErrorPanel(e, raw); return;
  }

  // Determine if the input is a JSON Schema or sample data
  // A schema typically has "type", "properties", or "items" fields
  let schema;
  if (parsed && typeof parsed === 'object' && (parsed.type || parsed.properties || parsed.items || parsed.enum)) {
    schema = parsed;
  } else {
    // It's sample data — infer schema from it
    schema = inferSchema(parsed);
    // If it's an array, generate array of mock items
    if (Array.isArray(parsed)) {
      schema = { type: 'array', items: schema.items || { type: 'object', properties: {} } };
    }
  }

  const count = parseInt(document.getElementById('mockCount')?.value) || 5;
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(generateMock(schema));
  }
  setOutput(JSON.stringify(results.length === 1 ? results[0] : results, null, 2), 'json');
}

function inferSchema(data) {
  if (data === null) return { type: 'null' };
  if (Array.isArray(data)) {
    if (data.length === 0) return { type: 'array' };
    return { type: 'array', items: inferSchema(data[0]) };
  }
  if (typeof data === 'object') {
    const props = {};
    for (const [k, v] of Object.entries(data)) {
      props[k] = inferSchema(v);
    }
    return { type: 'object', properties: props };
  }
  return { type: typeof data, example: data };
}

function generateMock(schema) {
  if (!schema) return null;
  const type = schema.type || (schema.properties ? 'object' : schema.items ? 'array' : 'string');

  // Check for enum
  if (schema.enum && schema.enum.length) {
    return schema.enum[Math.floor(Math.random() * schema.enum.length)];
  }

  switch(type) {
    case 'string':
      if (schema.format === 'email') return fakeEmail();
      if (schema.format === 'uri' || schema.format === 'url') return 'https://example.com/' + Math.random().toString(36).slice(2, 8);
      if (schema.format === 'date') return fakeDate();
      if (schema.format === 'date-time') return fakeDateTime();
      if (schema.format === 'uuid') return fakeUUID();
      if (schema.pattern) return generateFromPattern(schema.pattern);
      if (schema.minLength || schema.maxLength) {
        const len = schema.maxLength || (schema.minLength || 5) + 5;
        return 'str_' + Math.random().toString(36).slice(2, 2 + Math.min(len, 20));
      }
      return fakeWord();
    case 'number':
    case 'integer':
      const min = schema.minimum ?? 0;
      const max = schema.maximum ?? 100;
      const val = Math.random() * (max - min) + min;
      return type === 'integer' ? Math.round(val) : Math.round(val * 100) / 100;
    case 'boolean':
      return Math.random() > 0.5;
    case 'null':
      return null;
    case 'array':
      const itemCount = schema.minItems || Math.floor(Math.random() * 5) + 1;
      const itemSchema = schema.items || { type: 'string' };
      const arr = [];
      for (let i = 0; i < itemCount; i++) arr.push(generateMock(itemSchema));
      return arr;
    case 'object':
      const props = schema.properties || {};
      const obj = {};
      for (const [key, propSchema] of Object.entries(props)) {
        obj[key] = generateMock(propSchema);
      }
      return obj;
    default:
      return null;
  }
}

function generateFromPattern(pattern) {
  // Very simplified pattern generation
  return pattern.replace(/\./g, 'x').replace(/\*/g, 'xx').replace(/\+/g, 'xxx').replace(/\[\w+\]/g, 'abc');
}

const FIRST_NAMES = ['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda','David','Elizabeth','William','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Charles','Karen','Daniel','Lisa','Matthew','Nancy','Anthony','Betty','Mark','Sandra','Donald','Margaret'];
const LAST_NAMES = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin'];
const WORDS = ['hello','world','test','data','mock','sample','random','generate','example','demo','foo','bar','baz','qux','alpha','beta','gamma','delta'];

function fakeEmail() {
  return FIRST_NAMES[Math.floor(Math.random()*FIRST_NAMES.length)].toLowerCase() + LAST_NAMES[Math.floor(Math.random()*LAST_NAMES.length)].toLowerCase() + Math.floor(Math.random()*99) + '@example.com';
}
function fakeDate() {
  const d = new Date(Date.now() - Math.random() * 365 * 86400000);
  return d.toISOString().slice(0, 10);
}
function fakeDateTime() {
  return new Date(Date.now() - Math.random() * 365 * 86400000).toISOString();
}
function fakeUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
function fakeWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}
