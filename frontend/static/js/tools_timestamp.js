/* ============================================================
   ToolboxNova — Timestamp Converter (refactored)
   Features: live clock, smart auto-detect, instant convert,
   multi-timezone, batch processing, copy-to-clipboard
   ============================================================ */

// =========================
// Globals
// =========================
let clockInterval = null;
let isPaused = false;
const DEBOUNCE_MS = 300;
let convertTimer = null;

const TZ_LIST = [
  { id: 'UTC', nameKey: 'tools.timestamp.tz.utc' },
  { id: 'local', nameKey: 'tools.timestamp.tz.local' },
  { id: 'Asia/Shanghai', nameKey: 'tools.timestamp.tz.shanghai' },
  { id: 'America/New_York', nameKey: 'tools.timestamp.tz.ny' },
  { id: 'Europe/London', nameKey: 'tools.timestamp.tz.london' },
  { id: 'Asia/Tokyo', nameKey: 'tools.timestamp.tz.tokyo' },
  { id: 'America/Los_Angeles', nameKey: 'tools.timestamp.tz.la' },
];

// =========================
// Utilities
// =========================
function pad(n) { return String(n).padStart(2, '0'); }

function showToast(msg) {
  const el = document.getElementById('tsToast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 2000);
}

function copyText(text, btnEl) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast('✅ Copied');
    if (btnEl) {
      const old = btnEl.textContent;
      btnEl.textContent = '✅';
      btnEl.classList.add('copied');
      setTimeout(() => { btnEl.textContent = old; btnEl.classList.remove('copied'); }, 1500);
    }
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('✅ Copied');
  });
}

