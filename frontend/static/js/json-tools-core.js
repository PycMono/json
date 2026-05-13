'use strict';
// json-tools-core.js — Monaco Editor init + all common utilities

let inputEditor  = null;
let outputEditor = null;
let leftEditor   = null;  // diff tool
let rightEditor  = null;  // diff tool

require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }});

require(['vs/editor/editor.main'], function() {
  // Detect theme before creating editors
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const editorTheme = currentTheme === 'dark' ? 'vs-dark' : 'vs';

  const opts = {
    fontSize: 13, minimap: { enabled: false },
    scrollBeyondLastLine: false, automaticLayout: true, wordWrap: 'on',
    'bracketPairColorization': { enabled: true },
    theme: editorTheme,
  };

  const tool = window.JT_TOOL || '';

  if (tool === 'diff') {
    leftEditor = monaco.editor.create(document.getElementById('diffLeftEditor'), {
      ...opts, value: '', language: 'json',
    });
    rightEditor = monaco.editor.create(document.getElementById('diffRightEditor'), {
      ...opts, value: '', language: 'json',
    });
    // Update size stats when content changes
    leftEditor.onDidChangeModelContent(function() {
      const el = document.getElementById('diffLeftSize');
      if (el) el.textContent = formatBytes(new Blob([leftEditor.getValue()]).size);
    });
    rightEditor.onDidChangeModelContent(function() {
      const el = document.getElementById('diffRightSize');
      if (el) el.textContent = formatBytes(new Blob([rightEditor.getValue()]).size);
    });
    // Force immediate layout for diff editors
    requestAnimationFrame(function() { leftEditor.layout(); rightEditor.layout(); });
  } else if (tool === 'schema-validate') {
    const schemaEl = document.getElementById('schemaEditor');
    if (schemaEl) {
      window._schemaEditor = monaco.editor.create(schemaEl, {
        ...opts, value: JSON.stringify({ '$schema': 'http://json-schema.org/draft-07/schema#', type: 'object', properties: {} }, null, 2),
        language: 'json',
      });
      window._schemaEditor.onDidChangeModelContent(function() {
        const el = document.getElementById('schemaSize');
        if (el) el.textContent = formatBytes(new Blob([window._schemaEditor.getValue()]).size);
      });
    }
    const inputEl = document.getElementById('inputEditor');
    if (inputEl) {
      inputEditor = monaco.editor.create(inputEl, {
        ...opts, value: '', language: 'json', theme: 'vs',
      });
      inputEditor.onDidChangeModelContent(updateInputStats);
      inputEditor.onDidChangeModelContent(updateValidationBadge);
    }
  } else {
    const inputEl = document.getElementById('inputEditor');
    if (inputEl) {
      const inputLang = { 'from-yaml': 'yaml', 'from-xml': 'xml', 'from-sql': 'sql',
        'from-csv': 'plaintext', 'base64': 'plaintext', 'jwt': 'plaintext',
        'jsonc': 'plaintext', 'from-toml': 'toml', 'from-query': 'plaintext',
        'python-dict': 'python' }[tool] || 'json';
      inputEditor = monaco.editor.create(inputEl, {
        ...opts, value: '', language: inputLang,
      });
      inputEditor.onDidChangeModelContent(updateInputStats);
      inputEditor.onDidChangeModelContent(updateValidationBadge);
    }

    const outputEl = document.getElementById('outputEditor');
    if (outputEl) {
      const outputLang = {
        'to-csv': 'plaintext', 'to-yaml': 'yaml', 'to-xml': 'xml',
        'to-sql': 'sql', 'to-markdown': 'markdown',
        'to-typescript': 'typescript', 'to-python': 'python',
        'to-java': 'java', 'to-csharp': 'csharp', 'to-go': 'go',
        'to-kotlin': 'kotlin', 'to-swift': 'swift', 'to-rust': 'rust',
        'to-php': 'php', 'from-yaml': 'json', 'from-xml': 'json',
        'escape': 'plaintext', 'stringify': 'plaintext',
        'base64': 'plaintext', 'jwt': 'json', 'jsonc': 'json',
        'to-dart': 'dart', 'to-objc': 'objc', 'to-cpp': 'cpp',
        'to-ruby': 'ruby', 'to-scala': 'scala',
        'to-toml': 'toml', 'to-query': 'plaintext', 'from-query': 'json',
        'python-dict': 'python', 'json-generator': 'json',
        'to-zod': 'typescript', 'to-graphql': 'graphql', 'to-env': 'plaintext',
        'jsonl': 'plaintext',
      }[tool] || 'json';
      outputEditor = monaco.editor.create(outputEl, {
        ...opts, value: '', language: outputLang, readOnly: true,
      });
      // Add right-click context menu actions on output editor
      initOutputContextMenu(outputEditor);
    }
  }

  // Restore from URL hash
  const hash = location.hash.slice(1);
  if (hash && inputEditor) {
    if (hash.startsWith('share=')) {
      try {
        const base64 = hash.slice(6);
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const decoded = new TextDecoder().decode(bytes);
        inputEditor.setValue(decoded);
      } catch(e) {
        try { inputEditor.setValue(decodeURIComponent(hash)); } catch(e2) {}
      }
    } else {
      try { inputEditor.setValue(decodeURIComponent(hash)); } catch(e) {}
    }
  }

  // Init tool-specific options bar
  if (typeof initToolOptions === 'function') initToolOptions();
  // Show ghost placeholder if editor is empty
  initGhostPlaceholder();
  // Init font size control
  initFontSizeControl();
  // Init drag & drop on input pane
  initDragDrop();
  // Init draggable divider
  initDraggableDivider();
  // Init cursor position tracking for status bar
  initCursorTracking();
  // Init same-key highlighting
  initSameKeyHighlight();
  // Init sync scroll
  initSyncScroll();
  // Init clipboard smart detection
  initClipboardDetection();
  // Init share button
  initShareButton();
  // Init tooltip shortcuts
  initTooltipShortcuts();
  // Init empty state cards
  initEmptyState();
  // Init auto-format on paste
  initAutoFormatOnPaste();

  // Force layout update for all Monaco editors to ensure correct sizing
  // Use multiple attempts to ensure editors are sized correctly
  const updateLayout = function() {
    const editors = [inputEditor, outputEditor, leftEditor, rightEditor, window._schemaEditor];
    editors.forEach(function(editor) {
      if (editor) {
        editor.layout();
      }
    });
  };
  setTimeout(updateLayout, 100);
  setTimeout(updateLayout, 300);
  setTimeout(updateLayout, 600);
  window.addEventListener('resize', updateLayout);
});

/* ── Core API ─────────────────────────────────── */
function getInput()  { return inputEditor?.getValue()  || ''; }
function getOutput() { return outputEditor?.getValue() || ''; }

let _processStartTime = 0;
function startProcessTimer() { _processStartTime = performance.now(); }

function setOutput(val, lang) {
  if (!outputEditor) return;
  const elapsed = _processStartTime ? Math.round(performance.now() - _processStartTime) : 0;
  outputEditor.setValue(val || '');
  if (lang) {
    const langMap = { typescript: 'typescript', python: 'python', java: 'java',
      csharp: 'csharp', go: 'go', kotlin: 'kotlin', swift: 'swift',
      rust: 'rust', php: 'php', yaml: 'yaml', xml: 'xml', sql: 'sql',
      markdown: 'markdown', json: 'json', plaintext: 'plaintext',
      graphql: 'plaintext' };
    const monacoLang = langMap[lang] || lang;
    try {
      monaco.editor.setModelLanguage(outputEditor.getModel(), monacoLang);
    } catch(e) {}
  }
  updateOutputStats(val || '', elapsed);
  // Reset tree view so expand/collapse re-renders with new data
  outputTreeViewVisible = false;
  // Handle view visibility based on currentOutputView
  const editorDiv = document.getElementById('outputEditor');
  const treeView = document.getElementById('treeOutput');
  const tableView = document.getElementById('tableOutput');
  const oldTreeView = document.getElementById('outputTree');

  // Only reset to code view if that's the current view
  // Otherwise, let the view-specific rendering handle visibility
  if (currentOutputView === 'code') {
    if (editorDiv) editorDiv.style.display = '';
    if (treeView) treeView.style.display = 'none';
    if (tableView) tableView.style.display = 'none';
    if (oldTreeView) {
      oldTreeView.classList.remove('visible');
      oldTreeView.style.display = 'none';
    }
  }
  // Show "Continue with" links (UX-19)
  showContinueWith();
}

/* ── Output View Switching (Code/Tree/Table) ───────── */
let currentOutputView = 'code'; // 'code', 'tree', 'table'
let outputDataCache = null; // Cache output data for view switching
let isViewTransitioning = false; // Track view transition state

function switchOutputView(viewType) {
  if (isViewTransitioning) return; // Prevent rapid switching
  isViewTransitioning = true;

  currentOutputView = viewType;

  // Hide all views
  const codeView = document.getElementById('outputEditor');
  const treeView = document.getElementById('treeOutput');
  const tableView = document.getElementById('tableOutput');
  const oldTreeView = document.getElementById('outputTree');

  if (codeView) codeView.style.display = 'none';
  if (treeView) treeView.style.display = 'none';
  if (tableView) tableView.style.display = 'none';
  if (oldTreeView) {
    oldTreeView.classList.remove('visible');
    oldTreeView.style.display = 'none';
  }

  // Show selected view with smooth transition
  switch (viewType) {
    case 'code':
      if (codeView) {
        codeView.style.display = 'block';
        // Trigger Monaco editor layout update
        if (outputEditor) {
          requestAnimationFrame(function() {
            outputEditor.layout();
          });
        }
        if (outputEditor && outputDataCache) {
          const isJson = typeof outputDataCache === 'object';
          const text = isJson ? JSON.stringify(outputDataCache, null, 2) : outputDataCache;
          outputEditor.setValue(text);
        }
      }
      break;
    case 'tree':
      if (treeView) {
        treeView.style.display = 'block';
        if (outputDataCache) {
          renderTreeOutput(outputDataCache);
        } else {
          // Show loading state if no data
          treeView.innerHTML = '<div class="jt-empty-state">' + (i18n('json.common.empty_output') || 'Execute an operation to generate output') + '</div>';
        }
      }
      break;
    case 'table':
      if (tableView) {
        tableView.style.display = 'block';
        if (outputDataCache) {
          renderTableOutput(outputDataCache);
        } else {
          // Show loading state if no data
          tableView.innerHTML = '<div class="jt-empty-state">' + (i18n('json.common.empty_output') || 'Execute an operation to generate output') + '</div>';
        }
      }
      break;
  }

  // Update button states
  document.querySelectorAll('.jt-view-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.view === viewType);
  });

  // Save to localStorage
  try {
    localStorage.setItem('jsonTool_defaultView', viewType);
  } catch (e) {}

  // Update expand/collapse button visibility
  const expandBtn = document.getElementById('expandAllBtn');
  const collapseBtn = document.getElementById('collapseAllBtn');
  if (expandBtn && collapseBtn) {
    if (viewType === 'code') {
      expandBtn.style.display = '';
      collapseBtn.style.display = '';
    } else if (viewType === 'tree') {
      expandBtn.style.display = '';
      collapseBtn.style.display = '';
    } else {
      expandBtn.style.display = 'none';
      collapseBtn.style.display = 'none';
    }
  }

  // Reset transition state after a short delay
  setTimeout(function() {
    isViewTransitioning = false;
  }, 100);
}

// Save output data when setOutput is called
const originalSetOutput = setOutput;
setOutput = function(val, lang) {
  outputDataCache = val;
  originalSetOutput.call(this, val, lang);

  // Re-render based on current view and handle visibility
  const codeView = document.getElementById('outputEditor');
  const treeView = document.getElementById('treeOutput');
  const tableView = document.getElementById('tableOutput');

  // Use requestAnimationFrame for smoother UI updates
  requestAnimationFrame(function() {
    switch (currentOutputView) {
      case 'tree':
        if (codeView) codeView.style.display = 'none';
        if (tableView) tableView.style.display = 'none';
        if (treeView) {
          treeView.style.display = 'block';
          if (val) {
            renderTreeOutput(val);
          } else {
            treeView.innerHTML = '<div class="jt-empty-state">' + (i18n('json.common.empty_output') || 'Execute an operation to generate output') + '</div>';
          }
        }
        break;
      case 'table':
        if (codeView) codeView.style.display = 'none';
        if (treeView) treeView.style.display = 'none';
        if (tableView) {
          tableView.style.display = 'block';
          if (val) {
            renderTableOutput(val);
          } else {
            tableView.innerHTML = '<div class="jt-empty-state">' + (i18n('json.common.empty_output') || 'Execute an operation to generate output') + '</div>';
          }
        }
        break;
      case 'code':
      default:
        // Code view is already shown by originalSetOutput
        if (treeView) treeView.style.display = 'none';
        if (tableView) tableView.style.display = 'none';
        // Trigger Monaco editor layout update
        if (outputEditor) {
          requestAnimationFrame(function() {
            outputEditor.layout();
          });
        }
        break;
    }
  });
};

function renderTreeOutput(data) {
  const treeContainer = document.getElementById('treeOutput');
  if (!treeContainer) return;

  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    // Pass 0 as initial depth
    const treeHTML = buildJSONTree(parsed, null, 'root', 0);
    treeContainer.innerHTML = treeHTML;

    // Add expand/collapse event listeners
    treeContainer.querySelectorAll('.jt-tree-toggle').forEach(function(toggle) {
      toggle.addEventListener('click', function(e) {
        e.stopPropagation();
        const children = this.parentElement.querySelector('.jt-tree-children');
        if (children) {
          children.classList.toggle('jt-tree-children--collapsed');
          this.classList.toggle('jt-tree-toggle--collapsed');
        }
      });
    });
  } catch (e) {
    treeContainer.innerHTML = '<div class="jt-error">' + escapeHtml(e.message) + '</div>';
  }
}

function renderTableOutput(data) {
  const tableContainer = document.getElementById('tableOutput');
  if (!tableContainer) return;

  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    const tableHTML = buildJSONTable(parsed);
    tableContainer.innerHTML = tableHTML;

    // Add sorting event listeners
    tableContainer.querySelectorAll('.jt-table-sortable').forEach(function(th) {
      th.addEventListener('click', function() {
        const column = this.dataset.column;
        const currentOrder = this.dataset.order || 'asc';
        const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';

        sortTable(tableContainer, column, newOrder);
        this.dataset.order = newOrder;

        // Update sorting icons
        tableContainer.querySelectorAll('.jt-table-sortable').forEach(function(h) {
          h.classList.remove('jt-table-sorted-asc', 'jt-table-sorted-desc');
        });
        this.classList.add('jt-table-sorted-' + newOrder);
      });
    });
  } catch (e) {
    tableContainer.innerHTML = '<div class="jt-error">' + escapeHtml(e.message) + '</div>';
  }
}

// Restore default view on page load
document.addEventListener('DOMContentLoaded', function() {
  try {
    const savedView = localStorage.getItem('jsonTool_defaultView') || 'code';
    currentOutputView = savedView;

    // Update button states
    document.querySelectorAll('.jt-view-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.view === savedView);
    });
  } catch (e) {
    console.error('Failed to restore view preference:', e);
  }
});

// Keyboard shortcuts for view switching
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === '1') {
      e.preventDefault();
      switchOutputView('code');
    } else if (e.key === '2') {
      e.preventDefault();
      switchOutputView('tree');
    } else if (e.key === '3') {
      e.preventDefault();
      switchOutputView('table');
    }
  }
});

/* ── "Continue with" Links (UX-19) ──────────────── */
const CONTINUE_TOOL_MAP = {
  'validate': ['pretty', 'minify', 'tree', 'repair'],
  'pretty': ['minify', 'sort-keys', 'tree', 'to-yaml', 'to-csv'],
  'minify': ['pretty', 'escape', 'base64'],
  'repair': ['validate', 'pretty', 'sort-keys'],
  'escape': ['unescape', 'base64'],
  'unescape': ['pretty', 'validate', 'escape'],
  'stringify': ['pretty', 'validate'],
  'sort-keys': ['minify', 'pretty', 'to-yaml'],
  'flatten': ['unflatten', 'pretty'],
  'to-yaml': ['from-yaml', 'to-json', 'to-toml'],
  'to-xml': ['from-xml', 'pretty'],
  'to-csv': ['from-csv', 'to-excel', 'to-markdown'],
  'to-sql': ['from-sql', 'pretty'],
  'to-toml': ['from-toml', 'to-yaml'],
  'base64': ['escape', 'jwt'],
  'jwt': ['validate', 'pretty'],
  'from-yaml': ['pretty', 'validate', 'to-xml'],
  'from-xml': ['pretty', 'validate', 'to-yaml'],
  'from-csv': ['pretty', 'validate', 'to-excel'],
  'from-sql': ['pretty', 'validate'],
  'from-toml': ['pretty', 'validate', 'to-yaml'],
};

function showContinueWith() {
  let container = document.getElementById('jtContinueWith');
  if (!container) {
    container = document.createElement('div');
    container.id = 'jtContinueWith';
    container.className = 'jt-continue-with';
    // Insert after the output footer area
    const outputPane = document.querySelector('.jt-editor-pane--output');
    if (outputPane) outputPane.appendChild(container);
  }
  const currentTool = window.JT_TOOL || '';
  const nextTools = CONTINUE_TOOL_MAP[currentTool];
  if (!nextTools || !nextTools.length) { container.innerHTML = ''; return; }

  const lang = window.JT_LANG || 'en';
  const output = getOutput();
  const hasOutput = output && output.trim();
  if (!hasOutput) { container.innerHTML = ''; return; }

  // Find tool metadata from all tools
  const items = nextTools.slice(0, 4).map(function(key) {
    const el = document.querySelector('.jt-tool-dropdown__item[data-key="' + key + '"]');
    if (!el) return '';
    const name = el.dataset.name || key;
    const icon = el.querySelector('.jt-tool-dropdown__item-icon');
    const iconText = icon ? icon.textContent : '🔧';
    return '<a class="jt-continue-link" href="/json/' + key + '?lang=' + lang + '" onclick="return navigateWithOutput(event,\'' + key + '\')">' +
      '<span>' + iconText + '</span><span>' + escapeHtml(name) + '</span><span>→</span></a>';
  }).filter(Boolean);

  if (!items.length) { container.innerHTML = ''; return; }
  container.innerHTML = '<span class="jt-continue-with__label">' + (i18n('json.common.continue_with') || 'Continue with') + '</span>' + items.join('');
}

