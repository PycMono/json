// ToolBoxNova Extension — Shared page utilities
// All tool pages include this script for: i18n, toast, navigation, API proxy

(function() {
  'use strict';

  var SITE_ORIGIN = 'https://toolboxnova.com';

  // ── Toast notification (polyfill for main.js showToast) ───
  window.showToast = function(msg, duration) {
    duration = duration || 2000;
    var t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);' +
        'padding:10px 20px;background:#333;color:#fff;border-radius:8px;font-size:14px;' +
        'z-index:99999;opacity:0;transition:opacity 0.3s;pointer-events:none;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(function() { t.style.opacity = '0'; }, duration);
  };

  // ── i18n ──────────────────────────────────────────────
  var translations = {};

  window.loadI18n = function() {
    try {
      var lang = (navigator.language || 'en').split('-')[0];
      var localeMap = { zh: 'zh', ja: 'ja', ko: 'ko', es: 'spa', en: 'en' };
      var locale = localeMap[lang] || 'en';
      window._extLang = locale;

      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        var page = location.pathname.split('/').pop().replace('.html', '');
        var namespaceMap = {
          'password': 'tools', 'timestamp': 'tools', 'image-compress': 'img',
          'json': 'json', 'json-tool': 'json', 'color': 'tools',
          'qrcode': 'tools', 'ai-detect': 'ailab', 'ai-humanize': 'ailab',
        };
        var ns = namespaceMap[page];
        if (ns) {
          fetch(chrome.runtime.getURL('static/i18n/' + locale + '/' + ns + '.json'))
            .then(function(r) { return r.ok ? r.json() : {}; })
            .then(function(json) {
              translations = json;
              // Populate window.JT_I18N for json-tools-core.js
              if (!window.JT_I18N) window.JT_I18N = {};
              Object.keys(json).forEach(function(k) {
                window.JT_I18N[k] = json[k];
                // Also set short key (without namespace prefix)
                var shortKey = k.replace(/^(json|tools|img|ailab)\./, '');
                if (shortKey !== k) window.JT_I18N[shortKey] = json[k];
              });
              // Apply data-i18n attributes
              document.querySelectorAll('[data-i18n]').forEach(function(el) {
                var key = el.getAttribute('data-i18n');
                if (json[key]) el.textContent = json[key];
              });
            })
            .catch(function() {});
        }
      }
    } catch(e) {}
  };

  // ── API helper (route through background.js) ───────────
  window.extFetch = function(path, opts) {
    return new Promise(function(resolve, reject) {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'api-request',
          method: (opts && opts.method) || 'GET',
          path: path,
          body: (opts && opts.body) || null
        }, function(resp) {
          if (resp && resp.ok) resolve(resp.data);
          else reject(new Error((resp && resp.error) || 'API request failed'));
        });
      } else {
        // Fallback: direct fetch
        fetch(SITE_ORIGIN + path, opts).then(function(r) { return r.json(); }).then(resolve).catch(reject);
      }
    });
  };

  // ── Patch fetch: rewrite relative /api/ to absolute URL ──
  var _origFetch = window.fetch;
  window.fetch = function(url, opts) {
    if (typeof url === 'string' && url.charAt(0) === '/' && url.indexOf('/api/') === 0) {
      url = SITE_ORIGIN + url;
    }
    return _origFetch.call(this, url, opts);
  };

  // ── Set up globals for JSON tools compatibility ────────
  if (!window.JT_LANG) {
    var lang = (navigator.language || 'en').split('-')[0];
    window.JT_LANG = (lang === 'zh') ? 'zh' : 'en';
  }
  if (!window.JT_I18N) window.JT_I18N = {};
  if (!window.JT_TOOL) {
    var params = new URLSearchParams(location.search);
    window.JT_TOOL = params.get('tool') || '';
  }

  // ── Relay postMessage from parent to custom DOM event ──
  // Sidepanel sends {action:'tool-data', tool, data} via postMessage;
  // tool pages listen for custom 'tool-data' DOM event on document.
  window.addEventListener('message', function(e) {
    if (e.data && e.data.action === 'tool-data') {
      document.dispatchEvent(new CustomEvent('tool-data', { detail: e.data }));
    }
  });

  // ── Auto-init ──────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadI18n);
  } else {
    loadI18n();
  }
})();
