/**
 * remove-bg.js
 * AI Background Removal — UI bridge
 *
 * Responsibilities:
 *   - Wire the "Remove Background" button to start processing
 *   - Manage AI model load lifecycle UI (status hint + retry button on error)
 *   - Provide _itbCollectOptions() for the shared toolbox engine
 *
 * Requires:
 *   - remove-bg-engine.js loaded BEFORE this file (defines window.RemoveBgEngine)
 *   - img-toolbox-engine.js loaded BEFORE this file (defines itbStartProcess etc.)
 */
(function () {
  'use strict';

  /* ── Options collector — remove-bg currently has no per-file options ── */
  window._itbCollectOptions = function () { return {}; };

  /* ── i18n helper (mirrors itbI18n in toolbox engine) ── */
  function t(key) {
    if (window.ITB_I18N && window.ITB_I18N[key]) return window.ITB_I18N[key];
    return key;
  }

  /* ── DOM helpers ── */
  function $(id) { return document.getElementById(id); }

  /* ── Model status UI ── */
  function renderModelStatus(state, err) {
    const panel = $('itbOptionsPanel');
    const btn   = $('itbProcessBtn');
    const hint  = $('itbModelStatusHint');
    const retry = $('itbModelRetryBtn');
    if (!panel || !btn || !hint) return;

    const RB = window.RemoveBgEngine;
    if (!RB) return;
    const S = RB.ModelState;

    switch (state) {
      case S.LOADING:
        hint.textContent = t('status.remove_bg.loading_model');
        hint.style.color = 'var(--itb-text-secondary, #6b7280)';
        btn.disabled = true;
        if (retry) retry.hidden = true;
        break;
      case S.READY:
        hint.textContent = t('remove_bg.options.model_ready') || 'AI model ready';
        hint.style.color = 'var(--itb-text-secondary, #6b7280)';
        // re-enable button only if we have files
        if (typeof itbSetProcessBtn === 'function') {
          itbSetProcessBtn(true);
        } else {
          btn.disabled = false;
        }
        if (retry) retry.hidden = true;
        break;
      case S.ERROR:
        hint.textContent = (t('error.remove_bg.model_load_failed') || 'AI model load failed')
          + (err && err.message ? ': ' + err.message : '');
        hint.style.color = '#dc2626';
        btn.disabled = true;
        if (retry) retry.hidden = false;
        if (typeof gaTrackError === 'function') gaTrackError('remove-bg', 'model_load_failed', err && err.message ? err.message : 'model load failed');
        break;
      case S.IDLE:
      default:
        hint.textContent = t('remove_bg.options.model_idle') || t('status.remove_bg.loading_model');
        hint.style.color = 'var(--itb-text-secondary, #6b7280)';
        if (retry) retry.hidden = true;
        break;
    }
  }

  /* ── Manual retry handler ── */
  function retryModelLoad() {
    const RB = window.RemoveBgEngine;
    if (!RB) return;
    RB.loadModel(true).catch(() => {/* state listener handles error UI */});
  }

  /* ── Init: subscribe to engine state and start preload as soon as the
        options panel becomes visible (i.e. after first file is added). ── */
  function init() {
    const RB = window.RemoveBgEngine;
    if (!RB) {
      console.warn('[remove-bg] RemoveBgEngine not loaded');
      return;
    }

    // Observe panel visibility so model preload starts on first upload
    const panel = $('itbOptionsPanel');
    if (panel) {
      const mo = new MutationObserver(() => {
        if (!panel.hidden && RB.getState() === RB.ModelState.IDLE) {
          RB.loadModel().catch(() => {/* error UI handled via listener */});
        }
      });
      mo.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
    }

    // Listener: keep the hint + retry button in sync with model state
    RB.onStateChange(renderModelStatus);
    renderModelStatus(RB.getState(), RB.getLastError());

    // Wire the retry button (rendered in the template, hidden by default)
    const retryBtn = $('itbModelRetryBtn');
    if (retryBtn) retryBtn.addEventListener('click', retryModelLoad);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