function navigateWithOutput(event, toolKey) {
  event.preventDefault();
  const output = getOutput().trim();
  const lang = window.JT_LANG || 'en';
  let hash = '';
  if (output) {
    try {
      const encoded = btoa(unescape(encodeURIComponent(output)));
      if (encoded.length < 6000) hash = '#share=' + encoded;
    } catch(e) {}
  }
  location.href = '/json/' + toolKey + '?lang=' + lang + hash;
  return false;
}

/* ── Web Worker for Large Files (UX-12) ────────── */
function parseJsonInWorker(text) {
  return new Promise(function(resolve, reject) {
    const workerCode = `
      self.onmessage = function(e) {
        try {
          const parsed = JSON.parse(e.data);
          self.postMessage({ ok: true, data: parsed });
        } catch(err) {
          self.postMessage({ ok: false, error: err.message });
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    worker.onmessage = function(e) {
      URL.revokeObjectURL(url);
      worker.terminate();
      if (e.data.ok) resolve(e.data.data);
      else reject(new Error(e.data.error));
    };
    worker.onerror = function(err) {
      URL.revokeObjectURL(url);
      worker.terminate();
      reject(err);
    };
    worker.postMessage(text);
  });
}

// Override parseInput for large files (>2MB)
const LARGE_FILE_WORKER_THRESHOLD = 2 * 1024 * 1024;
const _originalParseInput = parseInput;

function parseInputAsync() {
  const raw = getInput().trim();
  if (!raw) {
    showToast(i18n('json.common.error.empty') || 'Please enter some content first', 'error');
    return Promise.resolve(null);
  }
  const bytes = new Blob([raw]).size;
  if (bytes > LARGE_FILE_WORKER_THRESHOLD) {
    return parseJsonInWorker(raw).then(function(parsed) {
      return parsed;
    }).catch(function(e) {
      showErrorPanel(e, raw);
      return null;
    });
  }
  // Small file: synchronous
  try {
    return Promise.resolve(JSON.parse(raw));
  } catch(e) {
    showErrorPanel(e, raw);
    return Promise.resolve(null);
  }
}

function parseInput() {
  const raw = getInput().trim();
  if (!raw) {
    showToast(i18n('json.common.error.empty') || 'Please enter some content first', 'error');
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch(e) {
    showErrorPanel(e, raw);
    return null;
  }
}

// JSON escape/unescape input helpers
function jsonEscapeInput() {
  if (!inputEditor) return;
  const val = inputEditor.getValue();
  if (!val.trim()) { showToast(i18n('json.common.input_empty') || 'Input is empty', 'info'); return; }
  inputEditor.setValue(JSON.stringify(val));
  showToast(i18n('json.common.escaped') || 'Escaped', 'success');
}

function smartJsonUnescape(input) {
  const str = input.trim();
  if (!str) return str;

  // Try 1: input is valid JSON (could be a double-quoted string, or already a JSON object/array)
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed === 'string') {
      return parsed;
    }
    return JSON.stringify(parsed);
  } catch (e) {}

  // Try 2: input is wrapped in single quotes
  if (str.startsWith("'") && str.endsWith("'")) {
    const inner = str.slice(1, -1);
    try {
      const parsed = JSON.parse(inner);
      if (typeof parsed === 'string') return parsed;
      return JSON.stringify(parsed);
    } catch (e) {}
  }

  // Try 3: input is an escaped JSON string without outer quotes (e.g. {\"id\":\"xxx\"})
  // Parse it as JSON string content, using JSON.parse to handle all standard escape sequences
  try {
    const unescaped = JSON.parse('"' + str + '"');
    try {
      return JSON.stringify(JSON.parse(unescaped));
    } catch (e) {
      return unescaped;
    }
  } catch (e) {}

  throw new Error(i18n('json.repair.cannot_parse') || 'Unable to parse input');
}

function jsonUnescapeInput() {
  if (!inputEditor) return;
  const val = inputEditor.getValue().trim();
  if (!val) { showToast(i18n('json.common.input_empty') || 'Input is empty', 'info'); return; }
  try {
    const result = smartJsonUnescape(val);
    inputEditor.setValue(result);
    showToast(i18n('json.common.unescaped') || 'Unescaped', 'success');
  } catch(e) {
    showToast(i18n('json.common.unescape_failed') || 'Unescape failed: not a valid escaped string', 'error');
  }
}

// Built-in CSV helpers (fallback when PapaParse CDN fails)
function builtinCsvUnparse(data, options) {
  options = options || {};
  const delimiter = options.delimiter || ',';
  const newline = options.newline || '\n';
  if (!Array.isArray(data) || data.length === 0) return '';
  const keys = Object.keys(data[0]);
  if (keys.length === 0) return '';
  function escapeValue(val) {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.indexOf(delimiter) >= 0 || str.indexOf('"') >= 0 || str.indexOf('\n') >= 0 || str.indexOf('\r') >= 0) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }
  const lines = [keys.map(escapeValue).join(delimiter)];
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    lines.push(keys.map(function(k) { return escapeValue(row[k]); }).join(delimiter));
  }
  return lines.join(newline);
}

function builtinCsvParse(text, options) {
  options = options || {};
  const delimiter = options.delimiter || ',';
  const header = options.header !== false;
  const skipEmptyLines = options.skipEmptyLines !== false;
  const dynamicTyping = options.dynamicTyping !== false;
  function parseLine(line) {
    const values = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        let value = '';
        i++;
        while (i < line.length) {
          if (line[i] === '"') {
            if (i + 1 < line.length && line[i + 1] === '"') {
              value += '"';
              i += 2;
            } else {
              i++;
              break;
            }
          } else {
            value += line[i];
            i++;
          }
        }
        values.push(value);
        if (i < line.length && line[i] === delimiter) i++;
      } else {
        const nextQuote = line.indexOf(delimiter, i);
        if (nextQuote === -1) {
          values.push(line.slice(i));
          break;
        } else {
          values.push(line.slice(i, nextQuote));
          i = nextQuote + 1;
        }
      }
    }
    return values;
  }
  function convertType(val) {
    if (!dynamicTyping) return val;
    if (val === '') return '';
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (val === 'null') return null;
    if (!isNaN(Number(val)) && val.trim() !== '') {
      const num = Number(val);
      if (Number.isInteger(num)) return parseInt(val, 10);
      return num;
    }
    return val;
  }
  const lines = text.split(/\r?\n/);
  const rows = [];
  let headers = [];
  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    if (skipEmptyLines && line.trim() === '') continue;
    const values = parseLine(line);
    if (header && headers.length === 0) {
      headers = values;
    } else if (header) {
      const obj = {};
      for (let i = 0; i < headers.length; i++) {
        obj[headers[i]] = convertType(values[i] !== undefined ? values[i] : '');
      }
      rows.push(obj);
    } else {
      rows.push(values.map(convertType));
    }
  }
  return rows;
}

// JSON repair logic (shared across all JSON tool pages)
function repairJson(raw) {
  let s = raw.trim();
  s = s.replace(/^\uFEFF/, '');
  s = repairStringAware(s);
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch(e) {
    s = balanceBrackets(s);
    try {
      return JSON.stringify(JSON.parse(s), null, 2);
    } catch(e2) {
      return s;
    }
  }
}

function repairStringAware(str) {
  let res = '';
  let inStr = false;
  let strQuote = '';
  let esc = false;
  let i = 0;
  const len = str.length;
  let lastNonWs = '';
  let hadWs = false;

  while (i < len) {
    const ch = str[i];
    const ch2 = str[i + 1] || '';

    if (esc) { res += ch; esc = false; i++; continue; }
    if (ch === '\\' && inStr) { res += ch; esc = true; i++; continue; }

    // String opening — insert missing comma before entering new string
    if ((ch === '"' || ch === "'") && !inStr) {
      if (hadWs && /[0-9"\]}'el]/.test(lastNonWs)) { res += ','; }
      hadWs = false;
      inStr = true; strQuote = ch; res += '"'; i++; continue;
    }
    if (ch === strQuote && inStr) {
      inStr = false; strQuote = ''; res += '"'; lastNonWs = '"'; i++; continue;
    }
    if (inStr) {
      if (ch === '"' && strQuote === "'") { res += '\\"'; i++; continue; }
      res += ch; i++; continue;
    }

    if (/\s/.test(ch)) { res += ch; hadWs = true; i++; continue; }

    if (ch === '/' && ch2 === '/') { while (i < len && str[i] !== '\n') i++; continue; }
    if (ch === '/' && ch2 === '*') { i += 2; while (i < len && !(str[i] === '*' && str[i + 1] === '/')) i++; i += 2; continue; }

    if (ch === ',' && (ch2 === '}' || ch2 === ']' || /^\s*[}\]]/.test(str.slice(i + 1)))) { i++; continue; }

    if (/[{\[,]/.test(lastNonWs) && /[a-zA-Z_$]/.test(ch)) {
      let keyEnd = i;
      while (keyEnd < len && /[a-zA-Z0-9_$]/.test(str[keyEnd])) keyEnd++;
      const potentialKey = str.slice(i, keyEnd);
      let afterKey = keyEnd;
      while (afterKey < len && /\s/.test(str[afterKey])) afterKey++;
      if (str[afterKey] === ':') {
        res += '"' + potentialKey + '"'; i = keyEnd; lastNonWs = '"'; continue;
      }
    }

    if (hadWs && /[0-9"'tfn-{\[]/.test(ch) && /[0-9"\]}'el]/.test(lastNonWs)) { res += ','; }
    hadWs = false;

    if (ch === 'u' && str.slice(i, i + 9) === 'undefined') {
      const after = str.slice(i + 9).replace(/^\s+/, '');
      if (/^[,}\]:]/.test(after) || after === '') { res += 'null'; i += 9; lastNonWs = 'l'; continue; }
    }
    if (ch === 'N' && str.slice(i, i + 3) === 'NaN') {
      const after = str.slice(i + 3).replace(/^\s+/, '');
      if (/^[,}\]:]/.test(after) || after === '') { res += 'null'; i += 3; lastNonWs = 'l'; continue; }
    }
    if (ch === 'I' && str.slice(i, i + 8) === 'Infinity') {
      const after = str.slice(i + 8).replace(/^\s+/, '');
      if (/^[,}\]:]/.test(after) || after === '') { res += 'null'; i += 8; lastNonWs = 'l'; continue; }
    }

    res += ch; lastNonWs = ch; i++;
  }
  return res;
}

function balanceBrackets(s) {
  const pairs = { '{': '}', '[': ']' };
  const stack = [];
  let inStr = false, esc = false;
  for (const ch of s) {
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if (ch === '"' && !inStr) { inStr = true; continue; }
    if (ch === '"' && inStr) { inStr = false; continue; }
    if (inStr) continue;
    if ('{['.includes(ch)) stack.push(ch);
    if ('}]'.includes(ch) && stack.length && pairs[stack[stack.length-1]] === ch) stack.pop();
  }
  while (stack.length) s += pairs[stack.pop()];
  return s;
}

// JSON repair with detailed report
function repairJsonWithReport(raw) {
  const fixes = [];
  let s = raw.trim();
  s = s.replace(/^\uFEFF/, '');
  const reportResult = repairStringAwareReport(s, fixes);
  s = reportResult;
  try {
    return { result: JSON.stringify(JSON.parse(s), null, 2), fixes };
  } catch(e) {
    const beforeBalance = s;
    s = balanceBracketsReport(s, fixes);
    try {
      return { result: JSON.stringify(JSON.parse(s), null, 2), fixes };
    } catch(e2) {
      return { result: s, fixes };
    }
  }
}

function repairStringAwareReport(str, fixes) {
  let res = '';
  let inStr = false, strQuote = '', esc = false;
  let i = 0;
  const len = str.length;
  let lastNonWs = '';
  let hadWs = false;
  const getLine = () => (res + '').split('\n').length;

  while (i < len) {
    const ch = str[i];
    const ch2 = str[i + 1] || '';

    if (esc) { res += ch; esc = false; i++; continue; }
    if (ch === '\\' && inStr) { res += ch; esc = true; i++; continue; }

    if ((ch === '"' || ch === "'") && !inStr) {
      if (ch === "'") {
        fixes.push({ line: getLine(), type: 'single_quotes', desc: i18n('json.repair.single_quotes') || 'Single quotes → double quotes' });
      }
      if (hadWs && /[0-9"\]}'el]/.test(lastNonWs)) {
        fixes.push({ line: getLine(), type: 'added_comma', desc: i18n('json.repair.added_comma') || 'Added missing comma' });
        res += ',';
      }
      hadWs = false; inStr = true; strQuote = ch; res += '"'; i++; continue;
    }
    if (ch === strQuote && inStr) { inStr = false; strQuote = ''; res += '"'; lastNonWs = '"'; i++; continue; }
    if (inStr) {
      if (ch === '"' && strQuote === "'") { res += '\\"'; i++; continue; }
      res += ch; i++; continue;
    }

    if (/\s/.test(ch)) { res += ch; hadWs = true; i++; continue; }

    if (ch === '/' && ch2 === '/') {
      fixes.push({ line: getLine(), type: 'comment_removed', desc: i18n('json.repair.comment_removed') || 'Removed comment' });
      while (i < len && str[i] !== '\n') i++; continue;
    }
    if (ch === '/' && ch2 === '*') {
      fixes.push({ line: getLine(), type: 'comment_removed', desc: i18n('json.repair.comment_removed') || 'Removed block comment' });
      i += 2; while (i < len && !(str[i] === '*' && str[i + 1] === '/')) i++; i += 2; continue;
    }

    if (ch === ',' && (ch2 === '}' || ch2 === ']' || /^\s*[}\]]/.test(str.slice(i + 1)))) {
      fixes.push({ line: getLine(), type: 'trailing_comma', desc: i18n('json.repair.trailing_comma') || 'Removed trailing comma' });
      i++; continue;
    }

    if (/[{\[,]/.test(lastNonWs) && /[a-zA-Z_$]/.test(ch)) {
      let keyEnd = i;
      while (keyEnd < len && /[a-zA-Z0-9_$]/.test(str[keyEnd])) keyEnd++;
      const potentialKey = str.slice(i, keyEnd);
      let afterKey = keyEnd;
      while (afterKey < len && /\s/.test(str[afterKey])) afterKey++;
      if (str[afterKey] === ':') {
        fixes.push({ line: getLine(), type: 'unquoted_key', desc: i18n('json.repair.unquoted_key') || 'Quoted unquoted key' });
        res += '"' + potentialKey + '"'; i = keyEnd; lastNonWs = '"'; continue;
      }
    }

    if (hadWs && /[0-9"'tfn-{\[]/.test(ch) && /[0-9"\]}'el]/.test(lastNonWs)) {
      fixes.push({ line: getLine(), type: 'added_comma', desc: i18n('json.repair.added_comma') || 'Added missing comma' });
      res += ',';
    }
    hadWs = false;

    if (ch === 'u' && str.slice(i, i + 9) === 'undefined') {
      const after = str.slice(i + 9).replace(/^\s+/, '');
      if (/^[,}\]:]/.test(after) || after === '') {
        fixes.push({ line: getLine(), type: 'undefined_null', desc: i18n('json.repair.undefined_null') || 'undefined→null' });
        res += 'null'; i += 9; lastNonWs = 'l'; continue;
      }
    }
    if (ch === 'N' && str.slice(i, i + 3) === 'NaN') {
      const after = str.slice(i + 3).replace(/^\s+/, '');
      if (/^[,}\]:]/.test(after) || after === '') {
        fixes.push({ line: getLine(), type: 'nan_null', desc: i18n('json.repair.nan_null') || 'NaN→null' });
        res += 'null'; i += 3; lastNonWs = 'l'; continue;
      }
    }
    if (ch === 'I' && str.slice(i, i + 8) === 'Infinity') {
      const after = str.slice(i + 8).replace(/^\s+/, '');
      if (/^[,}\]:]/.test(after) || after === '') {
        fixes.push({ line: getLine(), type: 'infinity_null', desc: i18n('json.repair.infinity_null') || 'Infinity→null' });
        res += 'null'; i += 8; lastNonWs = 'l'; continue;
      }
    }

    res += ch; lastNonWs = ch; i++;
  }
  return res;
}

function balanceBracketsReport(s, fixes) {
  const pairs = { '{': '}', '[': ']' };
  const stack = [];
  let inStr = false, esc = false;
  for (const ch of s) {
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if (ch === '"' && !inStr) { inStr = true; continue; }
    if (ch === '"' && inStr) { inStr = false; continue; }
    if (inStr) continue;
    if ('{['.includes(ch)) stack.push(ch);
    if ('}]'.includes(ch) && stack.length && pairs[stack[stack.length-1]] === ch) stack.pop();
  }
  if (stack.length) {
    const line = s.split('\n').length;
    fixes.push({ line, type: 'missing_bracket', desc: (i18n('json.repair.missing_bracket') || 'Added missing bracket(s)') + ' ' + stack.map(c => pairs[c]).join('') });
    while (stack.length) s += pairs[stack.pop()];
  }
  return s;
}

// Show repair report panel
function showRepairReport(fixes) {
  if (!fixes || !fixes.length) return;
  const container = document.getElementById('repairReportPanel');
  if (!container) return;
  const lines = fixes.map(f => `<div class="jt-repair-report__item"><span class="jt-repair-report__line">L${f.line}</span><span class="jt-repair-report__desc">${escapeHtml(f.desc)}</span></div>`);
  container.innerHTML = `<div class="jt-repair-report__header">✅ ${i18n('json.repair.report_title') || 'Repair Report'} (${fixes.length})</div>` + lines.join('');
  container.style.display = 'block';
}

// JSON repair input helper — repairs input in-place and auto-triggers process
function jsonRepairInput() {
  if (typeof inputEditor === 'undefined' || !inputEditor) return;
  const val = inputEditor.getValue().trim();
  if (!val) { showToast(i18n('json.common.input_empty') || 'Input is empty', 'info'); return; }
  try {
    const repaired = repairJson(val);
    // Compare parsed results: if both parse to the same object, only formatting changed
    let changed;
    try {
      const origParsed = JSON.parse(val);
      const repParsed = JSON.parse(repaired);
      changed = JSON.stringify(origParsed) !== JSON.stringify(repParsed);
    } catch(e) {
      // Original didn't parse (had errors) — if repaired parses, it was fixed
      try { JSON.parse(repaired); changed = true; } catch(e2) { changed = repaired.trim() !== val; }
    }
    inputEditor.setValue(repaired);
    showToast(changed ? (i18n('json.repair.repaired') || 'Repaired') : (i18n('json.repair.formatted') || 'JSON formatted'), 'success');
    if (typeof processJson === 'function') processJson();
  } catch(e) {
    showToast((i18n('json.repair.failed') || 'Repair failed') + ': ' + e.message, 'error');
  }
}

function loadExample() {
  const examples = {
    'from-yaml': 'name: John\nage: 30\ncity: Beijing',
    'from-xml':  '<?xml version="1.0"?>\n<root>\n  <name>John</name>\n  <age>30</age>\n</root>',
    'from-csv':  'name,age,city\nAlice,30,Beijing\nBob,25,Shanghai',
    'from-sql':  "INSERT INTO users (name, age) VALUES ('Alice', 30);\nINSERT INTO users (name, age) VALUES ('Bob', 25);",
    'base64':    '{"name":"John","age":30}',
    'jwt':       'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    'jsonc':     '{\n  // This is a comment\n  "name": "John", // inline comment\n  /* block comment */\n  "age": 30, // trailing comma allowed in JSONC\n}',
    'from-toml': '[server]\nhost = "localhost"\nport = 8080\n\n[database]\nurl = "postgres://localhost/mydb"\nmax_connections = 100',
    'from-query': '?name=John&age=30&city=Beijing&active=true&tags=dev&tags=coder',
    'python-dict': "{'name': 'John', 'age': 30, 'hobbies': ['coding', 'reading'], 'active': True, 'address': None}",
    'to-yaml':   '{\n  "name": "John",\n  "age": 30,\n  "city": "Beijing",\n  "hobbies": ["coding", "reading"]\n}',
    'to-csv':    '[\n  {"name": "Alice", "age": 30, "city": "Beijing"},\n  {"name": "Bob", "age": 25, "city": "Shanghai"},\n  {"name": "Charlie", "age": 35, "city": "Guangzhou"}\n]',
    'to-excel':  '[\n  {"name": "Alice", "age": 30, "city": "Beijing"},\n  {"name": "Bob", "age": 25, "city": "Shanghai"},\n  {"name": "Charlie", "age": 35, "city": "Guangzhou"}\n]',
    'to-markdown': '[\n  {"name": "Alice", "age": 30, "city": "Beijing"},\n  {"name": "Bob", "age": 25, "city": "Shanghai"},\n  {"name": "Charlie", "age": 35, "city": "Guangzhou"}\n]',
    'key-transform': '{\n  "firstName": "John",\n  "lastName": "Doe",\n  "emailAddress": "john@example.com",\n  "phoneNumber": "123-456-7890",\n  "homeAddress": {\n    "streetName": "Main St",\n    "zipCode": "10001"\n  }\n}',
    'mock': '{\n  "type": "object",\n  "properties": {\n    "name": { "type": "string" },\n    "email": { "type": "string", "format": "email" },\n    "age": { "type": "integer", "minimum": 18, "maximum": 65 },\n    "active": { "type": "boolean" },\n    "tags": { "type": "array", "items": { "type": "string" } }\n  }\n}',
    'patch': '{\n  "data": {\n    "name": "John",\n    "age": 30,\n    "city": "Beijing"\n  },\n  "patch": [\n    {"op": "replace", "path": "/age", "value": 31},\n    {"op": "add", "path": "/email", "value": "john@example.com"},\n    {"op": "remove", "path": "/city"}\n  ]\n}',
    'merge': '[\n  {"name": "John", "age": 30, "hobbies": ["coding"]},\n  {"age": 31, "city": "Beijing", "hobbies": ["reading"]},\n  {"email": "john@example.com", "name": "John Doe"}\n]',
    'transform': '[\n  {"name": "Alice", "age": 30, "city": "Beijing"},\n  {"name": "Bob", "age": 25, "city": "Shanghai"},\n  {"name": "Charlie", "age": 35, "city": "Beijing"}\n]',
    'jsonl': '{"name":"Alice","age":30,"city":"Beijing"}\n{"name":"Bob","age":25,"city":"Shanghai"}\n{"name":"Charlie","age":35,"city":"Guangzhou"}',
    'array': '[\n  {"name": "Charlie", "age": 35},\n  {"name": "Alice", "age": 30},\n  {"name": "Bob", "age": 25},\n  {"name": "Alice", "age": 30}\n]',
    'to-env': '{\n  "database": {\n    "host": "localhost",\n    "port": 5432,\n    "name": "myapp"\n  },\n  "redis": {\n    "host": "localhost",\n    "port": 6379\n  },\n  "debug": true\n}',
    'to-zod': '{\n  "name": "John",\n  "email": "john@example.com",\n  "age": 30,\n  "address": {\n    "city": "Beijing",\n    "zip": "10001"\n  }\n}',
    'to-graphql': '{\n  "users": [\n    {"id": 1, "name": "Alice", "email": "alice@example.com", "active": true},\n    {"id": 2, "name": "Bob", "email": "bob@example.com", "active": false}\n  ]\n}',
    'redact': '{\n  "name": "John Doe",\n  "email": "john@example.com",\n  "phone": "123-456-7890",\n  "ip": "192.168.1.100",\n  "api_key": "sk-abc123xyz",\n  "address": {\n    "city": "Beijing",\n    "email": "home@example.com"\n  }\n}',
  };
  const defaultEx = {
    name: 'John Doe', age: 30, email: 'john@example.com',
    address: { city: 'Beijing', country: 'China' },
    hobbies: ['coding', 'reading', 'hiking'],
    scores: [98.5, 87, 92.3],
  };
  const tool = window.JT_TOOL || '';
  const val  = examples[tool] || JSON.stringify(defaultEx, null, 2);
  inputEditor?.setValue(val);
  clearErrorPanel();
  // Trigger validation update after loading example
  updateValidationBadge();
  if (typeof gaTrackToolInteraction === 'function') {
    gaTrackToolInteraction(tool || 'json-tool', 'load_example');
  }
}

function clearInput()  {
  inputEditor?.setValue('');
  clearErrorPanel();
  if (typeof gaTrackToolInteraction === 'function') {
    gaTrackToolInteraction(window.JT_TOOL || 'json-tool', 'clear_input');
  }
  const badge = document.getElementById('realtimeValidationBadge');
  if (badge) {
    badge.className = 'jt-validation-badge jt-validation-badge--empty';
    badge.innerHTML = `<span class="jt-badge-icon"></span><span class="jt-badge-text">${i18n('json.validation.waiting')}</span>`;
    badge.onclick = null;
    badge.style.cursor = 'default';
  }
  clearEditorErrorMarkers();
}
function clearOutput() { outputEditor?.setValue(''); }

function copyOutput() {
  const text = getOutput();
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast(i18n('json.common.copy_done') || 'Copied!', 'success');
    const btn = document.getElementById('copyBtn');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ ' + (i18n('json.common.copy_done') || 'Copied!');
      btn.classList.add('jt-btn--success');
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('jt-btn--success'); }, 1500);
    }
    if (typeof gaTrackResultCopy === 'function') {
      gaTrackResultCopy(window.JT_TOOL || 'json-tool', 'json');
    }
  });
}

function downloadOutput(filename, ext) {
  const text = getOutput();
  if (!text) return;
  const tool = window.JT_TOOL || '';
  const extMap = {
    'to-yaml': 'yaml', 'from-yaml': 'json',
    'to-csv':  'csv',  'from-csv':  'json',
    'to-xml':  'xml',  'from-xml':  'json',
    'to-sql':  'sql',  'from-sql':  'json',
    'to-markdown': 'md',
    'to-typescript': 'ts', 'to-python': 'py',
    'to-java': 'java',     'to-csharp': 'cs',
    'to-go':   'go',       'to-kotlin': 'kt',
    'to-swift':'swift',    'to-rust':   'rs',
    'to-php':  'php',
    'to-dart': 'dart',    'to-objc': 'h',
    'to-cpp':  'hpp',     'to-ruby':  'rb',
    'to-scala':'scala',   'to-toml': 'toml',
  };
  const defaultExt = ext || extMap[tool] || 'json';
  const defaultFn = filename || ('output.' + defaultExt);

  // Show download dialog
  let dlg = document.getElementById('jtDownloadDlg');
  if (!dlg) {
    dlg = document.createElement('div');
    dlg.id = 'jtDownloadDlg';
    dlg.className = 'jt-download-dialog';
    document.body.appendChild(dlg);
  }
  dlg.innerHTML = '<div class="jt-dlg-content">' +
    '<h4>' + (i18n('json.common.download') || 'Download') + '</h4>' +
    '<div class="jt-dlg-row"><label>Filename</label><input id="jtDlFilename" value="' + defaultFn + '" class="jt-dlg-input"></div>' +
    '<div class="jt-dlg-row"><label>Format</label><select id="jtDlFormat" class="jt-dlg-input"><option value="json"' + (defaultExt === 'json' ? ' selected' : '') + '>.json</option><option value="txt"' + (defaultExt === 'txt' ? ' selected' : '') + '>.txt</option><option value="' + defaultExt + '"' + (defaultExt !== 'json' && defaultExt !== 'txt' ? ' selected' : '') + '>.' + defaultExt + '</option></select></div>' +
    '<div class="jt-dlg-actions"><button class="jt-btn jt-btn--primary" id="jtDlConfirm">' + (i18n('json.common.download') || 'Download') + '</button><button class="jt-btn jt-btn--ghost" id="jtDlCancel">' + (i18n('json.common.cancel') || 'Cancel') + '</button></div></div>';
  dlg.style.display = 'flex';

  document.getElementById('jtDlCancel').onclick = function() { dlg.style.display = 'none'; };
  document.getElementById('jtDlConfirm').onclick = function() {
    const fn = document.getElementById('jtDlFilename').value || defaultFn;
    const fmt = document.getElementById('jtDlFormat').value;
    const finalFn = fn.replace(/\.[^.]+$/, '') + '.' + fmt;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    if (window.saveAs) { saveAs(blob, finalFn); }
    else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = finalFn;
      a.click();
      URL.revokeObjectURL(a.href);
    }
    dlg.style.display = 'none';
    showToast('✓', 'success');
    if (typeof gaTrackDownload === 'function') {
      gaTrackDownload(window.JT_TOOL || 'json-tool', fmt || 'text');
    }
  };
  dlg.onclick = function(ev) { if (ev.target === dlg) dlg.style.display = 'none'; };
}

// Reverse tool mapping: tool -> its inverse tool
const REVERSE_TOOLS = {
  'escape': 'unescape', 'unescape': 'escape',
  'pretty': 'minify', 'minify': 'pretty',
  'to-yaml': 'from-yaml', 'from-yaml': 'to-yaml',
  'to-xml': 'from-xml', 'from-xml': 'to-xml',
  'to-csv': 'from-csv', 'from-csv': 'to-csv',
  'to-sql': 'from-sql', 'from-sql': 'to-sql',
  'to-excel': 'from-excel', 'from-excel': 'to-excel',
  'to-toml': 'from-toml', 'from-toml': 'to-toml',
  'to-query': 'from-query', 'from-query': 'to-query',
  'stringify': 'unescape',
  'jsonc': 'validate',
  'schema-generate': 'schema-validate',
  'jsonl': 'pretty',
  'to-env': 'from-query',
};

function swapEditors() {
  const a = getInput(), b = getOutput();
  if (!a && !b) {
    showToast(i18n('json.common.swap_empty') || 'Both input and output are empty', 'info');
    return;
  }
  if (!b) {
    showToast(i18n('json.common.swap_no_output') || 'Please run the tool first to generate output', 'info');
    return;
  }

  const currentTool = window.JT_TOOL || '';
  const reverseTool = REVERSE_TOOLS[currentTool];

  // If this tool has a reverse/inverse tool, navigate to it with the output as input
  if (reverseTool && b) {
    const maxHash = 8000;
    let hash = '';
    if (b.length <= maxHash) {
      hash = '#' + encodeURIComponent(b);
    }
    const lang = window.JT_LANG || 'en';
    location.href = `/json/${reverseTool}?lang=${lang}${hash}`;
    return;
  }

  // No reverse tool: swap in place
  inputEditor?.setValue(b);
  if (outputEditor) {
    outputEditor.updateOptions({ readOnly: false });
    outputEditor.setValue(a);
    outputEditor.updateOptions({ readOnly: true });
  }
  clearErrorPanel();
  outputTreeViewVisible = false;
  const editorDiv = document.getElementById('outputEditor');
  const treeDiv = document.getElementById('outputTree');
  if (editorDiv && treeDiv) {
    editorDiv.style.display = '';
    treeDiv.classList.remove('visible');
    treeDiv.style.display = 'none';
  }
  showToast(i18n('json.common.swap') || 'Swapped input/output', 'success');
}

// Swap left/right editors for diff tool
function swapDiffEditors() {
  if (!leftEditor || !rightEditor) return;
  const leftVal = leftEditor.getValue();
  const rightVal = rightEditor.getValue();
  leftEditor.setValue(rightVal);
  rightEditor.setValue(leftVal);
  showToast(i18n('json.common.swap') || 'Swapped left/right JSON', 'success');
}

function uploadFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    inputEditor?.setValue(e.target.result);
    clearErrorPanel();
  };
  reader.readAsText(file, 'utf-8');
  input.value = '';
}

// Fetch JSON from URL
async function fetchJsonFromUrl() {
  const input = document.getElementById('jsonUrlInput');
  const url = input?.value?.trim();
  if (!url) {
    showToast(i18n('json.common.url_empty') || 'Please enter a URL', 'error');
    return;
  }

  const btn = input?.nextElementSibling;
  const origText = btn?.innerHTML;
  if (btn) btn.innerHTML = '...';

  try {
    const resp = await fetch('/api/tools/json/fetch?url=' + encodeURIComponent(url), {
      signal: AbortSignal.timeout(20000)
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Error ${resp.status}`);
    }

    const text = await resp.text();

    if (inputEditor) {
      inputEditor.setValue(text);
      // Auto-format if valid JSON
      try {
        const parsed = JSON.parse(text);
        const formatted = JSON.stringify(parsed, null, 2);
        inputEditor.setValue(formatted);
        showToast(i18n('json.common.fetch_success') || 'JSON loaded successfully', 'success');
      } catch (e) {
        // Not valid JSON, just set as-is
        showToast(i18n('json.common.fetch_success_raw') || 'Content loaded (not JSON)', 'info');
      }
    }
    clearErrorPanel();
  } catch (err) {
    const msg = err.name === 'TimeoutError'
      ? (i18n('json.common.fetch_timeout') || 'Request timed out')
      : (err.message || (i18n('json.common.fetch_error') || 'Failed to fetch URL'));
    showToast(msg, 'error');
  } finally {
    if (btn && origText) btn.innerHTML = origText;
  }
}

