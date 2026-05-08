// dev-hash.js — Hash Generator Engine v2
// Supports: MD5, SHA-1, SHA-224, SHA-256, SHA-384, SHA-512, CRC32, HMAC-SHA256/SHA512/SHA1

const DevHash = (() => {
  const STATE = {
    text: '',
    fileBuffer: null,
    fileName: '',
    format: 'hex_lower', // hex_lower | hex_upper | base64
    activeTab: 'text',
    debounceTimer: null,
    DEBOUNCE_MS: 250,
    MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024,
    HISTORY_KEY: 'devhash_history_v2',
    MAX_HISTORY: 20,
    results: { md5: '', sha1: '', sha224: '', sha256: '', sha384: '', sha512: '', crc32: '', hmac: '' },
    batchResults: [],
  };

  const ALGOS = ['md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512', 'crc32'];

  // --- CRC32 table-based implementation ---
  const _crc32Table = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    return table;
  })();

  function crc32(buffer) {
    const bytes = new Uint8Array(buffer);
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc = _crc32Table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    crc ^= 0xFFFFFFFF;
    return (crc >>> 0).toString(16).padStart(8, '0');
  }

  // --- SHA-224 pure JS implementation ---
  const _sha224K = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ]);

  function sha224(buffer) {
    const bytes = new Uint8Array(buffer);
    const msgLen = bytes.length;
    let h0 = 0xc1059ed8, h1 = 0x367cd507, h2 = 0x3070dd17, h3 = 0xf70e5939;
    let h4 = 0xffc00b31, h5 = 0x68581511, h6 = 0x64f98fa7, h7 = 0xbefa4fa4;
    const bitLen = msgLen * 8;
    const padLen = ((56 - (msgLen + 1) % 64) + 64) % 64;
    const totalLen = msgLen + 1 + padLen + 8;
    const padded = new Uint8Array(totalLen);
    padded.set(bytes);
    padded[msgLen] = 0x80;
    const dv = new DataView(padded.buffer);
    dv.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);
    dv.setUint32(totalLen - 4, bitLen >>> 0, false);
    const w = new Uint32Array(64);
    for (let offset = 0; offset < totalLen; offset += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(offset + i * 4, false);
      for (let i = 16; i < 64; i++) {
        const s0 = ((w[i-15] >>> 7) | (w[i-15] << 25)) ^ ((w[i-15] >>> 18) | (w[i-15] << 14)) ^ (w[i-15] >>> 3);
        const s1 = ((w[i-2] >>> 17) | (w[i-2] << 15)) ^ ((w[i-2] >>> 19) | (w[i-2] << 13)) ^ (w[i-2] >>> 10);
        w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, hh = h7;
      for (let i = 0; i < 64; i++) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const ch = (e & f) ^ (~e & g);
        const temp1 = (hh + S1 + ch + _sha224K[i] + w[i]) | 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) | 0;
        hh = g; g = f; f = e; e = (d + temp1) | 0;
        d = c; c = b; b = a; a = (temp1 + temp2) | 0;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
      h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + hh) | 0;
    }
    const toHex = n => (n >>> 0).toString(16).padStart(8, '0');
    return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5) + toHex(h6);
  }

  // --- Formatting ---
  function formatResult(hex) {
    if (!hex) return '';
    switch (STATE.format) {
      case 'hex_upper': return hex.toUpperCase();
      case 'base64': return hexToBase64(hex);
      default: return hex.toLowerCase();
    }
  }

  function hexToBase64(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    let binary = '';
    const len = bytes.length;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  // --- Tab switching ---
  function switchTab(name) {
    STATE.activeTab = name;
    document.querySelectorAll('.hash-tab').forEach(t => {
      const active = t.id === 'tab-' + name;
      t.classList.toggle('hash-tab--active', active);
      t.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.hash-tab-panel').forEach(p => {
      const active = p.id === 'tab-panel-' + name;
      p.classList.toggle('hash-tab-panel--active', active);
      p.hidden = !active;
    });
    const results = document.getElementById('resultsPanel');
    if (results) results.style.display = (name === 'text' || name === 'file') ? '' : 'none';
    if (typeof gaTrackSettingChange === 'function') gaTrackSettingChange('dev-hash', 'tab', name);
  }

  // --- Text hashing ---
  function onInputChange() {
    clearTimeout(STATE.debounceTimer);
    STATE.debounceTimer = setTimeout(compute, STATE.DEBOUNCE_MS);
    const ta = document.getElementById('hashInput');
    const cc = document.getElementById('inputCharCount');
    if (ta && cc) cc.textContent = ta.value.length + ' chars';
  }

  async function compute() {
    const text = document.getElementById('hashInput').value;
    STATE.text = text;
    STATE.fileBuffer = null;
    if (!text.trim()) { clearResults(); return; }
    const buffer = new TextEncoder().encode(text).buffer;
    await computeFromBuffer(buffer, text);
  }

  async function computeFromBuffer(buffer, label) {
    const selected = getSelectedAlgos();
    if (selected.length === 0) { clearResults(); return; }
    const startMs = performance.now();
    try {
      const promises = [];
      const jobs = {};
      if (selected.includes('sha1'))   { jobs.sha1 = digestHex(buffer, 'SHA-1'); promises.push(jobs.sha1); }
      if (selected.includes('sha256')) { jobs.sha256 = digestHex(buffer, 'SHA-256'); promises.push(jobs.sha256); }
      if (selected.includes('sha384')) { jobs.sha384 = digestHex(buffer, 'SHA-384'); promises.push(jobs.sha384); }
      if (selected.includes('sha512')) { jobs.sha512 = digestHex(buffer, 'SHA-512'); promises.push(jobs.sha512); }
      await Promise.all(promises);

      const res = {};
      if (selected.includes('md5'))    res.md5    = formatResult(CryptoJS.MD5(CryptoJS.lib.WordArray.create(buffer)).toString());
      if (selected.includes('sha1'))   res.sha1   = formatResult(await jobs.sha1);
      if (selected.includes('sha224')) res.sha224 = formatResult(sha224(buffer));
      if (selected.includes('sha256')) res.sha256 = formatResult(await jobs.sha256);
      if (selected.includes('sha384')) res.sha384 = formatResult(await jobs.sha384);
      if (selected.includes('sha512')) res.sha512 = formatResult(await jobs.sha512);
      if (selected.includes('crc32'))  res.crc32  = formatResult(crc32(buffer));

      STATE.results = { ...STATE.results, ...res };
      renderResults(STATE.results, selected);
      if (STATE.activeTab === 'text' || STATE.activeTab === 'file') {
        addToHistory(label || STATE.text, STATE.results);
      }
      const durationMs = Math.round(performance.now() - startMs);
      if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('dev-hash', 1, durationMs);
    } catch (err) {
      if (typeof gaTrackError === 'function') gaTrackError('dev-hash', 'compute_error', err.message);
      showDevToast(err.message, 'error');
    }
  }

  async function digestHex(buffer, algo) {
    const hashBuffer = await crypto.subtle.digest(algo, buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function getSelectedAlgos() {
    const grid = document.getElementById(STATE.activeTab === 'file' ? 'algoGridFile' : 'algoGrid');
    if (!grid) return ALGOS;
    const checked = Array.from(grid.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);
    return checked.length ? checked : ALGOS;
  }

  function onFormatChange() {
    const checked = document.querySelector('input[name="hashFormat"]:checked');
    const newFormat = checked ? checked.value : 'hex_lower';
    if (newFormat !== STATE.format && typeof gaTrackSettingChange === 'function') {
      gaTrackSettingChange('dev-hash', 'format', newFormat);
    }
    STATE.format = newFormat;
    document.querySelectorAll('.hash-format-btn').forEach(btn => {
      const input = btn.querySelector('input[type="radio"]');
      btn.classList.toggle('hash-format-btn--active', input && input.checked);
    });
    if (STATE.text || STATE.fileBuffer) {
      const buffer = STATE.fileBuffer || new TextEncoder().encode(STATE.text).buffer;
      computeFromBuffer(buffer, STATE.text || STATE.fileName);
    }
  }

  // --- File hashing ---
  function onDragOver(e) {
    e.preventDefault();
    document.getElementById('fileDropZone').classList.add('hash-file-zone--hover');
  }
  function onDragLeave(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
      e.currentTarget.classList.remove('hash-file-zone--hover');
    }
  }
  function onDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('hash-file-zone--hover');
    const file = e.dataTransfer.files[0];
    if (file) addFile(file);
  }
  function onFileSelect(e) {
    const file = e.target.files[0];
    if (file) addFile(file);
  }

  function addFile(file) {
    if (file.size > STATE.MAX_FILE_SIZE) {
      showDevToast(window.__i18n__ ? window.__i18n__['hash.js.toast.file_too_large'] : 'File is too large (max 2 GB).', 'error');
      return;
    }
    const bar = document.getElementById('fileProgressBar');
    const info = document.getElementById('fileInfo');
    const nameEl = document.getElementById('fileName');
    const sizeEl = document.getElementById('fileSize');
    if (bar) bar.style.width = '0%';
    if (info) info.hidden = false;
    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = formatBytes(file.size);

    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable && bar) {
        bar.style.width = Math.round((e.loaded / e.total) * 100) + '%';
      }
    };
    reader.onload = async (e) => {
      STATE.fileBuffer = e.target.result;
      STATE.fileName = file.name;
      if (bar) bar.style.width = '100%';
      await computeFromBuffer(STATE.fileBuffer, 'File: ' + file.name);
    };
    reader.readAsArrayBuffer(file);
  }

  function clearFile() {
    STATE.fileBuffer = null;
    STATE.fileName = '';
    const info = document.getElementById('fileInfo');
    const bar = document.getElementById('fileProgressBar');
    if (info) info.hidden = true;
    if (bar) bar.style.width = '0%';
    clearResults();
  }

  function onFileAlgoChange() {
    if (STATE.fileBuffer) computeFromBuffer(STATE.fileBuffer, STATE.fileName);
  }

  function formatBytes(b) {
    if (b === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // --- Results ---
  function clearResults() {
    ALGOS.forEach(a => {
      const el = document.getElementById('val-' + a);
      if (el) el.textContent = '—';
    });
    STATE.results = { md5: '', sha1: '', sha224: '', sha256: '', sha384: '', sha512: '', crc32: '', hmac: '' };
  }

  function renderResults(res, selected) {
    const show = selected || ALGOS;
    show.forEach(a => {
      const el = document.getElementById('val-' + a);
      if (el) el.textContent = res[a] || '—';
    });
    ALGOS.forEach(a => {
      const card = document.querySelector('.hash-result-card[data-algo="' + a + '"]');
      if (card) card.style.display = show.includes(a) ? '' : 'none';
    });
  }

  async function copy(algo) {
    const val = STATE.results[algo];
    if (!val) return;
    await navigator.clipboard.writeText(val);
    if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('dev-hash', 'hash_' + algo);
    showDevToast(window.__i18n__ ? window.__i18n__['hash.js.toast.copied'] : 'Copied!', 'success');
  }

  async function copyAll() {
    const selected = getSelectedAlgos();
    const lines = selected
      .map(a => a.toUpperCase() + ': ' + (STATE.results[a] || ''))
      .filter(l => !l.endsWith(': '));
    if (!lines.length) {
      showDevToast(window.__i18n__ ? window.__i18n__['hash.js.toast.nothing_copy'] : 'Nothing to copy.', 'warn');
      return;
    }
    await navigator.clipboard.writeText(lines.join('\n'));
    if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('dev-hash', 'hash_all');
    showDevToast(window.__i18n__ ? window.__i18n__['hash.js.toast.copied'] : 'Copied!', 'success');
  }

  function downloadAll() {
    const selected = getSelectedAlgos();
    const lines = selected
      .map(a => a.toUpperCase() + ': ' + (STATE.results[a] || ''))
      .filter(l => !l.endsWith(': '));
    if (!lines.length) return;
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'hashes.txt'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    showDevToast(window.__i18n__ ? window.__i18n__['hash.js.toast.downloaded'] : 'Hashes downloaded.', 'success');
  }

  // --- HMAC ---
  function onHMACChange() {
    // Defer compute to button click for HMAC
  }

  async function computeHMAC() {
    const key = document.getElementById('hmacKey').value;
    const msg = document.getElementById('hmacMessage').value;
    if (!key || !msg) {
      showDevToast(window.__i18n__ ? window.__i18n__['hash.js.toast.hmac_empty'] : 'Enter both key and message.', 'warn');
      return;
    }
    const algoEl = document.querySelector('input[name="hmacAlgo"]:checked');
    const algo = algoEl ? algoEl.value : 'SHA256';
    const cryptoAlgo = 'SHA-' + algo.replace('SHA', '');
    const startMs = performance.now();
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(key);
      const msgData = encoder.encode(msg);
      const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: cryptoAlgo }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
      const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
      const formatted = formatResult(hex);
      const resEl = document.getElementById('hmacResult');
      if (!resEl) {
        // Create result card on the fly if not present
        const panel = document.getElementById('tab-panel-hmac');
        const card = document.createElement('div');
        card.className = 'hash-result-card';
        card.id = 'hmacResult';
        card.innerHTML = `
          <div class="hash-result-card__head">
            <span class="hash-result-card__name">HMAC-${algo}</span>
            <span class="hash-result-card__bits">${hex.length * 4}-bit</span>
          </div>
          <code class="hash-result-card__value">${formatted}</code>
          <button class="hash-result-card__copy" onclick="DevHash.copyHMACResult()" type="button" aria-label="Copy HMAC">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>`;
        panel.appendChild(card);
      } else {
        resEl.querySelector('.hash-result-card__name').textContent = 'HMAC-' + algo;
        resEl.querySelector('.hash-result-card__bits').textContent = (hex.length * 4) + '-bit';
        resEl.querySelector('.hash-result-card__value').textContent = formatted;
      }
      STATE.results.hmac = formatted;
      const durationMs = Math.round(performance.now() - startMs);
      if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('dev-hash', 1, durationMs);
      showDevToast(window.__i18n__ ? window.__i18n__['hash.js.toast.hmac_done'] : 'HMAC computed.', 'success');
    } catch (err) {
      if (typeof gaTrackError === 'function') gaTrackError('dev-hash', 'hmac_error', err.message);
      showDevToast(err.message, 'error');
    }
  }

  async function copyHMACResult() {
    if (STATE.results.hmac) {
      await navigator.clipboard.writeText(STATE.results.hmac);
      if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('dev-hash', 'hmac');
      showDevToast(window.__i18n__ ? window.__i18n__['hash.js.toast.copied'] : 'Copied!', 'success');
    }
  }

  function toggleKeyVisibility() {
    const input = document.getElementById('hmacKey');
    input.type = input.type === 'password' ? 'text' : 'password';
  }

  // --- Compare ---
  async function compareHashes() {
    const a = document.getElementById('compareA').value.trim().toLowerCase().replace(/\s/g, '');
    const b = document.getElementById('compareB').value.trim().toLowerCase().replace(/\s/g, '');
    const out = document.getElementById('compareResult');
    if (!a || !b) {
      out.className = 'hash-compare-result hash-compare-result--warn';
      out.textContent = window.__i18n__ ? window.__i18n__['hash.compare.empty'] : 'Enter both hashes to compare.';
      return;
    }
    if (a.length !== b.length) {
      out.className = 'hash-compare-result hash-compare-result--warn';
      out.textContent = window.__i18n__ ? window.__i18n__['hash.compare.length_mismatch'] : 'These look like different algorithms — lengths do not match.';
      return;
    }
    if (a === b) {
      out.className = 'hash-compare-result hash-compare-result--match';
      out.textContent = window.__i18n__ ? window.__i18n__['hash.compare.match'] : 'Hashes match — the data is identical.';
    } else {
      out.className = 'hash-compare-result hash-compare-result--mismatch';
      out.textContent = window.__i18n__ ? window.__i18n__['hash.compare.mismatch'] : 'Hashes differ. The inputs are NOT identical.';
    }
  }

  // --- Batch ---
  async function computeBatch() {
    const raw = document.getElementById('batchInput').value;
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (!lines.length) {
      showDevToast(window.__i18n__ ? window.__i18n__['hash.js.toast.batch_empty'] : 'Enter at least one line.', 'warn');
      return;
    }
    const selected = [];
    if (document.getElementById('batch-md5').checked) selected.push('md5');
    if (document.getElementById('batch-sha1').checked) selected.push('sha1');
    if (document.getElementById('batch-sha256').checked) selected.push('sha256');
    if (document.getElementById('batch-sha512').checked) selected.push('sha512');
    if (!selected.length) selected.push('sha256');

    const results = [];
    for (const line of lines) {
      const buffer = new TextEncoder().encode(line).buffer;
      const row = { input: line };
      for (const algo of selected) {
        if (algo === 'md5') row.md5 = CryptoJS.MD5(CryptoJS.lib.WordArray.create(buffer)).toString();
        else if (algo === 'sha1') row.sha1 = await digestHex(buffer, 'SHA-1');
        else if (algo === 'sha256') row.sha256 = await digestHex(buffer, 'SHA-256');
        else if (algo === 'sha512') row.sha512 = await digestHex(buffer, 'SHA-512');
      }
      results.push(row);
    }
    STATE.batchResults = results;
    renderBatchTable(results, selected);
    showDevToast((window.__i18n__ ? window.__i18n__['hash.js.toast.batch_done'] : 'Hashed {n} line(s).').replace('{n}', results.length), 'success');
  }

  function renderBatchTable(results, selected) {
    const wrap = document.getElementById('batchTableWrap');
    const body = document.getElementById('batchTableBody');
    const empty = document.getElementById('batchEmpty');
    if (wrap) wrap.hidden = false;
    if (empty) empty.hidden = true;
    if (!body) return;
    const cols = ['input', ...selected];
    body.innerHTML = results.map(r => {
      return '<tr>' + cols.map(c => `<td>${escapeHtml(r[c] || '')}</td>`).join('') + '</tr>';
    }).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  }

  function clearBatch() {
    document.getElementById('batchInput').value = '';
    STATE.batchResults = [];
    const wrap = document.getElementById('batchTableWrap');
    const body = document.getElementById('batchTableBody');
    const empty = document.getElementById('batchEmpty');
    if (wrap) wrap.hidden = true;
    if (body) body.innerHTML = '';
    if (empty) empty.hidden = false;
  }

  function exportBatchCSV() {
    if (!STATE.batchResults.length) return;
    const selected = [];
    if (document.getElementById('batch-md5').checked) selected.push('md5');
    if (document.getElementById('batch-sha1').checked) selected.push('sha1');
    if (document.getElementById('batch-sha256').checked) selected.push('sha256');
    if (document.getElementById('batch-sha512').checked) selected.push('sha512');
    const cols = ['input', ...selected];
    const header = cols.join(',');
    const rows = STATE.batchResults.map(r => cols.map(c => '"' + String(r[c] || '').replace(/"/g, '""') + '"').join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'hash-batch.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    showDevToast(window.__i18n__ ? window.__i18n__['hash.js.toast.batch_exported'] : 'Batch exported as CSV.', 'success');
  }

  // --- Examples & Samples ---
  const EXAMPLES = {
    empty: '',
    webhook: '{\n  "id": "evt_1234567890",\n  "type": "invoice.payment_succeeded",\n  "data": {\n    "object": {\n      "id": "in_1234567890",\n      "amount_due": 2000,\n      "currency": "usd"\n    }\n  }\n}',
    password: 'MyStr0ng!P@ssw0rd_With_L0ng_Length_123456',
    json: '{"id":"abc123","name":"Alice","role":"admin","active":true}',
  };

  function loadExample(name) {
    const ta = document.getElementById('hashInput');
    if (!ta) return;
    ta.value = EXAMPLES[name] || '';
    switchTab('text');
    onInputChange();
    showDevToast(window.__i18n__ ? window.__i18n__['hash.js.toast.example_loaded'] : 'Example loaded.', 'success');
  }

  function loadSample() {
    const ta = document.getElementById('hashInput');
    if (ta) { ta.value = 'The quick brown fox jumps over the lazy dog'; onInputChange(); }
    showDevToast(window.__i18n__ ? window.__i18n__['hash.js.toast.sample_loaded'] : 'Sample loaded.', 'success');
  }

  function clearInput() {
    const ta = document.getElementById('hashInput');
    if (ta) ta.value = '';
    STATE.text = '';
    STATE.fileBuffer = null;
    clearResults();
    const cc = document.getElementById('inputCharCount');
    if (cc) cc.textContent = '0 chars';
    showDevToast(window.__i18n__ ? window.__i18n__['hash.js.toast.cleared'] : 'Input cleared.', 'info');
  }

  // --- History (simplified) ---
  function addToHistory(label, results) {
    if (!label || !results.sha256) return;
    const history = loadHistory();
    const filtered = history.filter(e => e.label !== label);
    const entry = { label: label.substring(0, 200), results: { ...results }, ts: Date.now() };
    filtered.unshift(entry);
    if (filtered.length > STATE.MAX_HISTORY) filtered.pop();
    try { localStorage.setItem(STATE.HISTORY_KEY, JSON.stringify(filtered)); } catch(e) {}
  }

  function loadHistory() {
    try { const raw = localStorage.getItem(STATE.HISTORY_KEY); return raw ? JSON.parse(raw) : []; } catch(e) { return []; }
  }

  function clearHistory() {
    try { localStorage.removeItem(STATE.HISTORY_KEY); } catch(e) {}
    showDevToast(window.__i18n__ ? window.__i18n__['hash.js.history.clear'] : 'History cleared.', 'info');
  }

  return {
    switchTab,
    onInputChange, compute, onFormatChange,
    onDragOver, onDragLeave, onDrop, onFileSelect,
    clearFile, onFileAlgoChange,
    copy, copyAll, downloadAll,
    computeHMAC, onHMACChange, toggleKeyVisibility, copyHMACResult,
    compareHashes,
    computeBatch, clearBatch, exportBatchCSV,
    loadExample, loadSample, clearInput,
    clearHistory,
    init() {
      onFormatChange();
      const ta = document.getElementById('hashInput');
      if (ta && ta.value) onInputChange();
    }
  };
})();

document.addEventListener('DOMContentLoaded', function() { DevHash.init(); });

function showDevToast(msg, type) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  while (container.children.length >= 3) container.removeChild(container.firstChild);
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' toast--' + type : '');
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 3200);
}
