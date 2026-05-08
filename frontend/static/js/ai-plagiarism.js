/**
 * AI Plagiarism Checker — AIP namespace
 */
(function() {
  'use strict';

  // State
  var inputMode = 'text';
  var checking = false;
  var inputText = '';
  var fileContent = '';
  var fileName = '';
  var lastResult = null;

  // Chart instances
  var plagiarismChart = null;
  var aiChart = null;

  // Constants
  var MAX_CHARS = 15000;
  var i18n = window.__i18n__ || {};

  // ── Init ────────────────────────────────────────────────────────
  function init() {
    // Charts
    initCharts();
    // Bind events
    bindEvents();
  }

  function initCharts() {
    var plgCanvas = document.getElementById('plgPlagiarismChart');
    var aiCanvas = document.getElementById('plgAIChart');
    if (plgCanvas && window.Chart) {
      plagiarismChart = new Chart(plgCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [0, 100],
            backgroundColor: ['#ef4444', '#e2e8f0'],
            borderWidth: 0
          }]
        },
        options: {
          cutout: '75%',
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          animation: { animateRotate: true, duration: 800 }
        }
      });
    }
    if (aiCanvas && window.Chart) {
      aiChart = new Chart(aiCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [0, 100],
            backgroundColor: ['#8b5cf6', '#e2e8f0'],
            borderWidth: 0
          }]
        },
        options: {
          cutout: '75%',
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          animation: { animateRotate: true, duration: 800 }
        }
      });
    }
  }

  function bindEvents() {
    // Textarea input
    var textarea = document.getElementById('plgInputText');
    if (textarea) {
      textarea.addEventListener('input', function() {
        handleTextInput(this);
      });
    }
  }

  // ── Input Mode ───────────────────────────────────────────────────
  function setInputMode(mode) {
    inputMode = mode;
    document.querySelectorAll('.plg-input-tab').forEach(function(tab) {
      tab.classList.toggle('plg-input-tab--active', tab.dataset.tab === mode);
    });
    document.getElementById('plgMode-text').style.display = mode === 'text' ? 'block' : 'none';
    document.getElementById('plgMode-file').style.display = mode === 'file' ? 'block' : 'none';
    updateCheckButton();
  }

  // ── Text Input ───────────────────────────────────────────────────
  function handleTextInput(el) {
    var text = el.value;
    inputText = text;

    // Counters
    var chars = text.length;
    var words = text.trim() ? text.trim().split(/\s+/).length : 0;

    document.getElementById('plgCharCounter').textContent = chars.toLocaleString() + ' / ' + MAX_CHARS.toLocaleString();
    document.getElementById('plgWordCounter').textContent = words.toLocaleString() + ' words';

    // Warning if over limit
    var charCounter = document.getElementById('plgCharCounter');
    if (chars > MAX_CHARS) {
      charCounter.style.color = '#ef4444';
    } else {
      charCounter.style.color = '';
    }

    // Clear button
    document.getElementById('plgClearBtn').style.display = text ? 'inline-flex' : 'none';

    updateCheckButton();
  }

  // ── File Handling ────────────────────────────────────────────────
  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('plgDropZone').classList.add('plg-drop-zone--active');
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('plgDropZone').classList.remove('plg-drop-zone--active');
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('plgDropZone').classList.remove('plg-drop-zone--active');

    var files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }

  function handleFileSelect(input) {
    if (input.files && input.files.length > 0) {
      processFile(input.files[0]);
    }
  }

  function processFile(file) {
    var validTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    var ext = file.name.split('.').pop().toLowerCase();

    if (!validTypes.includes(file.type) && !['txt', 'pdf', 'docx'].includes(ext)) {
      toast(i18n['plagiarism.error.invalid_file'] || 'Invalid file type. Please upload .txt, .pdf, or .docx', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast(i18n['plagiarism.error.file_too_large'] || 'File too large. Maximum 10MB', 'error');
      return;
    }

    fileName = file.name;
    readFileContent(file);
  }

  function readFileContent(file) {
    var reader = new FileReader();
    var ext = file.name.split('.').pop().toLowerCase();

    reader.onload = function(e) {
      if (ext === 'txt') {
        fileContent = e.target.result;
        showFileInfo();
      } else if (ext === 'pdf') {
        // Use pdf.js if available
        if (typeof pdfjsLib !== 'undefined') {
          extractPDFText(e.target.result);
        } else {
          toast('PDF processing not available', 'error');
        }
      } else if (ext === 'docx') {
        // Use mammoth if available
        if (typeof mammoth !== 'undefined') {
          extractDocxText(e.target.result);
        } else {
          toast('DOCX processing not available', 'error');
        }
      }
    };

    if (ext === 'txt') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }

  function extractPDFText(buffer) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    pdfjsLib.getDocument({ data: buffer }).promise.then(function(pdf) {
      var promises = [];
      for (var i = 1; i <= pdf.numPages; i++) {
        promises.push(pdf.getPage(i).then(function(page) {
          return page.getTextContent().then(function(tc) {
            return tc.items.map(function(item) { return item.str; }).join(' ');
          });
        }));
      }
      Promise.all(promises).then(function(pages) {
        fileContent = pages.join('\n');
        showFileInfo();
      });
    }).catch(function(err) {
      toast(i18n['plagiarism.error.pdf_failed'] || 'Failed to read PDF', 'error');
    });
  }

  function extractDocxText(buffer) {
    mammoth.extractRawText({ arrayBuffer: buffer }).then(function(result) {
      fileContent = result.value;
      showFileInfo();
    }).catch(function(err) {
      toast(i18n['plagiarism.error.docx_failed'] || 'Failed to read DOCX', 'error');
    });
  }

  function showFileInfo() {
    document.getElementById('plgFileZone').style.display = 'none';
    document.getElementById('plgFileInfo').style.display = 'flex';
    document.getElementById('plgFileName').textContent = fileName;
    updateCheckButton();
  }

  function removeFile() {
    fileContent = '';
    fileName = '';
    document.getElementById('plgFileZone').style.display = 'flex';
    document.getElementById('plgFileInfo').style.display = 'none';
    document.getElementById('plgFileInput').value = '';
    updateCheckButton();
  }

  // ── Check Button ──────────────────────────────────────────────────
  function updateCheckButton() {
    var btn = document.getElementById('plgCheckBtn');
    var text = inputMode === 'text' ? inputText.trim() : fileContent.trim();
    btn.disabled = !text || checking;
  }

  // ── Start Check ───────────────────────────────────────────────────
  function startCheck() {
    if (checking) return;

    var text = inputMode === 'text' ? inputText.trim() : fileContent.trim();
    if (!text) {
      toast(i18n['plagiarism.error.empty_input'] || 'Please enter or upload text', 'error');
      return;
    }

    checking = true;
    document.getElementById('plgCheckBtn').disabled = true;
    document.getElementById('plgCheckBtnText').textContent = i18n['plagiarism.btn.checking'] || 'Checking...';
      var _gaStart = Date.now();
      if (typeof gaTrackToolUse === 'function') gaTrackToolUse('ai-plagiarism');
    document.getElementById('plgCheckSpinner').style.display = 'inline';

    fetch('/api/ai/plagiarism-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        language: window.__lang__ || 'en'
      })
    }).then(function(resp) {
      return resp.json();
    }).then(function(data) {
      checking = false;
      document.getElementById('plgCheckBtnText').textContent = i18n['plagiarism.btn.check'] || 'Check for Plagiarism';
      document.getElementById('plgCheckSpinner').style.display = 'none';
      updateCheckButton();

      if (data.error) {
        toast(data.message || data.error, 'error');
        return;
      }

      lastResult = data;
      renderResults(data, text);
        if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('ai-plagiarism', 1, Date.now() - _gaStart);
    }).catch(function(err) {
      checking = false;
      document.getElementById('plgCheckBtnText').textContent = i18n['plagiarism.btn.check'] || 'Check for Plagiarism';
      document.getElementById('plgCheckSpinner').style.display = 'none';
      updateCheckButton();
      toast(i18n['plagiarism.error.network'] || 'Network error. Please try again.', 'error');
    });
  }

  // ── Render Results ────────────────────────────────────────────────
  function renderResults(data, originalText) {
    document.getElementById('plgEmpty').style.display = 'none';
    document.getElementById('plgResult').style.display = 'block';

    // Update charts
    var plagScore = data.plagiarism_score || 0;
    var aiScore = data.ai_score || 0;

    if (plagiarismChart) {
      plagiarismChart.data.datasets[0].data = [plagScore, 100 - plagScore];
      plagiarismChart.update();
    }
    if (aiChart) {
      aiChart.data.datasets[0].data = [aiScore, 100 - aiScore];
      aiChart.update();
    }

    document.getElementById('plgPlagiarismScore').textContent = plagScore;
    document.getElementById('plgAIScore').textContent = aiScore;

    // Verdict
    var verdictEl = document.getElementById('plgVerdict');
    var verdict = (data.verdict || 'original').toLowerCase();
    verdictEl.className = 'plg-verdict plg-verdict--' + verdict;
    verdictEl.textContent = i18n['plagiarism.result.verdict_' + verdict] || data.verdict;

    // Highlighted text
    var highlightEl = document.getElementById('plgHighlightText');
    var sentences = data.sentences || [];
    if (sentences.length > 0) {
      var html = sentences.map(function(s) {
        var cls = s.type || 'original';
        var title = s.reason || '';
        return '<mark class="' + cls + '" title="' + escapeHtml(title) + '">' + escapeHtml(s.text) + '</mark>';
      }).join(' ');
      highlightEl.innerHTML = html;
    } else {
      highlightEl.textContent = originalText;
    }

    // Stats
    document.getElementById('plgWordCountResult').textContent = (data.word_count || 0).toLocaleString();
    document.getElementById('plgSentencesCount').textContent = sentences.length.toLocaleString();

    // Matched sources
    var sources = data.matched_sources || [];
    var sourcesSection = document.getElementById('plgSourcesSection');
    var sourcesList = document.getElementById('plgSourcesList');
    document.getElementById('plgSourcesCount').textContent = sources.length.toLocaleString();

    if (sources.length > 0) {
      sourcesSection.style.display = 'block';
      sourcesList.innerHTML = sources.map(function(src) {
        return '<div class="plg-source-item">' +
          '<div class="plg-source-item__icon"><i class="fa-solid fa-globe"></i></div>' +
          '<div class="plg-source-item__content">' +
          '<p class="plg-source-item__title">' + escapeHtml(src.title || 'Unknown Source') + '</p>' +
          '<div class="plg-source-item__meta">' +
          '<span>' + escapeHtml(src.type || 'web') + '</span>' +
          '<span class="plg-source-item__similarity">' + Math.round(src.similarity || 0) + '% match</span>' +
          '</div></div></div>';
      }).join('');
    } else {
      sourcesSection.style.display = 'none';
    }

    // Recommendations
    var recommendations = data.recommendations || [];
    var recSection = document.getElementById('plgRecommendationsSection');
    var recList = document.getElementById('plgRecommendationsList');

    if (recommendations.length > 0) {
      recSection.style.display = 'block';
      recList.innerHTML = recommendations.map(function(rec) {
        return '<li>' + escapeHtml(rec) + '</li>';
      }).join('');
    } else {
      recSection.style.display = 'none';
    }
  }

  // ── Utilities ─────────────────────────────────────────────────────
  function clearInput() {
    document.getElementById('plgInputText').value = '';
    inputText = '';
    handleTextInput(document.getElementById('plgInputText'));
  }

  function loadSample() {
    var sample = "Artificial intelligence has revolutionized the way we interact with technology. Machine learning algorithms can now process vast amounts of data, identify patterns, and make predictions with remarkable accuracy. From natural language processing to computer vision, AI systems are becoming increasingly sophisticated and capable of performing tasks that were once thought to require human intelligence. The rapid advancement of AI technology has led to significant improvements in various industries, including healthcare, finance, and education.";
    document.getElementById('plgInputText').value = sample;
    inputText = sample;
    handleTextInput(document.getElementById('plgInputText'));
  }

  function copyReport() {
    if (!lastResult) return;

    var text = 'Plagiarism Check Report\n';
    text += '========================\n\n';
    text += 'Plagiarism Score: ' + lastResult.plagiarism_score + '%\n';
    text += 'AI Content Score: ' + lastResult.ai_score + '%\n';
    text += 'Verdict: ' + lastResult.verdict + '\n\n';

    if (lastResult.matched_sources && lastResult.matched_sources.length > 0) {
      text += 'Matched Sources:\n';
      lastResult.matched_sources.forEach(function(src, i) {
        text += (i + 1) + '. ' + src.title + ' (' + src.similarity + '% match)\n';
      });
      text += '\n';
    }

    if (lastResult.recommendations && lastResult.recommendations.length > 0) {
      text += 'Recommendations:\n';
      lastResult.recommendations.forEach(function(rec) {
        text += '- ' + rec + '\n';
      });
    }

    navigator.clipboard.writeText(text).then(function() {
      toast(i18n['plagiarism.toast.copied'] || 'Report copied to clipboard', 'success');
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function toast(msg, type) {
    var container = document.querySelector('.plg-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'plg-toast-container';
      document.body.appendChild(container);
    }

    var t = document.createElement('div');
    t.className = 'plg-toast plg-toast--' + (type || '');
    t.textContent = msg;
    container.appendChild(t);

    setTimeout(function() {
      t.remove();
    }, 3500);
  }

  // ── Public API ────────────────────────────────────────────────────
  window.AIP = {
    init: init,
    setInputMode: setInputMode,
    handleTextInput: handleTextInput,
    handleDragOver: handleDragOver,
    handleDragLeave: handleDragLeave,
    handleDrop: handleDrop,
    handleFileSelect: handleFileSelect,
    removeFile: removeFile,
    startCheck: startCheck,
    clearInput: clearInput,
    loadSample: loadSample,
    copyReport: copyReport
  };

})();
