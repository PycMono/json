'use strict';
// to-sql
function initToolOptions() {
  document.getElementById('inputOptions').innerHTML = `
    <span class="jt-options-label">表名</span>
    <input id="sqlTableName" type="text" value="my_table" class="jt-options-input" style="width:130px">
    <span class="jt-options-label">方言</span>
    <select id="sqlDialect" class="jt-options-select">
      <option value="mysql">MySQL</option>
      <option value="postgres">PostgreSQL</option>
      <option value="mssql">SQL Server</option>
    </select>`;
}
function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-to-sql');
  clearErrorPanel();
  const parsed = parseInput(); if (parsed === null) return;
  if (!Array.isArray(parsed)) {
    showErrorPanel(new TypeError('输入必须为 JSON 数组（[...]）'), getInput().trim());
    return;
  }
  const table   = document.getElementById('sqlTableName')?.value || 'my_table';
  const dialect = document.getElementById('sqlDialect')?.value   || 'mysql';
  const keys    = [...new Set(parsed.flatMap(r => Object.keys(r)))];
  const q  = dialect === 'postgres' ? '"' : dialect === 'mssql' ? '[' : '`';
  const qe = dialect === 'mssql' ? ']' : q;
  const colDefs   = keys.map(k => `  ${q}${k}${qe} TEXT`).join(',\n');
  const createSql = `CREATE TABLE ${q}${table}${qe} (\n${colDefs}\n);\n\n`;
  const inserts   = parsed.map(row => {
    const vals = keys.map(k => {
      const v = row[k];
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') return String(v);
      return `'${String(v).replace(/'/g, "''")}'`;
    });
    return `INSERT INTO ${q}${table}${qe} (${keys.map(k=>`${q}${k}${qe}`).join(', ')}) VALUES (${vals.join(', ')});`;
  }).join('\n');
  setOutput(createSql + inserts, 'sql');
  if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('json-tool-to-sql', 1, Date.now() - _gaStart);
  const el = document.getElementById('outputStats');
  if (el) el.innerHTML = `<span class="jt-success-badge">✅ 生成 ${parsed.length} 条 INSERT 语句</span>`;
}
