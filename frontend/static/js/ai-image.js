/**
 * ai-image.js — AI Image Generator Engine (refactored for aig-* design system)
 * Dependencies (loaded by base.html):
 *   - ga-events.js       GA event tracking
 *   - consent-engine.js  Consent Mode v2
 *   - main.js            Global UI (theme, nav, lang)
 */
(function () {
  'use strict';

  var TOOL         = 'ai-image';
  var API_GENERATE = '/api/ai/image/generate';
  var API_ENHANCE  = '/api/ai/image/enhance';
  var API_MODELS   = '/api/ai/image/models';
  var API_HISTORY  = '/api/ai/image/history';
  var IDB_DB_NAME  = 'tbn_ai_image';
  var IDB_STORE    = 'history';
  var IDB_MAX_ROWS = 50;
  var TOKEN_WARN   = 180;
  var TOKEN_MAX    = 240;

  var state = {
    mode:              'txt2img',
    model:             '',
    width:             1024,
    height:            1024,
    batchCount:        1,
    steps:             20,
    cfgScale:          7.0,
    sampler:           'DPM++ 2M Karras',
    seed:              -1,
    hiresEnabled:      false,
    denoisingStrength: 0.75,
    initImageBase64:   '',
    initImageFile:     null,
    selectedStyle:     '',

    generating:    false,
    lastResult:    null,
    objectURLs:    [],
    currentParams: null,

    history: [],
    idb:     null
  };

  var $ = function(id) { return document.getElementById(id); };
  var dom = {};

  function initDom() {
    dom.promptInput       = $('promptInput');
    dom.negPromptInput    = $('negPromptInput');
    dom.tokenCounter      = $('tokenCounter');
    dom.btnEnhance        = $('btnEnhance');
    dom.btnRandom         = $('btnRandom');
    dom.btnClearPrompt    = $('btnClearPrompt');
    dom.modelSelect       = $('modelSelect');
    dom.modelCardGrid     = $('modelCardGrid');
    dom.btnGenerate       = $('btnGenerate');
    dom.resultsEmpty      = $('resultsEmpty');
    dom.resultsLoading    = $('resultsLoading');
    dom.skeletonGrid      = $('skeletonGrid');
    dom.loadingText       = $('loadingText');
    dom.resultsGrid       = $('resultsGrid');
    dom.resultsMeta       = $('resultsMeta');
    dom.resultsActions    = $('resultsActions');
    dom.metaModel         = $('metaModel');
    dom.metaSeed          = $('metaSeed');
    dom.metaTime          = $('metaTime');
    dom.btnCopyParams     = $('btnCopyParams');
    dom.btnRegen          = $('btnRegen');
    dom.btnDownloadAll    = $('btnDownloadAll');
    dom.stepsSlider       = $('stepsSlider');
    dom.stepsVal          = $('stepsVal');
    dom.cfgSlider         = $('cfgSlider');
    dom.cfgVal            = $('cfgVal');
    dom.samplerSelect     = $('samplerSelect');
    dom.seedInput         = $('seedInput');
    dom.hiresToggle       = $('hiresToggle');
    dom.strengthSlider    = $('strengthSlider');
    dom.strengthVal       = $('strengthVal');
    dom.img2imgBlock      = $('img2imgBlock');
    dom.img2imgDropzone   = $('img2imgDropzone');
    dom.initImageInput    = $('initImageInput');
    dom.initImagePreview  = $('initImagePreview');
    dom.dropzonePlaceholder = $('dropzonePlaceholder');
    dom.historyFab        = $('historyFab');
    dom.historyDrawer     = $('historyDrawer');
    dom.drawerClose       = $('drawerClose');
    dom.drawerOverlay     = $('drawerOverlay');
    dom.drawerBody        = $('drawerBody');
    dom.historyList       = $('historyList');
    dom.historyEmpty      = $('historyEmpty');
    dom.btnClearHistory   = $('btnClearHistory');
    dom.previewModal      = $('previewModal');
    dom.modalOverlay      = $('modalOverlay');
    dom.modalClose        = $('modalClose');
    dom.previewImg        = $('previewImg');
    dom.modalDownload     = $('modalDownload');
    dom.modalCopyPrompt   = $('modalCopyPrompt');
    dom.modalUseThis      = $('modalUseThis');
    dom.toast             = $('ai-image-toast');
    dom.styleRow          = $('styleRow');
    dom.inspirationGrid   = $('inspirationGrid');
  }

  // ── Generate ────────────────────────────────────────────

  function generate() {
    var prompt = dom.promptInput.value.trim();
    if (!prompt) {
      showToast(getI18n('ai-image.error.empty_prompt'), 'error');
      dom.promptInput.focus();
      return;
    }
    if (prompt.length > 1000) {
      showToast(getI18n('ai-image.error.prompt_too_long'), 'error');
      return;
    }
    if (state.generating) return;

    state.generating = true;
    state.currentParams = buildParams();

    setGenerateBtn(true);
    showLoadingState(state.batchCount);

    if (typeof gaTrackSettingChange === 'function') {
      gaTrackSettingChange(TOOL, 'model', state.model);
      gaTrackSettingChange(TOOL, 'size', state.width + 'x' + state.height);
      gaTrackSettingChange(TOOL, 'batch', String(state.batchCount));
    }

    var startTs = Date.now();

    fetch(API_GENERATE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.currentParams)
    })
      .then(function (res) {
        if (res.status === 429) {
          return Promise.reject({ type: 'rate_limit' });
        }
        if (!res.ok) {
          return Promise.reject({ type: 'api_error', status: res.status });
        }
        return res.json();
      })
      .then(function (data) {
        var durationMs = Date.now() - startTs;
        renderResults(data, durationMs);
        state.lastResult = data;

        saveHistory({
          id:         Date.now(),
          prompt:     state.currentParams.prompt,
          model:      data.model,
          images:     data.images,
          seed:       data.seed,
          durationMs: durationMs,
          createdAt:  new Date().toISOString(),
          params:     state.currentParams
        });

        if (typeof gaTrackProcessDone === 'function') {
          gaTrackProcessDone(TOOL, (data.images || []).length, durationMs);
        }
      })
      .catch(function (err) {
        showErrorState();
        var key = err && err.type === 'rate_limit'
          ? 'ai-image.error.rate_limit'
          : 'ai-image.error.api_error';
        showToast(getI18n(key), 'error');
        if (typeof gaTrackError === 'function') {
          gaTrackError(TOOL, err && err.type || 'unknown', String(err && err.status || ''));
        }
      })
      .finally(function () {
        state.generating = false;
        setGenerateBtn(false);
      });
  }

  function buildParams() {
    var prompt = dom.promptInput.value.trim();
    // Append style suffix if a style is selected
    if (state.selectedStyle) {
      var chip = document.querySelector('.aig-style-chip[data-style="' + state.selectedStyle + '"]');
      if (chip) {
        var suffix = chip.dataset.suffix;
        if (suffix && prompt.indexOf(suffix) === -1) {
          prompt = prompt + ', ' + suffix;
        }
      }
    }
    return {
      prompt:            prompt,
      negativePrompt:    dom.negPromptInput.value.trim(),
      model:             state.model,
      width:             state.width,
      height:            state.height,
      steps:             state.steps,
      cfgScale:          state.cfgScale,
      sampler:           state.sampler,
      seed:              parseSeed(dom.seedInput.value),
      batchCount:        state.batchCount,
      mode:              state.mode,
      initImage:         state.mode === 'img2img' ? state.initImageBase64 : '',
      denoisingStrength: state.denoisingStrength
    };
  }

  function parseSeed(val) {
    var n = parseInt(val, 10);
    return isNaN(n) ? -1 : n;
  }

  // ── Enhance prompt ──────────────────────────────────────

  function enhancePrompt() {
    var prompt = dom.promptInput.value.trim();
    if (!prompt) return;

    dom.btnEnhance.disabled = true;
    var originalText = dom.btnEnhance.innerHTML;
    dom.btnEnhance.innerHTML = '✨ ' + getI18n('ai-image.prompt.enhancing');

    fetch(API_ENHANCE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt, lang: document.documentElement.lang || 'en' })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.enhanced) {
          dom.promptInput.value = data.enhanced;
          updateTokenCount();
          showToast('✨ ' + getI18n('ai-image.prompt.enhance'), 'success');
          if (typeof gaTrackSettingChange === 'function') {
            gaTrackSettingChange(TOOL, 'prompt_enhanced', '1');
          }
        }
      })
      .catch(function () {
        showToast(getI18n('ai-image.error.api_error'), 'error');
      })
      .finally(function () {
        dom.btnEnhance.disabled = false;
        dom.btnEnhance.innerHTML = originalText;
      });
  }

  // ── Random inspiration ──────────────────────────────────

  var inspirationPrompts = [
    'Astronaut cat on the moon, cinematic lighting, ultra detailed',
    'Crystal castle in enchanted forest, watercolor style, soft pastel colors, fairy tale atmosphere',
    'Cyberpunk cityscape at night, neon lights, rainy streets, futuristic',
    'Minimalist product photography, white background, aromatherapy candle, soft shadows, premium feel',
    'Ancient Chinese beauty under cherry blossom tree, flowing hanfu, ink wash style, poetic',
    'Flat illustration, young person working in a coffee shop, warm tones, cozy'
  ];

  function randomInspiration() {
    var idx = Math.floor(Math.random() * inspirationPrompts.length);
    dom.promptInput.value = getI18n('ai-image.inspiration.p' + (idx + 1)) || inspirationPrompts[idx];
    updateTokenCount();
    showToast('✨ Inspiration applied!', 'success');
    if (typeof gaTrackSettingChange === 'function') {
      gaTrackSettingChange(TOOL, 'random_inspiration', '1');
    }
  }

  function clearPrompt() {
    dom.promptInput.value = '';
    dom.negPromptInput.value = '';
    updateTokenCount();
    // Reset style selection
    state.selectedStyle = '';
    document.querySelectorAll('.aig-style-chip').forEach(function (c) {
      c.classList.remove('aig-style-chip--active');
    });
    showToast('✅ Cleared', 'info');
  }

  // ── Style selection ─────────────────────────────────────

  function bindStyleChips() {
    if (!dom.styleRow) return;
    dom.styleRow.addEventListener('click', function (e) {
      var chip = e.target.closest('.aig-style-chip');
      if (!chip) return;

      var style = chip.dataset.style;
      var isActive = chip.classList.contains('aig-style-chip--active');

      document.querySelectorAll('.aig-style-chip').forEach(function (c) {
        c.classList.remove('aig-style-chip--active');
      });

      if (!isActive) {
        chip.classList.add('aig-style-chip--active');
        state.selectedStyle = style;
        if (typeof gaTrackSettingChange === 'function') {
          gaTrackSettingChange(TOOL, 'style', style);
        }
      } else {
        state.selectedStyle = '';
      }
    });
  }

  // ── Inspiration cards ───────────────────────────────────

  function bindInspirationCards() {
    if (!dom.inspirationGrid) return;
    dom.inspirationGrid.addEventListener('click', function (e) {
      var card = e.target.closest('.aig-inspire-card');
      if (!card) return;
      var prompt = card.dataset.prompt;
      if (prompt) {
        dom.promptInput.value = prompt;
        updateTokenCount();
        dom.promptInput.focus();
        showToast('✨ Prompt applied', 'success');
        if (typeof gaTrackSettingChange === 'function') {
          gaTrackSettingChange(TOOL, 'inspiration_clicked', '1');
        }
      }
    });
  }

  // ── Model list ──────────────────────────────────────────

  function loadModels() {
    fetch(API_MODELS)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var models = data.models || [];
        if (models.length === 0) {
          models = getDefaultModels();
        }
        renderModelSelect(models);
        renderModelCards(models);
      })
      .catch(function () {
        var defaults = getDefaultModels();
        renderModelSelect(defaults);
        renderModelCards(defaults);
      });
  }

  function getDefaultModels() {
    return [
      { model_id: 'sd3-large', name: 'Stable Diffusion 3 Large', provider: 'stability', category: 'realistic', recommended: true },
      { model_id: 'sd3-medium', name: 'Stable Diffusion 3 Medium', provider: 'stability', category: 'realistic', recommended: false },
      { model_id: 'sdxl-1.0',  name: 'SDXL 1.0',  provider: 'stability', category: 'realistic', recommended: true },
      { model_id: 'sd-1.6',    name: 'SD 1.6',     provider: 'stability', category: 'realistic', recommended: false },
      { model_id: 'stable-image-ultra', name: 'Stable Image Ultra', provider: 'stability', category: 'realistic', recommended: true },
      { model_id: 'dall-e-3',  name: 'DALL·E 3', provider: 'openai', category: 'artistic', recommended: true },
      { model_id: 'dall-e-2',  name: 'DALL·E 2', provider: 'openai', category: 'artistic', recommended: false },
      { model_id: 'anything-v5', name: 'Anything V5', provider: 'sdwebui', category: 'anime', recommended: true },
      { model_id: 'deliberate-v3', name: 'Deliberate V3', provider: 'sdwebui', category: 'realistic', recommended: false },
      { model_id: 'dreamshaper-xl', name: 'DreamShaper XL', provider: 'sdwebui', category: 'artistic', recommended: false }
    ];
  }

  function renderModelSelect(models) {
    if (!dom.modelSelect) return;
    dom.modelSelect.innerHTML = '';
    models.forEach(function (m) {
      var opt = document.createElement('option');
      opt.value = m.model_id;
      opt.textContent = m.name;
      dom.modelSelect.appendChild(opt);
    });

    if (models.length > 0) {
      state.model = models[0].model_id;
      dom.modelSelect.value = state.model;
    }
  }

  // ── Model cards rendering ───────────────────────────────

  function renderModelCards(models) {
    var grid = dom.modelCardGrid;
    if (!grid) return;

    grid.innerHTML = '';
    models.forEach(function (m) {
      var card = createModelCard(m);
      grid.appendChild(card);
    });

    var firstRecommended = models.find(function(m) { return m.recommended; });
    var firstModel = firstRecommended || models[0];
    if (firstModel) {
      selectModelCard(firstModel.model_id);
      state.model = firstModel.model_id;
    }
  }

  function createModelCard(m) {
    var card = document.createElement('div');
    card.className = 'aig-model-card';
    card.dataset.modelId = m.model_id;
    card.dataset.category = m.category || 'all';

    var head = document.createElement('div');
    head.className = 'aig-model-card__head';

    var name = document.createElement('span');
    name.className = 'aig-model-card__name';
    name.textContent = m.name;

    var tag = document.createElement('span');
    tag.className = 'aig-model-card__tag';
    tag.textContent = getCategoryLabel(m.category || 'realistic');

    head.appendChild(name);
    head.appendChild(tag);
    card.appendChild(head);

    if (m.recommended) {
      var badge = document.createElement('span');
      badge.className = 'aig-model-card__tag';
      badge.style.marginTop = '4px';
      badge.style.display = 'inline-block';
      badge.textContent = getI18n('ai-image.model.recommended');
      card.appendChild(badge);
    }

    card.addEventListener('click', function () {
      selectModelCard(m.model_id);
      state.model = m.model_id;
      if (dom.modelSelect) dom.modelSelect.value = m.model_id;
      if (typeof gaTrackSettingChange === 'function') {
        gaTrackSettingChange(TOOL, 'model', state.model);
      }
    });

    return card;
  }

  function selectModelCard(modelId) {
    document.querySelectorAll('.aig-model-card').forEach(function (c) {
      c.classList.remove('aig-model-card--active');
      if (c.dataset.modelId === modelId) {
        c.classList.add('aig-model-card--active');
      }
    });
  }

  function getCategoryLabel(category) {
    var labels = {
      'anime':     getI18n('ai-image.model.category.anime'),
      'realistic': getI18n('ai-image.model.category.realistic'),
      'artistic':  getI18n('ai-image.model.category.artistic')
    };
    return labels[category] || category;
  }

  function filterModelsByCategory(category) {
    document.querySelectorAll('.aig-model-card').forEach(function (c) {
      if (category === 'all' || c.dataset.category === category) {
        c.style.display = 'block';
      } else {
        c.style.display = 'none';
      }
    });
  }

  // ── Result rendering ────────────────────────────────────

  function renderResults(data, durationMs) {
    hideLoadingState();

    var images = data.images || [];
    if (!images.length) {
      showErrorState();
      return;
    }

    dom.resultsGrid.innerHTML = '';

    images.forEach(function (imgData, idx) {
      var card = createResultCard(imgData, idx, data);
      dom.resultsGrid.appendChild(card);
    });

    dom.resultsGrid.style.display = 'grid';

    dom.metaModel.textContent = data.model || '—';
    dom.metaSeed.textContent  = data.seed  || '—';
    dom.metaTime.textContent  = durationMs ? (durationMs / 1000).toFixed(1) + 's' : '—';
    dom.resultsMeta.style.display   = 'flex';
    dom.resultsActions.style.display = 'flex';
    dom.resultsEmpty.style.display   = 'none';
  }

  function createResultCard(imgData, idx, fullData) {
    var card = document.createElement('div');
    card.className = 'aig-result-card';
    card.dataset.idx = idx;

    var imgSrc = typeof imgData === 'string' ? imgData : (imgData.url || '');

    var img = document.createElement('img');
    img.src = imgSrc;
    img.alt = 'Generated image ' + (idx + 1);
    img.loading = 'lazy';

    var bar = document.createElement('div');
    bar.className = 'aig-result-card__bar';

    var btnPreview = document.createElement('button');
    btnPreview.className = 'aig-result-act';
    btnPreview.innerHTML = '🔍';
    btnPreview.type = 'button';
    btnPreview.title = 'Preview';
    btnPreview.addEventListener('click', function (e) {
      e.stopPropagation();
      openPreview(imgSrc, fullData);
    });

    var btnDl = document.createElement('button');
    btnDl.className = 'aig-result-act';
    btnDl.innerHTML = '⬇️';
    btnDl.type = 'button';
    btnDl.title = 'Download';
    btnDl.addEventListener('click', function (e) {
      e.stopPropagation();
      downloadImage(imgSrc, 'ai-image-' + Date.now() + '-' + idx + '.png');
    });

    bar.appendChild(btnPreview);
    bar.appendChild(btnDl);
    card.appendChild(img);
    card.appendChild(bar);

    card.addEventListener('click', function () {
      openPreview(imgSrc, fullData);
    });

    return card;
  }

  // ── Loading / Empty / Error states ──────────────────────

  function showLoadingState(count) {
    dom.resultsEmpty.style.display   = 'none';
    dom.resultsGrid.style.display    = 'none';
    dom.resultsMeta.style.display    = 'none';
    dom.resultsActions.style.display = 'none';
    dom.resultsLoading.style.display = 'block';

    // Animate loading stages
    animateLoadingStages();

    if (dom.skeletonGrid) {
      dom.skeletonGrid.innerHTML = '';
      for (var i = 0; i < count; i++) {
        var sk = document.createElement('div');
        sk.className = 'aig-skeleton';
        dom.skeletonGrid.appendChild(sk);
      }
    }
  }

  function animateLoadingStages() {
    var stages = document.querySelectorAll('.aig-loading__stage');
    stages.forEach(function (s) { s.classList.remove('is-active', 'is-done'); });

    var delays = [0, 2000, 4500, 7000];
    stages.forEach(function (stage, idx) {
      setTimeout(function () {
        if (idx > 0) stages[idx - 1].classList.add('is-done');
        stages[idx - 1] && stages[idx - 1].classList.remove('is-active');
        stage.classList.add('is-active');
      }, delays[idx] || 0);
    });
  }

  function hideLoadingState() {
    dom.resultsLoading.style.display = 'none';
  }

  function showErrorState() {
    hideLoadingState();
    dom.resultsEmpty.style.display = 'flex';
    dom.resultsGrid.style.display  = 'none';
    dom.resultsMeta.style.display    = 'none';
    dom.resultsActions.style.display = 'none';
  }

  // ── Download ────────────────────────────────────────────

  function downloadImage(src, filename) {
    if (src.startsWith('data:')) {
      var parts = src.split(',');
      var mime  = parts[0].match(/:(.*?);/)[1];
      var bin   = atob(parts[1]);
      var arr   = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) { arr[i] = bin.charCodeAt(i); }
      var blob = new Blob([arr], { type: mime });
      triggerDownload(URL.createObjectURL(blob), filename);
      if (typeof gaTrackDownload === 'function') gaTrackDownload(TOOL, 'png');
      return;
    }

    fetch(src)
      .then(function (r) { return r.blob(); })
      .then(function (blob) {
        var objUrl = URL.createObjectURL(blob);
        state.objectURLs.push(objUrl);
        triggerDownload(objUrl, filename);
        if (typeof gaTrackDownload === 'function') gaTrackDownload(TOOL, 'png');
      })
      .catch(function () {
        triggerDownload(src, filename);
      });
  }

  function triggerDownload(url, filename) {
    var a = document.createElement('a');
    a.href = url;
    a.download = filename || 'ai-image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
        var idx = state.objectURLs.indexOf(url);
        if (idx !== -1) { state.objectURLs.splice(idx, 1); }
      }
    }, 10000);
  }

  function downloadAll() {
    if (!state.lastResult) return;
    var images = state.lastResult.images || [];
    images.forEach(function (imgData, idx) {
      var src = typeof imgData === 'string' ? imgData : (imgData.url || '');
      setTimeout(function () {
        downloadImage(src, 'ai-image-' + Date.now() + '-' + idx + '.png');
      }, idx * 300);
    });
    if (typeof gaTrackDownloadAll === 'function') gaTrackDownloadAll(TOOL, images.length);
  }

  // ── Copy params ─────────────────────────────────────────

  function copyParams() {
    if (!state.currentParams) return;
    var text = JSON.stringify(state.currentParams, null, 2);
    copyToClipboard(text, '📋 ' + getI18n('ai-image.result.copy_params'));
  }

  function copyToClipboard(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(function () { showToast(successMsg || '✓ Copied!', 'success'); })
        .catch(function () { fallbackCopy(text, successMsg); });
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      showToast(successMsg || '✓ Copied!', 'success');
    } catch (e) {
      showToast('Copy failed, please copy manually.', 'error');
    }
    document.body.removeChild(ta);
  }

  // ── Preview modal ───────────────────────────────────────

  var previewCurrentSrc    = '';
  var previewCurrentParams = null;

  function openPreview(src, data) {
    previewCurrentSrc    = src;
    previewCurrentParams = data && data.params ? data.params : state.currentParams;

    dom.previewImg.src = src;
    dom.previewModal.style.display = 'flex';
    dom.previewModal.classList.add('is-open');
    dom.previewModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closePreview() {
    dom.previewModal.style.display = 'none';
    dom.previewModal.classList.remove('is-open');
    dom.previewModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow  = '';
  }

  // ── History ─────────────────────────────────────────────

  function saveHistory(record) {
    state.history.unshift(record);
    if (state.history.length > IDB_MAX_ROWS) {
      state.history.pop();
    }
    idbSave(record);
  }

  function renderHistoryList() {
    if (!state.history.length) {
      if (dom.historyEmpty) dom.historyEmpty.style.display = 'block';
      if (dom.historyList) dom.historyList.innerHTML = '';
      return;
    }
    if (dom.historyEmpty) dom.historyEmpty.style.display = 'none';
    if (dom.historyList) dom.historyList.innerHTML = '';

    state.history.forEach(function (rec) {
      var item = document.createElement('div');
      item.className = 'aig-history-item';

      var firstImg = rec.images && rec.images[0];
      var imgSrc   = firstImg
        ? (typeof firstImg === 'string' ? firstImg : firstImg.url)
        : '';

      if (imgSrc) {
        var thumb = document.createElement('img');
        thumb.className = 'aig-history-item__thumb';
        thumb.src = imgSrc;
        thumb.alt = 'History thumbnail';
        item.appendChild(thumb);
      }

      var body = document.createElement('div');
      body.className = 'aig-history-item__body';

      var pPrompt = document.createElement('div');
      pPrompt.className = 'aig-history-item__prompt';
      pPrompt.textContent = rec.prompt;
      body.appendChild(pPrompt);

      var pMeta = document.createElement('div');
      pMeta.className = 'aig-history-item__time';
      pMeta.textContent = (rec.model || '') + ' · ' + formatTimeAgo(rec.createdAt);
      body.appendChild(pMeta);

      item.appendChild(body);

      item.addEventListener('click', function () {
        restoreParams(rec.params);
        closeHistoryDrawer();
      });

      if (dom.historyList) dom.historyList.appendChild(item);
    });
  }

  function restoreParams(params) {
    if (!params) return;
    if (params.prompt)         { dom.promptInput.value    = params.prompt; updateTokenCount(); }
    if (params.negativePrompt) { dom.negPromptInput.value = params.negativePrompt; }
    if (params.model)          {
      state.model = params.model;
      if (dom.modelSelect) dom.modelSelect.value = params.model;
      selectModelCard(params.model);
    }
    if (params.steps)          { dom.stepsSlider.value = params.steps; dom.stepsVal.textContent = params.steps; state.steps = params.steps; }
    if (params.cfgScale)       { dom.cfgSlider.value   = params.cfgScale; dom.cfgVal.textContent = params.cfgScale; state.cfgScale = params.cfgScale; }
    if (params.sampler)        { dom.samplerSelect.value = params.sampler; state.sampler = params.sampler; }
    if (params.width && params.height) {
      state.width = params.width;
      state.height = params.height;
      document.querySelectorAll('.aig-size-btn').forEach(function (b) {
        b.classList.toggle('aig-size-btn--active',
          parseInt(b.dataset.w, 10) === params.width && parseInt(b.dataset.h, 10) === params.height);
      });
    }
    showToast('✓ ' + getI18n('ai-image.btn.use_this'), 'success');
  }

  function clearHistory() {
    state.history = [];
    idbClear();
    renderHistoryList();
    showToast('🗑️ ' + getI18n('ai-image.history.clear'), 'info');
  }

  function openHistoryDrawer() {
    renderHistoryList();
    if (dom.historyDrawer) {
      dom.historyDrawer.classList.add('is-open');
      dom.historyDrawer.setAttribute('aria-hidden', 'false');
    }
    if (dom.drawerOverlay) dom.drawerOverlay.classList.add('is-shown');
    document.body.style.overflow = 'hidden';
  }

  function closeHistoryDrawer() {
    if (dom.historyDrawer) {
      dom.historyDrawer.classList.remove('is-open');
      dom.historyDrawer.setAttribute('aria-hidden', 'true');
    }
    if (dom.drawerOverlay) dom.drawerOverlay.classList.remove('is-shown');
    document.body.style.overflow = '';
  }

  // ── IndexedDB ───────────────────────────────────────────

  function idbOpen(cb) {
    if (state.idb) { cb(state.idb); return; }
    if (!window.indexedDB) { cb(null); return; }

    var req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = function (e) {
      var db    = e.target.result;
      var store = db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      store.createIndex('createdAt', 'createdAt', { unique: false });
    };
    req.onsuccess = function (e) {
      state.idb = e.target.result;
      cb(state.idb);
    };
    req.onerror = function () { cb(null); };
  }

  function idbSave(record) {
    idbOpen(function (db) {
      if (!db) return;
      try {
        var tx    = db.transaction(IDB_STORE, 'readwrite');
        var store = tx.objectStore(IDB_STORE);
        store.put(record);
      } catch (e) { /* silent */ }
    });
  }

  function idbLoadAll(cb) {
    idbOpen(function (db) {
      if (!db) { cb([]); return; }
      try {
        var tx    = db.transaction(IDB_STORE, 'readonly');
        var store = tx.objectStore(IDB_STORE);
        var req   = store.getAll();
        req.onsuccess = function () {
          var arr = (req.result || []).sort(function (a, b) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          });
          cb(arr.slice(0, IDB_MAX_ROWS));
        };
        req.onerror = function () { cb([]); };
      } catch (e) { cb([]); }
    });
  }

  function idbClear() {
    idbOpen(function (db) {
      if (!db) return;
      try {
        db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).clear();
      } catch (e) { /* silent */ }
    });
  }

  // ── Token counter ───────────────────────────────────────

  function estimateTokens(text) {
    var en = (text.match(/[a-zA-Z,.\s]+/g) || []).join('').length;
    var zh = text.length - en;
    return Math.ceil(en / 4 + zh / 2);
  }

  function updateTokenCount() {
    var text   = dom.promptInput.value;
    var tokens = estimateTokens(text);
    var label  = getI18n('ai-image.prompt.token_count');
    if (dom.tokenCounter) dom.tokenCounter.textContent = label.replace('{n}', tokens);

    dom.promptInput.classList.remove('token-warn', 'token-error');
    if (dom.tokenCounter) dom.tokenCounter.classList.remove('warn', 'error');

    if (tokens > TOKEN_MAX) {
      dom.promptInput.classList.add('token-error');
      if (dom.tokenCounter) dom.tokenCounter.classList.add('error');
    } else if (tokens > TOKEN_WARN) {
      dom.promptInput.classList.add('token-warn');
      if (dom.tokenCounter) dom.tokenCounter.classList.add('warn');
    }
  }

  // ── UI helpers ──────────────────────────────────────────

  function setGenerateBtn(loading) {
    dom.btnGenerate.disabled = loading;
    dom.btnGenerate.classList.toggle('is-loading', loading);
    var textSpan = dom.btnGenerate.querySelector('.aig-btn-text');
    if (textSpan) {
      textSpan.textContent = loading
        ? getI18n('ai-image.btn.generating')
        : getI18n('ai-image.btn.generate');
    }
  }

  var toastTimer = null;
  function showToast(msg, type) {
    if (!dom.toast) return;
    dom.toast.textContent = msg;
    dom.toast.className   = 'aig-toast ' + (type || 'info') + ' is-shown';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      dom.toast.classList.remove('is-shown');
    }, 2500);
  }

  function formatTimeAgo(iso) {
    if (!iso) return '';
    var diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60)   return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  function getI18n(key) {
    return (window.__I18N__ && window.__I18N__[key]) || key;
  }

  // ── img2img file handling ───────────────────────────────

  function handleInitImageFile(file) {
    var allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.indexOf(file.type) === -1) {
      showToast(getI18n('ai-image.error.invalid_image'), 'error');
      return;
    }

    state.initImageFile = file;
    var reader = new FileReader();
    reader.onload = function (e) {
      state.initImageBase64 = e.target.result;
      if (dom.initImagePreview) {
        dom.initImagePreview.src = e.target.result;
        dom.initImagePreview.style.display = 'block';
      }
      if (dom.dropzonePlaceholder) dom.dropzonePlaceholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  // ── Clear all ───────────────────────────────────────────

  function clearAll() {
    state.objectURLs.forEach(function (url) {
      try { URL.revokeObjectURL(url); } catch (e) { /* silent */ }
    });

    state.generating       = false;
    state.lastResult       = null;
    state.objectURLs       = [];
    state.currentParams    = null;
    state.initImageBase64  = '';
    state.initImageFile    = null;
    state.selectedStyle    = '';

    dom.promptInput.value    = '';
    dom.negPromptInput.value = '';
    if (dom.initImagePreview) dom.initImagePreview.style.display = 'none';
    if (dom.dropzonePlaceholder) dom.dropzonePlaceholder.style.display = 'flex';
    if (dom.initImageInput) dom.initImageInput.value = '';

    document.querySelectorAll('.aig-style-chip').forEach(function (c) {
      c.classList.remove('aig-style-chip--active');
    });

    updateTokenCount();
    showErrorState();
  }

  // ── Event binding ───────────────────────────────────────

  function bindEvents() {
    if (dom.btnGenerate) dom.btnGenerate.addEventListener('click', generate);
    if (dom.promptInput) dom.promptInput.addEventListener('input', updateTokenCount);
    if (dom.btnEnhance) dom.btnEnhance.addEventListener('click', enhancePrompt);
    if (dom.btnRandom) dom.btnRandom.addEventListener('click', randomInspiration);
    if (dom.btnClearPrompt) dom.btnClearPrompt.addEventListener('click', clearPrompt);

    bindStyleChips();
    bindInspirationCards();

    // Mode switcher (segment buttons)
    document.querySelectorAll('#tab-txt2img, #tab-img2img').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('#tab-txt2img, #tab-img2img').forEach(function (t) {
          t.classList.remove('aig-segment__btn--active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('aig-segment__btn--active');
        tab.setAttribute('aria-selected', 'true');
        state.mode = tab.dataset.mode;
        if (state.mode === 'img2img') {
          if (dom.img2imgBlock) dom.img2imgBlock.style.display = 'block';
        } else {
          if (dom.img2imgBlock) dom.img2imgBlock.style.display = 'none';
        }
        if (typeof gaTrackSettingChange === 'function') {
          gaTrackSettingChange(TOOL, 'mode', state.mode);
        }
      });
    });

    // Model selector (hidden select for compatibility)
    if (dom.modelSelect) {
      dom.modelSelect.addEventListener('change', function () {
        state.model = this.value;
        selectModelCard(this.value);
        if (typeof gaTrackSettingChange === 'function') {
          gaTrackSettingChange(TOOL, 'model', state.model);
        }
      });
    }

    // Size presets
    document.querySelectorAll('.aig-size-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.aig-size-btn').forEach(function (b) { b.classList.remove('aig-size-btn--active'); });
        btn.classList.add('aig-size-btn--active');
        state.width  = parseInt(btn.dataset.w, 10);
        state.height = parseInt(btn.dataset.h, 10);
        if (typeof gaTrackSettingChange === 'function') {
          gaTrackSettingChange(TOOL, 'size', state.width + 'x' + state.height);
        }
      });
    });

    // Model category filters
    document.querySelectorAll('.aig-cat-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.aig-cat-btn').forEach(function (b) { b.classList.remove('aig-cat-btn--active'); });
        btn.classList.add('aig-cat-btn--active');
        filterModelsByCategory(btn.dataset.cat);
      });
    });

    // Batch count (segment buttons with data-count)
    document.querySelectorAll('.aig-segment__btn[data-count]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parent = btn.closest('.aig-segment');
        if (parent) {
          parent.querySelectorAll('.aig-segment__btn[data-count]').forEach(function (b) { b.classList.remove('aig-segment__btn--active'); });
        }
        btn.classList.add('aig-segment__btn--active');
        state.batchCount = parseInt(btn.dataset.count, 10);
        if (typeof gaTrackSettingChange === 'function') {
          gaTrackSettingChange(TOOL, 'batch', String(state.batchCount));
        }
      });
    });

    // Sliders
    if (dom.stepsSlider) {
      dom.stepsSlider.addEventListener('input', function () {
        state.steps = parseInt(this.value, 10);
        if (dom.stepsVal) dom.stepsVal.textContent = state.steps;
        updateSliderProgress(this);
      });
    }

    if (dom.cfgSlider) {
      dom.cfgSlider.addEventListener('input', function () {
        state.cfgScale = parseFloat(this.value);
        if (dom.cfgVal) dom.cfgVal.textContent = state.cfgScale.toFixed(1);
        updateSliderProgress(this);
      });
    }

    if (dom.samplerSelect) {
      dom.samplerSelect.addEventListener('change', function () {
        state.sampler = this.value;
      });
    }

    if (dom.hiresToggle) {
      dom.hiresToggle.addEventListener('change', function () {
        state.hiresEnabled = this.checked;
        if (typeof gaTrackSettingChange === 'function') {
          gaTrackSettingChange(TOOL, 'hires', state.hiresEnabled ? '1' : '0');
        }
      });
    }

    if (dom.strengthSlider) {
      dom.strengthSlider.addEventListener('input', function () {
        state.denoisingStrength = parseFloat(this.value);
        if (dom.strengthVal) dom.strengthVal.textContent = state.denoisingStrength.toFixed(2);
        updateSliderProgress(this);
      });
    }

    // Quick insert negative prompts
    document.querySelectorAll('.aig-quick-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var toInsert = chip.dataset.insert;
        var cur      = dom.negPromptInput.value.trim();
        dom.negPromptInput.value = cur ? cur + ', ' + toInsert : toInsert;
      });
    });

    // img2img drag & drop
    if (dom.img2imgDropzone) {
      dom.img2imgDropzone.addEventListener('click', function () {
        if (dom.initImageInput) dom.initImageInput.click();
      });
      dom.img2imgDropzone.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          if (dom.initImageInput) dom.initImageInput.click();
        }
      });
      dom.img2imgDropzone.addEventListener('dragover', function (e) {
        e.preventDefault();
        dom.img2imgDropzone.classList.add('is-drag');
      });
      dom.img2imgDropzone.addEventListener('dragleave', function (e) {
        if (!dom.img2imgDropzone.contains(e.relatedTarget)) {
          dom.img2imgDropzone.classList.remove('is-drag');
        }
      });
      dom.img2imgDropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        dom.img2imgDropzone.classList.remove('is-drag');
        var files = e.dataTransfer.files;
        if (files && files[0]) { handleInitImageFile(files[0]); }
      });
    }
    if (dom.initImageInput) {
      dom.initImageInput.addEventListener('change', function () {
        if (this.files && this.files[0]) { handleInitImageFile(this.files[0]); }
      });
    }

    // Result actions
    if (dom.btnCopyParams) dom.btnCopyParams.addEventListener('click', copyParams);
    if (dom.btnRegen) dom.btnRegen.addEventListener('click', generate);
    if (dom.btnDownloadAll) dom.btnDownloadAll.addEventListener('click', downloadAll);

    // Preview modal
    if (dom.modalOverlay) dom.modalOverlay.addEventListener('click', closePreview);
    if (dom.modalClose) dom.modalClose.addEventListener('click', closePreview);
    if (dom.modalDownload) {
      dom.modalDownload.addEventListener('click', function () {
        downloadImage(previewCurrentSrc, 'ai-image-' + Date.now() + '.png');
      });
    }
    if (dom.modalCopyPrompt) {
      dom.modalCopyPrompt.addEventListener('click', function () {
        var prompt = previewCurrentParams && previewCurrentParams.prompt || '';
        copyToClipboard(prompt, '📋 ' + getI18n('ai-image.btn.copy_prompt'));
      });
    }
    if (dom.modalUseThis) {
      dom.modalUseThis.addEventListener('click', function () {
        if (previewCurrentParams) { restoreParams(previewCurrentParams); }
        closePreview();
      });
    }

    // History drawer
    if (dom.historyFab) dom.historyFab.addEventListener('click', openHistoryDrawer);
    if (dom.drawerClose) dom.drawerClose.addEventListener('click', closeHistoryDrawer);
    if (dom.drawerOverlay) dom.drawerOverlay.addEventListener('click', closeHistoryDrawer);
    if (dom.btnClearHistory) dom.btnClearHistory.addEventListener('click', clearHistory);

    // ESC key
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (dom.previewModal && dom.previewModal.classList.contains('is-open')) {
        closePreview();
      } else if (dom.historyDrawer && dom.historyDrawer.classList.contains('is-open')) {
        closeHistoryDrawer();
      }
    });

    // Init slider progress
    document.querySelectorAll('.aig-range').forEach(updateSliderProgress);
  }

  function updateSliderProgress(slider) {
    if (!slider) return;
    var min = parseFloat(slider.min) || 0;
    var max = parseFloat(slider.max) || 100;
    var val = parseFloat(slider.value) || 0;
    var pct = ((val - min) / (max - min)) * 100;
    slider.style.setProperty('--p', pct + '%');
  }

  // ── Init ────────────────────────────────────────────────

  function init() {
    initDom();
    bindEvents();
    loadModels();
    updateTokenCount();

    idbLoadAll(function (records) {
      state.history = records;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
