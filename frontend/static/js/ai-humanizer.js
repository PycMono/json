/* =============================================================
   AI Humanizer — ai-humanizer.js
   Frontend processing engine (strategy + factory pattern)
   ============================================================= */
(function () {
'use strict';

// ─── State ────────────────────────────────────────────────────
var STATE = {
  inputText:        '',
  inputWordCount:   0,
  inputAIScore:     null,
  mode:             'standard',
  purpose:          'general',
  tone:             'neutral',
  preserveFormat:   true,
  strength:         3,
  dialect:          '',
  frozenKeywords:   [],
  seoKeywords:      [],
  customStyle:      '',
  outputText:       '',
  outputWordCount:  0,
  outputAIScore:    null,
  readabilityScore: null,
  isProcessing:     false,
  isDetecting:      false,
  abortController:  null,
  streamBuffer:     '',
  history:          [],
  themeMode:        'dark',
  historyOpen:      false,
  chartInput:       null,
  chartOutput:      null,
  advancedOpen:     false,
  inputTab:         'paste',
  // New state for features
  outputView:       'text',
  diffMode:         'side',
  variants:         [],
  currentVariant:   0,
  variantCount:     1,
  batchFiles:       [],
  batchResults:     [],
  isBatchProcessing: false,
  batchProgress:    0,
  paraphraseMode:   false,
  lastDetectData:   null,
  plagiarismData:   null,
  grammarIssues:    [],
  grammarScore:     null,
  undoStack:        [],
  editHistory:      [],
};
var MAX_FILE_SIZE = 10 * 1024 * 1024;
var HISTORY_LIMIT = 10;

// ─── i18n helper ─────────────────────────────────────────────
function t(key) {
  return (window.__i18n__ && window.__i18n__[key]) || key;
}

// ─── Word counter (CJK aware) ─────────────────────────────────
function countWords(text) {
  if (!text || !text.trim()) return 0;
  var cjk = (text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  var en  = text.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, ' ')
                .trim().split(/\s+/).filter(Boolean).length;
  return cjk + en;
}

// ─── Simple language detection from text ──────────────────────
function detectLang(text) {
  if (!text) return 'en';
  var cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  var jp  = (text.match(/[\u3040-\u30ff]/g) || []).length;
  var kr  = (text.match(/[\uac00-\ud7af]/g) || []).length;
  if (kr > cjk && kr > 5) return 'ko';
  if (jp > cjk && jp > 5) return 'ja';
  if (cjk > 5) return 'zh';
  return 'en';
}

function fmtWords(n) {
  return n + ' ' + (n === 1 ? 'word' : 'words');
}

// ─── XSS / escaping ──────────────────────────────────────────
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escRx(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ─── Mode descriptions ───────────────────────────────────────
var MODE_DESC = {
  free:       function(){ return t('ah.mode.free.desc'); },
  standard:   function(){ return t('ah.mode.standard.desc'); },
  smart:      function(){ return t('ah.mode.smart.desc'); },
  easy:       function(){ return t('ah.mode.easy.desc'); },
  creative:   function(){ return t('ah.mode.creative.desc'); },
  academic:   function(){ return t('ah.mode.academic.desc'); },
  formal:     function(){ return t('ah.mode.formal.desc'); },
  casual:     function(){ return t('ah.mode.casual.desc'); },
  aggressive: function(){ return t('ah.mode.aggressive.desc'); },
  ultra:      function(){ return t('ah.mode.ultra.desc'); },
};

// ─── Public API ───────────────────────────────────────────────
var AIHumanizer = {

  // ── Init ──────────────────────────────────────────────────
  init: function() {
    // Restore theme — use unified 'tbn-theme' key (migrate legacy 'ah-theme')
    var savedTheme = localStorage.getItem('tbn-theme')
      || localStorage.getItem('ah-theme')
      || 'light';
    STATE.themeMode = savedTheme;
    // The FOUC script in base.html already set data-theme; just sync the local icon
    var sunIcon  = document.getElementById('ah-icon-sun');
    var moonIcon = document.getElementById('ah-icon-moon');
    if (sunIcon)  sunIcon.style.display  = savedTheme === 'dark' ? '' : 'none';
    if (moonIcon) moonIcon.style.display = savedTheme === 'dark' ? 'none' : '';

    // Load history
    loadHistory();

    // Load saved custom style
    try {
      var savedStyle = localStorage.getItem('ah-custom-style') || '';
      STATE.customStyle = savedStyle;
      var styleTa = el('ah-style-sample');
      if (styleTa && savedStyle) {
        styleTa.value = savedStyle;
        var countEl = el('ah-style-count');
        if (countEl) countEl.textContent = savedStyle.length + '/2000 ' + t('ah.advanced.style.chars');
      }
    } catch(e) {}

    // Cross-tool prefill: if navigated from AI Detector
    try {
      var prefill = sessionStorage.getItem('ah_prefill_text');
      if (prefill) {
        sessionStorage.removeItem('ah_prefill_text');
        var taP = document.getElementById('ah-input');
        if (taP) {
          taP.value = prefill;
          AIHumanizer.onInputChange({ target: taP });
        }
      }
    } catch(e) {}

    // Apply i18n to data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var k = el.getAttribute('data-i18n');
      var v = t(k);
      if (v && v !== k) el.textContent = v;
    });

    // Apply i18n placeholder
    var ta = document.getElementById('ah-input');
    if (ta) ta.placeholder = t('ah.input.placeholder');

    // Set active mode button slider
    setModeSlider(STATE.mode);

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        AIHumanizer.closeSynonymPanel();
        AIHumanizer.closeHistory();
        closeDropdown();
        var shortcutsModal = el('ah-shortcuts-modal');
        if (shortcutsModal) shortcutsModal.style.display = 'none';
      }
    });
    // Setup full keyboard shortcuts
    setupKeyboardShortcuts();
    setupURLInput();

    // Click outside closes menus
    document.addEventListener('click', function(e) {
      if (!e.target.closest('#ah-synonym-panel') && !e.target.closest('.ah-word--syn')) {
        AIHumanizer.closeSynonymPanel();
      }
      if (!e.target.closest('#ah-dl-dropdown') && !e.target.closest('[data-dl-toggle]')) {
        closeDropdown();
      }
    });
  },

  // ── Input change ─────────────────────────────────────────
  onInputChange: function(e) {
    STATE.inputText      = e.target.value;
    STATE.inputWordCount = countWords(STATE.inputText);
    var wcEl = document.getElementById('ah-input-wc');
    if (wcEl) wcEl.textContent = fmtWords(STATE.inputWordCount);
    if (STATE.inputWordCount > MAX_WORDS) {
      showToast(t('ah.error.too_long'), 'error');
    }
    if (STATE.inputAIScore !== null) {
      STATE.inputAIScore = null;
      updateScoreRing('input', null);
    }
  },

  // ── Mode select ──────────────────────────────────────────
  setMode: function(mode) {
    STATE.mode = mode;
    document.querySelectorAll('.ah-mode-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
    var descEl = document.getElementById('ah-mode-desc');
    if (descEl) descEl.textContent = MODE_DESC[mode] ? MODE_DESC[mode]() : '';
    setModeSlider(mode);
  },

  // ── Purpose select ──────────────────────────────────────
  setPurpose: function(purpose) {
    STATE.purpose = purpose;
    document.querySelectorAll('.ah-purpose-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.purpose === purpose);
    });
  },

  // ── Drag-and-drop ────────────────────────────────────────
  onDragOver: function(e) {
    e.preventDefault();
    document.getElementById('ah-panel-input').classList.add('drag-over');
  },
  onDragLeave: function(e) {
    var panel = document.getElementById('ah-panel-input');
    if (!panel.contains(e.relatedTarget)) panel.classList.remove('drag-over');
  },
  onDrop: function(e) {
    e.preventDefault();
    document.getElementById('ah-panel-input').classList.remove('drag-over');
    var file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  },
  onFileSelect: function(e) {
    var file = e.target.files[0];
    if (file) parseFile(file);
    e.target.value = '';
  },

  // ── Tone / Options ────────────────────────────────
  onToneChange: function(e) { STATE.tone = e.target.value; },
  onPreserveChange: function(e) { STATE.preserveFormat = e.target.checked; },

  // ── Main humanize ────────────────────────────────────────
  humanize: function(isRetry) {
    if (!STATE.inputText.trim()) {
      showToast(t('ah.error.empty_input'), 'error'); return;
    }
    if (STATE.isProcessing) return;

    STATE.isProcessing   = true;
    STATE.streamBuffer   = '';
    STATE._sseError      = false;  // reset error flag for each new run
    STATE.abortController = new AbortController();

    setBtnState('loading');
    var _gaStart = Date.now();
    if (typeof gaTrackToolUse === 'function') gaTrackToolUse('ai-humanizer');
    showOutputStreaming();
    startProgressBar();
    var startTime = Date.now();

    var body = JSON.stringify({
      text:             STATE.inputText,
      mode:             STATE.paraphraseMode ? 'standard' : STATE.mode,
      tone:             STATE.tone,
      preserve_format:  STATE.preserveFormat,
      strength:         STATE.strength,
      dialect:          STATE.dialect,
      frozen_keywords:  STATE.frozenKeywords,
      seo_keywords:     STATE.seoKeywords,
      custom_style:     STATE.customStyle,
      purpose:          STATE.purpose,
      paraphrase:       STATE.paraphraseMode,
    });

    fetch('/api/ai/humanize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: STATE.abortController.signal,
      body: body,
    }).then(function(resp) {
      if (!resp.ok) {
        return resp.text().then(function(txt) {
          var msg = 'API error ' + resp.status;
          try { msg = JSON.parse(txt).message || msg; } catch(_) {}
          throw new Error(msg);
        });
      }
      // Read SSE stream
      var reader  = resp.body.getReader();
      var decoder = new TextDecoder('utf-8');
      var buf     = '';
      var done    = false; // Track if [DONE] was received

      function read() {
        reader.read().then(function(r) {
          if (r.done || done) {
            if (!done) finishHumanize(startTime);
            return;
          }
          buf += decoder.decode(r.value, { stream: true });
          var lines = buf.split('\n');
          buf = lines.pop(); // keep incomplete line
          lines.forEach(function(line) {
            // ⚠️ Critical: stop processing ANY lines after [DONE] is received
            // Without this guard, tokens after [DONE] in the same buffer chunk
            // would call renderStreamOutput('') and wipe the final output.
            if (done) return;

            // Track SSE event type
            if (line.startsWith('event:')) {
              if (line.indexOf('event: error') !== -1) {
                STATE._sseError = true;
              }
              return;
            }
            if (!line.startsWith('data: ')) return;
            var token = line.slice(6);
            if (token === '[DONE]') {
              done = true;
              finishHumanize(startTime);
              return;
            }
            // If we saw an error event, this data line contains the error message
            if (STATE._sseError) {
              try { var errMsg = JSON.parse(token); showToast(errMsg.msg || errMsg.message || 'Server error', 'error'); } catch(_) { showToast(token, 'error'); }
              resetProcessing();
              return;
            }
            // Unescape newlines the backend escapes as \\n
            token = token.replace(/\\n/g, '\n');
            STATE.streamBuffer += token;
            renderStreamOutput(STATE.streamBuffer);
            updateProgressBar(estimateProgress(STATE.streamBuffer.length, STATE.inputText.length));
          });
          if (!done) read();
        }).catch(function(err) {
          if (err.name !== 'AbortError') {
            showToast(t('ah.error.api_fail'), 'error');
            document.dispatchEvent(new CustomEvent('humanize:error', { detail: { message: err.message } }));
          }
          resetProcessing();
        });
      }
      read();

    }).catch(function(err) {
      if (err.name !== 'AbortError') {
        showToast(t('ah.error.api_fail'), 'error');
        document.dispatchEvent(new CustomEvent('humanize:error', { detail: { message: err.message } }));
      }
      resetProcessing();
    });
  },

  // ── Detect AI ────────────────────────────────────────────
  detectAI: function(panel) {
    panel = panel || 'input';
    var text = panel === 'input' ? STATE.inputText : STATE.outputText;
    if (!text.trim()) return;
    if (panel === 'input') {
      STATE.isDetecting = true;
      var btn = document.getElementById('ah-detect-btn');
      if (btn) { btn._orig = btn.innerHTML; btn.innerHTML = '<span class="ah-spin"></span>'; btn.disabled = true; }
    }
    fetch('/api/ai/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text }),
    }).then(function(r) { return r.json(); }).then(function(data) {
      // API returns { score: 0-100, verdict, ... } — use data.score directly
      var score = typeof data.score === 'number' ? data.score
                : Math.round((data.ai_score || 0) * 100); // legacy fallback
      if (panel === 'input') {
        STATE.inputAIScore = score;
        animateScoreRing('input', score);
      } else {
        STATE.outputAIScore = score;
        animateScoreRing('output', score);
        showImproveBadge();
        // Render full detection results from backend
        renderFullDetectionResults(data);
      }
      document.dispatchEvent(new CustomEvent('detect:done', { detail: { score: score, panel: panel } }));
    }).catch(function() {
      showToast(t('ah.error.api_fail'), 'error');
    }).finally(function() {
      if (panel === 'input') {
        STATE.isDetecting = false;
        var btn = document.getElementById('ah-detect-btn');
        if (btn && btn._orig) { btn.innerHTML = btn._orig; btn.disabled = false; }
      }
    });
  },

  // ── Copy ─────────────────────────────────────────────────
  copyOutput: function() {
    if (!STATE.outputText) return;
    var write = navigator.clipboard
      ? navigator.clipboard.writeText(STATE.outputText)
      : Promise.resolve(legacyCopy(STATE.outputText));
    write.then(function() {
      showToast(t('ah.action.copy.done'), 'success');
      if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('ai-humanizer', 'text');
      var btn = document.getElementById('ah-copy-btn');
      if (btn) { var orig = btn.textContent; btn.textContent = t('ah.action.copy.done'); setTimeout(function() { btn.textContent = orig; }, 1500); }
    }).catch(function() { showToast(t('ah.error.api_fail'), 'error'); });
  },

  // ── Download TXT ─────────────────────────────────────────
  downloadTxt: function() {
    if (!STATE.outputText) return;
    var blob = new Blob([STATE.outputText], { type: 'text/plain;charset=utf-8' });
    triggerDownload(URL.createObjectURL(blob), 'humanized.txt');
    if (typeof gaTrackDownload === 'function') gaTrackDownload('ai-humanizer', 'txt');
  },

  // ── Download DOCX ────────────────────────────────────────
  downloadDocx: function() {
    if (!STATE.outputText || typeof docx === 'undefined') {
      showToast('DOCX library not loaded', 'error'); return;
    }
    var paragraphs = STATE.outputText.split('\n').map(function(line) {
      return new docx.Paragraph({ children: [new docx.TextRun({ text: line, size: 24 })] });
    });
    var doc = new docx.Document({ sections: [{ children: paragraphs }] });
    docx.Packer.toBlob(doc).then(function(blob) {
      triggerDownload(URL.createObjectURL(blob), 'humanized.docx');
    if (typeof gaTrackDownload === 'function') gaTrackDownload('ai-humanizer', 'docx');
    });
  },

  // ── Clear ────────────────────────────────────────────────
  clearAll: function() {
    if (STATE.abortController) STATE.abortController.abort();
    STATE.inputText = ''; STATE.outputText = '';
    STATE.inputAIScore = null; STATE.outputAIScore = null;
    STATE.isProcessing = false; STATE.streamBuffer = '';
    if (STATE.chartInput)  { STATE.chartInput.destroy();  STATE.chartInput  = null; }
    if (STATE.chartOutput) { STATE.chartOutput.destroy(); STATE.chartOutput = null; }
    var ta = document.getElementById('ah-input');
    if (ta) ta.value = '';
    var wcEl = document.getElementById('ah-input-wc');
    if (wcEl) wcEl.textContent = fmtWords(0);
    showOutputEmpty();
    updateScoreRing('input',  null);
    updateScoreRing('output', null);
    hideImproveBadge();
    resetProcessing();
  },
  clearInput: function() {
    var ta = document.getElementById('ah-input');
    if (ta) { ta.value = ''; AIHumanizer.onInputChange({ target: ta }); }
  },

  // ── Theme ────────────────────────────────────────────────
  toggleTheme: function() {
    // Delegate to global applyTheme (base.html) for site-wide switching
    if (typeof window.applyTheme === 'function') {
      var cur = document.documentElement.getAttribute('data-theme') || 'light';
      window.applyTheme(cur === 'dark' ? 'light' : 'dark');
      return;
    }
    // Fallback: local toggle
    STATE.themeMode = STATE.themeMode === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', STATE.themeMode);
    localStorage.setItem('tbn-theme', STATE.themeMode);
    var sunIcon  = document.getElementById('ah-icon-sun');
    var moonIcon = document.getElementById('ah-icon-moon');
    if (sunIcon)  sunIcon.style.display  = STATE.themeMode === 'dark' ? '' : 'none';
    if (moonIcon) moonIcon.style.display = STATE.themeMode === 'dark' ? 'none' : '';
  },

  // ── History drawer ───────────────────────────────────────
  toggleHistory: function() {
    STATE.historyOpen = !STATE.historyOpen;
    var drawer  = document.getElementById('ah-history-drawer');
    var overlay = document.getElementById('ah-history-overlay');
    if (drawer)  drawer.classList.toggle('open', STATE.historyOpen);
    if (overlay) overlay.classList.toggle('visible', STATE.historyOpen);
  },
  closeHistory: function() {
    STATE.historyOpen = false;
    var drawer  = document.getElementById('ah-history-drawer');
    var overlay = document.getElementById('ah-history-overlay');
    if (drawer)  drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('visible');
  },
  clearHistory: function() {
    STATE.history = [];
    localStorage.removeItem('ah-history');
    renderHistoryList();
  },
  restoreHistory: function(id) {
    var item = STATE.history.find(function(h) { return h.id === id; });
    if (!item) return;
    var ta = document.getElementById('ah-input');
    if (ta) { ta.value = item.fullInput; AIHumanizer.onInputChange({ target: ta }); }
    if (item.output) {
      STATE.outputText = item.output;
      finalizeOutput();
    }
    AIHumanizer.closeHistory();
  },

  // ── Download dropdown ────────────────────────────────────
  toggleDownloadMenu: function() {
    var dd = document.getElementById('ah-dl-dropdown');
    if (dd) dd.classList.toggle('open');
  },

  // ── Synonym panel ────────────────────────────────────────
  closeSynonymPanel: function() {
    var p = document.getElementById('ah-synonym-panel');
    if (p) p.style.display = 'none';
  },
  applySynonym: function(original, replacement) {
    var rx = new RegExp('\\b' + escRx(original) + '\\b', 'i');
    STATE.outputText = STATE.outputText.replace(rx, replacement);
    renderFinalOutput(STATE.outputText);
    AIHumanizer.closeSynonymPanel();
    showToast('"' + original + '" → "' + replacement + '"', 'success', 2000);
  },

  // ── New Advanced Options ────────────────────────────────────
  toggleAdvanced: function() {
    STATE.advancedOpen = !STATE.advancedOpen;
    var panel = el('ah-advanced-panel');
    var btn   = document.querySelector('.ah-advanced-toggle');
    if (panel) {
      panel.style.display = STATE.advancedOpen ? 'block' : 'none';
      panel.style.maxHeight = STATE.advancedOpen ? panel.scrollHeight + 'px' : '0';
    }
    if (btn) btn.classList.toggle('open', STATE.advancedOpen);
  },
  onStrengthChange: function(e) {
    STATE.strength = parseInt(e.target.value, 10) || 3;
    var valEl = el('ah-strength-val');
    if (valEl) {
      var labels = [t('ah.advanced.strength.light'), t('ah.advanced.strength.light'),
                    t('ah.advanced.strength.medium'), t('ah.advanced.strength.strong'),
                    t('ah.advanced.strength.strong')];
      valEl.textContent = labels[STATE.strength - 1] || STATE.strength;
    }
  },
  onDialectChange: function(e) {
    STATE.dialect = e.target.value || '';
  },
  onKeywordKeydown: function(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      var input = el('ah-keyword-input');
      if (!input) return;
      var word = input.value.trim().replace(/,$/, '');
      if (!word) return;
      if (STATE.frozenKeywords.length >= 20) {
        showToast(t('ah.advanced.keywords.max'), 'error'); return;
      }
      if (STATE.frozenKeywords.indexOf(word) === -1) {
        STATE.frozenKeywords.push(word);
        renderKeywordTags();
      }
      input.value = '';
    } else if (e.key === 'Backspace' && !e.target.value && STATE.frozenKeywords.length > 0) {
      STATE.frozenKeywords.pop();
      renderKeywordTags();
    }
  },
  removeKeyword: function(word) {
    var idx = STATE.frozenKeywords.indexOf(word);
    if (idx !== -1) {
      STATE.frozenKeywords.splice(idx, 1);
      renderKeywordTags();
    }
  },
  // SEO Keywords
  onSEOKeywordKeydown: function(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      var input = el('ah-seo-keyword-input');
      if (!input) return;
      var word = input.value.trim().replace(/,$/, '');
      if (!word) return;
      if (STATE.seoKeywords.length >= 10) {
        showToast(t('ah.advanced.seo_keywords.max'), 'error'); return;
      }
      if (STATE.seoKeywords.indexOf(word) === -1) {
        STATE.seoKeywords.push(word);
        renderSEOKeywordTags();
      }
      input.value = '';
    } else if (e.key === 'Backspace' && !e.target.value && STATE.seoKeywords.length > 0) {
      STATE.seoKeywords.pop();
      renderSEOKeywordTags();
    }
  },
  removeSEOKeyword: function(word) {
    var idx = STATE.seoKeywords.indexOf(word);
    if (idx !== -1) {
      STATE.seoKeywords.splice(idx, 1);
      renderSEOKeywordTags();
    }
  },
  onStyleChange: function(e) {
    var text = e.target.value;
    if (text.length > 2000) {
      e.target.value = text.substring(0, 2000);
      text = e.target.value;
    }
    STATE.customStyle = text;
    try { localStorage.setItem('ah-custom-style', text); } catch(_) {}
    var countEl = el('ah-style-count');
    if (countEl) countEl.textContent = text.length + '/2000 ' + t('ah.advanced.style.chars');
  },

  // ── Input Tab Switch (Paste vs Generate vs URL) ──────────────────────
  switchInputTab: function(tab) {
    STATE.inputTab = tab;
    document.querySelectorAll('.ah-input-tab').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    var pasteTa = el('ah-input');
    var genWrap = el('ah-generate-wrap');
    var urlWrap = el('ah-url-wrap');
    var dropOverlay = document.querySelector('.ah-drop-overlay');
    if (tab === 'paste') {
      if (pasteTa) { pasteTa.style.display = ''; }
      if (genWrap) { genWrap.style.display = 'none'; }
      if (urlWrap) { urlWrap.style.display = 'none'; }
      if (dropOverlay) { dropOverlay.style.display = ''; }
    } else if (tab === 'generate') {
      if (pasteTa) { pasteTa.style.display = 'none'; }
      if (genWrap) { genWrap.style.display = 'flex'; genWrap.style.flexDirection = 'column'; genWrap.style.flex = '1'; }
      if (urlWrap) { urlWrap.style.display = 'none'; }
      if (dropOverlay) { dropOverlay.style.display = 'none'; }
    } else if (tab === 'url') {
      if (pasteTa) { pasteTa.style.display = 'none'; }
      if (genWrap) { genWrap.style.display = 'none'; }
      if (urlWrap) { urlWrap.style.display = 'flex'; urlWrap.style.flexDirection = 'column'; urlWrap.style.flex = '1'; }
      if (dropOverlay) { dropOverlay.style.display = 'none'; }
    }
  },
  onGenerateInputChange: function(e) {
    // Just track prompt changes, no word count
  },
  generateContent: function() {
    var prompt = el('ah-generate-input');
    if (!prompt || !prompt.value.trim()) {
      showToast(t('ah.error.empty_input'), 'error'); return;
    }
    var lenSel = el('ah-generate-length');
    var length = lenSel ? lenSel.value : 'medium';

    var btn = el('ah-generate-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="ah-spin"></span>'; }

    // Generate content via API, then auto-humanize
    fetch('/api/ai/humanize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '[GENERATE] ' + prompt.value.trim(),
        mode: STATE.mode,
        tone: STATE.tone,
        preserve_format: false,
        strength: STATE.strength,
        extra_instructions: 'Generate ' + length + ' content about: ' + prompt.value.trim(),
      }),
    }).then(function(resp) {
      if (!resp.ok) throw new Error('API error');
      var reader = resp.body.getReader();
      var decoder = new TextDecoder('utf-8');
      var buf = '';
      var done = false;
      STATE.streamBuffer = '';

      function read() {
        reader.read().then(function(r) {
          if (r.done || done) {
            if (!done) {
              // Copy generated content to input textarea
              var pasteTa = el('ah-input');
              if (pasteTa) {
                pasteTa.value = STATE.streamBuffer;
                AIHumanizer.switchInputTab('paste');
                AIHumanizer.onInputChange({ target: pasteTa });
              }
            }
            return;
          }
          buf += decoder.decode(r.value, { stream: true });
          var lines = buf.split('\n');
          buf = lines.pop();
          lines.forEach(function(line) {
            if (done) return;
            if (line.startsWith('event:')) return;
            if (!line.startsWith('data: ')) return;
            var token = line.slice(6);
            if (token === '[DONE]') {
              done = true;
              var pasteTa = el('ah-input');
              if (pasteTa) {
                pasteTa.value = STATE.streamBuffer;
                AIHumanizer.switchInputTab('paste');
                AIHumanizer.onInputChange({ target: pasteTa });
              }
              return;
            }
            token = token.replace(/\\n/g, '\n');
            STATE.streamBuffer += token;
          });
          if (!done) read();
        }).catch(function(err) {
          showToast(t('ah.error.api_fail'), 'error');
          if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> ' + t('ah.input.generate.btn'); }
        });
      }
      read();
    }).catch(function(err) {
      showToast(t('ah.error.api_fail'), 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> ' + t('ah.input.generate.btn'); }
    });
  },

  // ── Autopilot (Deep Rewrite) ───────────────────────────────
  autopilot: function() {
    if (!STATE.outputText.trim()) {
      showToast(t('ah.error.empty_input'), 'error'); return;
    }
    if (STATE.isProcessing) return;

    STATE.isProcessing = true;
    STATE.autopilotRound = 0;
    STATE.autopilotMaxRounds = 3;
    STATE.autopilotInput = STATE.outputText;
    setBtnState('loading');
    var _gaStart = Date.now();
    if (typeof gaTrackToolUse === 'function') gaTrackToolUse('ai-humanizer');
    var btn = el('ah-autopilot-btn');
    if (btn) btn.innerHTML = '<span class="ah-spin"></span> ' + t('ah.autopilot.running').replace('{n}', '1');
    startProgressBar();
    autopilotRound();
  },

  // ── Sentence panel ─────────────────────────────────────────
  closeSentencePanel: function() {
    var p = el('ah-sentence-panel');
    if (p) p.style.display = 'none';
    // Remove sentence highlighting
    document.querySelectorAll('.ah-sentence--active').forEach(function(s) {
      s.classList.remove('ah-sentence--active');
    });
  },
  replaceSentence: function(original, replacement) {
    var idx = STATE.outputText.indexOf(original);
    if (idx !== -1) {
      STATE.outputText = STATE.outputText.substring(0, idx) + replacement + STATE.outputText.substring(idx + original.length);
    } else {
      STATE.outputText = STATE.outputText.replace(original, replacement);
    }
    renderFinalOutput(STATE.outputText);
    STATE.outputWordCount = countWords(STATE.outputText);
    var wcEl = el('ah-output-wc');
    if (wcEl) wcEl.textContent = fmtWords(STATE.outputWordCount);
    AIHumanizer.closeSentencePanel();
    showToast(t('ah.status.done'), 'success');
  if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('ai-humanizer', 1, Date.now() - _gaStart);
  },

  // ── Grammar Check ──────────────────────────────────────────
  checkGrammar: function() {
    if (!STATE.outputText.trim()) return;
    var btn = el('ah-grammar-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="ah-spin"></span>'; }
    checkGrammarWithAPI(STATE.outputText, function(issues) {
      STATE.grammarIssues = issues;
      STATE.grammarScore = Math.max(0, 100 - issues.length * 5);
      showGrammarResults(issues);
      if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> ' + t('ah.grammar.check'); }
    });
  },

  // ── FAQ ──────────────────────────────────────────────────
  toggleFAQ: function(btn) {
    var item = btn.parentElement;
    var isOpen = item.classList.contains('open');
    document.querySelectorAll('.ah-faq-item').forEach(function(el) {
      el.classList.remove('open');
      el.querySelector('.ah-faq-q').setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) { item.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
  },

  // ── Cross-tool: send humanized text to AI Detector ───────
  goToDetector: function() {
    var text = STATE.outputText || '';
    if (!text.trim()) return;
    try {
      sessionStorage.setItem('aid_prefill_text', text);
    } catch(e) {}
    var lang = window.__lang__ || 'en';
    var url = '/ai/detector' + (lang && lang !== 'en' ? '?lang=' + lang : '');
    window.location.href = url;
  },

  // ── URL Fetch ───────────────────────────────────────────────
  fetchURL: function() {
    var urlInput = el('ah-url-input');
    if (!urlInput || !urlInput.value.trim()) {
      showToast(t('ah.error.empty_input'), 'error'); return;
    }
    var url = urlInput.value.trim();
    var btn = el('ah-url-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="ah-spin"></span>'; }

    fetch('/api/ai/fetch-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url }),
    }).then(function(resp) {
      return resp.json();
    }).then(function(data) {
      if (!data.success || data.message) {
        showToast(data.message || t('ah.error.api_fail'), 'error');
      } else {
        var text = data.text || '';
        if (text.trim()) {
          var ta = el('ah-input');
          if (ta) { ta.value = text; AIHumanizer.onInputChange({ target: ta }); }
          AIHumanizer.switchInputTab('paste');
          showToast(t('ah.url.success'), 'success');
        } else {
          showToast(t('ah.url.no_content'), 'error');
        }
      }
    }).catch(function() {
      showToast(t('ah.error.api_fail'), 'error');
    }).finally(function() {
      if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg> ' + t('ah.input.url.btn'); }
    });
  },

  // ── Output View Switch ─────────────────────────────────────
  switchOutputView: function(view) {
    STATE.outputView = view;
    document.querySelectorAll('.ah-output-tab').forEach(function(b) {
      b.classList.toggle('active', b.dataset.view === view);
    });
    var textDiv = el('ah-output-text');
    var diffDiv = el('ah-diff-view');
    var authDiv = el('ah-authorship-view');
    if (view === 'text') {
      if (textDiv) { textDiv.style.display = ''; }
      if (diffDiv) { diffDiv.style.display = 'none'; }
      if (authDiv) { authDiv.style.display = 'none'; }
    } else if (view === 'diff') {
      if (textDiv) { textDiv.style.display = 'none'; }
      if (diffDiv) { diffDiv.style.display = ''; renderDiffView(); }
      if (authDiv) { authDiv.style.display = 'none'; }
    } else if (view === 'authorship') {
      if (textDiv) { textDiv.style.display = 'none'; }
      if (diffDiv) { diffDiv.style.display = 'none'; }
      if (authDiv) { authDiv.style.display = ''; renderAuthorshipView(); }
    }
  },

  // ── Diff Mode ─────────────────────────────────────────────
  setDiffMode: function(mode) {
    STATE.diffMode = mode;
    document.querySelectorAll('.ah-diff-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.diffMode === mode);
    });
    renderDiffView();
  },

  // ── Variant generation ───────────────────────────────────
  onVariantCountChange: function(e) {
    STATE.variantCount = parseInt(e.target.value, 10) || 1;
    var tabs = el('ah-variant-tabs');
    if (tabs) {
      tabs.querySelectorAll('.ah-variant-tab').forEach(function(tab, i) {
        tab.style.display = i < STATE.variantCount ? '' : 'none';
      });
    }
  },
  switchVariant: function(idx) {
    STATE.currentVariant = idx;
    document.querySelectorAll('.ah-variant-tab').forEach(function(b) {
      b.classList.toggle('active', parseInt(b.dataset.variant, 10) === idx);
    });
    if (STATE.variants[idx]) {
      STATE.outputText = STATE.variants[idx].text;
      renderFinalOutput(STATE.outputText);
      if (STATE.variants[idx].score) {
        STATE.outputAIScore = STATE.variants[idx].score;
        animateScoreRing('output', STATE.outputAIScore);
      }
    }
  },
  generateVariants: function() {
    if (!STATE.inputText.trim()) return;
    STATE.isProcessing = true;
    STATE.variants = [];
    setBtnState('loading');
    var _gaStart = Date.now();
    if (typeof gaTrackToolUse === 'function') gaTrackToolUse('ai-humanizer');
    startProgressBar();
    var promises = [];
    for (var i = 0; i < STATE.variantCount; i++) {
      promises.push(generateVariant(i));
    }
    Promise.all(promises).then(function(results) {
      STATE.variants = results;
      STATE.outputText = results[0].text;
      STATE.outputAIScore = results[0].score;
      finalizeOutput();
      animateScoreRing('output', STATE.outputAIScore);
      var tabs = el('ah-variant-tabs');
      if (tabs && STATE.variantCount > 1) { tabs.style.display = ''; }
      showToast(t('ah.variants.done'), 'success');
    }).catch(function() {
      showToast(t('ah.error.api_fail'), 'error');
    }).finally(function() {
      resetProcessing();
      finishProgressBar();
    });
  },

  // ── Batch processing ─────────────────────────────────────
  toggleBatch: function() {
    STATE.batchOpen = !STATE.batchOpen;
    var drawer  = el('ah-batch-drawer');
    var overlay = el('ah-batch-overlay');
    if (drawer)  drawer.classList.toggle('open', STATE.batchOpen);
    if (overlay) overlay.classList.toggle('visible', STATE.batchOpen);
  },
  closeBatch: function() {
    STATE.batchOpen = false;
    var drawer  = el('ah-batch-drawer');
    var overlay = el('ah-batch-overlay');
    if (drawer)  drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('visible');
  },
  onBatchFiles: function(e) {
    var files = Array.from(e.target.files);
    STATE.batchFiles = files.filter(function(f) {
      var ext = f.name.split('.').pop().toLowerCase();
      return ['txt', 'pdf', 'docx'].indexOf(ext) !== -1 && f.size <= MAX_FILE_SIZE;
    });
    renderBatchList();
    var startBtn = el('ah-batch-start-btn');
    if (startBtn && STATE.batchFiles.length > 0) { startBtn.style.display = ''; }
  },
  startBatch: function() {
    if (STATE.batchFiles.length === 0 || STATE.isBatchProcessing) return;
    STATE.isBatchProcessing = true;
    STATE.batchResults = [];
    STATE.batchProgress = 0;
    var progressEl = el('ah-batch-progress');
    if (progressEl) { progressEl.style.display = ''; }
    processBatchFiles();
  },
  downloadBatchZip: function() {
    // Create a simple zip-like download of all results
    STATE.batchResults.forEach(function(r, i) {
      if (r.text) {
        setTimeout(function() {
          var blob = new Blob([r.text], { type: 'text/plain;charset=utf-8' });
          triggerDownload(URL.createObjectURL(blob), 'humanized_' + (i+1) + '_' + r.filename);
        }, i * 200);
      }
    });
  },

  // ── Keyboard shortcuts modal ──────────────────────────────
  toggleShortcuts: function() {
    var modal = el('ah-shortcuts-modal');
    if (modal) modal.style.display = modal.style.display === 'none' ? '' : 'none';
  },

  // ── Paraphraser mode toggle ───────────────────────────────
  toggleParaphrase: function() {
    STATE.paraphraseMode = !STATE.paraphraseMode;
    var btn = el('ah-paraphrase-btn');
    var label = el('ah-paraphrase-label');
    if (btn) btn.classList.toggle('active', STATE.paraphraseMode);
    if (label) {
      label.textContent = STATE.paraphraseMode ? t('ah.paraphrase.active') : t('ah.paraphrase.title');
    }
    showToast(STATE.paraphraseMode ? t('ah.paraphrase.enabled') : t('ah.paraphrase.disabled'), 'info');
  },

  // ── Plagiarism check ───────────────────────────────────────
  checkPlagiarism: function() {
    if (!STATE.outputText.trim()) return;
    var btn = el('ah-plagiarism-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="ah-spin"></span>'; }
    fetch('/api/ai/plagiarism-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: STATE.outputText, language: detectLang(STATE.outputText) }),
    }).then(function(r) { return r.json(); }).then(function(data) {
      STATE.plagiarismData = data;
      renderPlagiarismResults(data);
      var panel = el('ah-plagiarism-panel');
      if (panel) { panel.style.display = ''; }
      showToast(t('ah.plagiarism.done'), 'success');
    }).catch(function() {
      showToast(t('ah.error.api_fail'), 'error');
    }).finally(function() {
      if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> ' + t('ah.plagiarism.title'); }
    });
  },

  // ── Undo ──────────────────────────────────────────────────
  undo: function() {
    if (STATE.undoStack.length === 0) return;
    var prev = STATE.undoStack.pop();
    STATE.outputText = prev.text;
    renderFinalOutput(STATE.outputText);
    showToast(t('ah.undo.done'), 'success');
  },

  // ── Push undo state ───────────────────────────────────────
  pushUndo: function() {
    STATE.undoStack.push({ text: STATE.outputText, timestamp: Date.now() });
    if (STATE.undoStack.length > 20) STATE.undoStack.shift();
  },
};

