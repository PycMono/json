/**
 * remove-bg-engine.js
 * AI Background Removal — Canvas/AI processing engine
 *
 * - Lazy-loads @imgly/background-removal@1.4.5 from CDN (with fallback)
 * - Uses a deferred Promise pattern (no setInterval polling)
 * - Exposes window._itbProcessRemoveBg(entry) for img-toolbox-engine.js to call
 *
 * Tool-specific constants:
 *   MAX_FILE_SIZE = 10 * 1024 * 1024  (10MB per image — matches UI hint)
 *   MAX_FILES     = 10                (batch limit — matches UI hint)
 *   SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
 */
(function () {
  'use strict';

  /* ── Tool constants (must align with UI hints in remove_bg.html / i18n) ── */
  const MAX_FILE_SIZE   = 10 * 1024 * 1024;
  const MAX_FILES       = 10;
  const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const CDNS = [
    'https://unpkg.com/@imgly/background-removal@1.4.5/dist/browser/index.js',
    'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/browser/index.js',
  ];

  /* ── Internal model state ── */
  const ModelState = {
    READY:   'ready',
    LOADING: 'loading',
    IDLE:    'idle',
    ERROR:   'error',
  };

  let _state    = ModelState.IDLE;
  let _module   = null;
  let _cfg      = null;
  let _loadPromise = null;   // deferred Promise — single-flight loader
  let _lastError   = null;
  const _listeners = new Set();

  function _notify() {
    for (const fn of _listeners) {
      try { fn(_state, _lastError); } catch (e) { /* ignore listener error */ }
    }
  }

  function _publicPath(cdn) { return cdn.replace(/index\.js$/, ''); }

  /**
   * loadModel — single-flight model loader.
   * Returns a Promise that resolves when the model is ready, or rejects with
   * the last CDN error. Multiple callers share the same in-flight promise.
   */
  function loadModel(force) {
    if (_state === ModelState.READY && !force) return Promise.resolve();
    if (_loadPromise && !force) return _loadPromise;

    _state = ModelState.LOADING;
    _lastError = null;
    _notify();

    _loadPromise = (async () => {
      let lastErr = null;
      for (const cdn of CDNS) {
        try {
          const cfg = { publicPath: _publicPath(cdn) };
          // Dynamic import — module is cached by browser after first success
          const mod = await import(cdn);
          await mod.preload(cfg);
          _module = mod;
          _cfg    = cfg;
          _state  = ModelState.READY;
          _lastError = null;
          _notify();
          if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('remove-bg', 1, 0);
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      _state = ModelState.ERROR;
      _lastError = lastErr;
      _notify();
      if (typeof gaTrackError === 'function') gaTrackError('remove-bg', 'model_load_fail', lastErr ? lastErr.message : '');
      throw new Error(_i18n('error.remove_bg.model_load_failed') + (lastErr ? ': ' + lastErr.message : ''));
    })();

    // Reset the deferred promise after settle so retry works cleanly
    _loadPromise.catch(() => {}).finally(() => {
      if (_state !== ModelState.LOADING) _loadPromise = null;
    });

    return _loadPromise;
  }

  /**
   * processOne — remove background from a single FileEntry.
   * Throws on failure; caller handles per-file error UI.
   */
  async function processOne(entry) {
    if (_state !== ModelState.READY) {
      await loadModel();
    }
    const t0 = performance.now();
    const blob = await _module.removeBackground(entry.file, _cfg);
    if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('remove-bg', 1, performance.now() - t0);
    return blob;
  }

  function getState()      { return _state; }
  function getLastError()  { return _lastError; }
  function onStateChange(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  }

  function _i18n(key) {
    if (window.ITB_I18N && window.ITB_I18N[key]) return window.ITB_I18N[key];
    return key;
  }

  /* ── Public API ── */
  window.RemoveBgEngine = {
    MAX_FILE_SIZE,
    MAX_FILES,
    SUPPORTED_TYPES,
    ModelState,
    loadModel,
    processOne,
    getState,
    getLastError,
    onStateChange,
  };

  /**
   * Bridge for img-toolbox-engine.js dispatcher.
   * The shared engine calls window._itbProcessRemoveBg(entry, opts) inside its
   * `case 'remove-bg'` branch — keeps AI/CDN code out of the shared engine file.
   */
  window._itbProcessRemoveBg = function (entry /*, opts */) {
    return processOne(entry);
  };
})();
