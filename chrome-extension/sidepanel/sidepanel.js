// ToolBoxNova Chrome Extension — Sidepanel Script

(function() {
  'use strict';

  const TOOL_PAGES = {
    'password':       '../pages/password.html',
    'timestamp':      '../pages/timestamp.html',
    'ai-detect':      '../pages/ai-detect.html',
    'ai-humanize':    '../pages/ai-humanize.html',
    'json':           '../pages/json.html',
    'color':          '../pages/color.html',
    'image-compress': '../pages/image-compress.html',
  };

  let currentTool = 'home';

  // ── Tab navigation ──────────────────────────────────────
  document.querySelectorAll('.sp-nav button').forEach(btn => {
    btn.addEventListener('click', () => openTool(btn.dataset.tool));
  });

  // Home cards click
  document.querySelectorAll('.sp-card[data-goto]').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      openTool(card.dataset.goto);
    });
  });

  function openTool(tool) {
    if (tool === 'home') {
      showHome();
      return;
    }

    currentTool = tool;

    // Update nav active state
    document.querySelectorAll('.sp-nav button').forEach(b => b.classList.remove('active'));
    const navBtn = document.querySelector(`.sp-nav button[data-tool="${tool}"]`);
    if (navBtn) navBtn.classList.add('active');

    // Show iframe, hide home
    document.getElementById('spHome').style.display = 'none';
    document.getElementById('spFrameWrap').style.display = 'block';

    // Load tool page in iframe
    const src = TOOL_PAGES[tool];
    const frame = document.getElementById('spFrame');
    const targetHref = src ? new URL(src, location.href).href : null;
    if (src && frame.src !== targetHref) {
      frame.src = src;
    }
  }

  function showHome() {
    currentTool = 'home';
    document.querySelectorAll('.sp-nav button').forEach(b => b.classList.remove('active'));
    document.querySelector('.sp-nav button[data-tool="home"]').classList.add('active');
    document.getElementById('spHome').style.display = 'block';
    document.getElementById('spFrameWrap').style.display = 'none';
    document.getElementById('spFrame').src = 'about:blank';
  }

  // ── Send data payload to iframe (handles both first-load and already-loaded cases) ──
  function sendToolData(mappedTool, data) {
    if (!data) return;
    const frame = document.getElementById('spFrame');
    const targetSrc = TOOL_PAGES[mappedTool];
    if (!targetSrc) return;

    const targetHref = new URL(targetSrc, location.href).href;
    const isLoaded = frame.src === targetHref;

    const sendMessage = () => {
      try {
        frame.contentWindow.postMessage({
          action: 'tool-data',
          tool: mappedTool,
          data: data
        }, '*');
      } catch(e) {}
    };

    if (isLoaded) {
      // iframe is already on the right page — postMessage directly
      sendMessage();
    } else {
      // iframe is navigating; wait for load then send
      const onLoad = () => {
        frame.removeEventListener('load', onLoad);
        sendMessage();
      };
      frame.addEventListener('load', onLoad);
    }
  }

  // ── Receive data from background (right-click menu) ─────
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.pendingTool) return;

    const tool = changes.pendingTool.newValue;
    if (!tool) return;
    const data = changes.pendingData?.newValue || '';

    // Map context menu tools to sidepanel tools
    const toolMap = {
      'json-format': 'json',
      'ai-detect': 'ai-detect',
      'ai-humanize': 'ai-humanize',
    };
    const mappedTool = toolMap[tool] || tool;
    openTool(mappedTool);

    if (data) {
      sendToolData(mappedTool, data);
    }

    chrome.storage.local.remove(['pendingTool', 'pendingData']);
  });

  // Check for pending data on startup
  chrome.storage.local.get(['pendingTool', 'pendingData'], (result) => {
    if (result.pendingTool) {
      const tool = result.pendingTool;
      const data = result.pendingData || '';
      const toolMap = { 'json-format': 'json', 'ai-detect': 'ai-detect', 'ai-humanize': 'ai-humanize' };
      const mappedTool = toolMap[tool] || tool;
      openTool(mappedTool);
      if (data) {
        sendToolData(mappedTool, data);
      }
      chrome.storage.local.remove(['pendingTool', 'pendingData']);
    }
  });

  // Listen for postMessage from iframe (back button, etc.)
  window.addEventListener('message', (e) => {
    if (e.data && e.data.action === 'go-home') {
      showHome();
    }
  });
})();
