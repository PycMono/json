// dev-user-agent.js — User-Agent Parser & Browser Diagnostics
// 100% client-side, no network requests required.

const DevUA = (() => {

  const I18N = (typeof window !== 'undefined' && window.__i18n__) ? window.__i18n__ : {};

  function t(key, fallback) {
    return I18N[key] || fallback;
  }

  function tf(key, fallback, vars) {
    let msg = t(key, fallback);
    Object.keys(vars || {}).forEach((k) => {
      msg = msg.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
    });
    return msg;
  }

  // ─── UA Parser Core ───────────────────────────────────────────

  const BOTS = [
    'Googlebot', 'bingbot', 'Slurp', 'DuckDuckBot', 'Baiduspider',
    'YandexBot', 'Sogou', 'Exabot', 'facebot', 'facebookexternalhit',
    'ia_archiver', 'Applebot', 'SemrushBot', 'AhrefsBot', 'MJ12bot',
    'DotBot', 'rogerbot', 'CCBot', 'serpstatbot', 'linkdexbot',
    'Mediapartners-Google', 'AdsBot-Google', 'Twitterbot', 'LinkedInBot',
    'WhatsApp', 'TelegramBot', 'Discordbot', 'Slackbot', 'crawler',
    'spider', 'scraper', 'bot', 'crawl', 'fetch', 'claudebot', 'gptbot',
    'ChatGPT-User', 'anthropic-ai', 'PerplexityBot', 'cohere-ai',
    'HeadlessChrome', 'PhantomJS', 'Selenium', 'puppeteer',
  ];

  function parse(ua) {
    if (!ua || !ua.trim()) return null;
    const result = {
      raw: ua,
      browser:  detectBrowser(ua),
      os:       detectOS(ua),
      device:   detectDevice(ua),
      engine:   detectEngine(ua),
      isBot:    detectBot(ua),
      isMobile: /Mobile|Android(?!.*Tablet)|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
      isTablet: /iPad|Android(?!.*Mobile)|Tablet/i.test(ua),
      arch:     detectArch(ua),
    };
    if (result.isBot) {
      result.device.type = 'Bot / Crawler';
      result.device.icon = '🤖';
    }
    return result;
  }

  function detectBrowser(ua) {
    const rules = [
      { name: 'Microsoft Edge',     icon: '🌊', re: /Edg(?:e|A|iOS)?\/(\S+)/i },
      { name: 'Samsung Internet',   icon: '📱', re: /SamsungBrowser\/(\S+)/i },
      { name: 'UC Browser',         icon: '🌐', re: /UCBrowser\/(\S+)/i },
      { name: 'OPR / Opera',        icon: '🔴', re: /OPR\/(\S+)/i },
      { name: 'Opera Mini',         icon: '🔴', re: /Opera Mini\/(\S+)/i },
      { name: 'Opera',              icon: '🔴', re: /Opera\/(\S+)/i },
      { name: 'Firefox',            icon: '🦊', re: /Firefox\/(\S+)/i },
      { name: 'Waterfox',           icon: '🦊', re: /Waterfox\/(\S+)/i },
      { name: 'Tor Browser',        icon: '🧅', re: /Tor Browser\/(\S+)/i },
      { name: 'Chromium',           icon: '🔵', re: /Chromium\/(\S+)/i },
      { name: 'Brave',              icon: '🦁', re: /Brave\/(\S+)/i },
      { name: 'Vivaldi',            icon: '🎵', re: /Vivaldi\/(\S+)/i },
      { name: 'YaBrowser (Yandex)', icon: '🌐', re: /YaBrowser\/(\S+)/i },
      { name: 'Chrome',             icon: '🌐', re: /Chrome\/(\S+)/i },
      { name: 'Safari',             icon: '🧭', re: /Version\/(\S+).*Safari/i },
      { name: 'Mobile Safari',      icon: '🧭', re: /Mobile.*Safari\/(\S+)/i },
      { name: 'Internet Explorer',  icon: '🔷', re: /(?:MSIE |Trident\/.*rv:)(\S+)/i },
      { name: 'WeChat',             icon: '💬', re: /MicroMessenger\/(\S+)/i },
      { name: 'QQ Browser',         icon: '🐧', re: /QQBrowser\/(\S+)/i },
    ];
    for (const r of rules) {
      const m = ua.match(r.re);
      if (m) {
        return { name: r.name, version: m[1].replace(/[;)]/g, ''), icon: r.icon };
      }
    }
    return { name: 'Unknown', version: '—', icon: '❓' };
  }

  function detectOS(ua) {
    const rules = [
      { name: 'Windows 11',     icon: '🪟', re: /Windows NT 10\.0.*Win64/i },
      { name: 'Windows 10',     icon: '🪟', re: /Windows NT 10\.0/i },
      { name: 'Windows 8.1',    icon: '🪟', re: /Windows NT 6\.3/i },
      { name: 'Windows 8',      icon: '🪟', re: /Windows NT 6\.2/i },
      { name: 'Windows 7',      icon: '🪟', re: /Windows NT 6\.1/i },
      { name: 'Windows Vista',  icon: '🪟', re: /Windows NT 6\.0/i },
      { name: 'Windows XP',     icon: '🪟', re: /Windows NT 5\.1/i },
      { name: 'iOS',            icon: '📱', re: /(?:iPhone|iPad|iPod).*CPU (?:iPhone )?OS ([0-9_]+)/i, verFmt: v => v.replace(/_/g, '.') },
      { name: 'macOS',          icon: '🍎', re: /Mac OS X ([0-9_.]+)/i, verFmt: v => v.replace(/_/g, '.') },
      { name: 'Android',        icon: '🤖', re: /Android ([0-9.]+)/i },
      { name: 'ChromeOS',       icon: '🔵', re: /CrOS\s+\S+\s+([0-9.]+)/i },
      { name: 'Ubuntu',         icon: '🐧', re: /Ubuntu/i },
      { name: 'Fedora',         icon: '🐧', re: /Fedora/i },
      { name: 'Linux',          icon: '🐧', re: /Linux/i },
    ];
    for (const r of rules) {
      const m = ua.match(r.re);
      if (m) {
        const ver = m[1] ? (r.verFmt ? r.verFmt(m[1]) : m[1]) : '';
        return { name: r.name, version: ver, icon: r.icon };
      }
    }
    return { name: 'Unknown', version: '', icon: '❓' };
  }

  function detectDevice(ua) {
    if (/iPhone/i.test(ua))  return { type: 'iPhone',  icon: '📱', brand: 'Apple' };
    if (/iPad/i.test(ua))    return { type: 'iPad',    icon: '📟', brand: 'Apple' };
    if (/iPod/i.test(ua))    return { type: 'iPod',    icon: '🎵', brand: 'Apple' };
    const androidPhone = /Android.*Mobile/i.test(ua);
    const androidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);
    if (androidTablet) {
      const brand = extractAndroidBrand(ua);
      return { type: 'Tablet', icon: '📟', brand };
    }
    if (androidPhone) {
      const brand = extractAndroidBrand(ua);
      return { type: 'Smartphone', icon: '📱', brand };
    }
    if (/BlackBerry|BB10/i.test(ua)) return { type: 'BlackBerry', icon: '📱', brand: 'BlackBerry' };
    if (/IEMobile|Windows Phone/i.test(ua)) return { type: 'Smartphone', icon: '📱', brand: 'Microsoft' };
    if (/Macintosh/i.test(ua)) return { type: 'Desktop / Mac', icon: '🖥️', brand: 'Apple' };
    if (/Windows/i.test(ua))  return { type: 'Desktop / PC',  icon: '🖥️', brand: '' };
    if (/Linux/i.test(ua))    return { type: 'Desktop / Linux', icon: '🖥️', brand: '' };
    if (/CrOS/i.test(ua))     return { type: 'Chromebook', icon: '💻', brand: 'Google' };
    return { type: 'Desktop', icon: '🖥️', brand: '' };
  }

  function extractAndroidBrand(ua) {
    const known = [
      'Samsung', 'Huawei', 'Xiaomi', 'OPPO', 'OnePlus', 'Vivo',
      'Realme', 'Motorola', 'Nokia', 'LG', 'Sony', 'HTC',
      'Google', 'Pixel',
    ];
    for (const b of known) {
      if (ua.includes(b)) return b;
    }
    const m = ua.match(/;\s+([A-Z][^;)]+)\sBuild\//i);
    if (m) return m[1].trim().split(' ')[0];
    return '';
  }

  function detectEngine(ua) {
    if (/Edg(?:e|A|iOS)?\//.test(ua)) return { name: 'Blink (Chromium)', version: extractVersion(ua, /Chrome\/([0-9.]+)/), icon: '⚙️' };
    if (/Gecko\/\d+/.test(ua) && /Firefox\//.test(ua)) {
      const ver = extractVersion(ua, /rv:([0-9.]+)/);
      return { name: 'Gecko', version: ver, icon: '🦊' };
    }
    if (/Trident\/([0-9.]+)/.test(ua)) return { name: 'Trident', version: extractVersion(ua, /Trident\/([0-9.]+)/), icon: '🔷' };
    if (/AppleWebKit\/([0-9.]+)/.test(ua)) {
      const chromium = /Chrome\//.test(ua);
      const ver = extractVersion(ua, /AppleWebKit\/([0-9.]+)/);
      return { name: chromium ? 'Blink (Chromium)' : 'WebKit', version: ver, icon: '⚙️' };
    }
    if (/Presto\/([0-9.]+)/.test(ua)) return { name: 'Presto', version: extractVersion(ua, /Presto\/([0-9.]+)/), icon: '🎵' };
    return { name: 'Unknown', version: '—', icon: '❓' };
  }

  function detectBot(ua) {
    const lower = ua.toLowerCase();
    for (const b of BOTS) {
      if (lower.includes(b.toLowerCase())) return true;
    }
    return false;
  }

  function detectArch(ua) {
    if (/Win64|x64|x86_64|aarch64|arm64/i.test(ua)) return '64-bit';
    if (/Win32|i686|i386|x86/i.test(ua)) return '32-bit';
    if (/ARM/i.test(ua)) return 'ARM';
    return '—';
  }

  function extractVersion(ua, re) {
    const m = ua.match(re);
    return m ? m[1] : '—';
  }

  // ─── Common Test UAs ──────────────────────────────────────────

  const SAMPLES = [
    {
      label: 'Chrome / Windows 10',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
    {
      label: 'Firefox / macOS',
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) Gecko/20100101 Firefox/125.0',
    },
    {
      label: 'Safari / iPhone (iOS 17)',
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    },
    {
      label: 'Edge / Windows 11',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
    },
    {
      label: 'Chrome / Android (Pixel)',
      ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    },
    {
      label: 'Googlebot',
      ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    },
    {
      label: 'Safari / iPad',
      ua: 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    },
  ];

  // ─── UI Rendering ─────────────────────────────────────────────

  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function renderResult(parsed) {
    const cards = [
      { icon: parsed.browser.icon, label: t('ua.js.summary.browser', 'Browser'), value: parsed.browser.name, sub: 'v' + parsed.browser.version },
      { icon: parsed.os.icon, label: t('ua.js.summary.os', 'OS'), value: parsed.os.name, sub: parsed.os.version || '—' },
      { icon: parsed.device.icon, label: t('ua.js.summary.device', 'Device'), value: parsed.device.type, sub: parsed.device.brand || '—' },
      { icon: parsed.engine.icon, label: t('ua.js.summary.engine', 'Engine'), value: parsed.engine.name, sub: 'v' + parsed.engine.version },
    ];

    const summaryEl = document.getElementById('uaSummaryCards');
    if (summaryEl) {
      summaryEl.innerHTML = cards.map(c => `
        <div class="ua-card">
          <div class="ua-card__icon">${c.icon}</div>
          <div class="ua-card__body">
            <div class="ua-card__label">${escapeHTML(c.label)}</div>
            <div class="ua-card__value">${escapeHTML(c.value)}</div>
            <div class="ua-card__sub">${escapeHTML(c.sub)}</div>
          </div>
        </div>
      `).join('');
    }

    const rows = [
      [t('ua.js.table.browser_name', 'Browser Name'), parsed.browser.name],
      [t('ua.js.table.browser_version', 'Browser Version'), parsed.browser.version],
      [t('ua.js.table.rendering_engine', 'Rendering Engine'), parsed.engine.name + ' ' + parsed.engine.version],
      [t('ua.js.table.operating_system', 'Operating System'), parsed.os.name + (parsed.os.version ? ' ' + parsed.os.version : '')],
      [t('ua.js.table.device_type', 'Device Type'), parsed.device.type + (parsed.device.brand ? ' (' + parsed.device.brand + ')' : '')],
      [t('ua.js.table.architecture', 'Architecture'), parsed.arch],
      [t('ua.js.table.is_mobile', 'Is Mobile'), parsed.isMobile && !parsed.isTablet ? t('ua.js.yes', 'Yes') : t('ua.js.no', 'No')],
      [t('ua.js.table.is_tablet', 'Is Tablet'), parsed.isTablet ? t('ua.js.yes', 'Yes') : t('ua.js.no', 'No')],
      [t('ua.js.table.is_bot', 'Is Bot / Crawler'), parsed.isBot ? t('ua.js.bot_automated', 'Yes — automated') : t('ua.js.human_browser', 'No — human browser')],
    ];

    const tableEl = document.getElementById('uaDetailTable');
    if (tableEl) {
      tableEl.innerHTML = rows.map(r => `
        <tr>
          <td class="ua-table__key">${escapeHTML(r[0])}</td>
          <td class="ua-table__val">${escapeHTML(r[1])}</td>
        </tr>
      `).join('');
    }

    const panelEl = document.getElementById('uaResultPanel');
    if (panelEl) panelEl.hidden = false;

    const emptyEl = document.getElementById('uaEmpty');
    if (emptyEl) emptyEl.hidden = true;

    const botBadgeEl = document.getElementById('uaBotBadge');
    if (botBadgeEl) {
      botBadgeEl.hidden = !parsed.isBot;
    }

    updateJSON(parsed);
  }

  // ─── Current UA card ─────────────────────────────────────────

  function updateCurrentUAString() {
    const el = document.getElementById('uaCurrentString');
    if (el) el.textContent = navigator.userAgent || '';
  }

  function copyCurrent() {
    const ua = navigator.userAgent;
    if (!ua) { showToast(t('ua.js.toast.nothing_copy', 'Nothing to copy.'), 'warn'); return; }
    copyText(ua);
    showToast(t('ua.js.toast.copied', 'Copied!'));
  }

  function useCurrent() {
    const ua = navigator.userAgent;
    const inp = document.getElementById('uaInput');
    if (!inp || !ua) return;
    inp.value = ua;
    updateCharCount();
    const parsed = parse(ua);
    if (parsed) renderResult(parsed);
    inp.focus();
    showToast(t('ua.js.toast.detected', 'Captured your current browser UA.'));
  }

  // ─── JSON output ─────────────────────────────────────────────

  let jsonVisible = false;
  let lastParsed = null;

  function updateJSON(parsed) {
    lastParsed = parsed;
    const codeEl = document.getElementById('uaJsonCode');
    if (!codeEl) return;
    const compact = {
      browser:  { name: parsed.browser.name, version: parsed.browser.version },
      engine:   { name: parsed.engine.name, version: parsed.engine.version },
      os:       { name: parsed.os.name, version: parsed.os.version || '' },
      device:   { type: parsed.device.type, brand: parsed.device.brand || '' },
      arch:     parsed.arch,
      isMobile: parsed.isMobile && !parsed.isTablet,
      isTablet: parsed.isTablet,
      isBot:    parsed.isBot,
      raw:      parsed.raw,
    };
    codeEl.textContent = JSON.stringify(compact, null, 2);
  }

  function toggleJSON() {
    const block = document.getElementById('uaJsonBlock');
    const txt = document.getElementById('uaJsonToggleText');
    if (!block) return;
    jsonVisible = !jsonVisible;
    block.hidden = !jsonVisible;
    if (txt) txt.textContent = jsonVisible
      ? t('ua.json.btn.hide', 'Hide JSON')
      : t('ua.json.btn.show', 'Show JSON');
  }

  function copyJSON() {
    const codeEl = document.getElementById('uaJsonCode');
    if (!codeEl || !codeEl.textContent.trim()) {
      showToast(t('ua.js.toast.parse_first', 'Parse a UA first.'), 'warn');
      return;
    }
    copyText(codeEl.textContent);
    showToast(t('ua.js.toast.json_copied', 'JSON copied.'));
  }

  // ─── Browser env diagnostics ─────────────────────────────────

  function fmt(v, fallback) {
    if (v == null || v === '' || (typeof v === 'number' && Number.isNaN(v))) {
      return { value: fallback || t('ua.env.value.unknown', 'Not exposed'), muted: true };
    }
    return { value: String(v), muted: false };
  }

  function envRows() {
    const nav = navigator || {};
    const scr = screen || {};
    const langs = (nav.languages && nav.languages.length) ? nav.languages.join(', ') : nav.language;
    let tz = '';
    let tzOffset = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
    try {
      const offset = -new Date().getTimezoneOffset();
      const h = Math.floor(Math.abs(offset) / 60);
      const m = Math.abs(offset) % 60;
      const sign = offset >= 0 ? '+' : '-';
      tzOffset = 'UTC' + sign + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    } catch (e) {}
    const dpr = window.devicePixelRatio ? window.devicePixelRatio.toFixed(2) : '';
    const screenRes = (scr.width && scr.height) ? scr.width + ' × ' + scr.height : '';
    const viewport = (window.innerWidth && window.innerHeight) ? window.innerWidth + ' × ' + window.innerHeight : '';
    const memory = nav.deviceMemory ? nav.deviceMemory + ' GB' : '';
    const cores = nav.hardwareConcurrency || '';
    const online = nav.onLine === undefined
      ? null
      : (nav.onLine ? t('ua.env.value.online', 'Online') : t('ua.env.value.offline', 'Offline'));
    const cookies = nav.cookieEnabled === undefined
      ? null
      : (nav.cookieEnabled ? t('ua.env.value.yes', 'Yes') : t('ua.env.value.no', 'No'));
    const dnt = (nav.doNotTrack === '1' || nav.doNotTrack === 'yes' || window.doNotTrack === '1')
      ? t('ua.env.value.yes', 'Yes')
      : (nav.doNotTrack === '0' || nav.doNotTrack === 'no')
        ? t('ua.env.value.no', 'No')
        : null;
    const touch = (typeof nav.maxTouchPoints === 'number')
      ? (nav.maxTouchPoints > 0 ? t('ua.env.value.yes', 'Yes') + ' (' + nav.maxTouchPoints + ')' : t('ua.env.value.no', 'No'))
      : null;
    const colorDepth = scr.colorDepth ? scr.colorDepth + '-bit' : '';

    return [
      [t('ua.env.label.lang', 'Language'), fmt(nav.language)],
      [t('ua.env.label.languages', 'Accepted languages'), fmt(langs)],
      [t('ua.env.label.platform', 'Platform'), fmt(nav.platform)],
      [t('ua.env.label.cores', 'CPU cores'), fmt(cores)],
      [t('ua.env.label.memory', 'Device memory'), fmt(memory)],
      [t('ua.env.label.screen', 'Screen resolution'), fmt(screenRes)],
      [t('ua.env.label.viewport', 'Viewport size'), fmt(viewport)],
      [t('ua.env.label.dpr', 'Pixel ratio (DPR)'), fmt(dpr)],
      [t('ua.env.label.color_depth', 'Color depth'), fmt(colorDepth)],
      [t('ua.env.label.timezone', 'Timezone'), fmt(tz)],
      [t('ua.env.label.tz_offset', 'UTC offset'), fmt(tzOffset)],
      [t('ua.env.label.online', 'Network status'), online ? { value: online, muted: false } : fmt(null)],
      [t('ua.env.label.cookies', 'Cookies enabled'), cookies ? { value: cookies, muted: false } : fmt(null)],
      [t('ua.env.label.dnt', 'Do Not Track'), dnt ? { value: dnt, muted: false } : fmt(null)],
      [t('ua.env.label.touch', 'Touch support'), touch ? { value: touch, muted: false } : fmt(null)],
    ];
  }

  function populateEnv() {
    const grid = document.getElementById('uaEnvGrid');
    if (!grid) return;
    const rows = envRows();
    grid.innerHTML = rows.map(([label, v]) => `
      <div class="ua-env__row">
        <span class="ua-env__row-label">${escapeHTML(label)}</span>
        <span class="ua-env__row-value${v.muted ? ' ua-env__row-value--muted' : ''}">${escapeHTML(v.value)}</span>
      </div>
    `).join('');
  }

  // ─── Client Hints ────────────────────────────────────────────

  let lastHints = null;

  async function loadHints() {
    const unsupported = document.getElementById('uaHintsUnsupported');
    const grid = document.getElementById('uaHintsGrid');
    const copyBtn = document.getElementById('uaHintsCopyBtn');

    if (!('userAgentData' in navigator) || !navigator.userAgentData) {
      if (unsupported) unsupported.hidden = false;
      if (grid) grid.hidden = true;
      if (copyBtn) copyBtn.hidden = true;
      return;
    }

    const data = navigator.userAgentData;
    let high = {};
    try {
      high = await data.getHighEntropyValues([
        'platformVersion', 'architecture', 'bitness', 'model', 'fullVersionList', 'wow64',
      ]) || {};
    } catch (e) { high = {}; }

    const merged = {
      brands: data.brands || [],
      mobile: !!data.mobile,
      platform: data.platform || '',
      platformVersion: high.platformVersion || '',
      architecture: high.architecture || '',
      bitness: high.bitness || '',
      model: high.model || '',
      fullVersionList: high.fullVersionList || [],
      wow64: high.wow64 === true ? true : (high.wow64 === false ? false : null),
    };
    lastHints = merged;

    if (unsupported) unsupported.hidden = true;
    if (copyBtn) copyBtn.hidden = false;
    if (!grid) return;
    grid.hidden = false;

    const brandsStr = merged.brands.length
      ? merged.brands.map(b => b.brand + ' ' + b.version).join(' · ')
      : '';
    const fullVerStr = merged.fullVersionList.length
      ? merged.fullVersionList.map(b => b.brand + ' ' + b.version).join(' · ')
      : '';
    const cells = [
      [t('ua.hints.label.brands', 'Brands'), brandsStr],
      [t('ua.hints.label.mobile', 'Mobile'), merged.mobile ? t('ua.env.value.yes', 'Yes') : t('ua.env.value.no', 'No')],
      [t('ua.hints.label.platform', 'Platform'), merged.platform],
      [t('ua.hints.label.platform_version', 'Platform version'), merged.platformVersion],
      [t('ua.hints.label.architecture', 'Architecture'), merged.architecture],
      [t('ua.hints.label.bitness', 'Bitness'), merged.bitness ? merged.bitness + '-bit' : ''],
      [t('ua.hints.label.model', 'Device model'), merged.model],
      [t('ua.hints.label.full_version_list', 'Full version list'), fullVerStr],
      [t('ua.hints.label.wow64', 'WoW64'), merged.wow64 == null ? '' : (merged.wow64 ? t('ua.env.value.yes', 'Yes') : t('ua.env.value.no', 'No'))],
    ];

    grid.innerHTML = cells.map(([label, val]) => {
      const muted = !val;
      const display = val || t('ua.env.value.unknown', 'Not exposed');
      return `
        <div class="ua-hints__cell">
          <span class="ua-hints__cell-label">${escapeHTML(label)}</span>
          <span class="ua-hints__cell-value${muted ? ' ua-env__row-value--muted' : ''}">${escapeHTML(display)}</span>
        </div>
      `;
    }).join('');
  }

  function copyHints() {
    if (!lastHints) {
      showToast(t('ua.js.toast.hints_unsupported', 'navigator.userAgentData is not available in this browser.'), 'warn');
      return;
    }
    copyText(JSON.stringify(lastHints, null, 2));
    showToast(t('ua.js.toast.hints_copied', 'Client Hints copied.'));
  }

  // ─── Batch parse ─────────────────────────────────────────────

  let lastBatch = [];

  function parseBatch() {
    const input = document.getElementById('uaBatchInput');
    if (!input) return;
    const lines = input.value.split('\n').map(s => s.trim()).filter(Boolean);
    if (!lines.length) {
      showToast(t('ua.js.toast.batch_empty', 'Add at least one User-Agent.'), 'warn');
      return;
    }
    const startMs = performance.now();
    const list = lines.map(ua => {
      const p = parse(ua);
      if (!p) return null;
      return {
        ua: p.raw,
        browser: p.browser.name + (p.browser.version ? ' ' + p.browser.version : ''),
        os: p.os.name + (p.os.version ? ' ' + p.os.version : ''),
        device: p.device.type,
        engine: p.engine.name,
        isBot: p.isBot,
      };
    }).filter(Boolean);
    lastBatch = list;
    renderBatch(list);
    const durationMs = Math.round(performance.now() - startMs);
    if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('dev-user-agent', list.length, durationMs);
    showToast(tf('ua.js.toast.batch_parsed', 'Parsed {n} UA string(s).', { n: list.length }));
  }

  function renderBatch(list) {
    const root = document.getElementById('uaBatchResults');
    if (!root) return;
    if (!list.length) {
      root.innerHTML = `<p class="ua-batch__empty">${escapeHTML(t('ua.batch.empty_hint', 'Add UA strings above and click Parse all to compare them side by side.'))}</p>`;
      return;
    }
    const colUA = t('ua.batch.col.ua', 'User-Agent');
    const colBrowser = t('ua.batch.col.browser', 'Browser');
    const colOS = t('ua.batch.col.os', 'OS');
    const colDevice = t('ua.batch.col.device', 'Device');
    const colBot = t('ua.batch.col.bot', 'Bot');
    const colEngine = t('ua.batch.col.engine', 'Engine');
    root.innerHTML = `
      <div style="overflow-x:auto">
      <table class="ua-batch__table">
        <thead>
          <tr>
            <th>${escapeHTML(colUA)}</th>
            <th>${escapeHTML(colBrowser)}</th>
            <th>${escapeHTML(colOS)}</th>
            <th>${escapeHTML(colDevice)}</th>
            <th>${escapeHTML(colEngine)}</th>
            <th>${escapeHTML(colBot)}</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(r => `
            <tr>
              <td><div class="ua-batch__ua-cell" title="${escapeHTML(r.ua)}">${escapeHTML(r.ua)}</div></td>
              <td>${escapeHTML(r.browser)}</td>
              <td>${escapeHTML(r.os)}</td>
              <td>${escapeHTML(r.device)}</td>
              <td>${escapeHTML(r.engine)}</td>
              <td><span class="ua-batch__bot${r.isBot ? '' : ' ua-batch__bot--no'}">${r.isBot ? t('ua.js.yes', 'Yes') : t('ua.js.no', 'No')}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      </div>
    `;
  }

  function clearBatch() {
    const input = document.getElementById('uaBatchInput');
    if (input) input.value = '';
    lastBatch = [];
    renderBatch([]);
  }

  function exportBatch() {
    if (!lastBatch.length) {
      showToast(t('ua.js.toast.batch_empty', 'Add at least one User-Agent.'), 'warn');
      return;
    }
    const blob = new Blob([JSON.stringify(lastBatch, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-agents-' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(t('ua.js.toast.batch_exported', 'Exported as JSON.'));
  }

  // ─── Public API ───────────────────────────────────────────────

  function detectMyUA() {
    const ua = navigator.userAgent;
    document.getElementById('uaInput').value = ua;
    updateCharCount();
    const parsed = parse(ua);
    if (parsed) renderResult(parsed);
    showToast(t('ua.js.toast.detected', 'Captured your current browser UA.'));
  }

  function parseInput() {
    const val = document.getElementById('uaInput').value.trim();
    if (!val) {
      showToast(t('ua.js.toast.enter_first', 'Please enter a User-Agent string first.'), 'warn');
      return;
    }
    const startMs = performance.now();
    const parsed = parse(val);
    if (parsed) {
      renderResult(parsed);
      addToHistory(val, parsed);
      const durationMs = Math.round(performance.now() - startMs);
      if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('dev-user-agent', 1, durationMs);
    } else {
      showToast(t('ua.js.toast.parse_failed', 'Could not parse this UA string.'), 'warn');
      if (typeof gaTrackError === 'function') gaTrackError('dev-user-agent', 'parse_failed', 'Could not parse UA string');
    }
  }

  function clearAll() {
    document.getElementById('uaInput').value = '';
    updateCharCount();
    const panelEl = document.getElementById('uaResultPanel');
    if (panelEl) panelEl.hidden = true;
    const emptyEl = document.getElementById('uaEmpty');
    if (emptyEl) emptyEl.hidden = false;
  }

  function copyUA() {
    const val = document.getElementById('uaInput').value.trim();
    if (!val) { showToast(t('ua.js.toast.nothing_copy', 'Nothing to copy.'), 'warn'); return; }
    copyText(val);
    showToast(t('ua.js.toast.copied', 'Copied!'));
  }

  function copyResult() {
    const rows = document.querySelectorAll('#uaDetailTable tr');
    if (!rows.length) { showToast(t('ua.js.toast.parse_first', 'Parse a UA first.'), 'warn'); return; }
    const lines = Array.from(rows).map(r => {
      const cells = r.querySelectorAll('td');
      return cells[0].textContent.trim() + ': ' + cells[1].textContent.trim();
    });
    copyText(lines.join('\n'));
    showToast(t('ua.js.toast.result_copied', 'Result copied.'));
  }

  function loadSample(idx) {
    const sample = SAMPLES[idx];
    if (!sample) return;
    document.getElementById('uaInput').value = sample.ua;
    updateCharCount();
    const parsed = parse(sample.ua);
    if (parsed) renderResult(parsed);
  }

  function populateSamples() {
    const el = document.getElementById('uaSampleList');
    if (!el) return;
    el.innerHTML = SAMPLES.map((s, i) => `
      <button class="ua-sample-btn" onclick="DevUA.loadSample(${i})" type="button">
        ${escapeHTML(s.label)}
      </button>
    `).join('');
  }

  function updateCharCount() {
    const ta = document.getElementById('uaInput');
    const cc = document.getElementById('uaCharCount');
    if (cc) cc.textContent = tf('ua.js.char_count', '{n} chars', { n: ta.value.length });
  }

  function copyText(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
    } else {
      legacyCopy(text);
    }
  }

  function legacyCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  function showToast(msg, type) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'warn' ? ' toast--warn' : ' toast--success');
    el.textContent = msg;
    container.appendChild(el);
    requestAnimationFrame(() => { requestAnimationFrame(() => { el.classList.add('toast--show'); }); });
    setTimeout(() => {
      el.classList.remove('toast--show');
      setTimeout(() => el.remove(), 400);
    }, 2600);
  }

  // ─── History (localStorage) ────────────────────────────────────

  const HISTORY_KEY = 'ua_parse_history';
  const MAX_HISTORY = 50;
  let historyOpen = false;

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch { return []; }
  }

  function saveHistory(list) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
  }

  function addToHistory(ua, parsed) {
    if (!ua || !parsed) return;
    const list = getHistory();
    const idx = list.findIndex(h => h.ua === ua);
    if (idx !== -1) list.splice(idx, 1);
    list.unshift({
      ua,
      browser: parsed.browser.name,
      os: parsed.os.name,
      device: parsed.device ? parsed.device.type : '',
      time: new Date().toISOString()
    });
    saveHistory(list);
    renderHistory();
  }

  function renderHistory() {
    const list = getHistory();
    const countEl = document.getElementById('uaHistoryCount');
    const listEl = document.getElementById('uaHistoryList');
    const emptyEl = document.getElementById('uaHistoryEmpty');
    if (countEl) countEl.textContent = list.length;
    if (!listEl) return;
    if (list.length === 0) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    listEl.innerHTML = list.map((h, i) => {
      const ago = timeAgo(h.time);
      const short = h.ua.length > 120 ? h.ua.substring(0, 120) + '…' : h.ua;
      return `<div class="ua-history-item" onclick="DevUA.loadHistory(${i})" title="${escapeHTML(h.ua)}">
        <div class="ua-history-item__info">
          <div class="ua-history-item__ua">${escapeHTML(short)}</div>
          <div class="ua-history-item__meta">
            <span class="ua-history-item__browser">${escapeHTML(h.browser || '')}</span>
            <span>${escapeHTML(h.os || '')}</span>
            <span class="ua-history-item__time">${escapeHTML(ago)}</span>
          </div>
        </div>
        <button class="ua-history-item__delete" onclick="event.stopPropagation();DevUA.deleteHistory(${i})" title="Delete" aria-label="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>`;
    }).join('');
  }

  function loadHistory(index) {
    const list = getHistory();
    if (!list[index]) return;
    const h = list[index];
    document.getElementById('uaInput').value = h.ua;
    updateCharCount();
    const parsed = parse(h.ua);
    if (parsed) renderResult(parsed);
  }

  function deleteHistory(index) {
    const list = getHistory();
    list.splice(index, 1);
    saveHistory(list);
    renderHistory();
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
  }

  function toggleHistory() {
    const body = document.getElementById('uaHistoryBody');
    const panel = document.getElementById('uaHistoryPanel');
    if (!body || !panel) return;
    historyOpen = !historyOpen;
    body.hidden = !historyOpen;
    panel.classList.toggle('open', historyOpen);
  }

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('ua.js.history.just_now', 'just now');
    if (mins < 60) return tf('ua.js.history.minutes_ago', '{n}m ago', { n: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return tf('ua.js.history.hours_ago', '{n}h ago', { n: hrs });
    const days = Math.floor(hrs / 24);
    return tf('ua.js.history.days_ago', '{n}d ago', { n: days });
  }

  // ─── Init ─────────────────────────────────────────────────────

  function init() {
    populateSamples();
    renderHistory();
    updateCurrentUAString();
    populateEnv();
    loadHints();

    const ua = navigator.userAgent;
    const inp = document.getElementById('uaInput');
    if (inp) {
      inp.value = ua;
      updateCharCount();
    }
    const parsed = parse(ua);
    if (parsed) renderResult(parsed);

    window.addEventListener('resize', () => {
      const grid = document.getElementById('uaEnvGrid');
      if (grid && !grid.hidden) populateEnv();
    });
  }

  return {
    init,
    detectMyUA, parseInput, clearAll, copyUA, copyResult, loadSample, updateCharCount,
    toggleHistory, loadHistory, deleteHistory, clearHistory,
    copyCurrent, useCurrent,
    toggleJSON, copyJSON,
    copyHints,
    parseBatch, clearBatch, exportBatch,
  };
})();

document.addEventListener('DOMContentLoaded', DevUA.init);
