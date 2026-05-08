// ToolBoxNova Chrome Extension — Popup Script

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.popup-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      const target = item.dataset.target;

      if (target === 'tab') {
        // Open tool page in new browser tab (no CSP restriction on CDN scripts)
        chrome.tabs.create({ url: chrome.runtime.getURL('pages/' + page + '.html') });
        window.close();
      } else {
        // Open in sidepanel — wait for it to open before writing storage
        // to avoid the race where pendingTool is set before sidepanel.js initialises
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]) return;
          chrome.sidePanel.open({ tabId: tabs[0].id })
            .then(() => {
              // Give sidepanel.js ~400 ms to boot and attach storage listener
              setTimeout(() => {
                chrome.storage.local.set({ pendingTool: page, pendingData: '' });
              }, 400);
            })
            .catch(() => {
              // Fallback: still try to set the tool
              chrome.storage.local.set({ pendingTool: page, pendingData: '' });
            });
          window.close();
        });
      }
    });
  });
});
