// ToolBoxNova Chrome Extension — Content Script
// 负责接收 background.js 的消息，将数据传递给 sidepanel

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'open-tool') {
    // 将工具数据存储到 extension storage，sidepanel 读取后自动打开对应工具
    chrome.storage.local.set({
      pendingTool: msg.tool,
      pendingData: msg.data || ''
    });
    sendResponse({ ok: true });
  }
});
