// dev-ip.js — IP Lookup Engine (Leaflet + ip-api.com + ipify)

const DevIP = (() => {
  let map = null;
  let marker = null;
  let lastRawData = null;

  /* ── Helpers ─────────────────────────────────────────────── */
  function $(id) { return document.getElementById(id); }

  function showToast(msg) {
    const el = $('ipToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 2000);
  }

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text || '—';
  }

  function setHTML(id, html) {
    const el = $(id);
    if (el) el.innerHTML = html || '—';
  }

  function toggleClass(id, cls, show) {
    const el = $(id);
    if (el) el.classList.toggle(cls, show);
  }

  function setStatus(msg) {
    const el = $('lookupStatus');
    if (el) {
      if (msg) {
        el.innerHTML = '<span class="ip-spinner"></span> ' + msg;
      } else {
        el.textContent = '';
      }
    }
  }

  async function copyText(text) {
    if (!text || text === '—') return;
    try {
      await navigator.clipboard.writeText(text);
      showToast(window._t?.('tools.ip.toast.copied') || '已复制到剪贴板');
    } catch (e) {
      showToast(window._t?.('tools.ip.toast.copy_fail') || '复制失败');
    }
  }

  /* ── Detect input type ───────────────────────────────────── */
  function detectInputType(input) {
    const s = input.trim();
    if (!s) return 'empty';
    // IPv4
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(s)) return 'ipv4';
    // IPv6
    if (/^([0-9a-fA-F:]+)$/.test(s) && s.includes(':')) return 'ipv6';
    // Domain
    if (/^[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+$/.test(s)) return 'domain';
    return 'unknown';
  }

  /* ── Load my IP ──────────────────────────────────────────── */
  async function loadMyIP() {
    try {
      // Use backend API to avoid CORS issues with ipify
      const r = await fetch('/api/my-ip');
      const { ip } = await r.json();
      setText('myIPv4', ip);

      // Pre-fill input
      const inp = $('ipInput');
      if (inp && !inp.value.trim()) inp.value = ip;

      // Lookup my IP details
      await lookupIP(ip, true);
    } catch (e) {
      setText('myIPv4', '—');
      showToast(window._t?.('tools.ip.toast.detect_fail') || '无法获取 IP');
      if (typeof gaTrackError === 'function') gaTrackError('dev-ip', 'detect_fail', e.message);
    }
  }

  /* ── Lookup IP / Domain ──────────────────────────────────── */
  async function lookupIP(ip, isMyIP) {
    if (!ip) {
      ip = ($('ipInput') || {}).value || '';
    }
    ip = ip.trim();
    if (!ip) { await loadMyIP(); return; }

    const type = detectInputType(ip);
    if (type === 'unknown') {
      toggleClass('lookupError', 'visible', true);
      if (typeof gaTrackError === 'function') gaTrackError('dev-ip', 'invalid_input', 'Unknown input type');
      return;
    }
    toggleClass('lookupError', 'visible', false);

    setStatus(window._t?.('tools.ip.status.looking_up') || '查询中…');
    const startMs = performance.now();

    let data = null;

    try {
      const resp = await fetch('/api/ip-lookup?q=' + encodeURIComponent(ip));
      data = await resp.json();
      if (data.status === 'fail') throw new Error(data.message);
    } catch (e) {
      setStatus('');
      toggleClass('lookupError', 'visible', true);
      showToast(window._t?.('tools.ip.toast.api_error') || '查询服务暂时不可用');
      if (typeof gaTrackError === 'function') gaTrackError('dev-ip', 'api_error', e.message);
      return;
    }

    lastRawData = data;
    setStatus('');
    renderResult(data, type, isMyIP);
    const durationMs = Math.round(performance.now() - startMs);
    if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('dev-ip', 1, durationMs);
  }

  /* ── Render result ───────────────────────────────────────── */
  function renderResult(d, inputType, isMyIP) {
    const now = new Date().toLocaleString();

    // Show result section
    toggleClass('resultSection', 'ip-hidden', false);

    // Basic Info
    setText('resIP', d.query);
    setText('resType', d.query.includes(':') ? 'IPv6' : 'IPv4');
    setText('resQueryObj', inputType === 'domain' ? window._t?.('tools.ip.type.domain') || '域名' : 'IP');
    setText('resHostname', d.reverse || '—');
    setText('resQueryTime', now);

    // Geolocation
    const countryStr = d.country + (d.countryCode ? ' (' + d.countryCode + ')' : '');
    setText('resCountry', countryStr);
    setText('resRegion', d.regionName || '—');
    setText('resCity', d.city || '—');
    setText('resTimezone', d.timezone || '—');
    setText('resLatLng', (d.lat && d.lon) ? d.lat + ', ' + d.lon : '—');

    // Map
    if (d.lat && d.lon) {
      toggleClass('resMapWrap', 'ip-hidden', false);
      updateMap(d.lat, d.lon, d.city, d.country);
    } else {
      toggleClass('resMapWrap', 'ip-hidden', true);
    }

    // Network Info
    setText('resISP', d.isp || '—');
    setText('resOrg', d.org || '—');
    setText('resASN', d.as || '—');
    setText('resNetType', d.mobile ? (window._t?.('tools.ip.net.mobile') || '移动网络') : (window._t?.('tools.ip.net.broadband') || '宽带/固定线路'));
    setText('resProxy', d.proxy ? (window._t?.('tools.ip.proxy.yes') || '检测到代理/VPN') : (window._t?.('tools.ip.proxy.no') || '未检测到'));

    // DNS Card (only for domain lookups)
    if (inputType === 'domain') {
      toggleClass('dnsCard', 'ip-hidden', false);
      setText('resDomain', ($('ipInput') || {}).value || '—');
      setText('resDnsIPv4', d.query || '—');
      setText('resDnsIPv6', '—');
      setText('resCNAME', '—');
    } else {
      toggleClass('dnsCard', 'ip-hidden', true);
    }

    // JSON
    $('jsonPre').querySelector('code').textContent = JSON.stringify(d, null, 2);

    // Update hero card if it's my IP
    if (isMyIP) {
      setText('heroCountry', d.country || '—');
      setText('heroCity', d.city || '—');
      setText('heroISP', d.isp || '—');
      setText('heroASN', d.as || '—');
      setText('heroTimezone', d.timezone || '—');
      setText('heroLocalTime', new Date().toLocaleString());
    }

    // Scroll to result
    const rs = $('resultSection');
    if (rs) rs.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ── Map ─────────────────────────────────────────────────── */
  function initMap() {
    if (map) return;
    const mapEl = $('ipMap');
    if (!mapEl || typeof L === 'undefined') return;
    map = L.map('ipMap', { zoomControl: true }).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);
  }

  function updateMap(lat, lon, city, country) {
    initMap();
    if (!map) return;
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lon])
      .addTo(map)
      .bindPopup('<b>' + (city || '') + '</b><br>' + (country || ''))
      .openPopup();
    map.flyTo([lat, lon], 10, { duration: 1.5 });
    setTimeout(() => { if (map) map.invalidateSize(); }, 400);
  }

  /* ── Environment Detection ───────────────────────────────── */
  function detectEnv() {
    const ua = navigator.userAgent;

    // Browser
    let browser = 'Unknown';
    if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
    else if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
    else if (ua.includes('Edg/')) browser = 'Edge';

    // OS
    let os = 'Unknown';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    setText('envPublicIP', $('myIPv4')?.textContent || '—');
    setText('envUA', ua);
    setText('envBrowser', browser);
    setText('envOS', os);
    setText('envLang', navigator.language || '—');
    setText('envTimezone', Intl.DateTimeFormat().resolvedOptions().timeZone || '—');
    setText('envProtocol', window.location.protocol.replace(':', ''));
    setText('envScreen', window.screen.width + '×' + window.screen.height);
    setText('envReferrer', document.referrer || '—');
  }

  /* ── Batch Lookup ────────────────────────────────────────── */
  async function doBatch() {
    const raw = ($('batchInput') || {}).value || '';
    const lines = raw.split('\n').map(s => s.trim()).filter(s => s);
    if (!lines.length) return;

    const tbody = $('batchTable').querySelector('tbody');
    tbody.innerHTML = '';
    toggleClass('batchResultWrap', 'ip-hidden', false);

    for (const line of lines) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>' + line + '</td><td colspan="4"><span class="ip-spinner"></span></td>';
      tbody.appendChild(tr);

      try {
        const resp = await fetch('/api/ip-lookup?q=' + encodeURIComponent(line));
        const d = await resp.json();
        if (d.status === 'fail') {
          tr.innerHTML = '<td>' + line + '</td><td colspan="4" class="ip-batch-error">' + (d.message || '查询失败') + '</td>';
        } else {
          tr.innerHTML = '<td>' + line + '</td>' +
            '<td>' + (d.country || '—') + '</td>' +
            '<td>' + (d.city || '—') + '</td>' +
            '<td>' + (d.isp || '—') + '</td>' +
            '<td>' + (d.as || '—') + '</td>';
        }
      } catch (e) {
        tr.innerHTML = '<td>' + line + '</td><td colspan="4" class="ip-batch-error">查询失败</td>';
      }
    }
  }

  /* ── Event wiring ────────────────────────────────────────── */
  function init() {
    // Load my IP
    loadMyIP();

    // Detect environment
    detectEnv();

    // Lookup button
    $('lookupBtn')?.addEventListener('click', () => lookupIP());

    // Enter key
    $('ipInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') lookupIP();
    });

    // Use my IP
    $('useMyIPBtn')?.addEventListener('click', () => {
      const ip = $('myIPv4')?.textContent;
      if (ip && ip !== '—') {
        $('ipInput').value = ip;
        lookupIP(ip);
      }
    });

    // Clear input
    $('clearInputBtn')?.addEventListener('click', () => {
      $('ipInput').value = '';
      toggleClass('lookupError', 'visible', false);
    });

    // Example chips
    document.querySelectorAll('.ip-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $('ipInput').value = chip.dataset.example;
        lookupIP();
      });
    });

    // Copy my IP
    $('copyMyIPBtn')?.addEventListener('click', () => {
      copyText($('myIPv4')?.textContent);
    });

    // Refresh my IP
    $('refreshMyIPBtn')?.addEventListener('click', () => {
      loadMyIP();
    });

    // JSON toggle
    $('jsonToggle')?.addEventListener('click', () => {
      const expanded = $('jsonToggle').getAttribute('aria-expanded') === 'true';
      $('jsonToggle').setAttribute('aria-expanded', !expanded);
      $('jsonBody').classList.toggle('open', !expanded);
    });

    // Copy JSON
    $('copyJsonBtn')?.addEventListener('click', () => {
      if (lastRawData) {
        copyText(JSON.stringify(lastRawData, null, 2));
      }
    });

    // Batch
    $('batchBtn')?.addEventListener('click', doBatch);
    $('batchClearBtn')?.addEventListener('click', () => {
      $('batchInput').value = '';
      toggleClass('batchResultWrap', 'ip-hidden', true);
    });
  }

  return { loadMyIP, lookupIP, init };
})();

document.addEventListener('DOMContentLoaded', () => DevIP.init());
