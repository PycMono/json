'use strict';
// JSON to GraphQL — Generate GraphQL type definitions from JSON

function initToolOptions() {}

function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-to-graphql');
  clearErrorPanel();
  const parsed = parseInput();
  if (parsed === null) return;
  const types = {};
  const mainType = generateGraphQLType(parsed, 'Root', types);
  let output = '';
  // Output collected types first (dependencies)
  const typeOrder = Object.keys(types).filter(t => t !== 'Root');
  for (const t of typeOrder) {
    output += types[t] + '\n\n';
  }
  output += mainType;
  setOutput(output, 'graphql');
  if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('json-tool-to-graphql', 1, Date.now() - _gaStart);
}

function generateGraphQLType(data, name, types) {
  if (data === null) return 'String';
  if (typeof data === 'boolean') return 'Boolean';
  if (typeof data === 'number') return Number.isInteger(data) ? 'Int' : 'Float';
  if (typeof data === 'string') return 'String';
  if (Array.isArray(data)) {
    if (data.length === 0) return '[String]';
    const itemType = generateGraphQLType(data[0], name + 'Item', types);
    return '[' + itemType + ']';
  }
  if (typeof data === 'object') {
    const fields = [];
    for (const [key, val] of Object.entries(data)) {
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : '"' + key + '"';
      const graphQLType = generateGraphQLType(val, capitalize(key), types);
      fields.push('  ' + safeKey + ': ' + graphQLType);
    }
    const typeDef = 'type ' + name + ' {\n' + fields.join('\n') + '\n}';
    types[name] = typeDef;
    return name;
  }
  return 'String';
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