function updateInputStats() {
  const text = getInput();
  const el   = document.getElementById('inputSize');
  const bytes = new Blob([text]).size;
  if (el) el.textContent = formatBytes(bytes);
  // Warn for large files
  if (bytes > LARGE_FILE_WARNING) {
    const warnEl = document.getElementById('inputWarning');
    if (warnEl) {
      warnEl.textContent = i18n('json.common.large_file_warning') || 'Large files may affect performance';
      warnEl.style.display = '';
    }
  }
  // Update JSON stats (nodes, depth, lines)
  _updateJsonStats(text);
  // Dynamic page title
  _updatePageTitle(text);
}

function _updatePageTitle(text) {
  const base = document.querySelector('meta[name="jt-base-title"]');
  const baseTitle = base ? base.content : (window.JT_TOOL_NAME || 'JSON Tools');
  if (!text || !text.trim()) {
    document.title = baseTitle;
    return;
  }
  try {
    JSON.parse(text);
    document.title = '✅ ' + baseTitle;
  } catch(e) {
    document.title = '❌ ' + baseTitle;
  }
}

function _updateJsonStats(text) {
  const statsEl = document.getElementById('inputJsonStats');
  if (!statsEl) return;
  if (!text || !text.trim()) { statsEl.innerHTML = ''; return; }
  const lblNodes = i18n('json.common.stats_nodes') || 'Nodes';
  const lblDepth = i18n('json.common.stats_depth') || 'Depth';
  const lblLines = i18n('json.common.stats_lines') || 'Lines';
  try {
    const parsed = JSON.parse(text);
    const info = _analyzeJson(parsed);
    const lines = text.split('\n').length;
    statsEl.innerHTML =
      `<span class="jt-json-stats__item">${lblNodes}: ${info.nodes}</span>` +
      `<span class="jt-json-stats__sep">|</span>` +
      `<span class="jt-json-stats__item">${lblDepth}: ${info.depth}</span>` +
      `<span class="jt-json-stats__sep">|</span>` +
      `<span class="jt-json-stats__item">${lblLines}: ${lines}</span>` +
      `<span class="jt-json-stats__sep">|</span>` +
      `<span class="jt-json-stats__item" id="inputCursorPos">Ln 1, Col 1</span>`;
  } catch(e) {
    const lines = text.split('\n').length;
    statsEl.innerHTML = `<span class="jt-json-stats__item">${lblLines}: ${lines}</span>`;
  }
}

function _analyzeJson(obj, depth) {
  if (depth === undefined) depth = 0;
  let nodes = 1, maxDepth = depth;
  if (obj && typeof obj === 'object') {
    const vals = Array.isArray(obj) ? obj : Object.values(obj);
    for (const v of vals) {
      const sub = _analyzeJson(v, depth + 1);
      nodes += sub.nodes;
      maxDepth = Math.max(maxDepth, sub.depth);
    }
  }
  return { nodes, depth: maxDepth };
}

