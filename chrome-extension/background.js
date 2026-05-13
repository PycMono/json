// ToolBoxNova Chrome Extension — Background Service Worker (MV3)

const SITE_ORIGIN = 'https://ycjson.top';

// ── 右键菜单 ──────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'format-json',
    title: chrome.i18n.getMessage('contextFormatJson') || 'Format JSON',
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: 'ai-detect',
    title: chrome.i18n.getMessage('contextAiDetect') || 'AI Content Detect',
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: 'ai-humanize',
    title: chrome.i18n.getMessage('contextAiHumanize') || 'Humanize Text',
    contexts: ['selection']
  });
});

// ── 右键菜单点击处理 ──────────────────────────────────────
// 注意：直接写 chrome.storage.local，不依赖 content_scripts（避免注入问题）
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const text = info.selectionText;
  if (!text) return;

  const toolMap = {
    'format-json': 'json-format',
    'ai-detect':   'ai-detect',
    'ai-humanize': 'ai-humanize',
  };
  const tool = toolMap[info.menuItemId];
  if (!tool) return;

  // 先打开侧边栏，再写 storage（sidepanel.js 有 onChanged 监听）
  chrome.sidePanel.open({ tabId: tab.id }).then(() => {
    // 稍微延迟，给侧边栏时间完成初始化
    setTimeout(() => {
      chrome.storage.local.set({ pendingTool: tool, pendingData: text });
    }, 300);
  }).catch(() => {
    // 如果 open 失败（如首次或权限问题），仍尝试写 storage
    chrome.storage.local.set({ pendingTool: tool, pendingData: text });
  });
});

// ── API 代理（统一发请求，避免 extension page 跨域问题）─────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== 'api-request') return false;

  const { method, path, body } = msg;
  const url = `${SITE_ORIGIN}${path}`;

  const opts = {
    method: method || 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);

  fetch(url, opts)
    .then(r => r.json())
    .then(data => sendResponse({ ok: true, data }))
    .catch(err => sendResponse({ ok: false, error: err.message }));

  return true; // 保持 sendResponse 通道开启（异步）
});

// ── 快捷键处理 ──────────────────────────────────────────────
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-json-tools') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab) return;
      chrome.sidePanel.open({ tabId: tab.id }).then(() => {
        setTimeout(() => {
          chrome.storage.local.set({ pendingTool: 'json-format', pendingData: '' });
        }, 300);
      }).catch(() => {});
    });
  }
});
