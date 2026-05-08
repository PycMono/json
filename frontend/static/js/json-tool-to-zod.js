'use strict';
// JSON to Zod — Generate TypeScript Zod schemas from JSON

function initToolOptions() {}

function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-to-zod');
  clearErrorPanel();
  const parsed = parseInput();
  if (parsed === null) return;
  const result = generateZodSchema(parsed, 'RootSchema');
  setOutput("import { z } from 'zod';\n\n" + result + '\n\nexport const RootSchema = ' + buildZodExpression(parsed) + ';', 'typescript');
}

function buildZodExpression(data, depth) {
  depth = depth || 0;
  const indent = '  '.repeat(depth);
  if (data === null) return 'z.null()';
  if (typeof data === 'boolean') return 'z.boolean()';
  if (typeof data === 'number') {
    return Number.isInteger(data) ? 'z.number().int()' : 'z.number()';
  }
  if (typeof data === 'string') {
    // Detect common formats
    if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(data)) return 'z.string().uuid()';
    if (/^\S+@\S+\.\S+$/.test(data)) return 'z.string().email()';
    if (/^https?:\/\//.test(data)) return 'z.string().url()';
    if (/^\d{4}-\d{2}-\d{2}/.test(data)) return 'z.string().datetime()';
    return 'z.string()';
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return 'z.array(z.any())';
    // Check if all elements are the same type
    const firstType = zodTypeOf(data[0]);
    const allSameType = data.every(item => zodTypeOf(item) === firstType);
    if (allSameType) {
      return 'z.array(' + buildZodExpression(data[0]) + ')';
    }
    // Mixed types — use union of unique types
    const uniqueExprs = [];
    const seen = new Set();
    for (const item of data) {
      const expr = buildZodExpression(item);
      if (!seen.has(expr)) { seen.add(expr); uniqueExprs.push(expr); }
    }
    if (uniqueExprs.length === 1) return 'z.array(' + uniqueExprs[0] + ')';
    return 'z.array(z.union([' + uniqueExprs.join(', ') + '])';
  }
  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) return 'z.record(z.any())';
    const lines = entries.map(([key, val]) => {
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
      return safeKey + ': ' + buildZodExpression(val);
    });
    return 'z.object({\n' + lines.map(l => '  ' + l + ',').join('\n') + '\n})';
  }
  return 'z.any()';
}

function zodTypeOf(data) {
  if (data === null) return 'null';
  return typeof data;
}

function generateZodSchema(data, name) {
  // Generate named type definitions for nested objects
  const types = [];
  collectZodTypes(data, name, types);
  return types.map(t => 'const ' + t.name + ' = ' + t.expr + ';').join('\n\n');
}

function collectZodTypes(data, name, types) {
  if (data === null || typeof data !== 'object') return;
  if (Array.isArray(data)) {
    data.forEach((item, i) => collectZodTypes(item, name + 'Item', types));
    return;
  }
  for (const [key, val] of Object.entries(data)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const subName = capitalize(key) + 'Schema';
      collectZodTypes(val, subName, types);
    }
  }
}