/* ── Ghost Placeholder ──────────────────────────── */
function initGhostPlaceholder() {
  if (!inputEditor) return;
  if (!inputEditor.getValue().trim()) {
    loadExample();
  }
}

/* ── Cursor Position Tracking ───────────────────── */
function initCursorTracking() {
  if (!inputEditor) return;
  inputEditor.onDidChangeCursorPosition(function(e) {
    const el = document.getElementById('inputCursorPos');
    if (el) el.textContent = 'Ln ' + e.position.lineNumber + ', Col ' + e.position.column;
  });
}

/* ── Same Key Highlight + F3 Navigation ────────── */
let _sameKeyDecorations = [];
let _sameKeyPositions = [];
let _sameKeyCurrentIdx = -1;

function initSameKeyHighlight() {
  if (!inputEditor) return;
  inputEditor.onDidChangeCursorPosition(function(e) {
    if (e.reason === 2 || e.reason === 3) return; // skip navigation reasons
    _highlightSameKeys(e.position);
  });
  // F3: next same key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F3' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      _jumpToNextSameKey(e.shiftKey ? -1 : 1);
    }
  });
}

function _highlightSameKeys(pos) {
  // Clear previous
  _sameKeyDecorations = [];
  _sameKeyPositions = [];
  _sameKeyCurrentIdx = -1;

  const model = inputEditor.getModel();
  if (!model) return;
  const word = model.getWordAtPosition(pos);
  if (!word || !word.word) {
    inputEditor.deltaDecorations(_sameKeyDecorations, []);
    _updateSameKeyBadge(0);
    return;
  }
  const keyName = word.word;
  // Only highlight if the word looks like a JSON key (before a colon)
  const line = model.getLineContent(pos.lineNumber);
  const afterWord = line.substring(word.endColumn - 1);
  if (!/^\s*:/.test(afterWord)) {
    inputEditor.deltaDecorations(_sameKeyDecorations, []);
    _updateSameKeyBadge(0);
    return;
  }
  // Find all occurrences
  const matches = model.findMatches(keyName, false, false, true, null, true);
  const keyMatches = matches.filter(m => {
    const l = model.getLineContent(m.range.startLineNumber);
    const after = l.substring(m.range.endColumn - 1);
    return /^\s*:/.test(after);
  });
  if (keyMatches.length <= 1) {
    inputEditor.deltaDecorations(_sameKeyDecorations, []);
    _updateSameKeyBadge(0);
    return;
  }
  _sameKeyPositions = keyMatches.map(m => ({ line: m.range.startLineNumber, col: m.range.startColumn }));
  const decs = keyMatches.map(m => ({
    range: new monaco.Range(m.range.startLineNumber, m.range.startColumn, m.range.startLineNumber, m.range.endColumn),
    options: { inlineClassName: 'jt-same-key-highlight' }
  }));
  _sameKeyDecorations = inputEditor.deltaDecorations([], decs);
  // Find current index
  _sameKeyCurrentIdx = keyMatches.findIndex(m => m.range.startLineNumber === pos.lineNumber && m.range.startColumn === pos.startColumn);
  _updateSameKeyBadge(keyMatches.length);
}

function _jumpToNextSameKey(dir) {
  if (_sameKeyPositions.length === 0) return;
  _sameKeyCurrentIdx += dir;
  if (_sameKeyCurrentIdx >= _sameKeyPositions.length) _sameKeyCurrentIdx = 0;
  if (_sameKeyCurrentIdx < 0) _sameKeyCurrentIdx = _sameKeyPositions.length - 1;
  const p = _sameKeyPositions[_sameKeyCurrentIdx];
  inputEditor.revealLineInCenter(p.line);
  inputEditor.setPosition({ lineNumber: p.line, column: p.col });
}

function _updateSameKeyBadge(count) {
  let badge = document.getElementById('jtSameKeyBadge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'jtSameKeyBadge';
    badge.className = 'jt-same-key-badge';
    const editorWrap = document.querySelector('.jt-editor-wrap');
    if (editorWrap) editorWrap.appendChild(badge);
  }
  if (count > 1) {
    badge.textContent = (i18n('json.common.same_key_count') || 'Found') + ': ' + count;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

/* ── Validation Badge ──────────────────────────────── */
let _validationTimer = null;
let _lastErrorPosition = { line: 0, col: 0 };

function updateValidationBadge() {
  clearTimeout(_validationTimer);
  _validationTimer = setTimeout(_doValidationBadge, 300);
}

function showRepairBadge(fixCount) {
  const badge = document.getElementById('realtimeValidationBadge');
  if (!badge) return;
  badge.className = 'jt-validation-badge jt-validation-badge--repair';
  badge.innerHTML = `<span class="jt-badge-icon"></span><span class="jt-badge-text">⚠ ` + (i18n('json.repair.fix_count') || 'Fixed') + ` ${fixCount}</span>`;
  badge.style.cursor = '';
  badge.onclick = null;
  // Auto-revert to normal validation after 5s
  setTimeout(() => _doValidationBadge(), 5000);
}

function _doValidationBadge() {
  const badge = document.getElementById('realtimeValidationBadge');
  if (!badge) return;
  const text = getInput();
  if (!text || !text.trim()) {
    badge.className = 'jt-validation-badge jt-validation-badge--empty';
    badge.innerHTML = `<span class="jt-badge-icon"></span><span class="jt-badge-text">${i18n('json.validation.waiting')}</span>`;
    badge.onclick = null;
    badge.style.cursor = 'default';
    clearEditorErrorMarkers();
    return;
  }
  try {
    JSON.parse(text);
    badge.className = 'jt-validation-badge jt-validation-badge--valid';
    badge.innerHTML = `<span class="jt-badge-icon"></span><span class="jt-badge-text">${i18n('json.validation.valid')}</span>`;
    badge.onclick = null;
    badge.style.cursor = 'default';
    clearEditorErrorMarkers();
  } catch(e) {
    const { line, col } = parseErrorPosition(e.message, text);
    _lastErrorPosition = { line, col };
    badge.className = 'jt-validation-badge jt-validation-badge--error';
    const errorText = i18n('json.validation.error').replace('{line}', line);
    badge.innerHTML = `<span class="jt-badge-icon"></span><span class="jt-badge-text">${errorText}</span>`;
    badge.style.cursor = 'pointer';
    badge.onclick = function() {
      gotoErrorLine(line, col);
    };
    // Show error markers in editor
    showEditorErrorMarkers(e.message, line, col);
  }
}

function parseErrorPosition(errMsg, text) {
  // Try to extract position from error message
  const posMatch = errMsg.match(/position (\d+)/);
  if (posMatch) {
    const pos = parseInt(posMatch[1], 10);
    const lines = text.substring(0, pos).split('\n');
    return { line: lines.length, col: lines[lines.length - 1].length + 1 };
  }
  const lineMatch = errMsg.match(/line (\d+) column (\d+)/);
  if (lineMatch) {
    return { line: parseInt(lineMatch[1], 10), col: parseInt(lineMatch[2], 10) };
  }
  return { line: 1, col: 1 };
}

function gotoErrorLine(line, col) {
  if (!inputEditor) return;
  inputEditor.revealLineInCenter(line);
  inputEditor.setPosition({ lineNumber: line, column: col });
  inputEditor.focus();
}

function showEditorErrorMarkers(errMsg, line, col) {
  if (!inputEditor) return;
  const model = inputEditor.getModel();
  monaco.editor.setModelMarkers(model, 'json-lint', [{
    startLineNumber: line,
    endLineNumber: line,
    startColumn: Math.max(1, col),
    endColumn: col + 10,
    severity: monaco.MarkerSeverity.Error,
    message: errMsg,
  }]);
  // Add custom decoration for error line
  const decorations = inputEditor.createDecorationsCollection([{
    range: new monaco.Range(line, 1, line, 1),
    options: {
      isWholeLine: true,
      className: 'jt-error-line',
      glyphMarginClassName: 'jt-error-glyph',
      hoverMessage: {
        value: `Line ${line}: ${errMsg}`,
      }
    }
  }]);
}

function clearEditorErrorMarkers() {
  if (!inputEditor) return;
  monaco.editor.setModelMarkers(inputEditor.getModel(), 'json-lint', []);
}

function updateOutputStats(text, elapsed) {
  const el = document.getElementById('outputSize');
  if (el) el.textContent = formatBytes(new Blob([text || '']).size);
  const timeEl = document.getElementById('outputTime');
  if (timeEl && elapsed) timeEl.textContent = elapsed + 'ms';
}

/* ── Font Size Control ─────────────────────────── */
let _currentFontSize = parseInt(localStorage.getItem('jt-font-size')) || 13;

function adjustFontSize(delta) {
  _currentFontSize = Math.max(10, Math.min(24, _currentFontSize + delta));
  localStorage.setItem('jt-font-size', _currentFontSize);
  applyFontSize();
}

function applyFontSize() {
  [inputEditor, outputEditor].forEach(ed => {
    if (ed) ed.updateOptions({ fontSize: _currentFontSize });
  });
  // Update A-/A+ label
  const label = document.getElementById('jtFontSizeLabel');
  if (label) label.textContent = _currentFontSize + 'px';
}

function initFontSizeControl() {
  if (_currentFontSize !== 13) applyFontSize();
  // Ctrl/Cmd + wheel zoom on editor containers
  ['inputEditor', 'outputEditor'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('wheel', function(e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        adjustFontSize(e.deltaY < 0 ? 1 : -1);
      }
    }, { passive: false });
  });
}

/* ── Auto-Format on Paste ──────────────────────── */
function initAutoFormatOnPaste() {
  if (!inputEditor) return;
  const editorEl = document.getElementById('inputEditor');
  if (!editorEl) return;

  editorEl.addEventListener('paste', function(e) {
    const pasted = (e.clipboardData || window.clipboardData)?.getData('text');
    if (!pasted) return;
    const trimmed = pasted.trim();
    // Only auto-format if it looks like JSON
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return;

    // Check if it's compact/minified (no newlines or very short)
    const hasNewlines = trimmed.indexOf('\n') > 0;
    const isCompact = !hasNewlines || trimmed.split('\n').length <= 2;
    if (!isCompact) return;

    // Wait for Monaco to insert the pasted content
    setTimeout(function() {
      const current = inputEditor.getValue().trim();
      if (!current) return;
      try {
        JSON.parse(current);
        // Valid JSON and compact — auto-format
        const formatted = JSON.stringify(JSON.parse(current), null, 2);
        // Only format if it actually changed
        if (formatted !== current) {
          inputEditor.setValue(formatted);
          showToast(i18n('json.common.auto_formatted') || 'Auto-formatted', 'success');
        }
      } catch (err) {
        // Not valid JSON, ignore
      }
    }, 50);
  });
}

