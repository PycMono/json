/**
 * AI Humanize Hub — Tab switching controller
 * Coordinates the unified Humanize + Detector page
 */
(function() {
  'use strict';

  var currentTab = (window.__HUMANIZE_CONFIG__ && window.__HUMANIZE_CONFIG__.activeTab) || 'home';
  var initialized = { humanizer: false, detector: false, plagiarism: false };

  // ── Tab Switching ─────────────────────────────────────────
  function switchTab(tabName) {
    if (!tabName || tabName === currentTab) return;
    currentTab = tabName;

    // Update tab buttons
    var tabs = document.querySelectorAll('.hub-tab');
    tabs.forEach(function(tab) {
      var isActive = tab.getAttribute('data-tab') === tabName;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Update panels
    var panels = document.querySelectorAll('.hub-panel');
    panels.forEach(function(panel) {
      var panelTab = panel.id.replace('hub-panel-', '');
      if (panelTab === tabName) {
        panel.classList.remove('hub-panel--hidden');
      } else {
        panel.classList.add('hub-panel--hidden');
      }
    });

    // Lazy-init tool-specific JS when tab is first shown
    if (tabName === 'humanizer' && !initialized.humanizer) {
      initialized.humanizer = true;
      initHumanizerTab();
    }
    if (tabName === 'detector' && !initialized.detector) {
      initialized.detector = true;
      initDetectorTab();
    }
    if (tabName === 'plagiarism' && !initialized.plagiarism) {
      initialized.plagiarism = true;
      initPlagiarismTab();
    }

    // Update URL without reload
    var url = new URL(window.location);
    if (tabName === 'home') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tabName);
    }
    window.history.replaceState({}, '', url);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof gaTrackTabSwitch === 'function') gaTrackTabSwitch(tabName, 'ai-humanize-hub', 'ai-humanize');
  }

  // ── Lazy initialization ───────────────────────────────────
  function initHumanizerTab() {
    // The ai-humanizer.js auto-inits on DOMContentLoaded.
    // When loaded in hidden tab, canvases may be zero-sized.
    // Trigger a resize after showing the panel to fix charts.
    if (typeof AIHumanizer !== 'undefined' && AIHumanizer.init) {
      AIHumanizer.init();
    }
    setTimeout(function() {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  function initDetectorTab() {
    if (typeof AID !== 'undefined' && AID.init) {
      AID.init();
    }
    setTimeout(function() {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  function initPlagiarismTab() {
    if (typeof AIP !== 'undefined' && AIP.init) {
      AIP.init();
    }
    setTimeout(function() {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  // ── Cross-tool text transfer ──────────────────────────────
  function transferTextToHumanizer(text) {
    try {
      sessionStorage.setItem('ah_prefill_text', text);
    } catch(e) {}
    switchTab('humanizer');
    // Apply text after tab switch
    setTimeout(function() {
      var input = document.getElementById('ah-input');
      if (input && text) {
        input.value = text;
        if (typeof AIHumanizer !== 'undefined' && AIHumanizer.onInputChange) {
          var evt = { target: input };
          AIHumanizer.onInputChange(evt);
        }
      }
    }, 200);
  }

  function transferTextToDetector(text) {
    try {
      sessionStorage.setItem('aid_prefill_text', text);
    } catch(e) {}
    switchTab('detector');
    setTimeout(function() {
      var input = document.getElementById('aidInputText');
      if (input && text) {
        input.value = text;
        if (typeof AID !== 'undefined' && AID.handleTextInput) {
          AID.handleTextInput(input);
        }
      }
    }, 200);
  }

  // ── Public API ────────────────────────────────────────────
  window.HumanizeHub = {
    goToTab: switchTab,
    transferToHumanizer: transferTextToHumanizer,
    transferToDetector: transferTextToDetector,
    getCurrentTab: function() { return currentTab; }
  };

  // ── Bind tab clicks ───────────────────────────────────────
  function bindEvents() {
    document.querySelectorAll('.hub-tab').forEach(function(tab) {
      tab.addEventListener('click', function(e) {
        // External-link tabs: let the browser navigate normally
        if (!this.getAttribute('data-tab')) return;
        e.preventDefault();
        var tabName = this.getAttribute('data-tab');
        if (tabName) switchTab(tabName);
      });
    });

    // Dropdown handled by ai-tool-nav.js

    // Handle back/forward browser navigation
    window.addEventListener('popstate', function() {
      var params = new URLSearchParams(window.location.search);
      var tab = params.get('tab') || 'home';
      switchTab(tab);
    });

    // Pre-fill text from sessionStorage
    var prefillHumanizer = null;
    var prefillDetector = null;
    try { prefillHumanizer = sessionStorage.getItem('ah_prefill_text'); } catch(e) {}
    try { prefillDetector = sessionStorage.getItem('aid_prefill_text'); } catch(e) {}

    // If coming from detector with prefill, switch to humanizer
    if (prefillHumanizer && currentTab === 'humanizer') {
      setTimeout(function() {
        var input = document.getElementById('ah-input');
        if (input) {
          input.value = prefillHumanizer;
          try { sessionStorage.removeItem('ah_prefill_text'); } catch(e) {}
          if (typeof AIHumanizer !== 'undefined' && AIHumanizer.onInputChange) {
            AIHumanizer.onInputChange({ target: input });
          }
        }
      }, 300);
    }
    if (prefillDetector && currentTab === 'detector') {
      setTimeout(function() {
        var input = document.getElementById('aidInputText');
        if (input) {
          input.value = prefillDetector;
          try { sessionStorage.removeItem('aid_prefill_text'); } catch(e) {}
          if (typeof AID !== 'undefined' && AID.handleTextInput) {
            AID.handleTextInput(input);
          }
        }
      }, 300);
    }
  }

  // ── Home Page Inline Tool ─────────────────────────────────
  var homeMode = 'free';
  var homeStreaming = false;
  var homeUltra = false;

  window.HomeTool = {
    setMode: function(mode) {
      homeMode = mode;
      document.querySelectorAll('.hub-mode-bar .hub-mode-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
      });
    },

    showMoreModes: function() {
      // Switch to full humanizer tab
      HumanizeHub.goToTab('humanizer');
    },

    updateWordCount: function() {
      var input = document.getElementById('home-input');
      var wc = document.getElementById('home-wordcount');
      if (!input || !wc) return;
      var text = input.value.trim();
      var count = text ? text.split(/\s+/).length : 0;
      wc.textContent = count + ' words';
    },

    loadSample: function() {
      var input = document.getElementById('home-input');
      if (!input) return;
      input.value = "Artificial intelligence has revolutionized the way we interact with technology. Machine learning algorithms can now process vast amounts of data, identify patterns, and make predictions with remarkable accuracy. From natural language processing to computer vision, AI systems are becoming increasingly sophisticated and capable of performing tasks that were once thought to require human intelligence. The rapid advancement of AI technology has led to significant improvements in various industries, including healthcare, finance, and education.";
      this.updateWordCount();
    },

    humanize: function() {
      var input = document.getElementById('home-input');
      if (!input || !input.value.trim()) return;

      var btn = document.getElementById('home-humanize-btn');
      if (homeStreaming) return;
      homeStreaming = true;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + (window.__i18n__ && window.__i18n__['ah.action.humanize.loading'] || 'Humanizing...');

      var outputWrap = document.getElementById('home-output-wrap');
      var outputEl = document.getElementById('home-output');
      outputWrap.style.display = 'block';
      outputEl.textContent = '';

      var body = JSON.stringify({
        text: input.value,
        mode: homeMode,
        tone: 'neutral',
        preserve_format: true
      });

      var self = this;
      var streamBuf = '';

      fetch('/api/ai/humanize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      }).then(function(resp) {
        // Handle non-200 responses (e.g., 429 rate limit, 402 payment required)
        if (!resp.ok) {
          return resp.text().then(function(txt) {
            var msg = 'API error ' + resp.status;
            try {
              var json = JSON.parse(txt);
              msg = json.error || json.message || msg;
            } catch(_) {}
            throw new Error(msg);
          });
        }
        var reader = resp.body.getReader();
        var decoder = new TextDecoder('utf-8');
        var buf = '';
        var sseError = false;

        function read() {
          reader.read().then(function(r) {
            if (r.done) {
              finish();
              return;
            }
            buf += decoder.decode(r.value, { stream: true });
            var lines = buf.split('\n');
            buf = lines.pop();
            lines.forEach(function(line) {
              if (line.startsWith('event:')) {
                if (line.indexOf('event: error') !== -1) sseError = true;
                return;
              }
              if (!line.startsWith('data: ')) return;
              var token = line.slice(6);
              if (token === '[DONE]') {
                finish();
                return;
              }
              if (sseError) {
                outputEl.innerHTML = '<span style="color:#ef4444">Error: ' + token + '</span>';
                finish();
                return;
              }
              token = token.replace(/\\n/g, '\n');
              streamBuf += token;
              outputEl.textContent = streamBuf;
            });
            read();
          }).catch(function() {
            outputEl.innerHTML = '<span style="color:#ef4444">Error: Please try again.</span>';
            finish();
          });
        }

        function finish() {
          homeStreaming = false;
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-wand-sparkles"></i> ' + (window.__i18n__ && window.__i18n__['ah.action.humanize'] || 'Humanize AI');
          var outWc = document.getElementById('home-output-wordcount');
          if (outWc && streamBuf) {
            outWc.textContent = streamBuf.trim().split(/\s+/).length + ' words';
          }
        }

        read();
      }).catch(function(err) {
        homeStreaming = false;
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-wand-sparkles"></i> ' + (window.__i18n__ && window.__i18n__['ah.action.humanize'] || 'Humanize AI');
        var errMsg = (err && err.message) ? err.message : 'Please try again.';
        outputEl.innerHTML = '<span style="color:#ef4444">Error: ' + errMsg + '</span>';
      });
    },

    humanizeAgain: function() {
      this.humanize();
    },

    copyOutput: function() {
      var outputEl = document.getElementById('home-output');
      if (!outputEl || !outputEl.textContent) return;
      navigator.clipboard.writeText(outputEl.textContent).then(function() {
        // Brief visual feedback
        var btns = document.querySelectorAll('.hub-tool-output__btn');
        if (btns[0]) {
          var orig = btns[0].innerHTML;
          btns[0].innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
          setTimeout(function() { btns[0].innerHTML = orig; }, 1500);
        }
      });
    },

    goToFullTool: function() {
      var input = document.getElementById('home-input');
      if (input && input.value) {
        HumanizeHub.transferToHumanizer(input.value);
      } else {
        HumanizeHub.goToTab('humanizer');
      }
    },

    toggleUltra: function() {
      var toggle = document.getElementById('home-ultra-toggle');
      homeUltra = toggle ? toggle.checked : false;
      // Visual feedback on the mode bar
      if (homeUltra) {
        document.querySelector('.hub-mode-ultra__label').style.color = 'var(--hub-primary-dark)';
      } else {
        document.querySelector('.hub-mode-ultra__label').style.color = 'var(--hub-tx2)';
      }
    }
  };

  // ── Init ──────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();
