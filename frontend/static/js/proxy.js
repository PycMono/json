/* ============================================
   json - Proxy JS (v2)
   ============================================ */

const ProxyTool = {
  _loading: false,

  visit() {
    if (this._loading) return;
    const urlEl = document.getElementById('proxyUrl');
    let url = urlEl ? urlEl.value.trim() : '';
    if (!url) { this.toast('Please enter a URL', 'error'); return; }
    if (!url.startsWith('http')) url = 'https://' + url;

    const encrypt = document.getElementById('optEncrypt').checked;
    const disableScripts = document.getElementById('optDisableScripts').checked;
    const blockAds = document.getElementById('optBlockAds').checked;
    const node = document.getElementById('proxyNode').value;

    const resultDiv = document.getElementById('proxyResult');
    const resultUrl = document.getElementById('proxyResultUrl');
    const frame = document.getElementById('proxyFrame');
    const btn = document.getElementById('proxyVisitBtn');

    // Loading state
    this._loading = true;
    if (btn) {
      btn.innerHTML = '<div class="proxy-loading-spinner"></div> <span>Loading...</span>';
      btn.disabled = true;
    }
    resultDiv.style.display = 'block';
    resultUrl.textContent = '\u{1F504} ' + url;
    frame.srcdoc = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;font-family:sans-serif;color:#94a3b8;"><div style="width:32px;height:32px;border:3px solid #e2e8f0;border-top-color:#4f46e5;border-radius:50%;animation:proxySpin .8s linear infinite;margin-bottom:16px;"></div><span>Loading through proxy...</span></div>';

    fetch('/api/proxy/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, encrypt, disable_scripts: disableScripts, block_ads: blockAds, node }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          frame.srcdoc = '<div style="display:flex;align-items:center;justify-content:center;height:200px;font-family:sans-serif;color:#ef4444;padding:20px;text-align:center;">Error: ' + data.error + '</div>';
          resultUrl.textContent = '\u274C ' + url;
          this.toast(data.error, 'error');
          if (typeof gaTrackError === 'function') gaTrackError('proxy', 'fetch_failed', data.error);
          return;
        }
        resultUrl.textContent = '\u2705 ' + (data.url || url);
        frame.srcdoc = data.html || '';
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('proxy', 1, 0);
      })
      .catch(() => {
        frame.srcdoc = '<div style="display:flex;align-items:center;justify-content:center;height:200px;font-family:sans-serif;color:#ef4444;padding:20px;text-align:center;">Network error. Please try again.</div>';
        resultUrl.textContent = '\u274C Error';
        this.toast('Network error. Please try again.', 'error');
        if (typeof gaTrackError === 'function') gaTrackError('proxy', 'network_error', 'Network error');
      })
      .finally(() => {
        this._loading = false;
        if (btn) {
          btn.innerHTML = '<i class="fa-solid fa-globe"></i> <span>' + (btn.dataset.label || 'Visit') + '</span>';
          btn.disabled = false;
        }
      });
  },

  quickVisit(domain) {
    const urlEl = document.getElementById('proxyUrl');
    if (urlEl) urlEl.value = domain;
    this.visit();
  },

  close() {
    const resultDiv = document.getElementById('proxyResult');
    const frame = document.getElementById('proxyFrame');
    if (resultDiv) resultDiv.style.display = 'none';
    if (frame) frame.srcdoc = '';
  },

  // Re-proxy a URL when the iframe navigates (link click / form submit)
  proxyNavigate(url) {
    const resultUrl = document.getElementById('proxyResultUrl');
    const frame = document.getElementById('proxyFrame');
    if (!frame) return;

    resultUrl.textContent = '\u{1F504} ' + url;
    frame.srcdoc = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;font-family:sans-serif;color:#94a3b8;"><div style="width:32px;height:32px;border:3px solid #e2e8f0;border-top-color:#4f46e5;border-radius:50%;animation:proxySpin .8s linear infinite;margin-bottom:16px;"></div><span>Loading through proxy...</span></div>';

    const encrypt = document.getElementById('optEncrypt');
    const disableScripts = document.getElementById('optDisableScripts');
    const blockAds = document.getElementById('optBlockAds');
    const node = document.getElementById('proxyNode');

    fetch('/api/proxy/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        encrypt: encrypt ? encrypt.checked : false,
        disable_scripts: disableScripts ? disableScripts.checked : false,
        block_ads: blockAds ? blockAds.checked : false,
        node: node ? node.value : 'auto',
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          frame.srcdoc = '<div style="display:flex;align-items:center;justify-content:center;height:200px;font-family:sans-serif;color:#ef4444;padding:20px;text-align:center;">Error: ' + data.error + '</div>';
          resultUrl.textContent = '\u274C ' + url;
          this.toast(data.error, 'error');
          return;
        }
        resultUrl.textContent = '\u2705 ' + (data.url || url);
        frame.srcdoc = data.html || '';
      })
      .catch(() => {
        frame.srcdoc = '<div style="display:flex;align-items:center;justify-content:center;height:200px;font-family:sans-serif;color:#ef4444;padding:20px;text-align:center;">Network error. Please try again.</div>';
        this.toast('Network error', 'error');
      });
  },

  copyUrl() {
    const urlEl = document.getElementById('proxyResultUrl');
    if (!urlEl) return;
    const text = urlEl.textContent.replace(/^[\u2705\u274C\u{1F504}]\s*/, '').trim();
    navigator.clipboard.writeText(text).then(() => {
      this.toast('URL copied to clipboard', 'success');
    }).catch(() => {
      this.toast('Failed to copy', 'error');
    });
  },

  toast(msg, type) {
    let container = document.getElementById('proxyToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'proxyToastContainer';
      container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.style.cssText = 'padding:10px 20px;border-radius:8px;font-size:14px;font-family:sans-serif;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:opacity 0.3s;max-width:360px;';
    if (type === 'error') t.style.background = '#dc2626';
    else if (type === 'success') t.style.background = '#16a34a';
    else t.style.background = '#4f46e5';
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
  },

  loadNodes() {
    fetch('/api/proxy/nodes')
      .then(r => r.json())
      .then(data => {
        if (!data.nodes) return;
        data.nodes.forEach(node => {
          const msEl = document.getElementById('node-' + node.id + '-ms');
          const barEl = document.getElementById('node-' + node.id + '-bar');
          if (msEl) msEl.textContent = node.latency + 'ms';
          if (barEl) {
            barEl.style.width = Math.max(20, 100 - node.latency) + '%';
            barEl.className = 'proxy-node-card__speed-bar';
            if (node.latency < 80) barEl.classList.add('proxy-node-card__speed-bar--fast');
            else if (node.latency < 150) barEl.classList.add('proxy-node-card__speed-bar--medium');
            else barEl.classList.add('proxy-node-card__speed-bar--slow');
          }
        });
      })
      .catch(() => {});
  },

  loadStats() {
    fetch('/api/proxy/stats')
      .then(r => r.json())
      .then(d => {
        const reqEl = document.getElementById('todayRequests');
        const nodesEl = document.getElementById('availableNodes');
        if (reqEl) reqEl.textContent = d.today_requests ? Number(d.today_requests).toLocaleString() : '--';
        if (nodesEl) nodesEl.textContent = d.available_nodes || '--';
      })
      .catch(() => {});
  },

  init() {
    // Store button label for loading state restore
    const btn = document.getElementById('proxyVisitBtn');
    if (btn) {
      const span = btn.querySelector('span');
      if (span) btn.dataset.label = span.textContent;
    }
    this.loadStats();
    this.loadNodes();

    // Listen for messages from proxied iframe (navigation + close)
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'proxyNavigate') {
        this.proxyNavigate(e.data.url);
      }
      if (e.data === 'closeProxy') {
        this.close();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });

    // Enter key in URL input
    const urlInput = document.getElementById('proxyUrl');
    if (urlInput) {
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.visit();
      });
    }
  }
};

window.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('proxyUrl')) {
    ProxyTool.init();
  }
});