// ─── Internal helpers ─────────────────────────────────────────

function setModeSlider(mode) {
  var activeBtn = document.querySelector('.ah-mode-btn[data-mode="' + mode + '"]');
  var descEl    = document.getElementById('ah-mode-desc');
  if (descEl) descEl.textContent = MODE_DESC[mode] ? MODE_DESC[mode]() : '';
}

function showOutputEmpty() {
  el('ah-output-empty') && show(el('ah-output-empty'));
  el('ah-output-text')  && hide(el('ah-output-text'));
  el('ah-output-proc')  && hide(el('ah-output-proc'));
}
function showOutputStreaming() {
  el('ah-output-empty') && hide(el('ah-output-empty'));
  el('ah-output-proc')  && show(el('ah-output-proc'));
  el('ah-output-text')  && hide(el('ah-output-text'));
}
function renderStreamOutput(text) {
  var div = el('ah-output-text');
  if (!div) return;
  hide(el('ah-output-empty'));
  hide(el('ah-output-proc'));
  show(div);
  div.innerHTML = esc(text) + '<span class="ah-cursor"></span>';
  div.scrollTop = div.scrollHeight;
}
function finalizeOutput() {
  var div = el('ah-output-text');
  if (!div) return;
  hide(el('ah-output-empty'));
  hide(el('ah-output-proc'));
  show(div);
  renderFinalOutput(STATE.outputText);
  STATE.outputWordCount = countWords(STATE.outputText);
  var wcEl = el('ah-output-wc');
  if (wcEl) wcEl.textContent = fmtWords(STATE.outputWordCount);
  updateReadability(STATE.outputText);
  var btn = el('ah-humanize-again');
  if (btn) show(btn);
  // Show autopilot button
  var apBtn = el('ah-autopilot-btn');
  if (apBtn) show(apBtn);
  // Show grammar check button
  var grammarBtn = el('ah-grammar-btn');
  if (grammarBtn) show(grammarBtn);
  // Show cross-tool button
  var detBtn = el('ah-goto-detector');
  if (detBtn) show(detBtn);
  // Show plagiarism check button
  var plagBtn = el('ah-plagiarism-btn');
  if (plagBtn) show(plagBtn);
  // Show output tabs (diff/authorship)
  var tabs = el('ah-output-tabs');
  if (tabs) show(tabs);
  // Show variant selector if multi-variant
  if (STATE.variantCount > 1) {
    var varTabs = el('ah-variant-tabs');
    if (varTabs) show(varTabs);
    var varSel = el('ah-variant-selector');
    if (varSel) show(varSel);
  }
  div.scrollTop = 0;
}
function renderFinalOutput(text) {
  var div = el('ah-output-text');
  if (!div) return;
  var html = esc(text).replace(/\n/g, '<br>');
  // Wrap sentences for click-to-rewrite
  html = html.replace(/([^.!?]*[.!?](?:\s|$))/g, function(sentence) {
    if (sentence.trim().length < 10) return sentence;
    return '<span class="ah-sentence" data-text="' + esc(sentence.trim()) + '">' + sentence + '</span>';
  });
  // Wrap long English words with synonym capability
  html = html.replace(/\b([A-Za-z]{4,})\b/g, function(match) {
    // Skip if already inside a span attribute
    return getSynonyms(match).length > 0
      ? '<span class="ah-word--syn" data-word="' + match + '">' + match + '</span>'
      : match;
  });
  div.innerHTML = html;
  // Bind synonym click
  div.querySelectorAll('.ah-word--syn').forEach(function(span) {
    span.addEventListener('click', function(e) {
      e.stopPropagation();
      var word = span.dataset.word;
      var syns = getSynonyms(word);
      if (syns.length) showSynonymPanel(e, word, syns);
    });
  });
  // Bind sentence click
  div.querySelectorAll('.ah-sentence').forEach(function(span) {
    span.addEventListener('click', function(e) {
      e.stopPropagation();
      AIHumanizer.closeSynonymPanel();
      var sentenceText = span.dataset.text;
      // Highlight active sentence
      document.querySelectorAll('.ah-sentence--active').forEach(function(s) { s.classList.remove('ah-sentence--active'); });
      span.classList.add('ah-sentence--active');
      showSentenceAlternatives(e, sentenceText);
    });
  });
}

