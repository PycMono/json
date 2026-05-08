// Build the standard JSON tool editor DOM dynamically
// This creates the layout that json-tools-core.js expects, without any inline event handlers.

(function() {
  var toolKey = new URLSearchParams(location.search).get('tool') || 'validate';

  // Main workspace HTML — standard dual-pane layout for all tools
  var html = '<div class="jt-editor-wrap" style="position:relative">' +

    // Sidebar toggle
    '<button class="jt-sidebar-toggle" id="sidebarToggle"><span class="jt-sidebar-toggle__arrow">&#9664;</span></button>' +

    // History sidebar
    '<aside class="jt-history-sidebar" id="historySidebar" aria-expanded="true">' +
      '<div class="jt-sidebar-header">' +
        '<span class="jt-sidebar-title">&#128336; History</span>' +
        '<div class="jt-sidebar-actions">' +
          '<button class="jt-sidebar-btn" id="clearHistoryBtn">&#128465;</button>' +
          '<button class="jt-sidebar-btn" id="closeSidebarBtn">&#10005;</button>' +
        '</div>' +
      '</div>' +
      '<div class="jt-history-list" id="historyList" role="list">' +
        '<div class="jt-history-empty">No history yet</div>' +
      '</div>' +
    '</aside>' +

    // Editor layout
    '<div class="jt-editor-layout">' +

      // Left: Input pane
      '<div class="jt-editor-pane jt-editor-pane--input">' +
        '<div class="jt-editor-pane__header">' +
          '<span class="jt-editor-pane__label">Input</span>' +
          '<div class="jt-editor-pane__actions">' +
            '<span id="inputOptions" class="jt-input-options"></span>' +
            '<button class="jt-btn jt-btn--ghost" id="loadExampleBtn">Example</button>' +
            '<button class="jt-btn jt-btn--ghost" id="clearInputBtn">Clear</button>' +
            '<label class="jt-btn jt-btn--ghost">Upload<input type="file" accept=".json,.txt,.yaml,.yml,.xml,.csv,.sql" id="uploadInput" style="display:none"></label>' +
          '</div>' +
        '</div>' +
        '<div class="jt-url-bar">' +
          '<input type="text" id="jsonUrlInput" class="jt-url-bar__input" placeholder="Paste URL to fetch JSON...">' +
          '<button class="jt-url-bar__btn" id="fetchUrlBtn">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>' +
            '<span>Fetch</span>' +
          '</button>' +
        '</div>' +
        '<div id="inputEditor" class="jt-monaco-editor"></div>' +
        '<div class="jt-editor-pane__footer"><span id="inputSize"></span></div>' +
      '</div>' +

      // Middle: Action buttons
      '<div class="jt-editor-actions">' +
        '<button class="jt-process-btn" id="processBtn">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>' +
        '</button>' +
        '<button class="jt-swap-btn" id="swapBtn">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>' +
        '</button>' +
      '</div>' +

      // Right: Output pane
      '<div class="jt-editor-pane jt-editor-pane--output">' +
        '<div class="jt-editor-pane__header">' +
          '<span class="jt-editor-pane__label">Output</span>' +
          '<div class="jt-editor-pane__actions">' +
            '<button class="jt-btn jt-btn--ghost" id="fullscreenBtn">&#9974; Fullscreen</button>' +
            '<button class="jt-btn jt-btn--primary" id="copyBtn">Copy</button>' +
            '<button class="jt-btn jt-btn--ghost" id="downloadBtn">Download</button>' +
          '</div>' +
        '</div>' +
        '<div id="outputEditor" class="jt-monaco-editor"></div>' +
        '<div id="outputTree" class="jt-output-tree"></div>' +
        '<div class="jt-editor-pane__footer">' +
          '<span id="outputSize"></span>' +
          '<span id="outputStats" class="jt-output-stats"></span>' +
        '</div>' +
      '</div>' +

    '</div>' + // /jt-editor-layout
    '</div>' + // /jt-editor-wrap

    // Error panel
    '<div class="jt-error-panel" id="errorPanel" style="display:none" role="alert" aria-live="assertive">' +
      '<div class="jt-error-panel__header">' +
        '<span>&#10060;</span><span id="errorTitle"></span>' +
        '<button class="jt-error-panel__close" id="closeErrorBtn">&#10005;</button>' +
      '</div>' +
      '<div class="jt-error-panel__body" id="errorBody"></div>' +
    '</div>' +

    // Fullscreen modal
    '<div class="jt-fullscreen-overlay" id="fullscreenOverlay" role="dialog" aria-modal="true" aria-labelledby="fullscreenTitle">' +
      '<div class="jt-fullscreen-modal">' +
        '<div class="jt-fullscreen-header">' +
          '<span class="jt-fullscreen-title" id="fullscreenTitle"><span id="fullscreenToolIcon"></span><span id="fullscreenToolName"></span></span>' +
          '<button class="jt-fullscreen-close" id="closeFullscreenBtn"><span>&#10005;</span><span>Exit Fullscreen</span></button>' +
        '</div>' +
        '<div class="jt-fullscreen-body">' +
          '<div class="jt-editor-pane jt-editor-pane--input"><div id="fullscreenInputEditor" class="jt-monaco-editor"></div></div>' +
          '<div class="jt-editor-actions">' +
            '<button class="jt-process-btn" id="fullscreenProcessBtn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>' +
            '<button class="jt-swap-btn" id="fullscreenSwapBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg></button>' +
          '</div>' +
          '<div class="jt-editor-pane jt-editor-pane--output"><div id="fullscreenOutputEditor" class="jt-monaco-editor"></div></div>' +
        '</div>' +
        '<div class="jt-fullscreen-footer">' +
          '<div class="jt-fullscreen-stats"><span id="fullscreenInputSize"></span> &rarr; <span id="fullscreenOutputSize"></span></div>' +
          '<div class="jt-fullscreen-actions">' +
            '<button class="jt-btn jt-btn--primary" id="fullscreenCopyBtn">Copy</button>' +
            '<button class="jt-btn jt-btn--ghost" id="fullscreenDownloadBtn">Download</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  // Tool selector (minimal — just the dropdown)
  var selectorHtml =
    '<div class="jt-tool-selector-bar">' +
      '<div class="jt-tool-selector" id="toolSelector">' +
        '<span class="jt-tool-selector__icon">&#128295;</span>' +
        '<span class="jt-tool-selector__name" id="currentToolName">' + toolKey + '</span>' +
        '<span class="jt-tool-selector__hint">Search tools...</span>' +
        '<span class="jt-tool-selector__arrow">&#9662;</span>' +
        '<div class="jt-tool-dropdown" id="toolDropdown">' +
          '<div class="jt-tool-dropdown__search"><input type="text" id="toolSearchInput" placeholder="Search tools..."></div>' +
        '</div>' +
      '</div>' +
    '</div>';

  // Write to the content area
  var content = document.getElementById('jtContent');
  if (content) {
    content.innerHTML =
      '<section class="jt-tool-workspace"><div class="jt-container jt-container--wide" style="position:relative">' +
      selectorHtml + html +
      '</div></section>';
  }
})();
