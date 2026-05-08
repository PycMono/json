// dev-whois.js — WHOIS Lookup Engine

const DevWhois = (() => {
  const HISTORY_KEY = 'whois_history';
  const MAX_HISTORY = 10;
  const TIMEOUT_MS  = 15000;

  const STATUS_MAP = {
    'clientTransferProhibited': 'transfer_prohibited',
    'clientUpdateProhibited':   'update_prohibited',
    'clientDeleteProhibited':   'delete_prohibited',
    'serverTransferProhibited': 'server_transfer',
    'serverUpdateProhibited':   'update_prohibited',
    'serverDeleteProhibited':   'delete_prohibited',
    'clientRenewProhibited':    'update_prohibited',
    'serverRenewProhibited':    'update_prohibited',
  };

  const NS_PROVIDERS = [
    { name: 'Cloudflare', patterns: [/cloudflare\.com$/i] },
    { name: 'Amazon Route 53', patterns: [/awsdns-/i] },
    { name: 'Google Cloud DNS', patterns: [/googledomains\.com$/i, /google\.com$/i] },
    { name: 'Namecheap', patterns: [/registrar-servers\.com$/i] },
  ];

  function $(id) { return document.getElementById(id); }

  function extractDomain(input) {
    let s = input.trim();
    if (!s) return '';
    // Strip protocol and path
    try {
      if (s.includes('://') || s.startsWith('//')) {
        const u = new URL(s.startsWith('//') ? 'https:' + s : s);
        s = u.hostname;
      }
    } catch (_) {
      // not a URL, treat as plain domain
    }
    s = s.replace(/^www\./i, '');
    s = s.split('/')[0].split('?')[0].split('#')[0].trim();
    return s.toLowerCase();
  }

  function isValidDomain(domain) {
    const re = /^[a-z0-9¡-￿]([a-z0-9¡-￿\-]{0,61}[a-z0-9¡-￿])?(\.[a-z0-9¡-￿]([a-z0-9¡-￿\-]{0,61}[a-z0-9¡-￿])?)*$/i;
    if (!re.test(domain)) return false;
    const parts = domain.split('.');
    if (parts.length < 2) return false;
    const tld = parts[parts.length - 1];
    return tld.length >= 2;
  }

  function getTLD(domain) {
    const parts = domain.split('.');
    return parts.length >= 2 ? parts[parts.length - 1] : '';
  }

  function formatDate(d) {
    if (!d) return '';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return d;
      return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    } catch (_) { return d; }
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return Math.floor((d - Date.now()) / 86400000);
    } catch (_) { return null; }
    }

  function detectPrivacy(parsed) {
    if (!parsed) return 'unknown';
    // Check for common privacy indicators
    const raw = JSON.stringify(parsed).toLowerCase();
    if (raw.includes('redacted') || raw.includes('privacy') || raw.includes('whoisguard') ||
        raw.includes('contact privacy') || raw.includes('data protected')) {
      return 'on';
    }
    // If no registrant info but domain exists, likely privacy protected
    if (!parsed.registrant && !parsed.registrantName && !parsed.registrantOrganization) {
      return 'on';
    }
    return 'off';
  }

  function detectNSProvider(ns) {
    if (!ns) return 'Other';
    for (const p of NS_PROVIDERS) {
      for (const re of p.patterns) {
        if (re.test(ns)) return p.name;
      }
    }
    return 'Other';
  }

  function showToast(msg, type) {
    if (typeof showDevToast === 'function') {
      showDevToast(msg, type);
    } else {
      const container = $('toastContainer');
      if (!container) return;
      const el = document.createElement('div');
      el.className = 'wh-toast wh-toast--' + (type || 'info');
      el.textContent = msg;
      container.appendChild(el);
      setTimeout(() => { el.remove(); }, 3000);
    }
  }

  function copyText(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast(window._i18n ? window._i18n.copied : 'Copied', 'success'))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(window._i18n ? window._i18n.copied : 'Copied', 'success');
    } catch (_) {
      showToast('Copy failed', 'error');
    }
    document.body.removeChild(ta);
  }

  function setStatus(html, type) {
    const el = $('whoisStatus');
    if (!el) return;
    el.style.display = html ? 'block' : 'none';
    el.innerHTML = html;
    el.className = 'wh-status' + (type ? ' wh-status--' + type : '');
  }

  function setLoading(loading) {
    const btn = $('whoisBtn');
    if (btn) {
      btn.disabled = loading;
      btn.textContent = loading
        ? (window._i18n ? window._i18n.loading : 'Looking up...')
        : (window._i18n ? window._i18n.lookup : 'Look up');
    }
    if (loading) {
      $('whoisResults').style.display = 'none';
      $('whoisEmpty').style.display = 'none';
      setStatus('<span class="wh-spinner"></span> ' + (window._i18n ? window._i18n.loadingTitle : 'Looking up WHOIS information...'), 'loading');
    } else {
      setStatus('');
    }
  }

  function renderOverview(parsed, domain) {
    $('ov-domain').textContent = domain;
    const tld = getTLD(domain);
    $('ov-tld').textContent = tld ? '.' + tld : '—';
    $('ov-registrar').textContent = parsed.registrar || '—';
    $('ov-created').textContent = formatDate(parsed.creationDate) || '—';
    $('ov-expires').textContent = formatDate(parsed.expirationDate) || '—';
    $('ov-updated').textContent = formatDate(parsed.updatedDate) || '—';

    const days = daysUntil(parsed.expirationDate);
    $('ov-days').textContent = days !== null ? days + ' days' : '—';

    const nsArr = normalizeArray(parsed.nameServers);
    $('ov-ns-count').textContent = nsArr.length ? nsArr.length + '' : '—';

    const privacy = detectPrivacy(parsed);
    const privacyEl = $('ov-privacy');
    if (privacyEl) {
      privacyEl.textContent = window._i18n ? window._i18n['privacy_' + privacy] : privacy;
    }

    // Status badge
    const badge = $('ov-status-badge');
    let statusLabel = 'registered';
    let statusClass = 'wh-badge--green';
    if (days !== null && days < 0) { statusLabel = 'expired'; statusClass = 'wh-badge--slate'; }
    else if (days !== null && days < 30) { statusLabel = 'expiring_soon'; statusClass = 'wh-badge--amber'; }
    badge.className = 'wh-badge ' + statusClass;
    badge.textContent = window._i18n ? window._i18n['status_' + statusLabel] : statusLabel;

    const now = new Date();
    $('ov-time').textContent = (window._i18n ? window._i18n.queryTime : 'Queried at') + ' ' +
      now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  }

  function renderRegistration(parsed) {
    const setField = (id, val, wrapId) => {
      const el = $(id);
      const wrap = wrapId ? $(wrapId) : null;
      if (el) {
        const v = val || '';
        el.textContent = v;
        if (wrap) wrap.style.display = v ? '' : 'none';
      }
    };
    setField('f-registrar', parsed.registrar, 'f-registrar-wrap');
    setField('f-registrar-url', parsed.registrarURL || parsed.registrarUrl, 'f-registrar-url-wrap');
    setField('f-iana', parsed.registrarIanaId, 'f-iana-wrap');
    setField('f-created', formatDate(parsed.creationDate), 'f-created-wrap');
    setField('f-updated', formatDate(parsed.updatedDate), 'f-updated-wrap');
    setField('f-expires', formatDate(parsed.expirationDate), 'f-expires-wrap');
    setField('f-registry-id', parsed.registryDomainId, 'f-registry-id-wrap');
    setField('f-org', parsed.registrantOrganization || parsed.registrantOrg, 'f-org-wrap');
    setField('f-country', parsed.registrantCountry, 'f-country-wrap');
    setField('f-abuse-email', parsed.abuseContactEmail, 'f-abuse-email-wrap');
    setField('f-abuse-phone', parsed.abuseContactPhone, 'f-abuse-phone-wrap');
  }

  function renderStatus(parsed) {
    const list = $('statusList');
    const expiry = $('statusExpiry');
    if (!list) return;
    const statusArr = normalizeArray(parsed.status);
    if (!statusArr.length) {
      list.innerHTML = '<p class="wh-hint">' + (window._i18n ? window._i18n.noStatus : 'No status codes provided.') + '</p>';
    } else {
      list.innerHTML = statusArr.map(s => {
        const code = s.split(' ')[0];
        const key = STATUS_MAP[code] || '';
        const desc = key && window._i18n ? window._i18n['status_' + key] : '';
        return '<div class="wh-status-item"><code>' + escapeHtml(code) + '</code>' +
          (desc ? '<span class="wh-status-desc">' + desc + '</span>' : '') + '</div>';
      }).join('');
    }
    const days = daysUntil(parsed.expirationDate);
    if (expiry) {
      if (days !== null && days < 30) {
        const msg = days < 0
          ? (window._i18n ? window._i18n.expired : 'Expired')
          : (window._i18n ? window._i18n.expiryNotice : 'This domain will expire soon.');
        expiry.innerHTML = '<div class="wh-notice wh-notice--amber">' + escapeHtml(msg) + '</div>';
      } else if (!parsed.expirationDate) {
        expiry.innerHTML = '<div class="wh-notice wh-notice--info">' +
          (window._i18n ? window._i18n.noExpiry : 'No expiry date provided.') + '</div>';
      } else {
        expiry.innerHTML = '';
      }
    }
  }

  function renderNS(parsed) {
    const list = $('nsList');
    if (!list) return;
    const nsArr = normalizeArray(parsed.nameServers);
    if (!nsArr.length) {
      list.innerHTML = '<p class="wh-hint">No nameservers found.</p>';
      return;
    }
    list.innerHTML = nsArr.map(ns => {
      const provider = detectNSProvider(ns);
      return '<div class="wh-ns-item">' +
        '<code class="wh-ns-name">' + escapeHtml(ns) + '</code>' +
        '<span class="wh-ns-provider">' + escapeHtml(provider) + '</span>' +
        '<button class="wh-copy-btn" data-copy="' + escapeHtml(ns) + '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
        '</button></div>';
    }).join('');
    // Bind copy buttons
    list.querySelectorAll('.wh-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => copyText(btn.dataset.copy));
    });
  }

  function renderRegistry(parsed, domain) {
    $('r-registrar').textContent = parsed.registrar || '—';
    $('r-registry').textContent = parsed.registry || '—';
    $('r-tld').textContent = '.' + getTLD(domain) || '—';
    $('r-whois-server').textContent = parsed.whoisServer || '—';
    $('r-rdap').textContent = parsed.rdapUrl || '—';
    $('r-abuse').textContent = parsed.abuseContactEmail || '—';
    $('r-official').textContent = parsed.registrarURL || parsed.registrarUrl || '—';
  }

  function renderRaw(raw, rdap) {
    $('raw-structured').textContent = '';
    $('raw-whois-pre').textContent = raw || 'No raw data available.';
    $('raw-rdap-pre').textContent = rdap ? JSON.stringify(rdap, null, 2) : 'No RDAP data available.';
  }

  function normalizeArray(val) {
    if (Array.isArray(val)) return val.filter(Boolean);
    if (val) return [val];
    return [];
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  }

  function showResults() {
    $('whoisResults').style.display = 'block';
    $('whoisEmpty').style.display = 'none';
  }

  function showEmpty() {
    $('whoisResults').style.display = 'none';
    $('whoisEmpty').style.display = 'block';
  }

  async function lookup(domain) {
    const input = $('whoisInput');
    if (!domain) {
      domain = input ? input.value.trim() : '';
    }
    if (!domain) return;

    let cleanDomain = extractDomain(domain);
    if (!cleanDomain) {
      showToast(window._i18n ? window._i18n.invalidDomain : 'Invalid domain', 'error');
      if (typeof gaTrackError === 'function') gaTrackError('dev-whois', 'invalid_domain', 'Invalid domain');
      return;
    }

    if (cleanDomain !== domain.toLowerCase().trim()) {
      showToast((window._i18n ? window._i18n.autoExtract : 'Auto extracted: ') + cleanDomain, 'info');
      if (input) input.value = cleanDomain;
    }

    if (!isValidDomain(cleanDomain)) {
      showToast(window._i18n ? window._i18n.invalidDomain : 'Invalid domain', 'error');
      if (typeof gaTrackError === 'function') gaTrackError('dev-whois', 'invalid_domain', 'Invalid domain: ' + cleanDomain);
      return;
    }

    setLoading(true);
    const startMs = performance.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const resp = await fetch('/api/whois?domain=' + encodeURIComponent(cleanDomain), {
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();

      showResults();
      renderOverview(data.parsed, cleanDomain);
      renderRegistration(data.parsed);
      renderStatus(data.parsed);
      renderNS(data.parsed);
      renderRegistry(data.parsed, cleanDomain);
      renderRaw(data.raw, data.rdap);
      saveHistory(cleanDomain);

      const durationMs = Math.round(performance.now() - startMs);
      if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('dev-whois', 1, durationMs);

      setStatus('<span class="wh-status--success">' +
        (window._i18n ? window._i18n.success : 'Lookup complete') + '</span>', 'success');
    } catch (e) {
      const msg = e.name === 'AbortError'
        ? (window._i18n ? window._i18n.serviceUnavailable : 'Service unavailable')
        : (window._i18n ? window._i18n.lookupFailed : 'Lookup failed');
      showToast(msg, 'error');
      setStatus('<span class="wh-status--error">' + msg + '</span>', 'error');
      if (typeof gaTrackError === 'function') gaTrackError('dev-whois', e.name === 'AbortError' ? 'timeout' : 'lookup_error', msg);
      showEmpty();
    } finally {
      setLoading(false);
    }
  }

  function saveHistory(domain) {
    let hist = [];
    try { hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (_) {}
    hist = [domain, ...hist.filter(d => d !== domain)].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
    renderHistory(hist);
  }

  function renderHistory(hist) {
    // History can be rendered as example chips if needed
  }

  function switchTab(tab) {
    document.querySelectorAll('.wh-tab').forEach(btn => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle('wh-tab--active', active);
    });
    ['structured', 'raw', 'rdap'].forEach(t => {
      const el = $('raw-' + t);
      if (el) el.style.display = t === tab ? 'block' : 'none';
    });
  }

  function initI18n() {
    // Collect i18n strings from data attributes or inline
    window._i18n = window._i18n || {};
  }

  function init() {
    initI18n();

    const input = $('whoisInput');
    const btn = $('whoisBtn');
    const clearBtn = $('whoisClearBtn');
    const emptyExampleBtn = $('emptyExampleBtn');

    if (input) {
      input.addEventListener('keydown', e => { if (e.key === 'Enter') lookup(); });
    }
    if (btn) btn.addEventListener('click', () => lookup());
    if (clearBtn) clearBtn.addEventListener('click', () => {
      input.value = '';
      showEmpty();
      setStatus('');
    });
    if (emptyExampleBtn) emptyExampleBtn.addEventListener('click', () => {
      input.value = 'example.com';
      lookup('example.com');
    });

    // Example chips
    document.querySelectorAll('.wh-example-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const domain = chip.dataset.domain;
        if (input) input.value = domain;
        lookup(domain);
      });
    });

    // Raw tabs
    document.querySelectorAll('.wh-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Copy all NS
    $('nsCopyAll')?.addEventListener('click', () => {
      const nsArr = [];
      document.querySelectorAll('.wh-ns-name').forEach(el => nsArr.push(el.textContent));
      copyText(nsArr.join('\n'));
    });

    // Raw copy
    $('rawCopyBtn')?.addEventListener('click', () => {
      const activeTab = document.querySelector('.wh-tab.wh-tab--active');
      const tab = activeTab ? activeTab.dataset.tab : 'structured';
      let text = '';
      if (tab === 'raw') text = $('raw-whois-pre').textContent;
      else if (tab === 'rdap') text = $('raw-rdap-pre').textContent;
      else text = $('raw-structured').textContent;
      copyText(text);
    });

    // Batch lookup
    $('batchBtn')?.addEventListener('click', runBatch);
    $('batchClearBtn')?.addEventListener('click', () => {
      $('batchInput').value = '';
      $('batchResults').innerHTML = '';
      $('batchProgress').textContent = '';
    });
    $('batchCopyBtn')?.addEventListener('click', () => {
      const table = $('batchResults').querySelector('table');
      if (table) copyText(tableToText(table));
    });
    $('batchCsvBtn')?.addEventListener('click', downloadBatchCSV);

    showEmpty();
  }

  // ── Batch lookup ──
  async function runBatch() {
    const ta = $('batchInput');
    const progress = $('batchProgress');
    const results = $('batchResults');
    if (!ta) return;
    const domains = ta.value.split('\n').map(s => extractDomain(s)).filter(Boolean);
    if (!domains.length) {
      showToast('Enter at least one domain', 'error');
      return;
    }
    results.innerHTML = '';
    const rows = [];
    for (let i = 0; i < domains.length; i++) {
      const domain = domains[i];
      progress.textContent = (window._i18n ? window._i18n.progress : 'Progress: ') + (i + 1) + '/' + domains.length;
      try {
        const resp = await fetch('/api/whois?domain=' + encodeURIComponent(domain), { signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();
        const p = data.parsed || {};
        const days = daysUntil(p.expirationDate);
        const nsArr = normalizeArray(p.nameServers);
        rows.push({
          domain, status: 'success', registrar: p.registrar || '',
          created: formatDate(p.creationDate) || '',
          expires: formatDate(p.expirationDate) || '',
          days: days !== null ? days : '',
          nsCount: nsArr.length,
        });
      } catch (e) {
        rows.push({ domain, status: 'failed', registrar: '', created: '', expires: '', days: '', nsCount: 0 });
      }
    }
    progress.textContent = '';
    renderBatchTable(rows);
  }

  function renderBatchTable(rows) {
    const container = $('batchResults');
    if (!rows.length) { container.innerHTML = ''; return; }
    const i18n = window._i18n || {};
    const h = (key, fallback) => i18n[key] || fallback;
    let html = '<table class="wh-batch-table"><thead><tr>' +
      '<th>' + h('col_domain', 'Domain') + '</th>' +
      '<th>' + h('col_status', 'Status') + '</th>' +
      '<th>' + h('col_registrar', 'Registrar') + '</th>' +
      '<th>' + h('col_created', 'Created') + '</th>' +
      '<th>' + h('col_expires', 'Expires') + '</th>' +
      '<th>' + h('col_days', 'Days') + '</th>' +
      '<th>' + h('col_ns_count', 'NS') + '</th>' +
      '<th>' + h('col_action', 'Action') + '</th>' +
      '</tr></thead><tbody>';
    rows.forEach((row, idx) => {
      const statusLabel = row.status === 'success'
        ? h('batch_success', 'Success')
        : h('batch_failed', 'Failed');
      const statusClass = row.status === 'success' ? 'wh-status--success' : 'wh-status--error';
      html += '<tr class="' + (row.status === 'failed' ? 'wh-batch-row--error' : '') + '">' +
        '<td><code>' + escapeHtml(row.domain) + '</code></td>' +
        '<td><span class="' + statusClass + '">' + statusLabel + '</span></td>' +
        '<td>' + escapeHtml(row.registrar) + '</td>' +
        '<td>' + escapeHtml(row.created) + '</td>' +
        '<td>' + escapeHtml(row.expires) + '</td>' +
        '<td>' + escapeHtml(String(row.days)) + '</td>' +
        '<td>' + escapeHtml(String(row.nsCount)) + '</td>' +
        '<td><button class="wh-copy-btn" onclick="DevWhois.copyText(\'' + escapeHtml(row.domain) + '\')">Copy</button></td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  function tableToText(table) {
    const rows = [];
    table.querySelectorAll('tr').forEach(tr => {
      const cells = [];
      tr.querySelectorAll('td, th').forEach(td => cells.push(td.textContent.trim()));
      rows.push(cells.join('\t'));
    });
    return rows.join('\n');
  }

  function downloadBatchCSV() {
    const table = $('batchResults').querySelector('table');
    if (!table) return;
    const text = tableToText(table).replace(/\t/g, ',');
    const blob = new Blob([text], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whois-batch-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return { lookup, copyText, switchTab, init };
})();

document.addEventListener('DOMContentLoaded', () => DevWhois.init());