function finishHumanize(startTime) {
  STATE.outputText   = STATE.streamBuffer;
  STATE.streamBuffer = '';
  finalizeOutput();
  finishProgressBar();
  // Auto-detect output score
  AIHumanizer.detectAI('output');
  saveHistory();
  var durationMs = Date.now() - startTime;
  document.dispatchEvent(new CustomEvent('humanize:done', {
    detail: { durationMs: durationMs, aiScoreAfter: STATE.outputAIScore }
  }));
  resetProcessing();
  showToast(t('ah.status.done'), 'success');
  if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('ai-humanizer', 1, Date.now() - _gaStart);
}
function resetProcessing() {
  STATE.isProcessing = false;
  setBtnState('idle');
}
function setBtnState(state) {
  var btn = el('ah-humanize-btn');
  if (!btn) return;
  if (state === 'loading') {
    btn.disabled = true;
    btn.innerHTML = '<span class="ah-spin"></span>';
  } else {
    btn.disabled = false;
    btn.innerHTML = '<span class="ah-btn-humanize__icon">🧬</span>' + t('ah.action.humanize');
  }
}

// ─── Score Ring (Chart.js) ─────────────────────────────────────
function getScoreColor(score) {
  if (score > 70) return '#ef4444';
  if (score > 40) return '#f59e0b';
  return '#22c55e';
}
function updateScoreRing(panel, score) {
  var valueId = 'ah-score-' + panel + '-val';
  var valEl   = el(valueId);
  if (!valEl) return;
  valEl.textContent = score === null ? '—' : score + '%';
}
function animateScoreRing(panel, score) {
  var canvasId = 'ah-chart-' + panel;
  var chartKey = panel === 'input' ? 'chartInput' : 'chartOutput';
  var canvas   = el(canvasId);
  if (!canvas || typeof Chart === 'undefined') {
    updateScoreRing(panel, score); return;
  }
  var color = getScoreColor(score);
  if (STATE[chartKey]) STATE[chartKey].destroy();
  var ctx = canvas.getContext('2d');
  STATE[chartKey] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [score, 100 - score],
        backgroundColor: [color, 'rgba(255,255,255,0.05)'],
        borderWidth: 0, borderRadius: 3,
      }]
    },
    options: {
      cutout: '72%',
      animation: { duration: 1200, easing: 'easeInOutQuart' },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    }
  });
  animNumber(el('ah-score-' + panel + '-val'), 0, score, 1200, '%');
}
function animNumber(el, from, to, dur, suffix) {
  if (!el) return;
  var start = performance.now();
  function step(now) {
    var p = Math.min((now - start) / dur, 1);
    var v = Math.round(from + (to - from) * easeInOut(p));
    el.textContent = v + (suffix || '');
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

function showImproveBadge() {
  if (STATE.inputAIScore === null || STATE.outputAIScore === null) return;
  var diff  = STATE.inputAIScore - STATE.outputAIScore;
  var badge = el('ah-improve');
  var textEl = el('ah-improve-text');
  if (!badge || !textEl) return;
  textEl.textContent = (diff > 0 ? '↓ -' : '↑ +') + Math.abs(diff) + '% AI';
  badge.className = 'ah-improve ah-improve--' + (diff > 0 ? 'good' : 'bad');
  show(badge);
}
function hideImproveBadge() {
  var badge = el('ah-improve');
  if (badge) hide(badge);
}

// ─── Readability (Flesch-Kincaid approx) ─────────────────────
function fleschKincaid(text) {
  var sentences = (text.match(/[.!?]+/g) || []).length || 1;
  var words     = text.trim().split(/\s+/).filter(Boolean).length || 1;
  var syllables = countSyllables(text);
  var score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Math.max(0, Math.min(100, Math.round(score)));
}
function countSyllables(text) {
  return text.toLowerCase().replace(/[^a-z]/g,'')
    .replace(/[^aeiou]/g,'').length || 1;
}
function readabilityGrade(score) {
  if (score >= 90) return { label:'Very Easy', color:'#22c55e' };
  if (score >= 70) return { label:'Easy',      color:'#84cc16' };
  if (score >= 60) return { label:'Standard',  color:'#f59e0b' };
  if (score >= 50) return { label:'Fairly Diff',color:'#f97316'};
  return               { label:'Difficult',   color:'#ef4444' };
}
function updateReadability(text) {
  var score = fleschKincaid(text);
  STATE.readabilityScore = score;
  var g   = readabilityGrade(score);
  var rdEl = el('ah-readability');
  var valEl = el('ah-readability-val');
  if (!rdEl || !valEl) return;
  valEl.textContent  = g.label;
  valEl.style.color  = g.color;
  show(rdEl);
}

// ─── File parsing ─────────────────────────────────────────────
function parseFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    showToast(t('ah.error.file_too_large'), 'error'); return;
  }
  var ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'txt') {
    file.text().then(fillInput).catch(function() { showToast(t('ah.error.api_fail'), 'error'); });
  } else if (ext === 'pdf') {
    if (typeof pdfjsLib === 'undefined') { showToast('PDF.js not loaded', 'error'); return; }
    file.arrayBuffer().then(function(buf) {
      return pdfjsLib.getDocument({ data: buf }).promise;
    }).then(function(pdf) {
      var pages = [];
      for (var i = 1; i <= pdf.numPages; i++) pages.push(i);
      return Promise.all(pages.map(function(n) {
        return pdf.getPage(n).then(function(page) {
          return page.getTextContent().then(function(c) {
            return c.items.map(function(it) { return it.str; }).join(' ');
          });
        });
      }));
    }).then(function(texts) { fillInput(texts.join('\n').trim()); })
      .catch(function() { showToast(t('ah.error.api_fail'), 'error'); });
  } else if (ext === 'docx') {
    if (typeof mammoth === 'undefined') { showToast('mammoth.js not loaded', 'error'); return; }
    file.arrayBuffer().then(function(buf) {
      return mammoth.extractRawText({ arrayBuffer: buf });
    }).then(function(r) { fillInput(r.value.trim()); })
      .catch(function() { showToast(t('ah.error.api_fail'), 'error'); });
  } else {
    showToast(t('ah.error.unsupported_format'), 'error');
  }
}
function fillInput(text) {
  var ta = document.getElementById('ah-input');
  if (!ta) return;
  ta.value = text;
  AIHumanizer.onInputChange({ target: ta });
  showToast('File loaded ✓', 'success');
}