/* ── Clipboard Smart Detection (UX-13) ──────────── */
function initClipboardDetection() {
  if (!inputEditor) return;
  let offered = false;
  inputEditor.onDidFocusEditorWidget(function() {
    if (offered) return;
    if (inputEditor.getValue().trim()) return;
    // Try reading clipboard for JSON content
    if (!navigator.clipboard || !navigator.clipboard.readText) return;
    navigator.clipboard.readText().then(function(text) {
      if (!text || !text.trim()) return;
      const trimmed = text.trim();
      // Check if clipboard looks like JSON/YAML/XML
      if (/^[\[{]/.test(trimmed) || /^---/.test(trimmed) || /^<\?xml/.test(trimmed)) {
        offered = true;
        showClipboardBanner(trimmed);
      }
    }).catch(function() { /* permission denied, ignore */ });
  });
}

function showClipboardBanner(text) {
  let banner = document.getElementById('jtClipboardBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'jtClipboardBanner';
    banner.className = 'jt-clipboard-banner';
    document.body.appendChild(banner);
  }
  const preview = text.slice(0, 80).replace(/\n/g, ' ') + (text.length > 80 ? '...' : '');
  banner.innerHTML =
    '<span class="jt-clipboard-banner__text">📋 ' + (i18n('json.common.clipboard_detected') || 'JSON detected in clipboard') + '</span>' +
    '<code class="jt-clipboard-banner__preview">' + escapeHtml(preview) + '</code>' +
    '<button class="jt-btn jt-btn--primary jt-btn--sm" onclick="applyClipboard()">' + (i18n('json.common.paste') || 'Paste') + '</button>' +
    '<button class="jt-btn jt-btn--ghost jt-btn--sm" onclick="dismissClipboard()">' + (i18n('json.common.cancel') || 'Cancel') + '</button>';
  banner.style.display = 'flex';
  banner._clipboardText = text;
  // Auto-dismiss after 8s
  banner._timer = setTimeout(function() { banner.style.display = 'none'; }, 8000);
}

function applyClipboard() {
  const banner = document.getElementById('jtClipboardBanner');
  if (banner && banner._clipboardText) {
    inputEditor.setValue(banner._clipboardText);
    clearTimeout(banner._timer);
    banner.style.display = 'none';
  }
}

function dismissClipboard() {
  const banner = document.getElementById('jtClipboardBanner');
  if (banner) { clearTimeout(banner._timer); banner.style.display = 'none'; }
}

/* ── Share Button (UX-18) ─────────────────────── */
function initShareButton() {
  const shareBtn = document.getElementById('jtShareBtn');
  if (!shareBtn) return;
  shareBtn.addEventListener('click', function() {
    const input = getInput().trim();
    const output = getOutput().trim();
    const tool = window.JT_TOOL || '';
    const lang = window.JT_LANG || 'en';
    let hash = '';
    const data = output || input;
    if (data) {
      try {
        // Safe encoding for Unicode: encode UTF-8 bytes to base64
        const encoder = new TextEncoder();
        const bytes = encoder.encode(data);
        const base64 = btoa(String.fromCharCode.apply(null, bytes));
        if (base64.length < 6000) {
          hash = '#share=' + base64;
        }
      } catch(e) {
        // Fallback: just use the data directly if small
        if (data.length < 3000) {
          hash = '#' + encodeURIComponent(data);
        }
      }
    }
    const url = location.origin + '/json/' + tool + '?lang=' + lang + hash;
    navigator.clipboard.writeText(url).then(function() {
      showToast(i18n('json.common.share_copied') || 'Share URL copied!', 'success');
    }).catch(function() {
      showToast(i18n('json.common.share_failed') || 'Failed to copy URL', 'error');
    });
  });
}

/* ── Tooltip Shortcuts (UX-20) ──────────────────── */
function initTooltipShortcuts() {
  // Create global tooltip element
  const tooltip = document.createElement('div');
  tooltip.id = 'globalTooltip';
  tooltip.className = 'jt-global-tooltip';
  document.body.appendChild(tooltip);

  // Enhanced tooltip system using data-tooltip and data-shortcut attributes
  document.addEventListener('mouseover', function(e) {
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;

    const text = target.getAttribute('data-tooltip');
    const shortcut = target.getAttribute('data-shortcut');

    let content = text;
    if (shortcut) {
      content += `<span class="jt-tooltip-shortcut">⌨️ ${shortcut}</span>`;
    }

    tooltip.innerHTML = content;
    tooltip.classList.add('visible');

    const rect = target.getBoundingClientRect();
    const tooltipHeight = tooltip.offsetHeight || 40;
    tooltip.style.top = (rect.bottom + 8) + 'px';
    tooltip.style.left = (rect.left + rect.width / 2) + 'px';
    tooltip.style.transform = 'translateX(-50%)';

    // Prevent tooltip from going off-screen
    setTimeout(function() {
      const tooltipRect = tooltip.getBoundingClientRect();
      if (tooltipRect.right > window.innerWidth - 10) {
        tooltip.style.right = '10px';
        tooltip.style.left = 'auto';
        tooltip.style.transform = 'none';
      }
      if (tooltipRect.bottom > window.innerHeight - 10) {
        tooltip.style.top = (rect.top - tooltipHeight - 8) + 'px';
      }
    }, 0);
  }, true);

  document.addEventListener('mouseout', function(e) {
    if (e.target.closest('[data-tooltip]')) {
      tooltip.classList.remove('visible');
    }
  }, true);

  // Map button IDs/onclicks to shortcut hints (for backward compatibility)
  const shortcutMap = {
    'processBtn': 'Ctrl+Enter',
    'copyBtn': 'Ctrl+Shift+C',
    'fullscreenBtn': 'F11',
    'syncScrollBtn': '',
  };
  Object.keys(shortcutMap).forEach(function(id) {
    const el = document.getElementById(id);
    if (el && shortcutMap[id] && !el.hasAttribute('data-tooltip')) {
      const existing = el.getAttribute('title') || '';
      el.setAttribute('data-tooltip', existing);
      el.setAttribute('data-shortcut', shortcutMap[id]);
    }
  });
}

/* ── Empty State Quick Actions (UX-14) ────────── */
let _emptyStateOverlay = null;

function initEmptyState() {
  if (!inputEditor) return;
  inputEditor.onDidChangeModelContent(function() {
    const text = inputEditor.getValue().trim();
    if (!text) {
      showEmptyState();
    } else {
      hideEmptyState();
    }
  });
  // Show initially if empty
  setTimeout(function() {
    if (inputEditor && !inputEditor.getValue().trim()) showEmptyState();
  }, 200);
}

function showEmptyState() {
  const pane = document.querySelector('.jt-editor-pane--input');
  if (!pane || document.getElementById('jtEmptyState')) return;
  // Don't show on diff or schema-validate
  const tool = window.JT_TOOL || '';
  if (tool === 'diff' || tool === 'schema-validate' || tool === 'from-excel') return;

  const overlay = document.createElement('div');
  overlay.id = 'jtEmptyState';
  overlay.className = 'jt-empty-state';
  overlay.innerHTML =
    '<div class="jt-empty-state__inner">' +
      '<div class="jt-empty-state__icon">📋</div>' +
      '<div class="jt-empty-state__title">' + (i18n('json.common.empty_state_title') || 'Paste, upload or drag JSON here') + '</div>' +
      '<div class="jt-empty-state__cards">' +
        '<button class="jt-empty-card" onclick="doEmptyPaste()"><span class="jt-empty-card__icon">📋</span><span>' + (i18n('json.common.empty_paste') || 'Paste from clipboard') + '</span><kbd>Ctrl+V</kbd></button>' +
        '<label class="jt-empty-card"><span class="jt-empty-card__icon">📂</span><span>' + (i18n('json.common.empty_upload') || 'Upload file') + '</span><input type="file" accept=".json,.txt,.yaml,.yml,.xml" style="display:none" onchange="uploadFile(this);hideEmptyState()"></label>' +
        '<button class="jt-empty-card" onclick="loadExample();hideEmptyState()"><span class="jt-empty-card__icon">📝</span><span>' + (i18n('json.common.example') || 'Load example') + '</span></button>' +
        '<button class="jt-empty-card" onclick="doEmptyFetch()"><span class="jt-empty-card__icon">🔗</span><span>' + (i18n('json.common.empty_url') || 'Fetch from URL') + '</span></button>' +
      '</div>' +
    '</div>';
  pane.appendChild(overlay);
}

function hideEmptyState() {
  const el = document.getElementById('jtEmptyState');
  if (el) el.remove();
}

function doEmptyPaste() {
  hideEmptyState();
  if (navigator.clipboard && navigator.clipboard.readText) {
    navigator.clipboard.readText().then(function(text) {
      if (text) inputEditor.setValue(text);
    }).catch(function() { inputEditor.focus(); });
  } else {
    inputEditor.focus();
  }
}

function doEmptyFetch() {
  hideEmptyState();
  const urlInput = document.getElementById('jsonUrlInput');
  if (urlInput) urlInput.focus();
}

/* ── Sync Scroll ────────────────────────────────── */
let _syncScrollEnabled = true;
let _syncScrollLock = false;

function initSyncScroll() {
  if (!inputEditor || !outputEditor) return;
  inputEditor.onDidScrollChange(function(e) {
    if (!_syncScrollEnabled || _syncScrollLock) return;
    _syncScrollLock = true;
    outputEditor.setScrollTop(e.scrollTop);
    _syncScrollLock = false;
  });
  outputEditor.onDidScrollChange(function(e) {
    if (!_syncScrollEnabled || _syncScrollLock) return;
    _syncScrollLock = true;
    inputEditor.setScrollTop(e.scrollTop);
    _syncScrollLock = false;
  });
}

function toggleSyncScroll() {
  _syncScrollEnabled = !_syncScrollEnabled;
  const btn = document.getElementById('syncScrollBtn');
  if (btn) {
    btn.classList.toggle('jt-btn--active', _syncScrollEnabled);
    btn.title = (_syncScrollEnabled ? (i18n('json.common.sync_scroll_on') || 'Sync Scroll: ON') : (i18n('json.common.sync_scroll_off') || 'Sync Scroll: OFF'));
  }
}

/* ── Drag & Drop Upload ────────────────────────── */
function initDragDrop() {
  const inputPane = document.querySelector('.jt-editor-pane--input');
  if (!inputPane) return;
  let dragCounter = 0;
  const validExts = ['.json','.txt','.yaml','.yml','.xml','.csv','.sql','.toml'];
  inputPane.addEventListener('dragenter', function(e) {
    e.preventDefault();
    dragCounter++;
    inputPane.classList.add('jt-drop-active');
  });
  inputPane.addEventListener('dragleave', function(e) {
    dragCounter--;
    if (dragCounter <= 0) { dragCounter = 0; inputPane.classList.remove('jt-drop-active'); }
  });
  inputPane.addEventListener('dragover', function(e) { e.preventDefault(); });
  inputPane.addEventListener('drop', function(e) {
    e.preventDefault();
    dragCounter = 0;
    inputPane.classList.remove('jt-drop-active');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!validExts.includes(ext)) {
      showToast(i18n('json.common.drop_unsupported') || 'Only JSON/TXT/YAML/XML text files are supported', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = function(ev) {
      inputEditor?.setValue(ev.target.result);
      clearErrorPanel();
      showToast(file.name + ' ✓', 'success');
    };
    reader.readAsText(file, 'utf-8');
  });
}

/* ── Draggable Divider ─────────────────────────── */
function initDraggableDivider() {
  const actions = document.querySelector('.jt-editor-actions');
  const layout = document.querySelector('.jt-editor-layout');
  if (!actions || !layout) return;
  const inputPane = layout.querySelector('.jt-editor-pane--input');
  const outputPane = layout.querySelector('.jt-editor-pane--output');
  if (!inputPane || !outputPane) return;

  // Restore saved ratio
  const saved = localStorage.getItem('jt-split-ratio');
  if (saved) {
    const r = parseFloat(saved);
    inputPane.style.flex = `${r} 1 0`;
    outputPane.style.flex = `${1 - r} 1 0`;
  }

  let dragging = false, startX = 0, startInputW = 0, startOutputW = 0;

  actions.addEventListener('mousedown', function(e) {
    // Don't drag when clicking buttons
    if (e.target.closest('button')) return;
    dragging = true;
    startX = e.clientX;
    startInputW = inputPane.getBoundingClientRect().width;
    startOutputW = outputPane.getBoundingClientRect().width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const totalW = startInputW + startOutputW;
    const newInputW = Math.max(150, Math.min(totalW - 150, startInputW + dx));
    const ratio = newInputW / totalW;
    inputPane.style.flex = `${ratio} 1 0`;
    outputPane.style.flex = `${1 - ratio} 1 0`;
  });

  document.addEventListener('mouseup', function() {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    // Save ratio
    const totalW = inputPane.getBoundingClientRect().width + outputPane.getBoundingClientRect().width;
    if (totalW > 0) {
      localStorage.setItem('jt-split-ratio', (inputPane.getBoundingClientRect().width / totalW).toFixed(4));
    }
  });

  // Double-click to reset 50:50
  actions.addEventListener('dblclick', function(e) {
    if (e.target.closest('button')) return;
    inputPane.style.flex = '1 1 50%';
    outputPane.style.flex = '1 1 50%';
    localStorage.removeItem('jt-split-ratio');
  });
}

/* ── Right-Click Context Menu ────────────────────── */
function initOutputContextMenu(editor) {
  if (!editor) return;

  editor.addAction({
    id: 'copy-node-value',
    label: '📋 ' + (i18n('json.ctx.copy_value') || 'Copy value'),
    contextMenuGroupId: '9_json-tools',
    contextMenuOrder: 1,
    run: function(ed) {
      const pos = ed.getPosition();
      const val = getNodeAtPosition(ed.getValue(), pos.lineNumber, pos.column);
      if (val !== undefined) {
        navigator.clipboard.writeText(typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val));
        showToast('✓', 'success');
      }
    }
  });

  editor.addAction({
    id: 'copy-node-path',
    label: '🔑 ' + (i18n('json.ctx.copy_path') || 'Copy JSONPath'),
    contextMenuGroupId: '9_json-tools',
    contextMenuOrder: 2,
    run: function(ed) {
      const pos = ed.getPosition();
      const path = getJsonPathAtPosition(ed.getValue(), pos.lineNumber, pos.column);
      if (path) {
        navigator.clipboard.writeText(path);
        showToast(path, 'success');
      }
    }
  });

  editor.addAction({
    id: 'copy-node-with-key',
    label: '📦 ' + (i18n('json.ctx.copy_with_key') || 'Copy with key'),
    contextMenuGroupId: '9_json-tools',
    contextMenuOrder: 3,
    run: function(ed) {
      const pos = ed.getPosition();
      const text = ed.getValue();
      const range = getNodeRangeAtPosition(text, pos.lineNumber, pos.column);
      if (range) {
        const model = ed.getModel();
        const content = model.getValueInRange(new monaco.Range(range.startLine, range.startCol, range.endLine, range.endCol));
        navigator.clipboard.writeText(content.trim());
        showToast('✓', 'success');
      }
    }
  });

  editor.addAction({
    id: 'copy-as-json-string',
    label: '🔤 ' + (i18n('json.ctx.copy_as_string') || 'Copy as JSON string'),
    contextMenuGroupId: '9_json-tools',
    contextMenuOrder: 4,
    run: function(ed) {
      const pos = ed.getPosition();
      const val = getNodeAtPosition(ed.getValue(), pos.lineNumber, pos.column);
      if (val !== undefined) {
        const str = JSON.stringify(val);
        navigator.clipboard.writeText('"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"');
        showToast('✓', 'success');
      }
    }
  });

  editor.addAction({
    id: 'delete-node',
    label: '🗑️ ' + (i18n('json.ctx.delete_node') || 'Delete node'),
    contextMenuGroupId: '9_json-tools',
    contextMenuOrder: 5,
    run: function(ed) {
      const pos = ed.getPosition();
      const text = ed.getValue();
      const range = getNodeRangeAtPosition(text, pos.lineNumber, pos.column);
      if (!range) return;
      const model = ed.getModel();
      // Delete the line(s) of this node (including trailing comma on previous line)
      const prevLine = model.getLineContent(range.startLine - 1);
      const startLine = prevLine.trimEnd().endsWith(',') ? range.startLine - 1 : range.startLine;
      const startCol = prevLine.trimEnd().endsWith(',') ? prevLine.lastIndexOf(',') + 1 : range.startCol;
      model.applyEdits([{
        range: new monaco.Range(startLine, startCol, range.endLine, range.endCol),
        text: ''
      }]);
      showToast('✓', 'success');
    }
  });
}
function getJsonPathAtPosition(text, targetLine, targetCol) {
  try {
    const parsed = JSON.parse(text);
    const lines = text.split('\n');
    // Convert line/col to flat character offset
    let offset = 0;
    for (let i = 0; i < targetLine - 1 && i < lines.length; i++) {
      offset += lines[i].length + 1;
    }
    offset += targetCol - 1;
    return _walkJsonForPath(parsed, '$', offset, text);
  } catch(e) {
    return null;
  }
}

function _walkJsonForPath(obj, currentPath, targetOffset, fullText) {
  if (obj === null || typeof obj !== 'object') return currentPath;

  // Find the start offset of this object/array in the text
  // We do a simple search for the path components
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const childPath = currentPath + '[' + i + ']';
      const childOffset = _findOffsetOfValue(fullText, childPath, obj[i]);
      if (childOffset < 0) continue;
      const childEnd = childOffset + _valueLength(fullText, childOffset);
      if (targetOffset >= childOffset && targetOffset <= childEnd) {
        if (typeof obj[i] === 'object' && obj[i] !== null) {
          return _walkJsonForPath(obj[i], childPath, targetOffset, fullText);
        }
        return childPath;
      }
    }
  } else {
    const keys = Object.keys(obj);
    for (const k of keys) {
      const childPath = currentPath + '.' + k;
      const childOffset = _findKeyOffset(fullText, k, currentPath);
      if (childOffset < 0) continue;
      const valStart = _findColonValueOffset(fullText, childOffset);
      if (valStart < 0) continue;
      const valEnd = valStart + _valueLength(fullText, valStart);
      if (targetOffset >= childOffset && targetOffset <= valEnd) {
        if (typeof obj[k] === 'object' && obj[k] !== null) {
          return _walkJsonForPath(obj[k], childPath, targetOffset, fullText);
        }
        return childPath;
      }
    }
  }
  return currentPath;
}

// Simple approach: re-parse text with position tracking
function getNodeAtPosition(text, targetLine, targetCol) {
  try {
    const parsed = JSON.parse(text);
    const lines = text.split('\n');
    let offset = 0;
    for (let i = 0; i < targetLine - 1 && i < lines.length; i++) {
      offset += lines[i].length + 1;
    }
    offset += targetCol - 1;
    return _getNodeAtOffset(parsed, offset, text);
  } catch(e) {
    return undefined;
  }
}

function _getNodeAtOffset(obj, targetOffset, text) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const searchStr = _jsonSearchPattern(obj[i]);
      const idx = text.indexOf(searchStr, Math.max(0, targetOffset - searchStr.length - 20));
      if (idx >= 0 && Math.abs(idx - targetOffset) < searchStr.length + 5) return obj[i];
    }
    return obj;
  }
  return obj;
}

function _jsonSearchPattern(val) {
  if (val === null) return 'null';
  if (typeof val === 'string') return '"' + val.substring(0, 20) + '"';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return '[';
  return '{';
}