function formatDateTime(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDateOnly(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function formatTimeOnly(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatSql(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function relativeTime(ms) {
  const diff = Date.now() - ms;
  const abs = Math.abs(diff);
  const future = diff < 0;
  const s = Math.floor(abs / 1000);
  if (s < 60) return future ? `in ${s}s` : `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return future ? `in ${m}m` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return future ? `in ${h}h` : `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return future ? `in ${d}d` : `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return future ? `in ${mo}mo` : `${mo}mo ago`;
  const y = Math.floor(mo / 12);
  return future ? `in ${y}y` : `${y}y ago`;
}

function getTzOffsetName(tz) {
  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, timeZoneName: 'shortOffset', hour: 'numeric', minute: 'numeric'
    });
    const parts = fmt.formatToParts(now);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart ? tzPart.value : '';
  } catch (e) {
    return '';
  }
}

function isDst(tz) {
  try {
    const now = new Date();
    const jan = new Date(now.getFullYear(), 0, 1);
    const jul = new Date(now.getFullYear(), 6, 1);
    const janOffset = new Date(jan.toLocaleString('en-US', { timeZone: tz })).getTime() - jan.getTime();
    const julOffset = new Date(jul.toLocaleString('en-US', { timeZone: tz })).getTime() - jul.getTime();
    const nowOffset = new Date(now.toLocaleString('en-US', { timeZone: tz })).getTime() - now.getTime();
    return nowOffset !== Math.max(janOffset, julOffset);
  } catch (e) {
    return false;
  }
}

// =========================
// Live clock
// =========================
function updateClock() {
  if (isPaused) return;
  const now = Date.now();
  const sec = Math.floor(now / 1000);
  const d = new Date(now);

  const elSec = document.getElementById('tsNowSec');
  const elMs = document.getElementById('tsNowMs');
  const elLocal = document.getElementById('tsNowLocal');
  const elUtc = document.getElementById('tsNowUtc');
  const elIso = document.getElementById('tsNowIso');

  if (elSec) elSec.textContent = sec;
  if (elMs) elMs.textContent = now;
  if (elLocal) elLocal.textContent = formatDateTime(d);
  if (elUtc) elUtc.textContent = d.toUTCString();
  if (elIso) elIso.textContent = d.toISOString();
}

function startClock() {
  if (clockInterval) clearInterval(clockInterval);
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
}

function togglePause() {
  isPaused = !isPaused;
  const icon = document.getElementById('tsPauseIcon');
  const text = document.getElementById('tsPauseText');
  if (icon) icon.textContent = isPaused ? '▶' : '⏸';
  if (text) text.textContent = isPaused ? 'Resume' : 'Pause';
  if (!isPaused) updateClock();
}

// =========================
// Smart converter
// =========================
function detectInputType(raw) {
  const s = raw.trim();
  if (!s) return null;

  // ISO 8601: contains T or Z or ends with +xx:xx
  if (/^\d{4}-\d{2}-\d{2}T/.test(s) || /Z$|[+-]\d{2}:\d{2}$/.test(s)) {
    return { type: 'iso', date: new Date(s) };
  }

  // Numeric
  if (/^\d+$/.test(s)) {
    const num = parseInt(s, 10);
    const len = s.length;
    if (len === 10) {
      return { type: 'sec', ms: num * 1000 };
    }
    if (len === 13) {
      return { type: 'ms', ms: num };
    }
    // Try to guess: if value is reasonable as seconds (< year 2100)
    if (num < 4000000000) {
      return { type: 'sec', ms: num * 1000 };
    }
    return { type: 'ms', ms: num };
  }

  // Date string with / or -
  if (/\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return { type: 'date', date: d };
    }
  }

  // Try generic Date.parse as fallback
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return { type: 'date', date: d };
  }

  return null;
}

function updateResults(ms) {
  const d = new Date(ms);
  const panel = document.getElementById('tsResultPanel');
  if (panel) panel.classList.remove('ts-hidden');

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set('resSec', Math.floor(ms / 1000));
  set('resMs', ms);
  set('resLocal', formatDateTime(d));
  set('resUtc', d.toUTCString());
  set('resIso', d.toISOString());
  set('resRfc', d.toUTCString()); // RFC 2822 is close enough to toUTCString
  set('resSql', formatSql(d));
  set('resRelative', relativeTime(ms));
}

function clearResults() {
  const panel = document.getElementById('tsResultPanel');
  if (panel) panel.classList.add('ts-hidden');
}

function doConvert() {
  const raw = document.getElementById('tsConvertInput').value.trim();
  const errorEl = document.getElementById('tsConvertError');

  if (!raw) {
    if (errorEl) errorEl.classList.remove('visible');
    clearResults();
    return;
  }

  const detected = detectInputType(raw);
  if (!detected) {
    if (errorEl) errorEl.classList.add('visible');
    clearResults();
    return;
  }

  if (errorEl) errorEl.classList.remove('visible');

  let ms;
  if (detected.type === 'sec') {
    ms = detected.ms;
  } else if (detected.type === 'ms') {
    ms = detected.ms;
  } else {
    ms = detected.date.getTime();
  }

  if (isNaN(ms)) {
    if (errorEl) errorEl.classList.add('visible');
    clearResults();
    return;
  }

  updateResults(ms);
  if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('tools-timestamp', 1, 0);
}

function onInputChange() {
  if (convertTimer) clearTimeout(convertTimer);
  convertTimer = setTimeout(doConvert, DEBOUNCE_MS);
}

// =========================
// Mode tabs
// =========================
function initModeTabs() {
  const tabs = document.querySelectorAll('.ts-mode-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
    });
  });
}

// =========================
// Timezone grid
// =========================
function renderTzGrid() {
  const grid = document.getElementById('tsTzGrid');
  if (!grid) return;

  grid.innerHTML = TZ_LIST.map(tz => {
    const tzName = tz.id === 'local' ? Intl.DateTimeFormat().resolvedOptions().timeZone : tz.id;
    let timeStr, dateStr, offsetStr, dstStr = '';
    try {
      const now = new Date();
      const opts = { timeZone: tzName, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
      const parts = new Intl.DateTimeFormat('en-US', opts).formatToParts(now);
      const y = parts.find(p => p.type === 'year').value;
      const m = parts.find(p => p.type === 'month').value;
      const d = parts.find(p => p.type === 'day').value;
      const h = parts.find(p => p.type === 'hour').value;
      const min = parts.find(p => p.type === 'minute').value;
      const s = parts.find(p => p.type === 'second').value;
      timeStr = `${h}:${min}:${s}`;
      dateStr = `${y}-${m}-${d}`;
      offsetStr = getTzOffsetName(tzName);
      const dst = isDst(tzName);
      if (dst) dstStr = 'DST';
    } catch (e) {
      timeStr = '--:--:--';
      dateStr = '----/--/--';
      offsetStr = '';
    }

    return `
      <div class="ts-tz-card">
        <div class="ts-tz-card__header">
          <span class="ts-tz-card__name">${tzName}</span>
          ${offsetStr ? `<span class="ts-tz-card__offset">${offsetStr}</span>` : ''}
        </div>
        <div class="ts-tz-card__time">${timeStr}</div>
        <div class="ts-tz-card__date">${dateStr}</div>
        ${dstStr ? `<div class="ts-tz-card__dst">${dstStr}</div>` : ''}
      </div>
    `;
  }).join('');
}

// =========================
// Batch conversion
// =========================
function doBatchConvert() {
  const raw = document.getElementById('tsBatchInput').value;
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l);
  const tbody = document.querySelector('#tsBatchTable tbody');
  const resultWrap = document.getElementById('tsBatchResult');

  if (!lines.length) {
    if (resultWrap) resultWrap.classList.add('ts-hidden');
    return;
  }

  const rows = lines.map(line => {
    const detected = detectInputType(line);
    if (!detected || (detected.date && isNaN(detected.date.getTime()))) {
      return `<tr><td class="ts-batch-error">${escapeHtml(line)}</td><td colspan="4" class="ts-batch-error">Invalid</td></tr>`;
    }

    let ms;
    if (detected.type === 'sec') ms = detected.ms;
    else if (detected.type === 'ms') ms = detected.ms;
    else ms = detected.date.getTime();

    const d = new Date(ms);
    const typeLabel = detected.type === 'sec' ? 'Seconds' : detected.type === 'ms' ? 'Milliseconds' : 'Date';

    return `<tr>
      <td>${escapeHtml(line)}</td>
      <td>${typeLabel}</td>
      <td>${formatDateTime(d)}</td>
      <td>${d.toUTCString()}</td>
      <td>${d.toISOString()}</td>
    </tr>`;
  }).join('');

  if (tbody) tbody.innerHTML = rows;
  if (resultWrap) resultWrap.classList.remove('ts-hidden');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// =========================
// Copy all results
// =========================
function copyAllResults() {
  const lines = [];
  const labels = {
    resSec: 'Unix Seconds',
    resMs: 'Unix Milliseconds',
    resLocal: 'Local Time',
    resUtc: 'UTC',
    resIso: 'ISO 8601',
    resRfc: 'RFC 2822',
    resSql: 'SQL Datetime',
    resRelative: 'Relative',
  };
  Object.keys(labels).forEach(id => {
    const el = document.getElementById(id);
    if (el && el.textContent && el.textContent !== '--') {
      lines.push(`${labels[id]}: ${el.textContent}`);
    }
  });
  if (lines.length) copyText(lines.join('\n'));
}

// =========================
// Init
// =========================
document.addEventListener('DOMContentLoaded', () => {
  // Clock
  startClock();
  document.getElementById('tsPauseBtn')?.addEventListener('click', togglePause);
  document.getElementById('tsRefreshBtn')?.addEventListener('click', updateClock);

  // Live panel copy buttons
  document.querySelectorAll('.ts-live-item__copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.copyTarget;
      const el = document.getElementById(targetId);
      if (el) copyText(el.textContent, btn);
      if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('tools-timestamp', 'text');
    });
  });

  // Converter
  const inputEl = document.getElementById('tsConvertInput');
  if (inputEl) {
    inputEl.addEventListener('input', onInputChange);
    inputEl.addEventListener('paste', () => setTimeout(onInputChange, 50));
  }

  initModeTabs();

  document.getElementById('tsUseNowBtn')?.addEventListener('click', () => {
    if (inputEl) inputEl.value = String(Math.floor(Date.now() / 1000));
    onInputChange();
  });

  document.getElementById('tsExampleBtn')?.addEventListener('click', () => {
    if (inputEl) inputEl.value = '1713340800';
    onInputChange();
  });

  document.getElementById('tsClearBtn')?.addEventListener('click', () => {
    if (inputEl) inputEl.value = '';
    onInputChange();
  });

  // Result copy buttons
  document.querySelectorAll('.ts-result-row__copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.copyTarget;
      const el = document.getElementById(targetId);
      if (el) copyText(el.textContent, btn);
      if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('tools-timestamp', 'text');
    });
  });

  document.getElementById('tsCopyAllBtn')?.addEventListener('click', () => {
    copyAllResults();
    if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('tools-timestamp', 'text');
  });

  // Timezone
  renderTzGrid();
  setInterval(renderTzGrid, 60000); // refresh every minute

  // Batch
  document.getElementById('tsBatchConvertBtn')?.addEventListener('click', doBatchConvert);
  document.getElementById('tsBatchClearBtn')?.addEventListener('click', () => {
    const ta = document.getElementById('tsBatchInput');
    if (ta) ta.value = '';
    const resultWrap = document.getElementById('tsBatchResult');
    if (resultWrap) resultWrap.classList.add('ts-hidden');
  });

  // Code copy buttons
  document.querySelectorAll('.ts-code-card__copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      const codeEl = document.getElementById('code' + lang.charAt(0).toUpperCase() + lang.slice(1));
      if (codeEl) copyText(codeEl.textContent, btn);
    });
  });
});