// ─── Progress bar ─────────────────────────────────────────────
var _progInterval = null;
function startProgressBar() {
  var bar = el('ah-progress'); var fill = el('ah-progress-fill');
  if (!bar || !fill) return;
  show(bar); fill.style.width = '0%';
  var progress = 0;
  _progInterval = setInterval(function() {
    progress += Math.random() * 3;
    if (progress >= 85) { clearInterval(_progInterval); progress = 85; }
    fill.style.width = progress + '%';
  }, 200);
}
function finishProgressBar() {
  clearInterval(_progInterval);
  var bar = el('ah-progress'); var fill = el('ah-progress-fill');
  if (!bar || !fill) return;
  fill.style.width = '100%';
  setTimeout(function() { hide(bar); fill.style.width = '0%'; }, 600);
}
function updateProgressBar(pct) {
  var fill = el('ah-progress-fill');
  if (fill) fill.style.width = Math.min(pct, 84) + '%';
}
function estimateProgress(outputLen, inputLen) {
  return inputLen > 0 ? Math.round((outputLen / inputLen) * 80) : 0;
}

// ─── Keyword tags ──────────────────────────────────────────────
function renderKeywordTags() {
  var container = el('ah-keyword-tags');
  var countEl   = el('ah-keyword-count');
  if (!container) return;
  container.innerHTML = STATE.frozenKeywords.map(function(kw) {
    return '<span class="ah-keyword-tag">'
      + esc(kw)
      + '<button type="button" class="ah-keyword-tag__remove" onclick="AIHumanizer.removeKeyword(\'' + esc(kw).replace(/'/g, "\\'") + '\')">&times;</button>'
      + '</span>';
  }).join('');
  if (countEl) countEl.textContent = STATE.frozenKeywords.length + '/20';
}

function renderSEOKeywordTags() {
  var container = el('ah-seo-keyword-tags');
  var countEl   = el('ah-seo-keyword-count');
  if (!container) return;
  container.innerHTML = STATE.seoKeywords.map(function(kw) {
    return '<span class="ah-keyword-tag ah-keyword-tag--seo">'
      + esc(kw)
      + '<button type="button" class="ah-keyword-tag__remove" onclick="AIHumanizer.removeSEOKeyword(\'' + esc(kw).replace(/'/g, "\\'") + '\')">&times;</button>'
      + '</span>';
  }).join('');
  if (countEl) countEl.textContent = STATE.seoKeywords.length + '/10';
}

// ─── Autopilot rounds ─────────────────────────────────────────
function autopilotRound() {
  STATE.autopilotRound++;
  var btn = el('ah-autopilot-btn');
  if (btn) btn.innerHTML = '<span class="ah-spin"></span> ' + t('ah.autopilot.running').replace('{n}', STATE.autopilotRound);

  var body = JSON.stringify({
    text:             STATE.autopilotInput,
    mode:             STATE.mode,
    tone:             STATE.tone,
    preserve_format:  STATE.preserveFormat,
    strength:         STATE.strength,
    dialect:          STATE.dialect,
    frozen_keywords:  STATE.frozenKeywords,
    seo_keywords:     STATE.seoKeywords,
    purpose:          STATE.purpose,
    custom_style:     STATE.customStyle,
  });

  fetch('/api/ai/humanize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body,
  }).then(function(resp) {
    if (!resp.ok) throw new Error('API error');
    var reader  = resp.body.getReader();
    var decoder = new TextDecoder('utf-8');
    var buf     = '';
    var done    = false;
    STATE.streamBuffer = '';

    function read() {
      reader.read().then(function(r) {
        if (r.done || done) {
          if (!done) {
            STATE.autopilotInput = STATE.streamBuffer;
            STATE.outputText = STATE.streamBuffer;
            finalizeOutput();
            checkAutopilotProgress();
          }
          return;
        }
        buf += decoder.decode(r.value, { stream: true });
        var lines = buf.split('\n');
        buf = lines.pop();
        lines.forEach(function(line) {
          if (done) return;
          if (line.startsWith('event:')) return;
          if (!line.startsWith('data: ')) return;
          var token = line.slice(6);
          if (token === '[DONE]') {
            done = true;
            STATE.autopilotInput = STATE.streamBuffer;
            STATE.outputText = STATE.streamBuffer;
            finalizeOutput();
            checkAutopilotProgress();
            return;
          }
          token = token.replace(/\\n/g, '\n');
          STATE.streamBuffer += token;
          renderStreamOutput(STATE.streamBuffer);
        });
        if (!done) read();
      }).catch(function(err) {
        showToast(t('ah.error.api_fail'), 'error');
        resetAutopilot();
      });
    }
    read();
  }).catch(function(err) {
    showToast(t('ah.error.api_fail'), 'error');
    resetAutopilot();
  });
}

function checkAutopilotProgress() {
  // Check AI score
  var text = STATE.outputText;
  fetch('/api/ai/detect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text }),
  }).then(function(r) { return r.json(); }).then(function(data) {
    var score = typeof data.score === 'number' ? data.score : Math.round((data.ai_score || 0) * 100);
    STATE.outputAIScore = score;
    animateScoreRing('output', score);
    showImproveBadge();
    // Continue if score > 20% and rounds < max
    if (score > 20 && STATE.autopilotRound < STATE.autopilotMaxRounds) {
      setTimeout(autopilotRound, 500);
    } else {
      finishAutopilot();
    }
  }).catch(function() {
    finishAutopilot();
  });
}