// Get the text range of a node at position (for "copy with key")
function getNodeRangeAtPosition(text, line, col) {
  const lines = text.split('\n');
  if (line < 1 || line > lines.length) return null;

  // Find the key line (look backwards for a line with ":")
  let keyLine = line;
  while (keyLine > 1 && !lines[keyLine - 1].includes(':')) keyLine--;

  // Find the start column of the key
  const keyContent = lines[keyLine - 1];
  const startCol = keyContent.search(/["\w]/) + 1;

  // Find the end of this value
  let depth = 0;
  let endLine = keyLine;
  const firstChar = keyContent.trim()[0];

  if (firstChar === '{' || firstChar === '[') {
    // Count brackets to find the end
    for (let i = keyLine - 1; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{' || ch === '[') depth++;
        if (ch === '}' || ch === ']') depth--;
      }
      endLine = i + 1;
      if (depth === 0) break;
    }
    const lastLine = lines[endLine - 1];
    return { startLine: keyLine, startCol, endLine, endCol: lastLine.length + 1 };
  }

  // Simple value: find end of this line (comma is the separator)
  endLine = keyLine;
  return { startLine: keyLine, startCol, endLine: keyLine, endCol: lines[keyLine - 1].length + 1 };
}

// Helper: find offset of a key in text
function _findKeyOffset(text, key, parentPath) {
  const searchKey = '"' + key + '"';
  return text.indexOf(searchKey);
}

function _findColonValueOffset(text, keyOffset) {
  const colonIdx = text.indexOf(':', keyOffset);
  if (colonIdx < 0) return -1;
  let i = colonIdx + 1;
  while (i < text.length && /\s/.test(text[i])) i++;
  return i;
}

function _valueLength(text, startOffset) {
  if (startOffset >= text.length) return 0;
  const ch = text[startOffset];
  if (ch === '"') {
    let i = startOffset + 1;
    while (i < text.length) {
      if (text[i] === '\\') { i += 2; continue; }
      if (text[i] === '"') return i - startOffset + 1;
      i++;
    }
    return text.length - startOffset;
  }
  if (ch === '{' || ch === '[') {
    let depth = 0;
    let i = startOffset;
    while (i < text.length) {
      if (text[i] === '"') { i++; while (i < text.length && text[i] !== '"') { if (text[i] === '\\') i++; i++; } i++; continue; }
      if (text[i] === '{' || text[i] === '[') depth++;
      if (text[i] === '}' || text[i] === ']') { depth--; if (depth === 0) return i - startOffset + 1; }
      i++;
    }
  }
  // Number, boolean, null
  let i = startOffset;
  while (i < text.length && /[0-9eE.+\-tfnul]/.test(text[i])) i++;
  return i - startOffset;
}

/* ── Error Panel ──────────────────────────────── */
function showErrorPanel(err, raw) {
  const panel = document.getElementById('errorPanel');
  const titleEl = document.getElementById('errorTitle');
  const bodyEl  = document.getElementById('errorBody');
  if (!panel) return;

  const analysis = analyzeJsonError(err, raw || '');
  if (titleEl) titleEl.textContent = '❌ JSON Format Error';
  if (bodyEl) bodyEl.innerHTML = `
    <div class="jt-error-location">📍 Line <strong>${analysis.line}</strong>, Column <strong>${analysis.col}</strong></div>
    <div class="jt-error-message">${escapeHtml(analysis.message)}</div>
    ${analysis.suggestion ? `<div class="jt-error-suggestion">💡 ${escapeHtml(analysis.suggestion)}</div>` : ''}
    ${analysis.context ? `<pre class="jt-error-context">${escapeHtml(analysis.context)}</pre>` : ''}
  `;
  panel.style.display = 'block';

  if (analysis.line && inputEditor) {
    inputEditor.deltaDecorations([], [{
      range: new monaco.Range(analysis.line, 1, analysis.line, 9999),
      options: { isWholeLine: true, className: 'jt-error-line' },
    }]);
    inputEditor.revealLineInCenter(analysis.line);
  }
}

function hideErrorPanel() {
  const panel = document.getElementById('errorPanel');
  if (panel) panel.style.display = 'none';
  if (inputEditor) {
    try {
      const decorations = inputEditor.getModel()?.getAllDecorations() || [];
      inputEditor.deltaDecorations(decorations.map(d => d.id), []);
    } catch(e) {}
  }
}

function clearErrorPanel() { hideErrorPanel(); }

function analyzeJsonError(err, raw) {
  const msg   = err?.message || String(err);
  const lines = raw.split('\n');
  let line = 1, col = 1;
  const posMatch = msg.match(/position (\d+)/i);
  if (posMatch) {
    const pos = parseInt(posMatch[1]);
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      if (count + lines[i].length + 1 > pos) {
        line = i + 1; col = pos - count + 1; break;
      }
      count += lines[i].length + 1;
    }
  }
  const context = lines.slice(Math.max(0, line - 2), line + 1).join('\n');
  const near    = lines[line - 1]?.substring(0, col + 5) || '';
  let suggestion = '';
  if (/,\s*[}\]]/.test(raw))           suggestion = 'Remove trailing comma (no comma after last element)';
  else if (/[^\\]'/.test(near))        suggestion = 'Use double quotes " instead of single quotes \'';
  else if (/:\s*undefined/.test(near)) suggestion = 'undefined is not valid JSON, use null';
  else if (/\/\//.test(raw))           suggestion = 'JSON does not support comments, use /json/jsonc tool first';
  else if (/{[^}]*$/.test(raw))        suggestion = 'Object brace { is not closed';
  else if (/\[[^\]]*$/.test(raw))      suggestion = 'Array bracket [ is not closed';
  return { line, col, message: msg, suggestion, context };
}

/* ── Utilities ────────────────────────────────── */
function formatBytes(bytes) {
  if (bytes < 1024)      return `${bytes} B`;
  if (bytes < 1048576)   return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1048576).toFixed(2)} MB`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Tree View Builder ──────────────────────────────── */
function buildJSONTree(value, key, path, currentDepth) {
  if (value === null || typeof value !== 'object') {
    return '<div class="jt-tree-leaf">' +
      '<span class="jt-tree-key">' + escapeHtml(String(key)) + '</span>' +
      '<span class="jt-tree-sep">: </span>' + renderTreeValue(value) + '</div>';
  }

  const isArr = Array.isArray(value);
  const keys = Object.keys(value);
  // Use currentDepth parameter (default to 0 for root) to control expansion
  const depth = currentDepth || 0;
  const open = depth < outputTreeDepth;

  let html =
    '<div class="jt-tree-node">' +
    '<div class="jt-tree-header">' +
    '<button class="jt-tree-toggle' + (open ? '' : ' jt-tree-toggle--collapsed') + '">' + (open ? '▼' : '▶') + '</button>' +
    '<span class="jt-tree-key">' + escapeHtml(String(key)) + '</span>' +
    '<span class="jt-tree-sep">: </span>' +
    '<span class="jt-tree-bracket">' + (isArr ? '[' : '{') + '</span>' +
    '<span class="jt-tree-preview">' + (isArr ? keys.length + ' items' : keys.length + ' keys') + '</span>' +
    '<span class="jt-tree-bracket">' + (isArr ? ']' : '}') + '</span>' +
    '</div>' +
    '<div class="jt-tree-children' + (open ? '' : ' jt-tree-children--collapsed') + '">';

  for (const k of keys) {
    const cp = isArr ? path + '[' + k + ']' : path + '.' + k;
    // Pass depth + 1 to child nodes
    html += buildJSONTree(value[k], k, cp, depth + 1);
  }

  html += '</div></div>';
  return html;
}

function renderTreeValue(v) {
  if (v === null) return '<span class="jt-val-null">null</span>';
  if (typeof v === 'boolean') return '<span class="jt-val-bool">' + v + '</span>';
  if (typeof v === 'number') return '<span class="jt-val-num">' + v + '</span>';
  return '<span class="jt-val-str">"' + escapeHtml(String(v)) + '"</span>';
}

/* ── Table View Builder ─────────────────────────────── */
function buildJSONTable(data) {
  let arr = Array.isArray(data) ? data : [data];

  // Extract all unique keys from all objects
  const keys = [...new Set(arr.flatMap(row => {
    if (typeof row === 'object' && row !== null) {
      return Object.keys(row);
    }
    return [];
  }))];

  if (keys.length === 0) {
    return '<div class="jt-error">No data to display</div>';
  }

  // Build table header
  let thead = '<tr>';
  for (const k of keys) {
    thead += '<th class="jt-table-th jt-table-sortable" data-column="' + escapeHtml(k) + '">' + escapeHtml(k) + '</th>';
  }
  thead += '</tr>';

  // Build table body (limit to 100 rows for performance)
  let tbody = '';
  const displayRows = arr.slice(0, 100);
  for (const row of displayRows) {
    tbody += '<tr>';
    for (const k of keys) {
      const val = row && typeof row === 'object' ? row[k] : undefined;
      const displayVal = val === undefined ? '' : escapeHtml(String(val));
      tbody += '<td class="jt-table-td">' + displayVal + '</td>';
    }
    tbody += '</tr>';
  }

  if (arr.length > 100) {
    tbody += '<tr><td colspan="' + keys.length + '" style="text-align:center;color:var(--jt-muted);">... and ' + (arr.length - 100) + ' more rows</td></tr>';
  }

  return '<div class="jt-table-wrap"><table class="jt-table"><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table></div>';
}

function sortTable(container, column, order) {
  const table = container.querySelector('table');
  if (!table) return;

  const tbody = table.querySelector('tbody');
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll('tr'));
  const thIndex = Array.from(table.querySelectorAll('th')).findIndex(th => th.dataset.column === column);
  if (thIndex === -1) return;

  rows.sort(function(a, b) {
    const aVal = a.cells[thIndex]?.textContent || '';
    const bVal = b.cells[thIndex]?.textContent || '';
    const cmp = aVal.localeCompare(bVal);
    return order === 'asc' ? cmp : -cmp;
  });

  rows.forEach(function(row) {
    tbody.appendChild(row);
  });
}

function i18n(key) {
  return (window.JT_I18N || {})[key] || key;
}

function showToast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const el = document.createElement('div');
  el.className   = `jt-toast jt-toast--${type}`;
  el.textContent = msg;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  c.appendChild(el);
  requestAnimationFrame(() => el.classList.add('jt-toast--show'));
  setTimeout(() => { el.classList.remove('jt-toast--show'); setTimeout(() => el.remove(), 300); }, 3000);
}


// Record recent tool visit
function recordVisit(key, icon, name) {
  try {
    let recent = JSON.parse(localStorage.getItem('jt_recent_tools') || '[]');
    recent = recent.filter(t => t.key !== key);
    recent.unshift({ key, icon, name });
    recent = recent.slice(0, 6);
    localStorage.setItem('jt_recent_tools', JSON.stringify(recent));
  } catch(e) {}
}

// Auto-record on load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const tool = window.JT_TOOL;
  if (tool) {
    const icon = document.querySelector('.jt-tool-hero__icon')?.textContent?.trim() || '🔧';
    const name = document.querySelector('.jt-tool-hero__title')?.textContent?.trim() || tool;
    recordVisit(tool, icon, name);
  }
  loadHistory();
  restoreSidebarState();
  initKeyboardShortcuts();
});

/* ── Theme Management ───────────────────────────── */
const THEME_KEY = 'tbn-theme';

function getSystemTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch(e) {
    return null;
  }
}

const THEME_ICONS = { light: '☀️', dark: '🌙', forest: '🌿', ocean: '🌊', sunset: '🌅' };
const THEME_LIST = ['light', 'dark', 'forest', 'ocean', 'sunset'];

function applyTheme(theme) {
  if (THEME_LIST.indexOf(theme) < 0) theme = 'light';
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch(e) {}
  // Update theme icon (emoji dropdown version)
  const icon = document.getElementById('jtThemeIcon');
  if (icon) icon.textContent = THEME_ICONS[theme];
  // Mark active option
  document.querySelectorAll('.jt-theme-opt').forEach(function(b) {
    b.classList.toggle('active', b.dataset.theme === theme);
  });
  // Update Monaco editor theme if editors exist
  try {
    const vsTheme = theme === 'dark' ? 'vs-dark' : 'vs';
    if (inputEditor) monaco.editor.setTheme(vsTheme);
    if (outputEditor) monaco.editor.setTheme(vsTheme);
    if (leftEditor) monaco.editor.setTheme(vsTheme);
    if (rightEditor) monaco.editor.setTheme(vsTheme);
    if (window._schemaEditor) monaco.editor.setTheme(vsTheme);
    if (fullscreenInputEditor) monaco.editor.setTheme(vsTheme);
    if (fullscreenOutputEditor) monaco.editor.setTheme(vsTheme);
  } catch(e) {}
}

function initTheme() {
  const saved = getSavedTheme();
  const theme = saved || 'light';
  // Apply theme (don't save to localStorage — inline script already did that)
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('jtThemeIcon');
  if (icon) icon.textContent = THEME_ICONS[theme];
  document.querySelectorAll('.jt-theme-opt').forEach(function(b) {
    b.classList.toggle('active', b.dataset.theme === theme);
  });
  // Theme dropdown toggle
  const themeBtn = document.getElementById('jtThemeBtn');
  const themeDropdown = document.getElementById('jtThemeDropdown');
  if (themeBtn && themeDropdown) {
    themeDropdown.style.display = 'none';
    themeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = themeDropdown.style.display === 'block';
      // Close lang dropdown if open
      document.querySelectorAll('.lang-switcher').forEach(function(s) { s.classList.remove('open'); });
      if (isOpen) {
        themeDropdown.style.display = 'none';
      } else {
        themeDropdown.style.display = 'block';
      }
    });
  }
  // Close dropdown on outside click
  document.addEventListener('click', function(e) {
    if (themeDropdown) themeDropdown.style.display = 'none';
  });
  // Update Monaco editor theme
  try {
    const vsTheme = theme === 'dark' ? 'vs-dark' : 'vs';
    if (inputEditor) monaco.editor.setTheme(vsTheme);
    if (outputEditor) monaco.editor.setTheme(vsTheme);
    if (leftEditor) monaco.editor.setTheme(vsTheme);
    if (rightEditor) monaco.editor.setTheme(vsTheme);
    if (window._schemaEditor) monaco.editor.setTheme(vsTheme);
    if (fullscreenInputEditor) monaco.editor.setTheme(vsTheme);
    if (fullscreenOutputEditor) monaco.editor.setTheme(vsTheme);
  } catch(e) {}
}

/* ── Keyboard Shortcuts ─────────────────────────── */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    // Ctrl/Cmd + Enter: Run processJson
    if (mod && e.key === 'Enter') {
      e.preventDefault();
      if (isFullscreen) { processJsonFullscreen(); }
      else if (typeof processJson === 'function') { processJson(); }
    }
    // Escape: Close fullscreen, error panel, or shortcuts overlay
    if (e.key === 'Escape') {
      const scOverlay = document.getElementById('jtShortcutsOverlay');
      if (scOverlay && scOverlay.style.display !== 'none') { scOverlay.style.display = 'none'; return; }
      if (!isFullscreen) hideErrorPanel();
    }
    // ?: Show keyboard shortcuts help
    if (e.key === '?' && !mod && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault(); showKeyboardHelp();
    }
    // Ctrl+S: Download output
    if (mod && e.key === 's') { e.preventDefault(); downloadOutput(); }
    // Ctrl+Shift+C: Copy output
    if (mod && e.shiftKey && (e.key === 'C' || e.key === 'c')) { e.preventDefault(); copyOutput(); }
    // F11: Toggle fullscreen
    if (e.key === 'F11') { e.preventDefault(); isFullscreen ? closeFullscreen() : openFullscreen(); }
    // Ctrl+K: Open tool selector
    if (mod && e.key === 'k') { e.preventDefault(); toggleToolSelector(); }
    // Ctrl+Shift+F: Format (pretty print)
    if (mod && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
      e.preventDefault();
      const raw = getInput().trim();
      if (raw) { try { setOutput(JSON.stringify(JSON.parse(raw), null, 2), 'json'); } catch(e2) { showToast('Parse error', 'error'); } }
    }
    // Ctrl+Shift+M: Minify
    if (mod && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
      e.preventDefault();
      const raw = getInput().trim();
      if (raw) { try { setOutput(JSON.stringify(JSON.parse(raw)), 'json'); } catch(e2) { showToast('Parse error', 'error'); } }
    }
    // Ctrl+Shift+X: Clear input
    if (mod && e.shiftKey && (e.key === 'X' || e.key === 'x')) { e.preventDefault(); clearInput(); }
    // Ctrl+Shift+D: Toggle dark mode
    if (mod && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      e.preventDefault();
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(cur === 'dark' ? 'light' : 'dark');
    }
    // F8: Jump to error
    if (e.key === 'F8') {
      e.preventDefault();
      const panel = document.getElementById('errorPanel');
      if (panel && panel.style.display !== 'none') panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // F3: Next same key (if implemented) or find
    // Tab: Switch focus between input/output
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
      if (inputEditor && outputEditor) {
        e.preventDefault();
        if (document.activeElement?.closest?.('.jt-editor-pane--input') || inputEditor.hasTextFocus()) {
          outputEditor.focus();
        } else {
          inputEditor.focus();
        }
      }
    }
  });
}

function showKeyboardHelp() {
  const shortcuts = [
    { key: 'Ctrl/Cmd + Enter', action: i18n('json.shortcuts.run') || 'Run' },
    { key: 'Ctrl/Cmd + S', action: i18n('json.shortcuts.download') || 'Download' },
    { key: 'Ctrl/Cmd + Shift + C', action: i18n('json.shortcuts.copy') || 'Copy output' },
    { key: 'Ctrl/Cmd + Shift + F', action: i18n('json.shortcuts.format') || 'Format' },
    { key: 'Ctrl/Cmd + Shift + M', action: i18n('json.shortcuts.minify') || 'Minify' },
    { key: 'Ctrl/Cmd + Shift + X', action: i18n('json.shortcuts.clear') || 'Clear input' },
    { key: 'Ctrl/Cmd + Shift + D', action: i18n('json.shortcuts.theme') || 'Toggle theme' },
    { key: 'Ctrl/Cmd + K', action: i18n('json.shortcuts.selector') || 'Tool selector' },
    { key: 'F11', action: i18n('json.shortcuts.fullscreen') || 'Fullscreen' },
    { key: 'F8', action: i18n('json.shortcuts.jump_error') || 'Jump to error' },
    { key: 'Tab', action: i18n('json.shortcuts.switch_focus') || 'Switch focus' },
    { key: 'Escape', action: i18n('json.shortcuts.close') || 'Close' },
  ];
  // Build overlay HTML instead of alert
  let overlay = document.getElementById('jtShortcutsOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'jtShortcutsOverlay';
    overlay.className = 'jt-shortcuts-overlay';
    overlay.onclick = function(ev) { if (ev.target === overlay) overlay.style.display = 'none'; };
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = '<div class="jt-shortcuts-panel"><h3>' +
    (i18n('json.shortcuts.title') || 'Keyboard Shortcuts') +
    '</h3><table class="jt-shortcuts-table">' +
    shortcuts.map(s => '<tr><td class="jt-sc-key"><kbd>' + s.key + '</kbd></td><td>' + s.action + '</td></tr>').join('') +
    '</table><p class="jt-sc-hint">' + (i18n('json.shortcuts.hint') || 'Press ? to toggle, Escape to close') + '</p></div>';
  overlay.style.display = 'flex';
}

/* ── History Sidebar ───────────────────────────── */
const HISTORY_KEY = 'jt_input_history';
const MAX_HISTORY = 50;
const MAX_INPUT_SIZE = 10000; // 10KB per entry
const LARGE_FILE_WARNING = 5 * 1024 * 1024; // 5MB warning threshold

function getHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    // Validate it's an array
    if (!Array.isArray(parsed)) {
      console.warn('History data is not an array, resetting');
      return [];
    }
    return parsed;
  } catch(e) {
    console.error('Failed to parse history:', e);
    return [];
  }
}

function saveHistory(list) {
  try {
    const json = JSON.stringify(list);
    localStorage.setItem(HISTORY_KEY, json);
  } catch(e) {
    console.error('Failed to save history:', e);
    // If quota exceeded, try to trim older entries
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      try {
        // Keep only last 20 entries
        const trimmed = list.slice(0, 20);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
      } catch(e2) {
        console.error('Failed to save even trimmed history:', e2);
      }
    }
  }
}

function recordHistory(toolKey, toolName, icon, input) {
  if (!input || !input.trim()) return;
  let history = getHistory();
  // Remove duplicate (same toolKey + input combination)
  const inputHash = toolKey + ':' + input.slice(0, 100);
  history = history.filter(h => {
    const hHash = (h.toolKey || '') + ':' + (h.input || '').slice(0, 100);
    return hHash !== inputHash;
  });
  // Truncate input if too long
  const savedInput = input.length > MAX_INPUT_SIZE ? input.slice(0, MAX_INPUT_SIZE) : input;
  // Add to front
  history.unshift({
    toolKey, toolName, icon,
    input: savedInput,
    timestamp: Date.now()
  });
  // Keep max
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  saveHistory(history);
  renderHistory();
}

function loadHistory() {
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById('historyList');
  if (!container) return;
  let history = getHistory();
  if (history.length === 0) {
    container.innerHTML = '<div class="jt-history-empty">' + (i18n('json.history.empty') || 'No history') + '</div>';
    return;
  }
  // Filter by search query
  const searchInput = document.getElementById('jtHistorySearch');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  if (query) {
    history = history.filter(h => h.toolName.toLowerCase().includes(query) || h.input.toLowerCase().includes(query));
  }
  // Sort: favorites first
  const favs = JSON.parse(localStorage.getItem('jt_history_favs') || '[]');
  history.sort((a, b) => {
    const aFav = favs.includes(a.timestamp) ? 1 : 0;
    const bFav = favs.includes(b.timestamp) ? 1 : 0;
    return bFav - aFav;
  });

  const pageSize = 8;
  let visibleCount = parseInt(container.dataset.visible) || pageSize;
  if (visibleCount < pageSize) visibleCount = pageSize;
  container.dataset.visible = visibleCount;
  const items = history.slice(0, visibleCount);
  container.innerHTML = items.map((h, idx) => {
    const preview = h.input.slice(0, 40).replace(/\n/g, ' ');
    const time = formatHistoryTime(h.timestamp);
    const size = formatBytes(new Blob([h.input]).size);
    const isFav = favs.includes(h.timestamp);
    return '<div class="jt-history-item" onclick="restoreHistory(' + idx + ')" title="' + (i18n('json.history.restore') || 'Restore') + '">' +
      '<div class="jt-history-item__actions">' +
        '<button class="jt-history-item__fav' + (isFav ? ' active' : '') + '" onclick="event.stopPropagation();toggleHistoryFav(\'' + h.timestamp + '\')" title="⭐">⭐</button>' +
        '<button class="jt-history-item__delete" onclick="event.stopPropagation();deleteHistoryItem(' + idx + ')" title="🗑️">✕</button>' +
      '</div>' +
      '<div class="jt-history-item__header">' +
        '<span class="jt-history-item__icon">' + h.icon + '</span>' +
        '<span class="jt-history-item__tool">' + escapeHtml(h.toolName) + '</span>' +
        '<span class="jt-history-item__meta">' + size + ' · ' + time + '</span>' +
      '</div>' +
      '<div class="jt-history-item__preview">' + escapeHtml(preview) + (h.input.length > 40 ? '...' : '') + '</div>' +
    '</div>';
  }).join('');
  const hasMore = visibleCount < history.length;
  if (hasMore) {
    container.innerHTML += '<button class="jt-history-showmore" onclick="expandHistory()">' + (i18n('json.history.show_more') || 'Show more') + ' (' + (history.length - visibleCount) + ')</button>';
  } else if (visibleCount > pageSize) {
    container.innerHTML += '<button class="jt-history-showmore" onclick="collapseHistory()">' + (i18n('json.history.collapse') || 'Collapse') + '</button>';
  }
}

function toggleHistoryFav(timestamp) {
  let favs = JSON.parse(localStorage.getItem('jt_history_favs') || '[]');
  if (favs.includes(timestamp)) {
    favs = favs.filter(t => t !== timestamp);
  } else {
    favs.push(timestamp);
  }
  localStorage.setItem('jt_history_favs', JSON.stringify(favs));
  renderHistory();
}

function expandHistory() {
  const container = document.getElementById('historyList');
  if (!container) return;
  const pageSize = 8;
  const current = parseInt(container.dataset.visible) || pageSize;
  container.dataset.visible = current + pageSize;
  renderHistory();
}

function collapseHistory() {
  const container = document.getElementById('historyList');
  if (container) {
    container.dataset.visible = '8';
    renderHistory();
  }
}

function restoreHistory(index) {
  const history = getHistory();
  const item = history[index];
  if (!item) return;

  const currentTool = window.JT_TOOL || '';

  // If history item is from a different tool, navigate to that tool
  if (item.toolKey && item.toolKey !== currentTool) {
    const input = item.input || '';
    const maxHash = 8000;
    let hash = '';
    if (input && input.length <= maxHash) {
      hash = '#' + encodeURIComponent(input);
    }
    const lang = window.JT_LANG || 'en';
    location.href = `/json/${item.toolKey}?lang=${lang}${hash}`;
    return;
  }

  // Same tool: just restore input
  if (inputEditor) {
    inputEditor.setValue(item.input);
    clearErrorPanel();
  }
  showToast(i18n('json.history.restore') || 'Restored', 'success');
}

function clearHistory() {
  if (!confirm(i18n('json.history.clear_confirm'))) return;
  saveHistory([]);
  renderHistory();
  showToast(i18n('json.history.cleared') || 'History cleared', 'info');
}

function deleteHistoryItem(index) {
  let history = getHistory();
  if (index >= 0 && index < history.length) {
    history.splice(index, 1);
    saveHistory(history);
    renderHistory();
  }
}

function formatHistoryTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return i18n('json.history.time.just_now') || 'just now';
  if (diff < 3600000) return Math.floor(diff/60000) + i18n('json.history.time.minutes');
  if (diff < 86400000) return Math.floor(diff/3600000) + i18n('json.history.time.hours');
  if (diff < 604800000) return Math.floor(diff/86400000) + i18n('json.history.time.days');
  return d.toLocaleDateString();
}

function toggleHistorySidebar() {
  const sidebar = document.getElementById('historySidebar');
  const toggle = document.getElementById('sidebarToggle');
  if (!sidebar) return;
  const isOpen = sidebar.classList.toggle('open');
  if (toggle) {
    toggle.style.left = isOpen ? '280px' : '0';
    // Update arrow direction
    const arrow = toggle.querySelector('.jt-sidebar-toggle__arrow');
    if (arrow) arrow.textContent = isOpen ? '◀' : '▶';
  }
  // Save state
  try { localStorage.setItem('jt_sidebar_open', isOpen); } catch(e) {}
}

function restoreSidebarState() {
  try {
    // Default to CLOSED for better editor space (changed from open)
    const savedState = localStorage.getItem('jt_sidebar_open');
    const isOpen = savedState === null ? false : savedState === 'true';
    const sidebar = document.getElementById('historySidebar');
    const toggle = document.getElementById('sidebarToggle');
    if (isOpen && sidebar) {
      sidebar.classList.add('open');
      if (toggle) {
        toggle.style.left = '280px';
        const arrow = toggle.querySelector('.jt-sidebar-toggle__arrow');
        if (arrow) arrow.textContent = '◀';
      }
    } else if (toggle) {
      const arrow = toggle.querySelector('.jt-sidebar-toggle__arrow');
      if (arrow) arrow.textContent = '▶';
    }
  } catch(e) {}
}

/* ── Tool Selector Dropdown ────────────────────── */
function toggleToolSelector() {
  const sel = document.getElementById('toolSelector');
  if (!sel) return;
  sel.classList.toggle('open');
  // Focus search input
  const search = document.getElementById('toolSearchInput');
  if (sel.classList.contains('open') && search) {
    setTimeout(() => search.focus(), 50);
  }
}

function filterToolDropdown(query) {
  const q = (query || '').toLowerCase().trim();
  let visibleCount = 0;
  document.querySelectorAll('.jt-tool-dropdown__item').forEach(item => {
    const name = (item.dataset.name || '').toLowerCase();
    const keywords = (item.dataset.keywords || '').toLowerCase();
    const visible = !q || name.includes(q) || keywords.includes(q);
    item.style.display = visible ? '' : 'none';
    if (visible) visibleCount++;
  });
  document.querySelectorAll('.jt-tool-dropdown__group').forEach(g => {
    const visible = [...g.querySelectorAll('.jt-tool-dropdown__item')].some(i => i.style.display !== 'none');
    g.style.display = visible ? '' : 'none';
  });
  // Show/hide "no results" message
  const dropdown = document.getElementById('toolDropdown');
  if (dropdown) {
    let noResults = dropdown.querySelector('.jt-tool-dropdown__no-results');
    if (q && visibleCount === 0) {
      if (!noResults) {
        noResults = document.createElement('div');
        noResults.className = 'jt-tool-dropdown__no-results';
        dropdown.appendChild(noResults);
      }
      noResults.textContent = i18n('json.selector.no_results') || 'No matching tools found';
      noResults.style.display = '';
    } else if (noResults) {
      noResults.style.display = 'none';
    }
  }
}

// Keyboard navigation for tool selector dropdown
let toolDropdownHighlightIdx = -1;

function handleToolSearchKeydown(e) {
  const items = [...document.querySelectorAll('.jt-tool-dropdown__item')].filter(i => i.style.display !== 'none');
  if (!items.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    toolDropdownHighlightIdx = Math.min(toolDropdownHighlightIdx + 1, items.length - 1);
    updateToolDropdownHighlight(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    toolDropdownHighlightIdx = Math.max(toolDropdownHighlightIdx - 1, 0);
    updateToolDropdownHighlight(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (toolDropdownHighlightIdx >= 0 && items[toolDropdownHighlightIdx]) {
      const key = items[toolDropdownHighlightIdx].dataset.key;
      if (key) selectTool(key);
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    const sel = document.getElementById('toolSelector');
    if (sel) sel.classList.remove('open');
  }
}

function updateToolDropdownHighlight(items) {
  items.forEach((item, i) => {
    item.classList.toggle('highlighted', i === toolDropdownHighlightIdx);
  });
  if (items[toolDropdownHighlightIdx]) {
    items[toolDropdownHighlightIdx].scrollIntoView({ block: 'nearest' });
  }
}

function selectTool(toolKey) {
  if (toolKey === window.JT_TOOL) {
    toggleToolSelector();
    return;
  }
  // Get current input and encode for URL hash
  const input = getInput().trim();
  const maxHash = 8000; // URL length limit
  let hash = '';
  if (input && input.length <= maxHash) {
    hash = '#' + encodeURIComponent(input);
  } else if (input && input.length > maxHash) {
    showToast(i18n('json.selector.input_too_long') || 'Input too long', 'info');
  }
  // Navigate
  const lang = window.JT_LANG || 'en';
  location.href = `/json/${toolKey}?lang=${lang}${hash}`;
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const sel = document.getElementById('toolSelector');
  if (sel && !sel.contains(e.target)) {
    sel.classList.remove('open');
  }
});

/* ── Output Tree View ──────────────────────────── */
let outputTreeViewVisible = false;
let outputTreeDepth = 3; // Default expansion depth

function showOutputTreeView() {
  const editorDiv = document.getElementById('outputEditor');
  const treeDiv = document.getElementById('outputTree');
  if (!editorDiv || !treeDiv) return false;

  // Render tree from output
  const output = getOutput();
  if (!output || !output.trim()) {
    showToast(i18n('json.common.error.empty') || 'Please enter some content first', 'info');
    return false;
  }
  try {
    const parsed = JSON.parse(output);
    treeDiv.innerHTML = '';
    // Add tree toolbar with search and depth control
    const toolbar = document.createElement('div');
    toolbar.className = 'jt-tree-toolbar';
    toolbar.innerHTML =
      '<input type="text" id="treeSearchInput" placeholder="' + (i18n('json.tree.search') || 'Search...') + '" class="jt-options-input jt-options-input--sm" style="width:140px" oninput="filterTree(this.value)">' +
      '<label style="display:flex;align-items:center;gap:4px;font-size:0.75rem;color:var(--jt-muted)">' +
        (i18n('json.tree.depth') || 'Depth') +
        '<select id="treeDepthSelect" class="jt-options-select jt-options-select--sm" onchange="setTreeDepth(this.value)">' +
          '<option value="1">1</option><option value="2">2</option><option value="3" selected>3</option>' +
          '<option value="4">4</option><option value="5">5</option><option value="99">' + (i18n('json.tree.all') || 'All') + '</option>' +
        '</select>' +
      '</label>';
    treeDiv.appendChild(toolbar);
    const content = document.createElement('div');
    content.id = 'treeContent';
    content.appendChild(renderOutputTreeNode(parsed, 'root', '$', 0));
    treeDiv.appendChild(content);
  } catch(e) {
    treeDiv.innerHTML = '<div class="jt-history-empty">' + (i18n('json.output.tree_parse_error') || 'Cannot render tree view: JSON parse failed') + '</div>';
  }
  editorDiv.style.display = 'none';
  treeDiv.classList.add('visible');
  treeDiv.style.display = 'block';
  outputTreeViewVisible = true;
  return true;
}

function setTreeDepth(depth) {
  outputTreeDepth = parseInt(depth) || 3;

  // Check if using new treeOutput container (three-view system)
  const newTreeContainer = document.getElementById('treeOutput');
  if (newTreeContainer && newTreeContainer.offsetParent !== null) {
    // Using new container, re-render with cached data
    if (outputDataCache) {
      renderTreeOutput(outputDataCache);
    }
    return;
  }

  // Fall back to old showOutputTreeView function
  showOutputTreeView();
}

function filterTree(query) {
  // Try new treeOutput container first (three-view system)
  const newTreeContainer = document.getElementById('treeOutput');
  if (newTreeContainer && newTreeContainer.offsetParent !== null) {
    const q = (query || '').toLowerCase();
    const items = newTreeContainer.querySelectorAll('.jt-tree-leaf, .jt-tree-header');
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      const match = !q || text.includes(q);
      item.style.opacity = match ? '' : '0.3';
    });
    return;
  }

  // Fall back to old treeContent container
  const content = document.getElementById('treeContent');
  if (!content) return;
  const q = (query || '').toLowerCase();
  const items = content.querySelectorAll('.jt-tree-leaf, .jt-tree-header');
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    const match = !q || text.includes(q);
    item.style.opacity = match ? '' : '0.3';
  });
}

function toggleOutputTreeView() {
  const editorDiv = document.getElementById('outputEditor');
  const treeDiv = document.getElementById('outputTree');
  const btn = document.getElementById('treeViewBtn');

  outputTreeViewVisible = !outputTreeViewVisible;

  if (outputTreeViewVisible) {
    showOutputTreeView();
    if (btn) btn.classList.add('active');
  } else {
    editorDiv.style.display = '';
    treeDiv.classList.remove('visible');
    treeDiv.style.display = 'none';
    if (btn) btn.classList.remove('active');
  }
}

function renderOutputTreeNode(value, key, path, depth) {
  const wrap = document.createElement('div');
  wrap.className = 'jt-tree-node';

  // Type icon
  const typeIcon = getTypeIcon(value);

  if (value === null || typeof value !== 'object') {
    const leaf = document.createElement('div');
    leaf.className = 'jt-tree-leaf';
    leaf.innerHTML =
      '<span class="jt-tree-icon">' + typeIcon + '</span>' +
      '<span class="jt-tree-key" onclick="copyOutputTreePath(\'' + escapeHtml(path) + '\')" title="' + (i18n('json.tree.copy_path') || 'Copy path') + '">' + escapeHtml(String(key)) + '</span>' +
      '<span class="jt-tree-sep">: </span>' + renderOutputTreeValue(value) +
      '<button class="jt-tree-copy-btn" onclick="event.stopPropagation();copyTreeValue(\'' + escapeHtml(JSON.stringify(value)) + '\')" title="' + (i18n('json.tree.copy_value') || 'Copy value') + '" style="margin-left:4px;opacity:0.5;border:none;background:none;cursor:pointer;font-size:0.6875rem">📋</button>';
    leaf.addEventListener('click', function() { _locateInputByPath(path); });
    return wrap;
  }
  const isArr = Array.isArray(value);
  const keys = Object.keys(value);
  const open = depth < outputTreeDepth;
  const header = document.createElement('div');
  header.className = 'jt-tree-header';
  header.innerHTML =
    '<button class="jt-tree-toggle" onclick="toggleOutputTreeNode(this)">' + (open ? '▼' : '▶') + '</button>' +
    '<span class="jt-tree-icon">' + typeIcon + '</span>' +
    '<span class="jt-tree-key" onclick="copyOutputTreePath(\'' + escapeHtml(path) + '\')" title="' + (i18n('json.tree.copy_path') || 'Copy path') + '">' + escapeHtml(String(key)) + '</span>' +
    '<span class="jt-tree-sep">: </span>' +
    '<span class="jt-tree-bracket">' + (isArr ? '[' : '{') + '</span>' +
    '<span class="jt-tree-count">' + keys.length + '</span>' +
    '<span class="jt-tree-bracket">' + (isArr ? ']' : '}') + '</span>';
  const children = document.createElement('div');
  children.className = 'jt-tree-children';
  if (!open) children.style.display = 'none';
  for (const k of keys) {
    const cp = isArr ? path + '[' + k + ']' : path + '.' + k;
    children.appendChild(renderOutputTreeNode(value[k], k, cp, depth + 1));
  }
  wrap.appendChild(header);
  wrap.appendChild(children);
  return wrap;
}

function getTypeIcon(value) {
  if (value === null) return '␀';
  if (typeof value === 'boolean') return '𝔹';
  if (typeof value === 'number') return '#';
  if (typeof value === 'string') return 'Aa';
  if (Array.isArray(value)) return '[]';
  if (typeof value === 'object') return '{}';
  return '?';
}

function copyTreeValue(jsonStr) {
  try {
    const val = JSON.parse(jsonStr);
    const text = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
    navigator.clipboard.writeText(text).then(() => showToast(i18n('json.tree.copied') || 'Copied', 'success'));
  } catch(e) {
    navigator.clipboard.writeText(jsonStr).then(() => showToast(i18n('json.tree.copied') || 'Copied', 'success'));
  }
}

function renderOutputTreeValue(v) {
  if (v === null) return '<span class="jt-val-null">null</span>';
  if (typeof v === 'boolean') return '<span class="jt-val-bool">' + v + '</span>';
  if (typeof v === 'number') return '<span class="jt-val-num">' + v + '</span>';
  const s = String(v);
  if (s.length > 100) {
    const id = 'jt-str-' + Math.random().toString(36).slice(2, 8);
    const truncated = escapeHtml(s.slice(0, 100));
    const full = escapeHtml(s);
    return '<span class="jt-val-str" id="' + id + '"><span class="jt-str-trunc">"' + truncated + '…"</span>' +
      '<span class="jt-str-full" style="display:none">"' + full + '"</span>' +
      ' <a class="jt-str-toggle" onclick="return _toggleStrExpand(\'' + id + '\')" href="#">…</a></span>';
  }
  return '<span class="jt-val-str">"' + escapeHtml(s) + '"</span>';
}

function _toggleStrExpand(id) {
  const el = document.getElementById(id);
  if (!el) return false;
  const trunc = el.querySelector('.jt-str-trunc');
  const full = el.querySelector('.jt-str-full');
  const toggle = el.querySelector('.jt-str-toggle');
  if (!trunc || !full) return false;
  const expanding = trunc.style.display !== 'none';
  trunc.style.display = expanding ? 'none' : '';
  full.style.display = expanding ? '' : 'none';
  toggle.textContent = expanding ? '…collapse' : '…';
  return false;
}

function toggleOutputTreeNode(btn) {
  const c = btn.closest('.jt-tree-header').nextElementSibling;
  const h = c.style.display === 'none';
  c.style.display = h ? '' : 'none';
  btn.textContent = h ? '▼' : '▶';
}

function expandAllOutputTree() {
  // Try to expand in the new tree output first
  const newTreeContainer = document.getElementById('treeOutput');
  const oldTreeContainer = document.getElementById('outputTree');

  // Check if treeOutput is visible using offsetParent (more reliable than style.display)
  if (newTreeContainer && newTreeContainer.offsetParent !== null && newTreeContainer.children.length > 0) {
    // New tree view system (three-view switcher) OR old structure (tree tool)
    newTreeContainer.querySelectorAll('.jt-tree-children').forEach(n => {
      n.classList.remove('jt-tree-children--collapsed');
      n.style.display = '';
    });
    newTreeContainer.querySelectorAll('.jt-tree-toggle').forEach(n => {
      n.classList.remove('jt-tree-toggle--collapsed');
      n.textContent = '▼';
    });
    return;
  }

  // Check old tree view system (outputTree)
  if (oldTreeContainer && oldTreeContainer.offsetParent !== null && oldTreeContainer.children.length > 0) {
    oldTreeContainer.querySelectorAll('.jt-tree-children').forEach(n => n.style.display = '');
    oldTreeContainer.querySelectorAll('.jt-tree-toggle').forEach(n => n.textContent = '▼');
    return;
  }

  // Fall back to old showOutputTreeView function
  if (!outputTreeViewVisible) {
    const savedDepth = outputTreeDepth;
    outputTreeDepth = 99; // expand all
    if (!showOutputTreeView()) return;
    outputTreeDepth = savedDepth;
  } else {
    // Already visible, just expand all nodes
    if (oldTreeContainer) {
      oldTreeContainer.querySelectorAll('.jt-tree-children').forEach(n => n.style.display = '');
      oldTreeContainer.querySelectorAll('.jt-tree-toggle').forEach(n => n.textContent = '▼');
    }
  }
}

function collapseAllOutputTree() {
  // Try to collapse in the new tree output first
  const newTreeContainer = document.getElementById('treeOutput');
  const oldTreeContainer = document.getElementById('outputTree');

  // Check if treeOutput is visible using offsetParent (more reliable than style.display)
  if (newTreeContainer && newTreeContainer.offsetParent !== null && newTreeContainer.children.length > 0) {
    // New tree view system (three-view switcher) OR old structure (tree tool)
    newTreeContainer.querySelectorAll('.jt-tree-children').forEach(n => {
      n.classList.add('jt-tree-children--collapsed');
      n.style.display = 'none';
    });
    newTreeContainer.querySelectorAll('.jt-tree-toggle').forEach(n => {
      n.classList.add('jt-tree-toggle--collapsed');
      n.textContent = '▶';
    });
    return;
  }

  // Check old tree view system (outputTree)
  if (oldTreeContainer && oldTreeContainer.offsetParent !== null && oldTreeContainer.children.length > 0) {
    oldTreeContainer.querySelectorAll('.jt-tree-children').forEach(n => n.style.display = 'none');
    oldTreeContainer.querySelectorAll('.jt-tree-toggle').forEach(n => n.textContent = '▶');
    return;
  }

  // Fall back to old showOutputTreeView function
  if (!outputTreeViewVisible) {
    const savedDepth = outputTreeDepth;
    outputTreeDepth = 1; // collapse all
    if (!showOutputTreeView()) return;
    outputTreeDepth = savedDepth;
  } else {
    // Already visible, just collapse all nodes
    if (oldTreeContainer) {
      oldTreeContainer.querySelectorAll('.jt-tree-children').forEach(n => n.style.display = 'none');
      oldTreeContainer.querySelectorAll('.jt-tree-toggle').forEach(n => n.textContent = '▶');
    }
  }
}

function copyOutputTreePath(path) {
  navigator.clipboard.writeText(path).then(() => showToast((i18n('json.output.copy_path') || 'Copied') + '：' + path, 'success'));
}

function _locateInputByPath(jsonPath) {
  const text = getInput();
  if (!text) return;
  const lines = text.split('\n');
  // Simple search: find the last key in the path
  const parts = jsonPath.split(/[.\[\]]/).filter(Boolean);
  if (parts.length === 0) return;
  const lastKey = parts[parts.length - 1].replace(/['"]/g, '');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match key pattern: "key": or just "key"
    const keyMatch = line.match(new RegExp('"(' + lastKey + ')"\\s*:'));
    if (keyMatch) {
      inputEditor.revealLineInCenter(i + 1);
      inputEditor.setPosition({ lineNumber: i + 1, column: line.indexOf(keyMatch[1]) + 1 });
      // Brief highlight
      inputEditor.deltaDecorations([], [{
        range: new monaco.Range(i + 1, 1, i + 1, 9999),
        options: { isWholeLine: true, className: 'jt-locate-line' }
      }]);
      setTimeout(() => inputEditor.deltaDecorations([], []), 1500);
      break;
    }
  }
}

/* ── Fullscreen Modal ──────────────────────────── */
let fullscreenInputEditor = null;
let fullscreenOutputEditor = null;
let isFullscreen = false;

function openFullscreen() {
  const overlay = document.getElementById('fullscreenOverlay');
  if (!overlay) return;

  isFullscreen = true;
  overlay.classList.add('visible');
  document.body.style.overflow = 'hidden';

  // Initialize Monaco editors in fullscreen
  require(['vs/editor/editor.main'], function() {
    const opts = {
      fontSize: 14, minimap: { enabled: false },
      scrollBeyondLastLine: false, automaticLayout: true, wordWrap: 'on',
      'bracketPairColorization': { enabled: true },
    };

    // Create input editor
    const inputEl = document.getElementById('fullscreenInputEditor');
    if (inputEl && !fullscreenInputEditor) {
      fullscreenInputEditor = monaco.editor.create(inputEl, {
        ...opts, value: getInput(), language: 'json', theme: (document.documentElement.getAttribute('data-theme') || 'light') === 'dark' ? 'vs-dark' : 'vs',
      });
    } else if (fullscreenInputEditor) {
      fullscreenInputEditor.setValue(getInput());
    }

    // Create output editor
    const outputEl = document.getElementById('fullscreenOutputEditor');
    if (outputEl && !fullscreenOutputEditor) {
      fullscreenOutputEditor = monaco.editor.create(outputEl, {
        ...opts, value: getOutput(), language: 'json', theme: (document.documentElement.getAttribute('data-theme') || 'light') === 'dark' ? 'vs-dark' : 'vs', readOnly: true,
      });
    } else if (fullscreenOutputEditor) {
      fullscreenOutputEditor.setValue(getOutput());
    }

    updateFullscreenStats();
  });

  // Add Escape key listener
  document.addEventListener('keydown', handleFullscreenEsc);
}

function processJsonFullscreen() {
  if (!isFullscreen) return;
  // Sync fullscreen input to main input
  if (fullscreenInputEditor && inputEditor) {
    inputEditor.setValue(fullscreenInputEditor.getValue());
  }
  // Call the tool-specific processJson
  if (typeof processJson === 'function') {
    processJson();
  }
  // Sync main output to fullscreen output (after a short delay for async operations)
  setTimeout(() => {
    if (fullscreenOutputEditor && outputEditor) {
      fullscreenOutputEditor.setValue(getOutput());
      updateFullscreenStats();
    }
  }, 50);
}

function closeFullscreen() {
  const overlay = document.getElementById('fullscreenOverlay');
  if (!overlay) return;

  isFullscreen = false;
  overlay.classList.remove('visible');
  document.body.style.overflow = '';

  // Sync content back
  if (fullscreenInputEditor && inputEditor) {
    inputEditor.setValue(fullscreenInputEditor.getValue());
  }

  // Remove Escape key listener
  document.removeEventListener('keydown', handleFullscreenEsc);
}

function closeFullscreenOnBackdrop(e) {
  if (e.target.id === 'fullscreenOverlay') {
    closeFullscreen();
  }
}

function handleFullscreenEsc(e) {
  if (e.key === 'Escape' && isFullscreen) {
    closeFullscreen();
  }
}

function updateFullscreenStats() {
  const inputEl = document.getElementById('fullscreenInputSize');
  const outputEl = document.getElementById('fullscreenOutputSize');
  if (inputEl) inputEl.textContent = formatBytes(new Blob([getInput()]).size);
  if (outputEl) outputEl.textContent = formatBytes(new Blob([getOutput()]).size);
}

/* ── History-aware Process Wrapper ─────────────── */
function runProcessJson() {
  startProcessTimer();
  // Show loading state on process button
  const btn = document.getElementById('processBtn');
  const origHTML = btn ? btn.innerHTML : '';
  if (btn) { btn.innerHTML = '<span class="jt-spinner"></span>'; btn.disabled = true; }
  try {
  const tool = window.JT_TOOL;
  let inputText = '';
  if (tool === 'diff') {
    inputText = (leftEditor?.getValue() || '') + '\n---\n' + (rightEditor?.getValue() || '');
  } else if (tool === 'schema-validate') {
    inputText = window._schemaEditor?.getValue() || '';
  } else {
    inputText = getInput();
  }
  if (tool && inputText.trim()) {
    const icon = document.querySelector('.jt-tool-hero__icon')?.textContent?.trim() || '🔧';
    const name = document.querySelector('.jt-tool-hero__title')?.textContent?.trim() || tool;
    recordHistory(tool, name, icon, inputText);
  }
  // Call the tool-specific processJson
  if (typeof processJson === 'function') {
    const t0 = performance.now();
    const result = processJson.apply(this, arguments);
    const duration = Math.round(performance.now() - t0);
    // GA tracking
    if (typeof gaTrackProcessDone === 'function') {
      gaTrackProcessDone(tool || 'json-tool', 1, duration);
    }
    // Restore button after processing (use setTimeout for async operations)
    setTimeout(() => { if (btn) { btn.innerHTML = origHTML; btn.disabled = false; } }, 100);
    return result;
  }
  // No processJson defined — restore button
  if (btn) { btn.innerHTML = origHTML; btn.disabled = false; }
  } catch(e) {
    if (btn) { btn.innerHTML = origHTML; btn.disabled = false; }
  }
}

/* ── Multi-Tab Input Management ─────────────────── */
const MAX_TABS = 5;
const TABS_STORAGE_KEY = 'jt_json_tabs';
const ACTIVE_TAB_STORAGE_KEY = 'jt_json_active_tab';

// Initialize tabs from sessionStorage or create default tab
let tabs = [];
let activeTabId = null;

function initTabs() {
  try {
    const saved = sessionStorage.getItem(TABS_STORAGE_KEY);
    const active = sessionStorage.getItem(ACTIVE_TAB_STORAGE_KEY);

    if (saved) {
      tabs = JSON.parse(saved);
      // Validate tabs structure
      if (!Array.isArray(tabs) || tabs.length === 0) {
        tabs = createDefaultTab();
      }
    } else {
      tabs = createDefaultTab();
    }

    if (active) {
      activeTabId = parseInt(active);
      // Validate active tab still exists
      if (!tabs.find(t => t.id === activeTabId)) {
        activeTabId = tabs[0]?.id;
      }
    } else {
      activeTabId = tabs[0]?.id;
    }

    renderTabs();
    loadTabContent(activeTabId);
  } catch(e) {
    console.error('Failed to initialize tabs:', e);
    tabs = createDefaultTab();
    activeTabId = tabs[0]?.id;
    renderTabs();
  }
}

function createDefaultTab() {
  return [{
    id: Date.now(),
    title: i18n('json.tabs.document') + ' 1',
    content: '',
    isDirty: false
  }];
}

function newTab() {
  if (tabs.length >= MAX_TABS) {
    showToast(i18n('json.tabs.max_reached') || 'Maximum 5 tabs allowed', 'warning');
    return;
  }

  // Save current tab content before switching
  saveCurrentTabContent();

  const newTab = {
    id: Date.now(),
    title: i18n('json.tabs.document') + ' ' + (tabs.length + 1),
    content: '',
    isDirty: false
  };

  tabs.push(newTab);
  activeTabId = newTab.id;

  renderTabs();
  loadTabContent(activeTabId);
  saveTabs();
}

function closeTab(index) {
  const tab = tabs[index];
  if (!tab) return;

  // Check for dirty state
  if (tab.isDirty) {
    const msg = i18n('json.tabs.close_dirty_confirm') || 'This tab contains unsaved content. Close anyway?';
    if (!confirm(msg)) {
      return;
    }
  }

  tabs.splice(index, 1);

  // If we closed the active tab, switch to another
  if (activeTabId === tab.id) {
    if (tabs.length > 0) {
      // Switch to the tab to the left, or the first tab
      const newIndex = Math.max(0, index - 1);
      activeTabId = tabs[newIndex].id;
      loadTabContent(activeTabId);
    } else {
      // If all tabs closed, create a new default one
      tabs = createDefaultTab();
      activeTabId = tabs[0].id;
      loadTabContent(activeTabId);
    }
  }

  renderTabs();
  saveTabs();
}

function switchTab(tabId) {
  if (tabId === activeTabId) return;

  // Save current tab content
  saveCurrentTabContent();

  activeTabId = tabId;
  loadTabContent(tabId);

  renderTabs();
  saveTabs();
}

function saveCurrentTabContent() {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (currentTab && inputEditor) {
    const content = inputEditor.getValue();
    currentTab.content = content;
    currentTab.isDirty = content.trim() !== '';
  }
}

function loadTabContent(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;

  if (inputEditor) {
    inputEditor.setValue(tab.content);
  }
}

function renderTabs() {
  const tabsList = document.getElementById('tabsList');
  if (!tabsList) return;

  tabsList.innerHTML = tabs.map((tab, index) => {
    const isActive = tab.id === activeTabId;
    const closeStyle = tabs.length > 1 ? '' : 'display:none';
    return `
      <div class="jt-tab ${isActive ? 'active' : ''}" data-tab="${tab.id}" onclick="switchTab(${tab.id})">
        <span class="jt-tab-title">${escapeHtml(tab.title)}</span>
        ${tab.isDirty ? '<span class="jt-tab-dirty">●</span>' : ''}
        <button class="jt-tab-close" onclick="event.stopPropagation(); closeTab(${index})" style="${closeStyle}" title="Close">×</button>
      </div>
    `;
  }).join('');

  // Update tab add button visibility
  const addBtn = document.querySelector('.jt-tab-add');
  if (addBtn) {
    addBtn.style.display = tabs.length >= MAX_TABS ? 'none' : '';
  }
}

function saveTabs() {
  try {
    sessionStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
    sessionStorage.setItem(ACTIVE_TAB_STORAGE_KEY, String(activeTabId));
  } catch(e) {
    console.error('Failed to save tabs:', e);
  }
}

function updateTabDirtyState() {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab) return;

  if (inputEditor) {
    const content = inputEditor.getValue();
    const isDirty = content.trim() !== '';

    if (currentTab.isDirty !== isDirty) {
      currentTab.isDirty = isDirty;
      saveTabs();
      renderTabs();
    }
  }
}

// Track editor changes to update dirty state
function setupTabChangeTracking() {
  if (!inputEditor) return;

  let changeTimer = null;
  inputEditor.onDidChangeModelContent(function() {
    clearTimeout(changeTimer);
    changeTimer = setTimeout(updateTabDirtyState, 500);
  });
}

// Tab keyboard shortcuts
document.addEventListener('keydown', function(e) {
  // Ctrl+T for new tab
  if ((e.ctrlKey || e.metaKey) && e.key === 't') {
    e.preventDefault();
    newTab();
  }
  // Ctrl+W for close tab
  else if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
    e.preventDefault();
    const activeIndex = tabs.findIndex(t => t.id === activeTabId);
    if (activeIndex >= 0) {
      closeTab(activeIndex);
    }
  }
  // Ctrl+Tab for next tab
  else if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    const activeIndex = tabs.findIndex(t => t.id === activeTabId);
    const nextIndex = (activeIndex + 1) % tabs.length;
    switchTab(tabs[nextIndex].id);
  }
  // Ctrl+Shift+Tab for previous tab
  else if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && e.shiftKey) {
    e.preventDefault();
    const activeIndex = tabs.findIndex(t => t.id === activeTabId);
    const prevIndex = (activeIndex - 1 + tabs.length) % tabs.length;
    switchTab(tabs[prevIndex].id);
  }
  // Ctrl+1-5 for specific tab
  else if ((e.ctrlKey || e.metaKey) && /^[1-5]$/.test(e.key)) {
    const tabIndex = parseInt(e.key) - 1;
    if (tabIndex < tabs.length) {
      e.preventDefault();
      switchTab(tabs[tabIndex].id);
    }
  }
});

// Initialize tabs on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initTabs, 100);
    setTimeout(setupTabChangeTracking, 500);
    setTimeout(setupResizeHandle, 200);
  });
} else {
  setTimeout(initTabs, 100);
  setTimeout(setupTabChangeTracking, 500);
  setTimeout(setupResizeHandle, 200);
}

/* ── Resize Handle Functionality ───────────────────── */
const RESIZE_RATIO_KEY = 'jt_resize_ratio';
let isDragging = false;
let dragStartX = 0;
let dragStartRatio = 50;

function setupResizeHandle() {
  const handle = document.getElementById('resizeHandle');
  const inputPane = document.getElementById('inputPane');
  const outputPane = document.getElementById('outputPane');

  if (!handle || !inputPane || !outputPane) return;

  // Restore saved ratio
  const savedRatio = localStorage.getItem(RESIZE_RATIO_KEY);
  if (savedRatio) {
    const ratio = parseFloat(savedRatio);
    if (!isNaN(ratio) && ratio >= 20 && ratio <= 80) {
      applyResizeRatio(ratio, inputPane, outputPane);
    }
  }

  // Mouse down on handle
  handle.addEventListener('mousedown', function(e) {
    isDragging = true;
    dragStartX = e.clientX;

    const inputRect = inputPane.getBoundingClientRect();
    const containerRect = inputPane.parentElement.getBoundingClientRect();
    dragStartRatio = ((inputRect.right - containerRect.left) / containerRect.width) * 100;

    handle.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    e.preventDefault();
  });

  // Double click to reset to 50:50
  handle.addEventListener('dblclick', function() {
    applyResizeRatio(50, inputPane, outputPane);
    localStorage.removeItem(RESIZE_RATIO_KEY);
  });
}

// Global mouse move for dragging
document.addEventListener('mousemove', function(e) {
  if (!isDragging) return;

  const handle = document.getElementById('resizeHandle');
  const inputPane = document.getElementById('inputPane');
  const outputPane = document.getElementById('outputPane');

  if (!handle || !inputPane || !outputPane) return;

  const containerRect = inputPane.parentElement.getBoundingClientRect();
  const newRatio = ((e.clientX - containerRect.left) / containerRect.width) * 100;

  // Clamp between 20% and 80%
  const clampedRatio = Math.max(20, Math.min(80, newRatio));

  applyResizeRatio(clampedRatio, inputPane, outputPane);
});

// Global mouse up to stop dragging
document.addEventListener('mouseup', function() {
  if (isDragging) {
    isDragging = false;

    const handle = document.getElementById('resizeHandle');
    if (handle) {
      handle.classList.remove('dragging');
    }

    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    // Save the ratio
    const inputPane = document.getElementById('inputPane');
    if (inputPane) {
      const containerRect = inputPane.parentElement.getBoundingClientRect();
      const inputRect = inputPane.getBoundingClientRect();
      const ratio = ((inputRect.right - containerRect.left) / containerRect.width) * 100;
      localStorage.setItem(RESIZE_RATIO_KEY, String(ratio));
    }

    // Trigger Monaco editor layout update
    if (typeof inputEditor !== 'undefined' && inputEditor) {
      inputEditor.layout();
    }
    if (typeof outputEditor !== 'undefined' && outputEditor) {
      outputEditor.layout();
    }
  }
});

function applyResizeRatio(ratio, inputPane, outputPane) {
  inputPane.style.flex = '0 0 ' + ratio + '%';
  outputPane.style.flex = '0 0 ' + (100 - ratio) + '%';

  // Trigger Monaco editor layout update
  setTimeout(function() {
    if (typeof inputEditor !== 'undefined' && inputEditor) {
      inputEditor.layout();
    }
    if (typeof outputEditor !== 'undefined' && outputEditor) {
      outputEditor.layout();
    }
  }, 0);
}

