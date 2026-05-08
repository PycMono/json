/**
 * ai-compete.js — AI 竞品分析助手主引擎
 * 依赖（均由 base.html 全局加载）：
 *   - ga-events.js      GA 事件追踪
 *   - consent-engine.js Consent Mode v2
 *   - main.js           语言切换 / 主题切换
 * 页面级依赖（extraHead 中 defer 加载）：
 *   - marked.min.js     Markdown 渲染
 *   - purify.min.js     XSS 净化
 */
(function () {
  'use strict';

  // ── 常量 ──────────────────────────────────────────────────────────────
  var TOOL         = 'ai-compete';
  var MAX_COMPETITORS = 5;
  var API_ANALYZE  = '/api/ai-compete/analyze';
  var API_SUGGEST  = '/api/ai-compete/suggest';

  var DIM_SVG = {
    marketing:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
    product:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    pricing:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    audience:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    sentiment:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    company:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    market:      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    features:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    swot:        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/></svg>'
  };
  var DIM_META = {
    marketing:   { key: 'ai-compete.dimension.marketing'   },
    product:     { key: 'ai-compete.dimension.product'     },
    pricing:     { key: 'ai-compete.dimension.pricing'     },
    audience:    { key: 'ai-compete.dimension.audience'    },
    sentiment:   { key: 'ai-compete.dimension.sentiment'   },
    company:     { key: 'ai-compete.dimension.company'     },
    market:      { key: 'ai-compete.dimension.market'      },
    features:    { key: 'ai-compete.dimension.features'    },
    swot:        { key: 'ai-compete.dimension.swot'        }
  };

  // SWOT 字段名映射（prompt 输出 → 前端期望）
  var SWOT_KEY_MAP = {
    'strengths_vs_my_product': 'strengths',
    'weaknesses_vs_my_product': 'weaknesses',
    'opportunities_for_my_product': 'opportunities',
    'threats_to_my_product': 'threats'
  };

  // 预置示例
  var PRESET_EXAMPLES = [
    { product: 'Notion - all-in-one workspace for notes, docs, and project management', competitors: ['Asana', 'Trello', 'Evernote'] },
    { product: 'Shopify - e-commerce platform for online stores', competitors: ['WooCommerce', 'BigCommerce', 'Squarespace'] },
    { product: 'Slack - team communication and collaboration tool', competitors: ['Microsoft Teams', 'Discord', 'Zoom'] }
  ];

  // ── 全局状态 ──────────────────────────────────────────────────────────
  var state = {
    competitors:  [],
    dimensions:   [],
    results:      {},
    meta:         {},  // per-competitor-per-dim: { confidence, data_date }
    analysisStart: 0,
    analyzing:    false,
    controller:   null
  };

  // ── i18n 工具 ─────────────────────────────────────────────────────────
  function t(key) {
    return (window.__I18N__ && window.__I18N__[key]) || key;
  }

  // ── DOM 引用 ──────────────────────────────────────────────────────────
  var $ = function (id) { return document.getElementById(id); };

  var elProductInput    = $('productInput');
  var elSuggestBtn      = $('suggestBtn');
  var elSuggestDropdown = $('suggestDropdown');
  var elSuggestList     = $('suggestList');
  var elCompetitorTags  = $('competitorTags');
  var elCompetitorInput = $('competitorInput');
  var elAddCompetitorBtn= $('addCompetitorBtn');
  var elCompetitorMax   = $('competitorMaxMsg');
  var elAnalyzeBtn      = $('analyzeBtn');
  var elClearBtn        = $('clearBtn');
  var elErrorMsg        = $('errorMsg');
  var elProgressSection = $('progressSection');
  var elProgressText    = $('progressText');
  var elProgressBar     = $('progressBar');
  var elProgressDims    = $('progressDimensions');
  var elResultsSection  = $('resultsSection');
  var elReportBody      = $('reportBody');
  var elReportHero      = $('reportHero');
  var elReportHeroTitle = $('reportHeroTitle');
  var elReportHeroProduct = $('reportHeroProduct');
  var elReportHeroTime  = $('reportHeroTime');
  var elReportHeroStats = $('reportHeroStats');
  var elReportInsights  = $('reportInsights');
  var elInsightsGrid    = $('insightsGrid');
  var elReportNav       = $('reportNav');
  var elComparisonSection = $('comparisonTableSection');
  var elEmptyState      = $('emptyState');
  var elErrorState      = $('errorState');
  var elErrorStateMsg   = $('errorStateMsg');
  var elExportBtn       = $('exportBtn');
  var elCopyResultBtn   = $('copyResultBtn');
  var elCopyBtnText     = $('copyBtnText');
  var elExamplesRow     = $('examplesRow');

  // ── 竞品管理 ─────────────────────────────────────────────────────────
  function addCompetitor(value) {
    var v = value.trim();
    if (!v) return;
    if (state.competitors.length >= MAX_COMPETITORS) {
      elCompetitorMax.hidden = false;
      return;
    }
    if (state.competitors.indexOf(v) !== -1) {
      showToast(v + ' already added', 'info');
      return;
    }
    state.competitors.push(v);
    renderCompetitorTags();
    elCompetitorInput.value = '';
    elCompetitorMax.hidden = state.competitors.length < MAX_COMPETITORS;
    if (typeof gaTrackSettingChange === 'function') {
      gaTrackSettingChange(TOOL, 'competitor_add', v);
    }
  }

  function removeCompetitor(idx) {
    state.competitors.splice(idx, 1);
    renderCompetitorTags();
    elCompetitorMax.hidden = state.competitors.length < MAX_COMPETITORS;
  }

  function renderCompetitorTags() {
    elCompetitorTags.innerHTML = '';
    state.competitors.forEach(function (comp, idx) {
      var tag = document.createElement('div');
      tag.className = 'competitor-tag';
      tag.setAttribute('role', 'listitem');
      var label = document.createTextNode(comp);
      var btn = document.createElement('button');
      btn.className = 'tag-remove';
      btn.type = 'button';
      btn.textContent = '×';
      btn.setAttribute('aria-label', 'Remove ' + comp);
      btn.addEventListener('click', function () { removeCompetitor(idx); });
      tag.appendChild(label);
      tag.appendChild(btn);
      elCompetitorTags.appendChild(tag);
    });
  }

  // ── 快捷示例 ──────────────────────────────────────────────────────────
  function renderExamples() {
    if (!elExamplesRow) return;
    elExamplesRow.innerHTML = '';
    PRESET_EXAMPLES.forEach(function (ex, idx) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ac-example-chip';
      chip.textContent = ex.competitors.join(' vs ');
      chip.addEventListener('click', function () {
        loadExample(idx);
        if (typeof gaTrackSettingChange === 'function') {
          gaTrackSettingChange(TOOL, 'example_click', ex.competitors.join('_'));
        }
      });
      elExamplesRow.appendChild(chip);
    });
  }

  function loadExample(idx) {
    var ex = PRESET_EXAMPLES[idx];
    if (!ex) return;
    elProductInput.value = ex.product;
    state.competitors = [];
    elCompetitorTags.innerHTML = '';
    ex.competitors.forEach(function (c) { addCompetitor(c); });
    // 自动勾选全部维度
    document.querySelectorAll('input[name="dim"]').forEach(function (el) {
      el.checked = true;
    });
    // 滚动到分析按钮并聚焦
    elAnalyzeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ── AI 推荐竞品 ───────────────────────────────────────────────────────
  function suggestCompetitors() {
    var product = elProductInput.value.trim();
    if (!product) { showToast(t('ai-compete.error.empty_product'), 'error'); return; }

    elSuggestBtn.disabled = true;
    elSuggestBtn.textContent = t('ai-compete.suggest.loading');
    elSuggestDropdown.hidden = true;

    var lang = (window.__LANG__ || document.documentElement.lang || 'en');

    fetch(API_SUGGEST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_desc: product, lang: lang })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.suggestions || !data.suggestions.length) {
          showToast('No suggestions found', 'info');
          return;
        }
        renderSuggestions(data.suggestions);
        elSuggestDropdown.hidden = false;
      })
      .catch(function (err) {
        if (typeof gaTrackError === 'function') {
          gaTrackError(TOOL, 'suggest_error', err.message);
        }
        showToast(t('ai-compete.error.network'), 'error');
      })
      .finally(function () {
        elSuggestBtn.disabled = false;
        elSuggestBtn.textContent = t('ai-compete.suggest.btn');
      });
  }

  function renderSuggestions(suggestions) {
    elSuggestList.innerHTML = '';
    var selected = new Set();

    suggestions.forEach(function (s, idx) {
      var item = document.createElement('div');
      item.className = 'suggest-item';

      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'suggest-checkbox';
      checkbox.id = 'suggest-check-' + idx;
      checkbox.addEventListener('change', function () {
        if (checkbox.checked) selected.add(idx);
        else selected.delete(idx);
      });

      var label = document.createElement('label');
      label.className = 'suggest-item-info';
      label.htmlFor = 'suggest-check-' + idx;

      var name = document.createElement('div');
      name.className = 'suggest-item-name';
      name.textContent = s.name;

      var reason = document.createElement('div');
      reason.className = 'suggest-item-reason';
      reason.textContent = (s.reason || s.url || '');

      var typeBadge = document.createElement('span');
      typeBadge.className = 'suggest-item-type type-' + (s.type || 'direct');
      typeBadge.textContent = t('ai-compete.type.' + (s.type || 'direct')) || (s.type || 'direct');

      var metaRow = document.createElement('div');
      metaRow.className = 'suggest-item-meta';
      metaRow.appendChild(typeBadge);
      if (s.confidence) {
        var confBadge = document.createElement('span');
        confBadge.className = 'suggest-item-confidence conf-' + s.confidence;
        confBadge.textContent = t('ai-compete.confidence.' + s.confidence) || s.confidence;
        metaRow.appendChild(confBadge);
      }

      label.appendChild(name);
      label.appendChild(reason);
      label.appendChild(metaRow);

      item.appendChild(checkbox);
      item.appendChild(label);
      elSuggestList.appendChild(item);
    });

    if (suggestions.length > 0) {
      var footer = document.createElement('div');
      footer.className = 'suggest-footer';

      var selectAllBtn = document.createElement('button');
      selectAllBtn.type = 'button';
      selectAllBtn.className = 'ac-btn ac-btn--ghost ac-btn--sm';
      selectAllBtn.textContent = t('ai-compete.suggest.select_all') || 'Select All';
      selectAllBtn.addEventListener('click', function () {
        var checks = elSuggestList.querySelectorAll('.suggest-checkbox');
        var allChecked = true;
        checks.forEach(function (cb) { if (!cb.checked) allChecked = false; });
        checks.forEach(function (cb) {
          cb.checked = !allChecked;
          cb.dispatchEvent(new Event('change'));
        });
      });

      var addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'ac-btn ac-btn--primary ac-btn--sm';
      addBtn.textContent = t('ai-compete.suggest.add_selected') || 'Add Selected';
      addBtn.addEventListener('click', function () {
        var added = 0;
        suggestions.forEach(function (s, idx) {
          if (selected.has(idx)) {
            addCompetitor(s.url || s.name);
            added++;
          }
        });
        if (added > 0) {
          elSuggestDropdown.hidden = true;
        } else {
          showToast(t('ai-compete.suggest.none_selected') || 'Please select at least one competitor', 'info');
        }
      });

      footer.appendChild(selectAllBtn);
      footer.appendChild(addBtn);
      elSuggestList.appendChild(footer);
    }
  }

  // ── 分析启动 ─────────────────────────────────────────────────────────
  function startAnalysis() {
    var product = elProductInput.value.trim();
    if (!product) { showError(t('ai-compete.error.empty_product')); return; }
    if (state.competitors.length === 0) { showError(t('ai-compete.error.no_competitor')); return; }

    hideError();
    state.dimensions = getCheckedDimensions();
    state.results = {};
    state.meta = {};
    state.analyzing = true;
    state.analysisStart = Date.now();

    setAnalyzeBtnState(true);
    showProgressSection(state.dimensions);
    elResultsSection.hidden = true;
    elEmptyState.hidden = true;
    elErrorState.hidden = true;
    elReportBody.innerHTML = '';
    elComparisonSection.innerHTML = '';
    elReportHeroTitle.textContent = t('ai-compete.result.title');
    elReportHeroProduct.textContent = '';
    elReportHeroTime.textContent = '';
    elInsightsGrid.innerHTML = '<div class="ac-insight-card ac-insight-card--empty"><p>' + t('ai-compete.report.insights.empty') + '</p></div>';
    if (elReportHeroStats) {
      elReportHeroStats.querySelectorAll('.ac-stat-card__value').forEach(function(el) { el.textContent = '—'; });
    }
    startProgressStepRotation();

    var lang = (window.__LANG__ || document.documentElement.lang || 'en');
    var controller = new AbortController();
    state.controller = controller;

    fetch(API_ANALYZE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_desc: product,
        competitors:  state.competitors,
        dimensions:   state.dimensions,
        lang:         lang
      }),
      signal: controller.signal
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      if (typeof gaTrackAIRequest === 'function') gaTrackAIRequest(TOOL, 'ai-compete', 'streaming', 0, 0);
      return processStream(res.body);
    }).catch(function (err) {
      if (err.name === 'AbortError') return;
      if (typeof gaTrackError === 'function') {
        gaTrackError(TOOL, 'api_error', err.message);
      }
      showToast(t('ai-compete.error.api_fail'), 'error');
    }).finally(function () {
      state.analyzing = false;
      setAnalyzeBtnState(false);
      hideProgressSection();
      if (Object.keys(state.results).length > 0) {
        elResultsSection.hidden = false;
        elEmptyState.hidden = true;
        elErrorState.hidden = true;
        renderComparisonTable();
        renderInsights();
        if (typeof gaTrackProcessDone === 'function') {
          gaTrackProcessDone(TOOL, state.competitors.length, Date.now() - state.analysisStart);
        }
      } else {
        // Show error state if no results
        elErrorState.hidden = false;
        elErrorStateMsg.textContent = t('ai-compete.error.api_fail');
      }
    });
  }

  // ── ReadableStream 解析 SSE ──────────────────────────────────────────
  function processStream(body) {
    var reader = body.getReader();
    var decoder = new TextDecoder();
    var sseBuffer = '';
    var contentBuffer = '';
    var totalDims = state.dimensions.length * state.competitors.length;
    var doneDims = 0;

    function extractDimensions() {
      while (true) {
        var idx = contentBuffer.indexOf('DIMENSION:');
        if (idx === -1) break;
        var jsonStart = idx + 10;
        var braceCount = 0;
        var inString = false;
        var escapeNext = false;
        var jsonEnd = -1;
        for (var i = jsonStart; i < contentBuffer.length; i++) {
          var ch = contentBuffer[i];
          if (escapeNext) { escapeNext = false; continue; }
          if (ch === '\\') { escapeNext = true; continue; }
          if (ch === '"') { inString = !inString; continue; }
          if (!inString) {
            if (ch === '{') braceCount++;
            else if (ch === '}') {
              braceCount--;
              if (braceCount === 0) { jsonEnd = i + 1; break; }
            }
          }
        }
        if (jsonEnd === -1) {
          // 如果当前 DIMENSION 的 JSON 不完整，但后面还有 DIMENSION，
          // 说明当前这个可能是坏数据，跳过它继续解析后面的
          var nextIdx = contentBuffer.indexOf('DIMENSION:', jsonStart);
          if (nextIdx !== -1) {
            contentBuffer = contentBuffer.substring(nextIdx);
            continue;
          }
          break; // 真的不完整，等待更多数据
        }
        var jsonStr = contentBuffer.substring(jsonStart, jsonEnd);
        try {
          var dimData = JSON.parse(jsonStr);
          handleDimensionData(dimData);
          doneDims++;
          updateProgress(doneDims / totalDims, dimData.dim, dimData.competitor);
        } catch (e) {
          console.warn('JSON parse error for dimension:', e.message, jsonStr.slice(0, 100));
        }
        contentBuffer = contentBuffer.substring(jsonEnd);
      }
    }

    function read() {
      return reader.read().then(function (chunk) {
        if (chunk.done) {
          extractDimensions();
          return;
        }
        sseBuffer += decoder.decode(chunk.value, { stream: true });
        // 将后端转义的换行符还原为真实换行
        sseBuffer = sseBuffer.replace(/\\n/g, '\n');
        var lines = sseBuffer.split('\n');
        sseBuffer = lines.pop(); // 保留不完整的行

        lines.forEach(function (line) {
          line = line.trim();
          if (line.startsWith('data:')) {
            var raw = line.slice(5).trim();
            if (raw === '[DONE]' || raw === '{}' || raw === '') return;
            contentBuffer += raw;
          } else if (line.startsWith('event:')) {
            var eventType = line.slice(6).trim();
            if (eventType === 'done') {
              extractDimensions();
            }
          }
        });

        extractDimensions();
        return read();
      });
    }
    return read();
  }

  // ── 维度数据处理 → 渲染 ─────────────────────────────────────────────
  function normalizeCompetitorKey(aiName) {
    if (!aiName) return state.competitors[0];
    var lower = aiName.toLowerCase();
    var matched = state.competitors.find(function (c) {
      var cl = c.toLowerCase();
      return cl === lower || cl.indexOf(lower) !== -1 || lower.indexOf(cl) !== -1;
    });
    return matched || aiName;
  }

  function handleDimensionData(dimData) {
    var dim  = dimData.dim;
    var comp = normalizeCompetitorKey(dimData.competitor);
    var data = dimData.data;

    if (!state.results[comp]) state.results[comp] = {};
    if (!state.meta[comp]) state.meta[comp] = {};
    state.results[comp][dim] = data;
    state.meta[comp][dim] = {
      confidence: dimData.confidence || 'medium',
      data_date: dimData.data_date || 'unknown'
    };
    renderReportSection(dim);
    // First dimension triggers hero render
    if (Object.keys(state.results).length === 1 && Object.keys(state.results[comp]).length === 1) {
      renderReportHero();
    }
  }

  function renderReportSection(dim) {
    var sectionId = 'sec-' + dim;
    var existing  = document.getElementById(sectionId);
    if (!existing) {
      elResultsSection.hidden = false;
      elEmptyState.hidden = true;
      elErrorState.hidden = true;

      var meta = DIM_META[dim] || { icon: '📌', key: dim };
      var section = document.createElement('section');
      section.id = sectionId;
      section.className = 'ac-report-section';
      section.dataset.dim = dim;

      var header = document.createElement('div');
      header.className = 'ac-report-section__header';

      var titleWrap = document.createElement('div');
      titleWrap.className = 'ac-report-section__title';
      titleWrap.innerHTML = '<span class="ac-report-section__title-icon">' + (DIM_SVG[dim] || '') + '</span>' + t(meta.key);
      header.appendChild(titleWrap);

      var confidences = [];
      Object.keys(state.meta).forEach(function(comp) {
        var m = (state.meta[comp] || {})[dim];
        if (m && m.confidence) confidences.push(m.confidence);
      });
      var overallConf = confidences.indexOf('high') !== -1 ? 'high' : (confidences.indexOf('medium') !== -1 ? 'medium' : 'low');
      var badge = document.createElement('span');
      badge.className = 'ac-report-section__badge ac-report-section__badge--' + overallConf;
      badge.textContent = t('ai-compete.confidence.' + overallConf);
      header.appendChild(badge);

      var body = document.createElement('div');
      body.className = 'ac-report-section__body';
      body.id = 'dim-body-' + dim;

      section.appendChild(header);
      section.appendChild(body);

      // Insert in dim order
      var dimOrder = ['marketing','product','pricing','audience','sentiment','company','market','features','swot'];
      var inserted = false;
      var currentSections = elReportBody.querySelectorAll('.ac-report-section');
      for (var i = 0; i < currentSections.length; i++) {
        var otherDim = currentSections[i].dataset.dim;
        if (dimOrder.indexOf(dim) < dimOrder.indexOf(otherDim)) {
          elReportBody.insertBefore(section, currentSections[i]);
          inserted = true;
          break;
        }
      }
      if (!inserted) elReportBody.appendChild(section);
    }
    renderDimBody(dim);
  }

  function renderDimBody(dim) {
    var body = document.getElementById('dim-body-' + dim);
    if (!body) return;
    if (dim === 'swot') {
      renderSwot(body);
    } else {
      renderGenericDim(dim, body);
    }
  }


  // ── Report Hero ──────────────────────────────────────────────────────
  function renderReportHero() {
    var product = elProductInput.value.trim() || t('ai-compete.result.title');
    // Extract product name from first part before dash or comma
    var productName = product.split(/[-,—]/)[0].trim();
    elReportHeroTitle.textContent = productName + ' ' + t('ai-compete.result.title');
    elReportHeroProduct.textContent = t('ai-compete.compare.dimension') + ': ' + productName;
    var now = new Date();
    var timeStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    elReportHeroTime.textContent = t('ai-compete.report.generated_at') + ': ' + timeStr;

    // Compute pseudo stats from available data
    var stats = { position: 0, features: 0, pricing: 0, marketing: 0 };
    var counts = { position: 0, features: 0, pricing: 0, marketing: 0 };
    Object.keys(state.results).forEach(function(comp) {
      var res = state.results[comp];
      if (res.marketing) {
        if (res.marketing.positioning) { stats.position += 80; counts.position++; }
        if (res.marketing.tagline) { stats.marketing += 75; counts.marketing++; }
        if (res.marketing.channels && res.marketing.channels.length) { stats.marketing += 10 * Math.min(res.marketing.channels.length, 3); counts.marketing++; }
      }
      if (res.product) {
        if (res.product.key_features && res.product.key_features.length) { stats.features += 15 * Math.min(res.product.key_features.length, 5); counts.features++; }
        if (res.product.platforms && res.product.platforms.length) { stats.features += 15; counts.features++; }
      }
      if (res.pricing) {
        if (res.pricing.model) { stats.pricing += 50; counts.pricing++; }
        if (res.pricing.tiers && res.pricing.tiers.length) { stats.pricing += 30; counts.pricing++; }
        if (res.pricing.free_plan !== undefined) { stats.pricing += 20; counts.pricing++; }
      }
    });

    var statEls = elReportHeroStats.querySelectorAll('.ac-stat-card');
    var statKeys = ['position', 'features', 'pricing', 'marketing'];
    statKeys.forEach(function(key, idx) {
      var val = counts[key] > 0 ? Math.min(Math.round(stats[key] / counts[key]), 98) : 0;
      var el = statEls[idx];
      if (el) {
        var valEl = el.querySelector('.ac-stat-card__value');
        if (valEl) valEl.textContent = val > 0 ? val + '%' : '—';
      }
    });
  }

  // ── Insights generation ──────────────────────────────────────────────
  function renderInsights() {
    var insights = [];
    // Collect insights from SWOT
    Object.keys(state.results).forEach(function(comp) {
      var res = state.results[comp];
      if (res.swot) {
        var s = res.swot.strengths_vs_my_product || res.swot.strengths || [];
        var w = res.swot.weaknesses_vs_my_product || res.swot.weaknesses || [];
        var o = res.swot.opportunities_for_my_product || res.swot.opportunities || [];
        if (s.length) insights.push({ title: comp + ' ' + t('ai-compete.result.strengths'), body: s[0] });
        if (w.length) insights.push({ title: comp + ' ' + t('ai-compete.result.weaknesses'), body: w[0] });
        if (o.length) insights.push({ title: t('ai-compete.result.opportunities'), body: o[0] });
      }
      if (res.pricing && res.pricing.model) {
        insights.push({ title: comp + ' ' + t('ai-compete.dimension.pricing'), body: res.pricing.model });
      }
      if (res.product && res.product.unique_to_competitor && res.product.unique_to_competitor.length) {
        insights.push({ title: comp + ' ' + t('ai-compete.card.unique_advantages'), body: res.product.unique_to_competitor[0] });
      }
    });
    // Deduplicate by body text
    var seen = {};
    insights = insights.filter(function(i) {
      var key = i.body.slice(0, 60);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
    // Take top 5
    insights = insights.slice(0, 5);

    if (insights.length === 0) return;

    elInsightsGrid.innerHTML = '';
    insights.forEach(function(ins) {
      var card = document.createElement('div');
      card.className = 'ac-insight-card';
      var title = document.createElement('div');
      title.className = 'ac-insight-card__title';
      title.textContent = ins.title;
      var body = document.createElement('div');
      body.className = 'ac-insight-card__body';
      body.textContent = ins.body;
      card.appendChild(title);
      card.appendChild(body);
      elInsightsGrid.appendChild(card);
    });
  }

  // ── TOC Observer ─────────────────────────────────────────────────────
  function initTOCObserver() {
    if (!elReportNav) return;
    var links = elReportNav.querySelectorAll('a');
    links.forEach(function(link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        var href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          var target = document.getElementById(href.slice(1));
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          links.forEach(function(link) {
            link.classList.toggle('active', link.getAttribute('href') === '#' + id);
          });
        }
      });
    }, { rootMargin: '-80px 0px -60% 0px', threshold: 0 });

    elReportBody.querySelectorAll('.ac-report-section').forEach(function(sec) {
      observer.observe(sec);
    });
    // Also observe hero for TOC
    var hero = $('reportHero');
    if (hero) observer.observe(hero);

    // Re-observe when new sections added
    var mutationObs = new MutationObserver(function() {
      elReportBody.querySelectorAll('.ac-report-section').forEach(function(sec) {
        observer.observe(sec);
      });
    });
    mutationObs.observe(elReportBody, { childList: true });
  }

  // ── Progress step rotation ───────────────────────────────────────────
  var progressStepInterval = null;
  function startProgressStepRotation() {
    if (progressStepInterval) clearInterval(progressStepInterval);
    var steps = [
      t('ai-compete.progress.step1'),
      t('ai-compete.progress.step2'),
      t('ai-compete.progress.step3'),
      t('ai-compete.progress.step4'),
      t('ai-compete.progress.step5')
    ];
    var idx = 0;
    progressStepInterval = setInterval(function() {
      if (!state.analyzing) {
        clearInterval(progressStepInterval);
        progressStepInterval = null;
        return;
      }
      idx = (idx + 1) % steps.length;
      if (elProgressText && steps[idx]) {
        elProgressText.textContent = steps[idx];
      }
    }, 3500);
  }

  // ── SWOT 四象限渲染 ──────────────────────────────────────────────────
  function renderSwot(container) {
    container.innerHTML = '';
    var compKeys = Object.keys(state.results);
    if (compKeys.length === 0) return;
    compKeys.forEach(function (comp) {
      var rawData = (state.results[comp] || {}).swot;
      if (!rawData) return;

      var data = {};
      Object.keys(SWOT_KEY_MAP).forEach(function (promptKey) {
        var frontendKey = SWOT_KEY_MAP[promptKey];
        data[frontendKey] = rawData[promptKey] || rawData[frontendKey] || [];
      });

      var compTitle = document.createElement('h3');
      compTitle.textContent = comp;
      compTitle.style.cssText = 'font-size:1rem;font-weight:700;margin:0 0 16px;color:var(--ac2-tx)';
      container.appendChild(compTitle);

      var grid = document.createElement('div');
      grid.className = 'ac-swot-grid-v2';

      var cells = [
        { key: 'strengths',     cls: 's', label: t('ai-compete.result.strengths'), icon: '✓' },
        { key: 'weaknesses',    cls: 'w', label: t('ai-compete.result.weaknesses'), icon: '−' },
        { key: 'opportunities', cls: 'o', label: t('ai-compete.result.opportunities'), icon: '↑' },
        { key: 'threats',       cls: 't', label: t('ai-compete.result.threats'), icon: '!' }
      ];
      cells.forEach(function (c) {
        var cell = document.createElement('div');
        cell.className = 'ac-swot-cell-v2 ac-swot-cell-v2--' + c.cls;
        var label = document.createElement('div');
        label.className = 'ac-swot-cell-v2__label';
        label.textContent = c.icon + ' ' + c.label;
        var ul = document.createElement('ul');
        var items = data[c.key] || [];
        items.forEach(function (item) {
          var li = document.createElement('li');
          li.textContent = item;
          ul.appendChild(li);
        });
        cell.appendChild(label);
        cell.appendChild(ul);
        grid.appendChild(cell);
      });

      container.appendChild(grid);
      var sep = document.createElement('hr');
      sep.style.cssText = 'margin:24px 0;border:none;border-top:1px solid var(--ac2-border)';
      container.appendChild(sep);
    });
  }

  // ── 通用维度渲染 ─────────────────────────────────────────────────────
  function renderGenericDim(dim, container) {
    container.innerHTML = '';
    var compKeys = Object.keys(state.results);
    if (compKeys.length === 0) return;
    compKeys.forEach(function (comp) {
      var data = (state.results[comp] || {})[dim];
      if (!data) return;

      var wrapper = document.createElement('div');
      wrapper.className = 'ac-dim-competitor';

      var header = document.createElement('div');
      header.className = 'ac-dim-competitor__header';

      var compTitle = document.createElement('span');
      compTitle.className = 'ac-dim-competitor__name';
      compTitle.textContent = comp;
      header.appendChild(compTitle);

      var meta = (state.meta[comp] || {})[dim];
      if (meta && meta.confidence) {
        var badge = document.createElement('span');
        badge.className = 'ac-dim-competitor__badge';
        badge.textContent = t('ai-compete.confidence.' + meta.confidence);
        header.appendChild(badge);
      }

      wrapper.appendChild(header);

      var cardHtml = renderDimCard(dim, data);
      var cardDiv = document.createElement('div');
      cardDiv.className = 'ac-dim-card ac-dim-card--' + dim;
      cardDiv.innerHTML = cardHtml;
      wrapper.appendChild(cardDiv);

      container.appendChild(wrapper);

      var sep = document.createElement('hr');
      sep.className = 'ac-dim-sep';
      container.appendChild(sep);
    });
  }

  // ── 空值检测 ─────────────────────────────────────────────────────────
  function isEmpty(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string') {
      var s = v.trim();
      return s === '' || s === t('ai-compete.table.na') || s === 'n/a' || s === 'Unknown' || s === 'unknown' || s === 'None' || s === 'none' || s === '--';
    }
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === 'object') return Object.keys(v).length === 0;
    return false;
  }

  function renderTags(arr, cls) {
    if (!arr || !arr.length) return '';
    var tags = arr.filter(function(x) { return !isEmpty(x); });
    if (!tags.length) return '';
    return '<div class="dc-tags ' + (cls || '') + '">' +
      tags.map(function(t) { return '<span class="dc-tag">' + escapeHtml(String(t)) + '</span>'; }).join('') +
      '</div>';
  }

  function renderField(label, value, opts) {
    opts = opts || {};
    if (isEmpty(value)) return '';
    var valHtml = escapeHtml(String(value));
    if (opts.big) {
      return '<div class="dc-field dc-field--big">' +
        '<div class="dc-field-label">' + escapeHtml(label) + '</div>' +
        '<div class="dc-field-value">' + valHtml + '</div>' +
      '</div>';
    }
    return '<div class="dc-field">' +
      '<span class="dc-field-label">' + escapeHtml(label) + '</span>' +
      '<span class="dc-field-value">' + valHtml + '</span>' +
    '</div>';
  }

  function renderBlock(title, html) {
    if (!html) return '';
    return '<div class="dc-block">' +
      '<div class="dc-block-title">' + escapeHtml(title) + '</div>' +
      '<div class="dc-block-body">' + html + '</div>' +
    '</div>';
  }

  function renderQuote(text) {
    if (isEmpty(text)) return '';
    return '<blockquote class="dc-quote">' + escapeHtml(String(text)) + '</blockquote>';
  }

  function renderList(items, opts) {
    opts = opts || {};
    if (!items || !items.length) return '';
    var filtered = items.filter(function(x) { return !isEmpty(x); });
    if (!filtered.length) return '';
    var icon = opts.icon || '•';
    var cls = opts.cls || '';
    return '<ul class="dc-list ' + cls + '">' +
      filtered.map(function(item) {
        return '<li><span class="dc-list-icon">' + icon + '</span> ' + escapeHtml(String(item)) + '</li>';
      }).join('') +
    '</ul>';
  }

  // ── 维度卡片分发 ─────────────────────────────────────────────────────
  function renderDimCard(dim, data) {
    var html;
    switch (dim) {
      case 'marketing':   html = renderMarketingCard(data); break;
      case 'product':     html = renderProductCard(data); break;
      case 'pricing':     html = renderPricingCard(data); break;
      case 'audience':    html = renderAudienceCard(data); break;
      case 'sentiment':   html = renderSentimentCard(data); break;
      case 'company':     html = renderCompanyCard(data); break;
      case 'market':      html = renderMarketCard(data); break;
      case 'features':    html = renderFeaturesCard(data); break;
      default:            html = renderFallbackCard(data);
    }
    // 兜底：如果专用渲染没有输出（字段名不匹配或 data 为字符串等），fallback 到通用渲染
    if (!html || html.trim() === '') {
      html = renderFallbackCard(data);
    }
    return html;
  }

  // ── Marketing 卡片 ───────────────────────────────────────────────────
  function renderMarketingCard(d) {
    var parts = [];
    // Tagline + Positioning
    if (!isEmpty(d.tagline) || !isEmpty(d.positioning)) {
      var taglineHtml = isEmpty(d.tagline) ? '' : '<div class="dc-tagline">' + escapeHtml(d.tagline) + '</div>';
      var posHtml = isEmpty(d.positioning) ? '' : '<span class="dc-pos-badge">' + escapeHtml(d.positioning) + '</span>';
      parts.push('<div class="dc-hero-row">' + taglineHtml + posHtml + '</div>');
    }
    // USP
    if (!isEmpty(d.usp)) {
      parts.push(renderBlock(t('ai-compete.card.usp'), renderQuote(d.usp)));
    }
    // Keywords
    if (!isEmpty(d.keywords)) {
      parts.push(renderBlock(t('ai-compete.card.keywords'), renderTags(d.keywords, 'dc-tags--purple')));
    }
    // Channels
    if (!isEmpty(d.channels)) {
      parts.push(renderBlock(t('ai-compete.card.channels'), renderTags(d.channels, 'dc-tags--blue')));
    }
    // Social
    if (d.social && typeof d.social === 'object') {
      var socialFields = [];
      if (!isEmpty(d.social.platform)) socialFields.push(renderField(t('ai-compete.card.platform'), d.social.platform));
      if (!isEmpty(d.social.followers)) socialFields.push(renderField(t('ai-compete.card.followers'), d.social.followers));
      if (!isEmpty(d.social.engagement)) socialFields.push(renderField(t('ai-compete.card.engagement'), d.social.engagement));
      if (socialFields.length) {
        parts.push(renderBlock(t('ai-compete.card.social'), '<div class="dc-social-row">' + socialFields.join('') + '</div>'));
      }
    }
    // vs_my_product
    if (!isEmpty(d.vs_my_product)) {
      parts.push(renderBlock(t('ai-compete.card.vs_my_product'), '<div class="dc-compare-text">' + escapeHtml(d.vs_my_product) + '</div>'));
    }
    return parts.join('');
  }

  // ── Product 卡片 ─────────────────────────────────────────────────────
  function renderProductCard(d) {
    var parts = [];
    if (!isEmpty(d.platforms)) {
      parts.push(renderBlock(t('ai-compete.card.platforms'), renderTags(d.platforms, 'dc-tags--green')));
    }
    if (!isEmpty(d.key_features)) {
      parts.push(renderBlock(t('ai-compete.card.key_features'), renderList(d.key_features, {icon: '✓', cls: 'dc-list--check'})));
    }
    if (!isEmpty(d.unique_to_competitor)) {
      parts.push(renderBlock(t('ai-compete.card.unique_advantages'), renderList(d.unique_to_competitor, {icon: '★', cls: 'dc-list--star'})));
    }
    if (!isEmpty(d.integrations)) {
      parts.push(renderBlock(t('ai-compete.card.integrations'), renderTags(d.integrations, 'dc-tags--blue')));
    }
    return parts.join('');
  }

  // ── Features 卡片 ────────────────────────────────────────────────────
  function renderFeaturesCard(d) {
    var parts = [];
    // Hot features list with popularity badges
    if (d.hot_features && Array.isArray(d.hot_features) && d.hot_features.length) {
      var featuresHtml = d.hot_features.map(function(f) {
        var name = f.name || f.feature || '';
        var desc = f.description || '';
        var pop = f.popularity || 'medium';
        if (isEmpty(name)) return '';
        var popCls = pop === 'high' ? 'dc-pop-badge--high' : (pop === 'low' ? 'dc-pop-badge--low' : 'dc-pop-badge--medium');
        var popLabel = t('ai-compete.popularity.' + pop) || pop;
        return '<div class="dc-feature-item">' +
          '<div class="dc-feature-header">' +
            '<span class="dc-feature-name">' + escapeHtml(String(name)) + '</span>' +
            '<span class="dc-pop-badge ' + popCls + '">' + escapeHtml(String(popLabel)) + '</span>' +
          '</div>' +
          (desc ? '<div class="dc-feature-desc">' + escapeHtml(String(desc)) + '</div>' : '') +
        '</div>';
      }).filter(function(x) { return x !== ''; }).join('');
      if (featuresHtml) {
        parts.push(renderBlock(t('ai-compete.card.hot_features'), '<div class="dc-feature-list">' + featuresHtml + '</div>'));
      }
    }
    // Unique features
    if (!isEmpty(d.unique_features)) {
      parts.push(renderBlock(t('ai-compete.card.unique_features'), renderList(d.unique_features, {icon: '★', cls: 'dc-list--star'})));
    }
    // Recent launches
    if (!isEmpty(d.recent_launches)) {
      parts.push(renderBlock(t('ai-compete.card.recent_launches'), renderList(d.recent_launches, {icon: '▸', cls: 'dc-list--launch'})));
    }
    // Feature gaps vs my product
    if (!isEmpty(d.feature_gaps_vs_my_product)) {
      parts.push(renderBlock(t('ai-compete.card.feature_gaps'), renderList(d.feature_gaps_vs_my_product, {icon: '◆', cls: 'dc-list--gap'})));
    }
    // Roadmap signals
    if (!isEmpty(d.roadmap_signals)) {
      parts.push(renderBlock(t('ai-compete.card.roadmap_signals'), renderTags(d.roadmap_signals, 'dc-tags--purple')));
    }
    return parts.join('');
  }

  // ── Pricing 卡片 ─────────────────────────────────────────────────────
  function renderPricingCard(d) {
    var parts = [];
    // Model badge
    if (!isEmpty(d.model)) {
      parts.push('<div class="dc-pricing-model">' + escapeHtml(d.model) + '</div>');
    }
    // Tiers grid
    if (d.tiers && Array.isArray(d.tiers) && d.tiers.length) {
      var tiersHtml = '<div class="dc-tier-grid">' +
        d.tiers.map(function(tier) {
          var name = isEmpty(tier.name) ? '' : '<div class="dc-tier-name">' + escapeHtml(tier.name) + '</div>';
          var price = isEmpty(tier.price) ? '' : '<div class="dc-tier-price">' + escapeHtml(tier.price) + '</div>';
          var desc = isEmpty(tier.description) ? '' : '<div class="dc-tier-desc">' + escapeHtml(tier.description) + '</div>';
          return '<div class="dc-tier-card">' + name + price + desc + '</div>';
        }).join('') +
      '</div>';
      parts.push(renderBlock(t('ai-compete.card.pricing_tiers'), tiersHtml));
    }
    // Free plan / trial
    var freeParts = [];
    if (d.free_plan === true) freeParts.push('<span class="dc-free-badge dc-free-badge--yes">' + t('ai-compete.card.free_plan_yes') + '</span>');
    else if (d.free_plan === false) freeParts.push('<span class="dc-free-badge dc-free-badge--no">' + t('ai-compete.card.free_plan_no') + '</span>');
    if (d.free_trial && d.free_trial.available === true) {
      freeParts.push('<span class="dc-free-badge dc-free-badge--yes">' + t('ai-compete.card.free_trial') + ' ' + escapeHtml(d.free_trial.duration || '') + '</span>');
    }
    if (freeParts.length) {
      parts.push(renderBlock(t('ai-compete.card.free_strategy'), '<div class="dc-free-row">' + freeParts.join('') + '</div>'));
    }
    return parts.join('');
  }

  // ── Audience 卡片 ────────────────────────────────────────────────────
  function renderAudienceCard(d) {
    var parts = [];
    if (!isEmpty(d.company_sizes)) {
      parts.push(renderBlock(t('ai-compete.card.company_sizes'), renderTags(d.company_sizes, 'dc-tags--green')));
    }
    if (!isEmpty(d.industries)) {
      parts.push(renderBlock(t('ai-compete.card.industries'), renderTags(d.industries, 'dc-tags--blue')));
    }
    if (!isEmpty(d.personas)) {
      parts.push(renderBlock(t('ai-compete.card.personas'), renderTags(d.personas, 'dc-tags--purple')));
    }
    return parts.join('');
  }

  // ── Sentiment 卡片 ───────────────────────────────────────────────────
  function renderSentimentCard(d) {
    var parts = [];
    // Overall score badge
    if (!isEmpty(d.overall)) {
      var overallCls = 'neutral';
      var ov = String(d.overall).toLowerCase();
      if (ov.indexOf('positive') !== -1 || ov.indexOf('正面') !== -1 || ov.indexOf('好') !== -1) overallCls = 'positive';
      else if (ov.indexOf('negative') !== -1 || ov.indexOf('负面') !== -1 || ov.indexOf('差') !== -1) overallCls = 'negative';
      parts.push('<div class="dc-sentiment-overall dc-sentiment--' + overallCls + '">' + escapeHtml(d.overall) + '</div>');
    }
    // Scores
    if (d.scores && typeof d.scores === 'object' && Object.keys(d.scores).length) {
      var scoreItems = Object.keys(d.scores).map(function(k) {
        if (isEmpty(d.scores[k])) return '';
        return '<div class="dc-score-item">' +
          '<div class="dc-score-name">' + escapeHtml(k) + '</div>' +
          '<div class="dc-score-val">' + escapeHtml(String(d.scores[k])) + '</div>' +
        '</div>';
      }).filter(function(x) { return x !== ''; });
      if (scoreItems.length) {
        parts.push(renderBlock(t('ai-compete.card.scores'), '<div class="dc-score-grid">' + scoreItems.join('') + '</div>'));
      }
    }
    // Pros
    if (!isEmpty(d.pros)) {
      parts.push(renderBlock(t('ai-compete.card.pros'), renderList(d.pros, {icon: '+', cls: 'dc-list--pro'})));
    }
    // Cons
    if (!isEmpty(d.cons)) {
      parts.push(renderBlock(t('ai-compete.card.cons'), renderList(d.cons, {icon: '−', cls: 'dc-list--con'})));
    }
    return parts.join('');
  }

  // ── Company 卡片 ─────────────────────────────────────────────────────
  function renderCompanyCard(d) {
    var parts = [];
    // Info grid
    var infoFields = [];
    if (!isEmpty(d.founded)) infoFields.push(renderField(t('ai-compete.card.founded'), d.founded, {big: true}));
    if (!isEmpty(d.size)) infoFields.push(renderField(t('ai-compete.card.team_size'), d.size, {big: true}));
    if (!isEmpty(d.hq)) infoFields.push(renderField(t('ai-compete.card.hq'), d.hq, {big: true}));
    if (infoFields.length) {
      parts.push('<div class="dc-info-grid">' + infoFields.join('') + '</div>');
    }
    // Funding
    if (d.funding && typeof d.funding === 'object') {
      var fundFields = [];
      if (!isEmpty(d.funding.total)) fundFields.push(renderField(t('ai-compete.card.funding_total'), d.funding.total));
      if (!isEmpty(d.funding.latest_round)) fundFields.push(renderField(t('ai-compete.card.latest_round'), d.funding.latest_round));
      if (fundFields.length) {
        parts.push(renderBlock(t('ai-compete.card.funding'), '<div class="dc-funding-row">' + fundFields.join('') + '</div>'));
      }
    }
    return parts.join('');
  }

  // ── Market 卡片 ──────────────────────────────────────────────────────
  function renderMarketCard(d) {
    var parts = [];
    // Big metrics
    var metrics = [];
    if (!isEmpty(d.users)) metrics.push({label: t('ai-compete.card.users'), value: d.users});
    if (!isEmpty(d.estimated_revenue)) metrics.push({label: t('ai-compete.card.estimated_revenue'), value: d.estimated_revenue});
    if (!isEmpty(d.market_share)) metrics.push({label: t('ai-compete.card.market_share'), value: d.market_share});
    if (!isEmpty(d.growth_rate)) metrics.push({label: t('ai-compete.card.growth_rate'), value: d.growth_rate});
    if (metrics.length) {
      parts.push('<div class="dc-metric-grid">' +
        metrics.map(function(m) {
          return '<div class="dc-metric-card">' +
            '<div class="dc-metric-value">' + escapeHtml(String(m.value)) + '</div>' +
            '<div class="dc-metric-label">' + escapeHtml(m.label) + '</div>' +
          '</div>';
        }).join('') +
      '</div>');
    }
    if (!isEmpty(d.key_regions)) {
      parts.push(renderBlock(t('ai-compete.card.key_regions'), renderTags(d.key_regions, 'dc-tags--blue')));
    }
    return parts.join('');
  }

  // ── Fallback 兜底卡片 ────────────────────────────────────────────────
  function renderFallbackCard(data) {
    if (typeof data !== 'object' || data === null) {
      return '<div class="dc-field"><span class="dc-field-value">' + escapeHtml(String(data)) + '</span></div>';
    }
    var blocks = [];
    Object.keys(data).forEach(function(k) {
      var v = data[k];
      if (isEmpty(v)) return;
      if (Array.isArray(v)) {
        blocks.push(renderBlock(k, renderTags(v)));
      } else if (typeof v === 'object' && v !== null) {
        var subFields = Object.keys(v).map(function(sk) {
          return isEmpty(v[sk]) ? '' : renderField(sk, v[sk]);
        }).filter(Boolean);
        if (subFields.length) blocks.push(renderBlock(k, subFields.join('')));
      } else {
        blocks.push(renderField(k, v));
      }
    });
    if (!blocks.length) return '<p class="dc-empty">' + t('ai-compete.card.no_data') + '</p>';
    return blocks.join('');
  }

  // ── 横向对比表格 ──────────────────────────────────────────────────────
  function renderComparisonTable() {
    var existing = document.getElementById('comparisonTableSection');
    if (existing) existing.remove();

    var section = document.createElement('div');
    section.id = 'comparisonTableSection';
    section.className = 'ac-report-section';

    var title = document.createElement('h3');
    title.className = 'ac-report-section__title';
    title.textContent = t('ai-compete.compare.table_title');
    section.appendChild(title);

    var tableWrap = document.createElement('div');
    tableWrap.className = 'ac-compare-table-wrap';

    var table = document.createElement('table');
    table.className = 'ac-compare-table-v2';

    // Header
    var thead = document.createElement('thead');
    var hrow = document.createElement('tr');
    hrow.appendChild(makeTh(t('ai-compete.compare.dimension')));
    var compKeys = Object.keys(state.results);
    compKeys.forEach(function (comp) {
      hrow.appendChild(makeTh(comp, 'competitor'));
    });
    thead.appendChild(hrow);
    table.appendChild(thead);

    // Body rows — one per dimension
    var tbody = document.createElement('tbody');
    state.dimensions.forEach(function (dim) {
      if (dim === 'swot') return; // SWOT too complex for table
      var brow = document.createElement('tr');
      var meta = DIM_META[dim] || { icon: '📌', key: dim };
      var dimLabel = document.createElement('td');
      dimLabel.innerHTML = '<strong>' + meta.icon + ' ' + t(meta.key) + '</strong>';
      brow.appendChild(dimLabel);

      compKeys.forEach(function (comp) {
        var td = document.createElement('td');
        var data = ((state.results[comp] || {})[dim]);
        td.innerHTML = summarizeDimForTable(dim, data);
        brow.appendChild(td);
      });
      tbody.appendChild(brow);
    });

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    section.appendChild(tableWrap);

    // Insert at top of report body
    var firstSection = elReportBody.querySelector('.ac-report-section');
    if (firstSection) {
      elReportBody.insertBefore(section, firstSection);
    } else {
      elReportBody.appendChild(section);
    }
  }

  function makeTh(text, cls) {
    var th = document.createElement('th');
    th.textContent = text;
    if (cls) th.className = 'ac-th-' + cls;
    return th;
  }

  function summarizeDimForTable(dim, data) {
    if (!data || typeof data !== 'object') return '<span class="ac-na">' + t('ai-compete.table.na') + '</span>';
    var parts = [];
    switch (dim) {
      case 'marketing':
        if (!isEmpty(data.tagline)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.tagline') + ':</b> ' + escapeHtml(data.tagline) + '</div>');
        if (!isEmpty(data.positioning)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.positioning') + ':</b> ' + escapeHtml(data.positioning) + '</div>');
        if (!isEmpty(data.channels)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.channels') + ':</b> ' + escapeHtml(data.channels.slice(0, 3).join(', ')) + '</div>');
        break;
      case 'product':
        if (!isEmpty(data.platforms)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.platforms') + ':</b> ' + escapeHtml(data.platforms.join(', ')) + '</div>');
        if (!isEmpty(data.unique_to_competitor)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.unique') + ':</b> ' + escapeHtml(data.unique_to_competitor.slice(0, 2).join('; ')) + '</div>');
        if (!isEmpty(data.integrations)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.integrations') + ':</b> ' + escapeHtml(data.integrations.slice(0, 3).join(', ')) + '</div>');
        break;
      case 'pricing':
        if (!isEmpty(data.model)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.model') + ':</b> ' + escapeHtml(data.model) + '</div>');
        if (!isEmpty(data.tiers)) {
          var tier = data.tiers[0];
          parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.starts_at') + ':</b> ' + escapeHtml(tier.price || tier.name || t('ai-compete.table.na')) + '</div>');
        }
        if (data.free_plan === true) parts.push('<div class="ac-td-line"><span class="ac-badge-free">' + t('ai-compete.table.free_plan') + '</span></div>');
        else if (data.free_trial && data.free_trial.available) parts.push('<div class="ac-td-line"><span class="ac-badge-free">' + t('ai-compete.table.free_trial') + '</span></div>');
        break;
      case 'audience':
        if (!isEmpty(data.company_sizes)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.size') + ':</b> ' + escapeHtml(data.company_sizes.join(', ')) + '</div>');
        if (!isEmpty(data.industries)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.industries') + ':</b> ' + escapeHtml(data.industries.slice(0, 3).join(', ')) + '</div>');
        if (!isEmpty(data.personas)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.personas') + ':</b> ' + escapeHtml(data.personas.slice(0, 2).join(', ')) + '</div>');
        break;
      case 'sentiment':
        if (!isEmpty(data.overall)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.overall') + ':</b> ' + escapeHtml(data.overall) + '</div>');
        if (data.scores) {
          var scores = [];
          if (data.scores.g2) scores.push('G2: ' + escapeHtml(data.scores.g2));
          if (data.scores.capterra) scores.push('Capterra: ' + escapeHtml(data.scores.capterra));
          if (scores.length) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.scores') + ':</b> ' + scores.join(', ') + '</div>');
        }
        if (!isEmpty(data.pros)) parts.push('<div class="ac-td-line"><span class="ac-check">+</span> ' + escapeHtml(data.pros[0]) + '</div>');
        if (!isEmpty(data.cons)) parts.push('<div class="ac-td-line"><span class="ac-cross">-</span> ' + escapeHtml(data.cons[0]) + '</div>');
        break;
      case 'company':
        if (!isEmpty(data.founded)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.founded') + ':</b> ' + escapeHtml(data.founded) + '</div>');
        if (!isEmpty(data.size)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.size') + ':</b> ' + escapeHtml(data.size) + '</div>');
        if (data.funding && !isEmpty(data.funding.total)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.funding') + ':</b> ' + escapeHtml(data.funding.total) + '</div>');
        if (!isEmpty(data.hq)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.hq') + ':</b> ' + escapeHtml(data.hq) + '</div>');
        break;
      case 'market':
        if (!isEmpty(data.users)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.users') + ':</b> ' + escapeHtml(data.users) + '</div>');
        if (!isEmpty(data.estimated_revenue)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.revenue') + ':</b> ' + escapeHtml(data.estimated_revenue) + '</div>');
        if (!isEmpty(data.market_share)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.share') + ':</b> ' + escapeHtml(data.market_share) + '</div>');
        if (!isEmpty(data.growth_rate)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.growth') + ':</b> ' + escapeHtml(data.growth_rate) + '</div>');
        if (!isEmpty(data.key_regions)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.regions') + ':</b> ' + escapeHtml(data.key_regions.slice(0, 3).join(', ')) + '</div>');
        break;
      case 'features':
        if (data.hot_features && Array.isArray(data.hot_features) && data.hot_features.length) {
          var topFeatures = data.hot_features.slice(0, 3).map(function(f) { return f.name || f.feature || ''; }).filter(Boolean);
          if (topFeatures.length) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.hot_features') + ':</b> ' + escapeHtml(topFeatures.join(', ')) + '</div>');
        }
        if (!isEmpty(data.unique_features)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.unique') + ':</b> ' + escapeHtml(data.unique_features.slice(0, 2).join('; ')) + '</div>');
        if (!isEmpty(data.recent_launches)) parts.push('<div class="ac-td-line"><b>' + t('ai-compete.table.recent_launches') + ':</b> ' + escapeHtml(data.recent_launches[0]) + '</div>');
        break;
    }
    if (parts.length === 0) {
      var firstVal = Object.values(data).find(function (v) { return typeof v === 'string' && v; });
      parts.push('<div class="ac-td-line">' + escapeHtml(firstVal || t('ai-compete.table.na')) + '</div>');
    }
    return parts.join('');
  }

  // ── JSON → Markdown ──────────────────────────────────────────────────
  function dataToMarkdown(data) {
    if (typeof data !== 'object' || data === null) return String(data);
    var lines = [];
    Object.keys(data).forEach(function (k) {
      var v = data[k];
      if (Array.isArray(v)) {
        lines.push('**' + k + '**');
        v.forEach(function (item) { lines.push('- ' + item); });
      } else if (typeof v === 'object' && v !== null) {
        lines.push('**' + k + '**');
        Object.keys(v).forEach(function (subKey) {
          lines.push('  - **' + subKey + '**: ' + v[subKey]);
        });
      } else {
        lines.push('**' + k + '**: ' + v);
      }
      lines.push('');
    });
    return lines.join('\n');
  }

  // ── 进度区控制 ───────────────────────────────────────────────────────
  function showProgressSection(dimensions) {
    elProgressSection.hidden = false;
    elProgressText.textContent = t('ai-compete.status.loading');
    elProgressBar.style.width = '0%';
    elProgressBar.parentElement.setAttribute('aria-valuenow', '0');

    elProgressDims.innerHTML = '';
    dimensions.forEach(function (dim) {
      var tag = document.createElement('span');
      tag.className = 'progress-dim-tag';
      tag.id = 'pdim-' + dim;
      tag.textContent = t((DIM_META[dim] || {}).key || dim);
      elProgressDims.appendChild(tag);
    });
  }

  function updateProgress(ratio, dim, comp) {
    var pct = Math.min(Math.round(ratio * 100), 100);
    elProgressBar.style.width = pct + '%';
    elProgressBar.parentElement.setAttribute('aria-valuenow', pct);
    elProgressText.textContent = t('ai-compete.status.analyzing').replace('{competitor}', comp || '');

    var prevActive = elProgressDims.querySelector('.active');
    if (prevActive) {
      prevActive.classList.remove('active');
      prevActive.classList.add('done');
    }
    var current = document.getElementById('pdim-' + dim);
    if (current) current.classList.add('active');
  }

  function hideProgressSection() {
    if (progressStepInterval) {
      clearInterval(progressStepInterval);
      progressStepInterval = null;
    }
    elProgressText.textContent = t('ai-compete.status.done');
    elProgressBar.style.width = '100%';
    elProgressDims.querySelectorAll('.progress-dim-tag').forEach(function (el) {
      el.className = 'progress-dim-tag done';
    });
    setTimeout(function () { elProgressSection.hidden = true; }, 1200);
  }

  // ── 导出 Markdown ────────────────────────────────────────────────────
  function exportMarkdown() {
    var lines = ['# ' + t('ai-compete.result.title'), ''];
    state.competitors.forEach(function (comp) {
      lines.push('## ' + comp);
      var res = state.results[comp] || {};
      Object.keys(res).forEach(function (dim) {
        lines.push('### ' + (DIM_META[dim] || {}).icon + ' ' + t((DIM_META[dim] || {}).key || dim));
        var m = (state.meta[comp] || {})[dim];
        if (m && m.confidence) {
          lines.push('_Confidence: ' + m.confidence + (m.data_date && m.data_date !== 'unknown' ? ' | Data: ' + m.data_date : '') + '_');
        }
        lines.push(dataToMarkdown(res[dim]));
      });
    });
    var md = lines.join('\n');
    copyToClipboard(md, function (ok) {
      if (ok) {
        showToast(t('ai-compete.btn.copied'), 'success');
        if (typeof gaTrackExport === 'function') {
          gaTrackExport(TOOL, 'markdown');
        }
      } else {
        var blob = new Blob([md], { type: 'text/markdown' });
        var url  = URL.createObjectURL(blob);
        var a    = document.createElement('a');
        a.href = url; a.download = 'competitive-analysis.md';
        a.click();
        URL.revokeObjectURL(url);
        if (typeof gaTrackExport === 'function') {
          gaTrackExport(TOOL, 'markdown_download');
        }
      }
    });
  }

  // ── 复制结果 ─────────────────────────────────────────────────────────
  function copyResult() {
    var parts = [];
    var title = elReportHeroTitle.textContent || t('ai-compete.result.title');
    parts.push(title);
    parts.push('');
    var sections = elReportBody.querySelectorAll('.ac-report-section');
    sections.forEach(function(sec) {
      var header = sec.querySelector('.ac-report-section__title');
      if (header) parts.push(header.textContent.trim());
      var body = sec.querySelector('.ac-report-section__body');
      if (body) parts.push(body.innerText.trim());
      parts.push('');
    });
    var text = parts.join('\n');
    copyToClipboard(text, function (ok) {
      if (ok) {
        if (elCopyBtnText) elCopyBtnText.textContent = t('ai-compete.report.action.copied');
        setTimeout(function () {
          if (elCopyBtnText) elCopyBtnText.textContent = t('ai-compete.report.action.copy');
        }, 2000);
        if (typeof gaTrackShare === 'function') {
          gaTrackShare(TOOL, 'copy_result');
        }
      } else {
        showToast(t('ai-compete.error.api_fail'), 'error');
      }
    });
  }

  // ── 清空 ─────────────────────────────────────────────────────────────
  function clearAll() {
    if (state.controller) { state.controller.abort(); state.controller = null; }
    state.competitors = [];
    state.results     = {};
    state.meta        = {};
    state.analyzing   = false;

    elProductInput.value    = '';
    elCompetitorInput.value = '';
    elCompetitorTags.innerHTML  = '';
    elReportBody.innerHTML      = '';
    elComparisonSection.innerHTML = '';
    elReportHeroTitle.textContent = t('ai-compete.result.title');
    elReportHeroProduct.textContent = '';
    elReportHeroTime.textContent = '';
    elInsightsGrid.innerHTML = '<div class="ac-insight-card ac-insight-card--empty"><p>' + t('ai-compete.report.insights.empty') + '</p></div>';
    if (elReportHeroStats) {
      elReportHeroStats.querySelectorAll('.ac-stat-card__value').forEach(function(el) { el.textContent = '—'; });
    }
    elProgressSection.hidden    = true;
    elResultsSection.hidden     = true;
    elEmptyState.hidden         = false;
    elErrorState.hidden         = true;
    elCompetitorMax.hidden      = true;
    elSuggestDropdown.hidden    = true;
    hideError();
    setAnalyzeBtnState(false);
  }

  // ── 工具函数 ─────────────────────────────────────────────────────────
  function getCheckedDimensions() {
    var checked = [];
    document.querySelectorAll('input[name="dim"]:checked').forEach(function (el) {
      checked.push(el.value);
    });
    return checked.length ? checked : Object.keys(DIM_META);
  }

  function setAnalyzeBtnState(loading) {
    elAnalyzeBtn.disabled    = loading;
    elAnalyzeBtn.textContent = loading
      ? t('ai-compete.btn.analyzing')
      : t('ai-compete.btn.analyze');
  }

  function showError(msg) {
    elErrorMsg.textContent = msg;
    elErrorMsg.hidden      = false;
  }

  function hideError() {
    elErrorMsg.hidden = true;
    elErrorMsg.textContent = '';
  }

  function showToast(msg, type) {
    var container = $('toastContainer');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'info');
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(function () {
      toast.style.transition = 'opacity 0.3s';
      toast.style.opacity    = '0';
      setTimeout(function () { toast.remove(); }, 300);
    }, 2500);
  }

  function copyToClipboard(text, cb) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { cb(true); }).catch(function () { cb(false); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      cb(ok);
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── 事件绑定 ─────────────────────────────────────────────────────────
  function bindEvents() {
    elAddCompetitorBtn.addEventListener('click', function () {
      addCompetitor(elCompetitorInput.value);
    });
    elCompetitorInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); addCompetitor(elCompetitorInput.value); }
    });
    elSuggestBtn.addEventListener('click', suggestCompetitors);
    document.addEventListener('click', function (e) {
      if (!elSuggestDropdown.contains(e.target) && e.target !== elSuggestBtn) {
        elSuggestDropdown.hidden = true;
      }
    });
    elAnalyzeBtn.addEventListener('click', startAnalysis);
    elClearBtn.addEventListener('click', clearAll);
    elExportBtn.addEventListener('click', exportMarkdown);
    elCopyResultBtn.addEventListener('click', copyResult);

    var reanalyzeBtn = $('reanalyzeBtn');
    var emptyStartBtn = $('emptyStartBtn');
    var errorRetryBtn = $('errorRetryBtn');
    var errorEditBtn = $('errorEditBtn');

    function scrollToInput() {
      document.getElementById('productInput').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (reanalyzeBtn) reanalyzeBtn.addEventListener('click', function() { clearAll(); scrollToInput(); });
    if (emptyStartBtn) emptyStartBtn.addEventListener('click', scrollToInput);
    if (errorRetryBtn) errorRetryBtn.addEventListener('click', startAnalysis);
    if (errorEditBtn) errorEditBtn.addEventListener('click', scrollToInput);

    initTOCObserver();
    document.querySelectorAll('input[name="dim"]').forEach(function (el) {
      el.addEventListener('change', function () {
        if (typeof gaTrackSettingChange === 'function') {
          gaTrackSettingChange(TOOL, 'dimension', el.value + ':' + el.checked);
        }
      });
    });
  }

  // ── 初始化 ───────────────────────────────────────────────────────────
  function init() {
    bindEvents();
    renderExamples();
    elEmptyState.hidden = false;
    elResultsSection.hidden = true;

    // Auto-load example from URL parameter (?example=1)
    var params = new URLSearchParams(window.location.search);
    var exIdx = params.get('example');
    if (exIdx !== null) {
      var idx = parseInt(exIdx, 10) - 1;
      if (idx >= 0 && idx < PRESET_EXAMPLES.length) {
        loadExample(idx);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