function finishAutopilot() {
  finishProgressBar();
  resetAutopilot();
  showToast(t('ah.autopilot.complete'), 'success');
  document.dispatchEvent(new CustomEvent('humanize:done', {
    detail: { durationMs: 0, aiScoreAfter: STATE.outputAIScore }
  }));
}

function resetAutopilot() {
  STATE.isProcessing = false;
  STATE.autopilotRound = 0;
  var btn = el('ah-autopilot-btn');
  if (btn) btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg> ' + t('ah.autopilot.title');
  setBtnState('idle');
}

// ─── Sentence alternatives ───────────────────────────────────
function showSentenceAlternatives(e, sentenceText) {
  var panel = el('ah-sentence-panel');
  var origText = el('ah-sentence-original-text');
  var list = el('ah-sentence-list');
  if (!panel) return;
  if (origText) origText.textContent = sentenceText;

  // Generate 3 alternative rewrites using the API
  list.innerHTML = '<div class="ah-sentence-loading">' + t('ah.status.streaming') + '</div>';
  panel.style.display = 'block';

  // Position panel near click
  var rect = e.target.getBoundingClientRect();
  var x = rect.left + window.scrollX;
  var y = rect.bottom + window.scrollY + 10;
  if (x + 320 > window.innerWidth - 16) x = window.innerWidth - 336;
  panel.style.left = x + 'px';
  panel.style.top = y + 'px';

  // Get alternatives via API
  fetch('/api/ai/humanize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: sentenceText,
      mode: 'creative',
      tone: STATE.tone,
      preserve_format: false,
      strength: STATE.strength,
    }),
  }).then(function(resp) {
    if (!resp.ok) throw new Error('API error');
    var reader = resp.body.getReader();
    var decoder = new TextDecoder('utf-8');
    var buf = '';
    var done = false;
    var results = [];
    var current = '';

    function read() {
      reader.read().then(function(r) {
        if (r.done || done) {
          if (current) results.push(current);
          // Generate variations from the result
          showSentenceList(sentenceText, results.length > 0 ? results : generateLocalAlternatives(sentenceText));
          return;
        }
        buf += decoder.decode(r.value, { stream: true });
        var lines = buf.split('\n');
        buf = lines.pop();
        lines.forEach(function(line) {
          if (done) return;
          if (line.startsWith('event:')) return;
          if (!line.startsWith('data: ')) return;
          var token = line.slice(6);
          if (token === '[DONE]') { done = true; return; }
          token = token.replace(/\\n/g, '');
          current += token;
        });
        read();
      }).catch(function() {
        showSentenceList(sentenceText, generateLocalAlternatives(sentenceText));
      });
    }
    read();
  }).catch(function() {
    showSentenceList(sentenceText, generateLocalAlternatives(sentenceText));
  });
}

