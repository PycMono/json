'use strict';
// to-excel (requires SheetJS + FileSaver)
function initToolOptions() {
  document.getElementById('inputOptions').innerHTML = `
    <span class="jt-options-label">Sheet 名称</span>
    <input id="sheetName" type="text" value="Sheet1" placeholder="例如 Sheet1" class="jt-options-input" style="width:120px">`;
}
function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-to-excel');
  clearErrorPanel();
  let parsed = parseInput(); if (parsed === null) return;
  if (!Array.isArray(parsed)) {
    if (typeof parsed === 'object' && parsed !== null) {
      parsed = [parsed];
    } else {
      showErrorPanel(new TypeError('输入必须为 JSON 数组（[...]）或对象（{...}）'), getInput().trim());
      return;
    }
  }
  if (typeof XLSX === 'undefined') { showToast('SheetJS 库未加载，请刷新页面重试', 'error'); return; }
  const sheetName = document.getElementById('sheetName')?.value || 'Sheet1';
  const ws  = XLSX.utils.json_to_sheet(parsed);
  const wb  = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf  = XLSX.write(wb, { bookType:'xlsx', type:'array' });
  const blob = new Blob([buf], { type:'application/octet-stream' });
  if (window.saveAs) { saveAs(blob, 'output.xlsx'); }
  else { const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='output.xlsx'; a.click(); }
  const csvPreview = XLSX.utils.sheet_to_csv(ws);
  setOutput(csvPreview, 'plaintext');
  if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('json-tool-to-excel', 1, Date.now() - _gaStart);
  const el = document.getElementById('outputStats');
  if (el) el.innerHTML = `<span class="jt-success-badge">✅ Excel 已下载，共 ${parsed.length} 行</span>`;
}