function generateLocalAlternatives(sentence) {
  // Simple local variations as fallback
  var variations = [
    sentence.replace(/\b(very|extremely|highly)\b/gi, 'quite'),
    sentence.replace(/\b(utilize|use)\b/gi, 'employ').replace(/\b(many|numerous)\b/gi, 'various'),
    sentence.replace(/\b(important|significant)\b/gi, 'crucial').replace(/\b(show|demonstrate)\b/gi, 'illustrate'),
  ];
  return variations.filter(function(v) { return v !== sentence; });
}

function showSentenceList(original, alternatives) {
  var list = el('ah-sentence-list');
  if (!list) return;
  if (alternatives.length === 0) {
    list.innerHTML = '<div class="ah-sentence-empty">No alternatives available</div>';
    return;
  }
  list.innerHTML = alternatives.map(function(alt, i) {
    return '<div class="ah-sentence-item" onclick="AIHumanizer.replaceSentence(\'' + esc(original).replace(/'/g, "\\'") + '\', \'' + esc(alt).replace(/'/g, "\\'") + '\')">'
      + '<span class="ah-sentence-item__num">' + (i + 1) + '</span>'
      + '<p>' + esc(alt) + '</p>'
      + '</div>';
  }).join('');
}

// ─── Grammar Check ────────────────────────────────────────────
function checkGrammarLocal(text) {
  var issues = [];
  var lines = text.split('\n');
  var grammarRules = [
    { pattern: /\b(its|it's)\b/gi, check: 'context', msg: 'Check: "its" (possessive) vs "it\'s" (contraction)' },
    { pattern: /\b(your|you're)\b/gi, check: 'context', msg: 'Check: "your" (possessive) vs "you\'re" (contraction)' },
    { pattern: /\b(their|they're|there)\b/gi, check: 'context', msg: 'Check: "their" (possessive) vs "they\'re" (contraction) vs "there" (location)' },
    { pattern: /\b(affect|effect)\b/gi, check: 'context', msg: 'Check: "affect" (verb) vs "effect" (noun)' },
    { pattern: /\b(then|than)\b/gi, check: 'context', msg: 'Check: "then" (time) vs "than" (comparison)' },
    { pattern: /\b(loose|lose)\b/gi, check: 'context', msg: 'Check: "loose" (not tight) vs "lose" (misplace)' },
    { pattern: /\b(complement|compliment)\b/gi, check: 'context', msg: 'Check: "complement" (complete) vs "compliment" (praise)' },
    { pattern: /\b(principal|principle)\b/gi, check: 'context', msg: 'Check: "principal" (main/person) vs "principle" (rule)' },
    { pattern: /\s{2,}/g, msg: 'Double spaces detected', type: 'style' },
    { pattern: /\s+[.,!?]/g, msg: 'Space before punctuation', type: 'style' },
    { pattern: /[A-Z]{3,}/g, msg: 'Check excessive capitalization', type: 'style' },
    { pattern: /\b\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+/g, msg: 'Very long sentence — consider breaking', type: 'style' },
  ];

  lines.forEach(function(line, lineIdx) {
    grammarRules.forEach(function(rule) {
      var match;
      var regex = new RegExp(rule.pattern.source, 'gi');
      while ((match = regex.exec(line)) !== null) {
        issues.push({
          line: lineIdx + 1,
          col: match.index + 1,
          text: match[0],
          message: rule.msg,
          type: rule.type || 'grammar'
        });
      }
    });
  });
  return issues;
}

function showGrammarResults(issues) {
  var btn = el('ah-grammar-btn');
  var scoreEl = el('ah-readability-val');
  var rdEl = el('ah-readability');
  if (!btn) return;

  // Show grammar score instead of readability
  if (scoreEl && rdEl) {
    var score = Math.max(0, 100 - issues.length * 5);
    scoreEl.textContent = score + '/100';
    scoreEl.style.color = score > 90 ? '#22c55e' : score > 70 ? '#f59e0b' : '#ef4444';
    show(rdEl);
  }

  if (issues.length === 0) {
    showToast(t('ah.grammar.no_issues'), 'success');
    return;
  }

  showToast(t('ah.grammar.issues') + ': ' + issues.length, 'info');

  // Highlight issues in output
  var div = el('ah-output-text');
  if (!div) return;
  var html = div.innerHTML;
  issues.slice(0, 5).forEach(function(issue) {
    var escaped = esc(issue.text);
    html = html.replace(escaped, '<span class="ah-grammar-issue" title="' + esc(issue.message) + '">' + escaped + '</span>');
  });
  div.innerHTML = html;
}

// ─── History ──────────────────────────────────────────────────
function saveHistory() {
  var item = {
    id:        Date.now(),
    mode:      STATE.mode,
    inputText: STATE.inputText.slice(0, 200) + (STATE.inputText.length > 200 ? '…' : ''),
    fullInput: STATE.inputText,
    output:    STATE.outputText,
    scoreBefore: STATE.inputAIScore,
    scoreAfter:  STATE.outputAIScore,
    createdAt: new Date().toISOString(),
  };
  STATE.history.unshift(item);
  if (STATE.history.length > HISTORY_LIMIT) STATE.history.pop();
  localStorage.setItem('ah-history', JSON.stringify(STATE.history));
  renderHistoryList();
}
function loadHistory() {
  try {
    STATE.history = JSON.parse(localStorage.getItem('ah-history') || '[]');
  } catch(_) { STATE.history = []; }
  renderHistoryList();
}
function renderHistoryList() {
  var list = el('ah-history-list');
  if (!list) return;
  if (!STATE.history.length) {
    list.innerHTML = '<li class="ah-history-empty">' + esc(t('ah.history.empty')) + '</li>'; return;
  }
  list.innerHTML = STATE.history.map(function(item) {
    var scoreStr = (item.scoreBefore !== null && item.scoreAfter !== null)
      ? item.scoreBefore + '% → ' + item.scoreAfter + '%' : '';
    return '<li class="ah-history-item">'
      + '<div class="ah-history-item__meta">'
      + '<span class="ah-history-item__mode">' + esc(item.mode) + '</span>'
      + '<span class="ah-history-item__time">' + timeAgo(item.createdAt) + '</span>'
      + (scoreStr ? '<span class="ah-history-item__score">' + esc(scoreStr) + '</span>' : '')
      + '</div>'
      + '<p class="ah-history-item__preview">' + esc(item.inputText) + '</p>'
      + '<button class="ah-btn ah-btn--ghost ah-btn--sm" onclick="AIHumanizer.restoreHistory(' + item.id + ')">'
      + esc(t('ah.history.restore')) + '</button>'
      + '</li>';
  }).join('');
}
function timeAgo(iso) {
  var diff = Date.now() - new Date(iso).getTime();
  var m = Math.round(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return m + 'm ago';
  var h = Math.round(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.round(h / 24) + 'd ago';
}

// ─── Synonym panel ────────────────────────────────────────────
var SYNONYM_MAP = {
  'utilize':['use','employ','apply','leverage'],
  'implement':['carry out','execute','apply','introduce'],
  'facilitate':['help','support','enable','assist'],
  'demonstrate':['show','prove','display','reveal'],
  'significant':['important','major','key','substantial'],
  'comprehensive':['thorough','complete','detailed','full'],
  'leverage':['use','apply','employ','tap'],
  'innovative':['new','fresh','creative','original'],
  'streamline':['simplify','improve','optimize','refine'],
  'paramount':['crucial','vital','essential','critical'],
  'delve':['explore','examine','investigate','look into'],
  'nuanced':['subtle','complex','layered','refined'],
  'robust':['strong','solid','reliable','powerful'],
  'seamlessly':['smoothly','easily','effortlessly'],
  'intricate':['complex','detailed','elaborate','involved'],
  'commendable':['praiseworthy','admirable','notable'],
  'pivotal':['key','central','crucial','critical'],
  'tailor':['customize','adapt','adjust','modify'],
  'foster':['promote','encourage','support','nurture'],
  'harness':['use','employ','leverage','tap into'],
};
function getSynonyms(word) {
  return SYNONYM_MAP[(word || '').toLowerCase().replace(/[.,!?;:'"]/g,'')] || [];
}
function showSynonymPanel(e, word, synonyms) {
  var panel = el('ah-synonym-panel');
  if (!panel) return;
  var wordEl = el('ah-synonym-word');
  var listEl = el('ah-synonym-list');
  if (wordEl) wordEl.textContent = word;
  if (listEl) listEl.innerHTML = synonyms.map(function(s) {
    return '<div class="ah-synonym-item" onclick="AIHumanizer.applySynonym(\'' + esc(word) + '\',\'' + esc(s) + '\')">' + esc(s) + '</div>';
  }).join('');
  var rect = e.target.getBoundingClientRect();
  var x = rect.left + window.scrollX;
  var y = rect.bottom + window.scrollY + 6;
  if (x + 220 > window.innerWidth - 16) x = window.innerWidth - 236;
  panel.style.left = x + 'px';
  panel.style.top  = y + 'px';
  panel.style.display = 'block';
}

// ─── Toast ────────────────────────────────────────────────────
function showToast(msg, type, dur) {
  dur = dur || 3200;
  var container = el('ah-toast-container');
  if (!container) return;
  var t = document.createElement('div');
  t.className = 'ah-toast ah-toast--' + (type || 'info');
  t.textContent = msg;
  container.appendChild(t);
  requestAnimationFrame(function() { t.classList.add('show'); });
  setTimeout(function() {
    t.classList.remove('show');
    t.addEventListener('transitionend', function() { if (t.parentNode) t.parentNode.removeChild(t); }, { once: true });
  }, dur);
}

// ─── Utilities ────────────────────────────────────────────────
function el(id) { return document.getElementById(id); }
function show(e) { if (e) e.style.display = ''; }
function hide(e) { if (e) e.style.display = 'none'; }
function closeDropdown() {
  var dd = el('ah-dl-dropdown');
  if (dd) dd.classList.remove('open');
}
function triggerDownload(url, name) {
  var a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
}
function legacyCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px';
  document.body.appendChild(ta); ta.select();
  document.execCommand('copy'); document.body.removeChild(ta);
}

// ─── Diff View Rendering ─────────────────────────────────────
function renderDiffView() {
  var contentEl = el('ah-diff-content');
  var statsEl = el('ah-diff-stats');
  if (!contentEl) return;
  var input = STATE.inputText || '';
  var output = STATE.outputText || '';
  if (!input || !output) { contentEl.innerHTML = '<div class="ah-sentence-empty">No content to compare</div>'; return; }

  var inputLines = input.split('\n');
  var outputLines = output.split('\n');
  var inputSentences = splitIntoSentencesArray(input);
  var outputSentences = splitIntoSentencesArray(output);

  // Stats
  var changedSentences = 0;
  var totalSentences = Math.max(inputSentences.length, outputSentences.length);
  var changedWords = 0;
  var totalWords = Math.max(countWords(input), countWords(output));

  if (statsEl) {
    // Simple diff calculation
    var inputWords = input.split(/\s+/);
    var outputWords = output.split(/\s+/);
    changedWords = Math.abs(inputWords.length - outputWords.length);
    for (var i = 0; i < Math.min(inputSentences.length, outputSentences.length); i++) {
      if (inputSentences[i].trim() !== outputSentences[i].trim()) changedSentences++;
    }
    statsEl.innerHTML = '<span>' + changedSentences + '/' + totalSentences + ' sentences changed</span>' +
      '<span>' + changedWords + ' words modified</span>';
  }

  if (STATE.diffMode === 'side') {
    // Side-by-side
    var html = '<div class="ah-diff-side">';
    html += '<div class="ah-diff-col"><div class="ah-diff-col-hd">' + t('ah.diff.original') + '</div>';
    inputSentences.forEach(function(s) {
      var isChanged = outputSentences.indexOf(s) === -1;
      html += '<div class="ah-diff-line' + (isChanged ? ' ah-diff-del' : '') + '">' + esc(s) + '</div>';
    });
    html += '</div><div class="ah-diff-col"><div class="ah-diff-col-hd">' + t('ah.diff.rewritten') + '</div>';
    outputSentences.forEach(function(s) {
      var isNew = inputSentences.indexOf(s) === -1;
      html += '<div class="ah-diff-line' + (isNew ? ' ah-diff-add' : '') + '">' + esc(s) + '</div>';
    });
    html += '</div></div>';
    contentEl.innerHTML = html;
  } else {
    // Inline diff
    var html = '';
    var maxLen = Math.max(inputSentences.length, outputSentences.length);
    for (var i = 0; i < maxLen; i++) {
      var ins = inputSentences[i] || '';
      var outs = outputSentences[i] || '';
      if (ins === outs) {
        html += '<div class="ah-diff-line ah-diff-keep">' + esc(outs) + '</div>';
      } else {
        if (ins) html += '<div class="ah-diff-line ah-diff-del">' + esc(ins) + '</div>';
        if (outs) html += '<div class="ah-diff-line ah-diff-add">' + esc(outs) + '</div>';
      }
    }
    contentEl.innerHTML = html;
  }
}

function splitIntoSentencesArray(text) {
  return text.replace(/([.!?])\s+/g, '$1\n').split('\n').filter(function(s) { return s.trim(); });
}

// ─── Authorship View Rendering ───────────────────────────────
function renderAuthorshipView() {
  var contentEl = el('ah-authorship-content');
  var statsEl = el('ah-authorship-stats');
  if (!contentEl) return;
  var input = STATE.inputText || '';
  var output = STATE.outputText || '';
  if (!input || !output) { contentEl.innerHTML = '<div class="ah-sentence-empty">No content</div>'; return; }

  var inputSentences = splitIntoSentencesArray(input);
  var outputSentences = splitIntoSentencesArray(output);

  var originalCount = 0;
  var aiCount = 0;
  var manualCount = STATE.editHistory.length;

  var html = '';
  outputSentences.forEach(function(s) {
    var type = 'ai'; // default: AI rewritten
    if (inputSentences.indexOf(s) !== -1) {
      type = 'original';
      originalCount++;
    } else {
      aiCount++;
    }
    html += '<span class="ah-auth ah-auth--' + type + '">' + esc(s) + ' </span>';
  });

  contentEl.innerHTML = html;

  if (statsEl) {
    var total = originalCount + aiCount + manualCount;
    statsEl.innerHTML =
      '<div class="ah-auth-stat ah-auth-stat--original"><span>' + (total > 0 ? Math.round(originalCount / total * 100) : 0) + '%</span>' + t('ah.authorship.original') + '</div>' +
      '<div class="ah-auth-stat ah-auth-stat--ai"><span>' + (total > 0 ? Math.round(aiCount / total * 100) : 0) + '%</span>' + t('ah.authorship.ai') + '</div>' +
      '<div class="ah-auth-stat ah-auth-stat--manual"><span>' + (total > 0 ? Math.round(manualCount / total * 100) : 0) + '%</span>' + t('ah.authorship.manual') + '</div>';
  }
}

// ─── Multi-Variant Generation ────────────────────────────────
function generateVariant(index) {
  return new Promise(function(resolve, reject) {
    var body = JSON.stringify({
      text:             STATE.inputText,
      mode:             STATE.paraphraseMode ? 'standard' : STATE.mode,
      tone:             STATE.tone,
      preserve_format:  STATE.preserveFormat,
      dialect:          STATE.dialect,
      frozen_keywords:  STATE.frozenKeywords,
      seo_keywords:     STATE.seoKeywords,
      purpose:          STATE.purpose,
      custom_style:     STATE.customStyle,
      strength:         Math.min(5, STATE.strength + index),
    });

    fetch('/api/ai/humanize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    }).then(function(resp) {
      if (!resp.ok) throw new Error('API error');
      var reader = resp.body.getReader();
      var decoder = new TextDecoder('utf-8');
      var buf = '';
      var done = false;
      var fullText = '';

      function read() {
        reader.read().then(function(r) {
          if (r.done || done) {
            // Detect AI score for this variant
            fetch('/api/ai/detect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: fullText }),
            }).then(function(dr) { return dr.json(); }).then(function(dd) {
              var score = typeof dd.score === 'number' ? dd.score : 0;
              resolve({ text: fullText, score: score, index: index });
            }).catch(function() {
              resolve({ text: fullText, score: null, index: index });
            });
            return;
          }
          buf += decoder.decode(r.value, { stream: true });
          var lines = buf.split('\n');
          buf = lines.pop();
          lines.forEach(function(line) {
            if (done) return;
            if (line.startsWith('event:')) return;
            if (!line.startsWith('data: ')) return;
            var token = line.slice(6);
            if (token === '[DONE]') { done = true; return; }
            token = token.replace(/\\n/g, '\n');
            fullText += token;
          });
          if (!done) read();
        }).catch(reject);
      }
      read();
    }).catch(reject);
  });
}

// ─── Batch Processing ────────────────────────────────────────
function renderBatchList() {
  var list = el('ah-batch-list');
  if (!list) return;
  list.innerHTML = STATE.batchFiles.map(function(f, i) {
    var result = STATE.batchResults[i];
    var status = result ? 'done' : 'pending';
    var statusText = result ? t('ah.batch.done') : t('ah.batch.pending');
    return '<li class="ah-batch-item ah-batch-item--' + status + '">' +
      '<span class="ah-batch-item__name">' + esc(f.name) + '</span>' +
      '<span class="ah-batch-item__status">' + statusText + '</span>' +
      '</li>';
  }).join('');
}

function processBatchFiles() {
  if (STATE.batchFiles.length === 0) return;
  var file = STATE.batchFiles[STATE.batchResults.length];
  if (!file) {
    STATE.isBatchProcessing = false;
    renderBatchList();
    showToast(t('ah.batch.complete'), 'success');
    return;
  }

  // Parse file
  parseFileAsync(file).then(function(text) {
    return fetch('/api/ai/humanize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text, mode: STATE.mode, tone: STATE.tone,
        strength: STATE.strength,
        dialect: STATE.dialect, frozen_keywords: STATE.frozenKeywords,
        seo_keywords: STATE.seoKeywords, purpose: STATE.purpose,
        custom_style: STATE.customStyle,
      }),
    });
  }).then(function(resp) {
    if (!resp.ok) throw new Error('API error');
    var reader = resp.body.getReader();
    var decoder = new TextDecoder('utf-8');
    var buf = '';
    var done = false;
    var fullText = '';

    function read() {
      reader.read().then(function(r) {
        if (r.done || done) {
          STATE.batchResults.push({ text: fullText, filename: file.name });
          STATE.batchProgress = Math.round((STATE.batchResults.length / STATE.batchFiles.length) * 100);
          updateBatchProgress();
          renderBatchList();
          processBatchFiles();
          return;
        }
        buf += decoder.decode(r.value, { stream: true });
        var lines = buf.split('\n');
        buf = lines.pop();
        lines.forEach(function(line) {
          if (done) return;
          if (!line.startsWith('data: ')) return;
          var token = line.slice(6);
          if (token === '[DONE]') { done = true; return; }
          fullText += token.replace(/\\n/g, '\n');
        });
        if (!done) read();
      }).catch(function() {
        STATE.batchResults.push({ text: '', filename: file.name, error: true });
        renderBatchList();
        processBatchFiles();
      });
    }
    read();
  }).catch(function() {
    STATE.batchResults.push({ text: '', filename: file.name, error: true });
    renderBatchList();
    processBatchFiles();
  });
}

function parseFileAsync(file) {
  return new Promise(function(resolve, reject) {
    var ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'txt') {
      file.text().then(resolve).catch(reject);
    } else if (ext === 'pdf') {
      file.arrayBuffer().then(function(buf) {
        return pdfjsLib.getDocument({ data: buf }).promise;
      }).then(function(pdf) {
        var pages = [];
        for (var i = 1; i <= pdf.numPages; i++) pages.push(i);
        return Promise.all(pages.map(function(n) {
          return pdf.getPage(n).then(function(page) {
            return page.getTextContent().then(function(c) {
              return c.items.map(function(it) { return it.str; }).join(' ');
            });
          });
        }));
      }).then(function(texts) { resolve(texts.join('\n').trim()); })
        .catch(reject);
    } else if (ext === 'docx') {
      file.arrayBuffer().then(function(buf) {
        return mammoth.extractRawText({ arrayBuffer: buf });
      }).then(function(r) { resolve(r.value.trim()); }).catch(reject);
    } else {
      reject('Unsupported format');
    }
  });
}

function updateBatchProgress() {
  var bar = el('ah-batch-progress-bar');
  if (bar) bar.style.width = STATE.batchProgress + '%';
}

// ─── Plagiarism Results Rendering ────────────────────────────
function renderPlagiarismResults(data) {
  var scoreEl = el('ah-plagiarism-score');
  var sourcesEl = el('ah-plagiarism-sources');
  var sentencesEl = el('ah-plagiarism-sentences');

  if (scoreEl) {
    var score = data.plagiarism_score || 0;
    var verdict = data.verdict || 'original';
    var labelClass = verdict === 'original' ? 'good' : verdict === 'plagiarized' ? 'bad' : 'warn';
    scoreEl.innerHTML = '<div class="ah-plagiarism-badge ah-plagiarism-badge--' + labelClass + '">' +
      '<span class="ah-plagiarism-pct">' + score + '%</span>' +
      '<span class="ah-plagiarism-label">' + esc(verdict) + '</span>' +
      '</div>';
  }

  if (sourcesEl && data.matched_sources && data.matched_sources.length > 0) {
    sourcesEl.innerHTML = '<h5>Matched Sources</h5>' + data.matched_sources.map(function(s) {
      return '<div class="ah-plagiarism-source">' +
        '<span>' + esc(s.title || 'Unknown') + '</span>' +
        '<span>' + Math.round(s.similarity * 100) + '%</span>' +
        '</div>';
    }).join('');
  }

  if (sentencesEl && data.sentences && data.sentences.length > 0) {
    sentencesEl.innerHTML = data.sentences.map(function(s) {
      var cls = s.type === 'plagiarized' ? 'plagiarized' : s.type === 'ai' ? 'ai' : 'original';
      return '<div class="ah-plagiarism-sentence ah-plagiarism-sentence--' + cls + '">' + esc(s.text) + '</div>';
    }).join('');
  }
}

// ─── Detection Results Full Display ──────────────────────────
function renderFullDetectionResults(data) {
  STATE.lastDetectData = data;
  var panel = el('ah-detection-panel');
  if (panel) { panel.style.display = ''; }

  // Detector cards
  renderDetectorCards(data.detectors || {});

  // Forensic evidence
  renderForensicEvidence(data.forensic_evidence || []);

  // Linguistic metrics
  renderLinguisticMetrics(data.linguistic_metrics || {});

  // Model signature
  renderModelSignature(data.model_signature || {});

  // Verdict summary
  renderVerdictSummary(data);
}

function renderDetectorCards(detectors) {
  var container = el('ah-detector-cards');
  if (!container) return;
  var names = Object.keys(detectors);
  container.innerHTML = names.map(function(name) {
    var score = detectors[name];
    var pass = score <= 30;
    var displayName = name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1');
    return '<div class="ah-detector-card ah-detector-card--' + (pass ? 'pass' : 'fail') + '">' +
      '<span class="ah-detector-name">' + esc(displayName) + '</span>' +
      '<span class="ah-detector-score">' + score + '%</span>' +
      '<span class="ah-detector-badge">' + (pass ? '✓ Pass' : '✗ Fail') + '</span>' +
      '</div>';
  }).join('');
}

function renderForensicEvidence(evidence) {
  var panel = el('ah-forensic-panel');
  var list = el('ah-forensic-list');
  if (!panel || !list) return;
  if (evidence.length === 0) { panel.style.display = 'none'; return; }
  panel.style.display = '';
  list.innerHTML = evidence.map(function(e) {
    var severityClass = (e.severity || 'low').toLowerCase();
    return '<div class="ah-forensic-item ah-forensic-item--' + severityClass + '">' +
      '<span class="ah-forensic-dim">' + esc(e.dimension || '') + '</span>' +
      '<span class="ah-forensic-type">' + esc(e.type || '') + '</span>' +
      '<span class="ah-forensic-detail">' + esc(e.detail || '') + '</span>' +
      (e.original_quote ? '<span class="ah-forensic-quote">"' + esc(e.original_quote) + '"</span>' : '') +
      '<span class="ah-forensic-severity">' + esc(e.severity || '') + '</span>' +
      '</div>';
  }).join('');
}

function renderLinguisticMetrics(metrics) {
  var panel = el('ah-metrics-panel');
  var grid = el('ah-metrics-grid');
  if (!panel || !grid) return;
  var keys = Object.keys(metrics);
  if (keys.length === 0) { panel.style.display = 'none'; return; }
  panel.style.display = '';
  grid.innerHTML = keys.map(function(k) {
    var val = metrics[k];
    var label = k.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    return '<div class="ah-metric-card">' +
      '<span class="ah-metric-label">' + esc(label) + '</span>' +
      '<span class="ah-metric-value">' + esc(String(val)) + '</span>' +
      '</div>';
  }).join('');
}

function renderModelSignature(sig) {
  var panel = el('ah-model-sig-panel');
  var grid = el('ah-model-sig-grid');
  if (!panel || !grid) return;
  var keys = Object.keys(sig);
  if (keys.length === 0) { panel.style.display = 'none'; return; }
  panel.style.display = '';
  grid.innerHTML = keys.map(function(k) {
    var val = sig[k];
    var label = k.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    var isPercent = typeof val === 'number' && val <= 1;
    var display = isPercent ? Math.round(val * 100) + '%' : esc(String(val));
    return '<div class="ah-metric-card">' +
      '<span class="ah-metric-label">' + esc(label) + '</span>' +
      '<span class="ah-metric-value">' + display + '</span>' +
      '</div>';
  }).join('');
}

function renderVerdictSummary(data) {
  var panel = el('ah-verdict-panel');
  var summaryEl = el('ah-verdict-summary');
  var reasoningEl = el('ah-verdict-reasoning');
  if (!panel) return;
  if (!data.verdict_summary && !data.confidence_reasoning) { panel.style.display = 'none'; return; }
  panel.style.display = '';
  if (summaryEl && data.verdict_summary) {
    summaryEl.innerHTML = '<strong>Verdict:</strong> ' + esc(data.verdict_summary);
  }
  if (reasoningEl && data.confidence_reasoning) {
    reasoningEl.innerHTML = '<strong>Reasoning:</strong> ' + esc(data.confidence_reasoning);
  }
}

// ─── Keyboard Shortcuts ──────────────────────────────────────
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    // Ctrl+Enter: Humanize
    if (e.ctrlKey && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      AIHumanizer.humanize();
    }
    // Ctrl+Shift+Enter: Autopilot
    if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      AIHumanizer.autopilot();
    }
    // Ctrl+D: Detect AI
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      AIHumanizer.detectAI('output');
    }
    // Ctrl+Z: Undo
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
      e.preventDefault();
      AIHumanizer.undo();
    }
    // Ctrl+Shift+C: Copy output
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      AIHumanizer.copyOutput();
    }
    // Ctrl+Shift+V: Clear and paste
    if (e.ctrlKey && e.shiftKey && e.key === 'V') {
      e.preventDefault();
      AIHumanizer.clearInput();
      var ta = el('ah-input');
      if (ta) ta.focus();
    }
  });
}

// ─── Grammar Check with LanguageTool API ─────────────────────
function checkGrammarWithAPI(text, callback) {
  fetch('https://api.languagetool.org/v2/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'text=' + encodeURIComponent(text) + '&language=' + (function(){ var l = detectLang(text); return l === 'zh' ? 'zh-CN' : l; })(),
  }).then(function(r) { return r.json(); }).then(function(data) {
    var issues = (data.matches || []).map(function(m) {
      return {
        line: 0,
        col: m.offset || 0,
        text: text.substring(m.offset, m.offset + m.length),
        message: m.message || '',
        type: (m.rule && m.rule.category && m.rule.category.id) || 'grammar',
        suggestions: (m.replacements || []).map(function(r) { return r.value; }),
      };
    });
    callback(issues);
  }).catch(function() {
    // Fallback to local check
    callback(checkGrammarLocal(text));
  });
}

// ─── URL Input styling ───────────────────────────────────────
function setupURLInput() {
  var urlInput = el('ah-url-input');
  if (urlInput) {
    urlInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); AIHumanizer.fetchURL(); }
    });
  }
}

// Expose global
window.AIHumanizer = AIHumanizer;

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', AIHumanizer.init.bind(AIHumanizer));
} else {
  AIHumanizer.init();
}

})();

