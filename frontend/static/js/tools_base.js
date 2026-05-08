/* ============================================================
   tools_base.js — Number Base Converter
   BigInt-based conversion supporting bases 2..36, dev formats,
   bit-width / two's complement, batch conversion.
   ============================================================ */
(function () {
  'use strict';

  // ---------- i18n strings (read from a json script tag) ----------
  var I18N = {};
  var i18nNode = document.getElementById('bcI18n');
  if (i18nNode && i18nNode.textContent) {
    try { I18N = JSON.parse(i18nNode.textContent); } catch (e) { I18N = {}; }
  }
  function t(key, fallback) {
    return (I18N && I18N[key]) || fallback || key;
  }

  // ---------- Helpers ----------
  var DIGIT_RE = /^[0-9a-zA-Z]+$/;
  var HEX_LETTER_RE = /[a-fA-F]/;

  function cleanInput(raw) {
    if (!raw) return '';
    // remove ascii spaces, NBSP, underscores
    return String(raw).replace(/[\s_ ]+/g, '');
  }

  function detectBase(rawClean) {
    if (!rawClean) return null;
    var s = rawClean;
    var negative = s[0] === '-';
    if (negative) s = s.slice(1);
    if (!s) return null;
    if (/^0b/i.test(s)) return { base: 2, body: s.slice(2), negative: negative, prefix: '0b' };
    if (/^0o/i.test(s)) return { base: 8, body: s.slice(2), negative: negative, prefix: '0o' };
    if (/^0x/i.test(s)) return { base: 16, body: s.slice(2), negative: negative, prefix: '0x' };
    // bigint suffix like 123n
    if (/^[0-9]+n$/.test(s)) return { base: 10, body: s.slice(0, -1), negative: negative, prefix: '' };
    if (HEX_LETTER_RE.test(s)) return { base: 16, body: s, negative: negative, prefix: '' };
    if (/^[01]+$/.test(s) && s.length >= 4) return { base: 10, body: s, negative: negative, prefix: '', maybeBinary: true };
    return { base: 10, body: s, negative: negative, prefix: '' };
  }

  function digitsValid(body, base) {
    if (!body) return false;
    var max = base;
    for (var i = 0; i < body.length; i++) {
      var c = body.charCodeAt(i);
      var v;
      if (c >= 48 && c <= 57) v = c - 48;            // 0-9
      else if (c >= 65 && c <= 90) v = c - 65 + 10;  // A-Z
      else if (c >= 97 && c <= 122) v = c - 97 + 10; // a-z
      else return false;
      if (v >= max) return false;
    }
    return true;
  }

  function parseToBigInt(body, base) {
    // Manual digit-by-digit parse so we work for all bases 2..36 with BigInt.
    var b = BigInt(base);
    var v = 0n;
    for (var i = 0; i < body.length; i++) {
      var c = body.charCodeAt(i);
      var d;
      if (c >= 48 && c <= 57) d = c - 48;
      else if (c >= 65 && c <= 90) d = c - 65 + 10;
      else if (c >= 97 && c <= 122) d = c - 97 + 10;
      else throw new Error('invalid_digit');
      if (d >= base) throw new Error('invalid_digit');
      v = v * b + BigInt(d);
    }
    return v;
  }

  function bigIntToBase(v, base) {
    if (v === 0n) return '0';
    var negative = v < 0n;
    var n = negative ? -v : v;
    var b = BigInt(base);
    var out = '';
    while (n > 0n) {
      var d = Number(n % b);
      n = n / b;
      out = (d < 10 ? String(d) : String.fromCharCode(65 + d - 10)) + out;
    }
    return negative ? ('-' + out) : out;
  }

  // ---------- DOM refs ----------
  var elInput      = document.getElementById('bcInput');
  var elStatus     = document.getElementById('bcStatus');
  var elBaseHint   = document.getElementById('bcBaseHint');
  var elPills      = document.querySelectorAll('.bc-base-pill');
  var elCustomBase = document.getElementById('bcCustomBase');
  var elCustomWrap = document.getElementById('bcCustomBaseWrap');
  var elCustomCard = document.getElementById('bcResCustomCard');
  var elBtnClear   = document.getElementById('bcBtnClear');
  var elBtnConvert = document.getElementById('bcBtnConvert');
  var elBtnExample = document.getElementById('bcBtnExample');
  var elBtnCopyAll = document.getElementById('bcBtnCopyAll');
  var elHexCase    = document.getElementById('bcHexCase');
  var elPrefixToggle = document.getElementById('bcPrefixToggle');

  var resultRefs = {};
  document.querySelectorAll('[data-result]').forEach(function (el) {
    resultRefs[el.dataset.result] = el;
  });

  var devRefs = {};
  document.querySelectorAll('[data-dev]').forEach(function (el) {
    devRefs[el.dataset.dev] = el;
  });

  // bit-width refs
  var bwPills = document.querySelectorAll('.bc-bitwidth-pill');
  var bwRefs = {
    bin:   document.getElementById('bcBwBin'),
    hex:   document.getElementById('bcBwHex'),
    unsigned: document.getElementById('bcBwUnsigned'),
    signed:   document.getElementById('bcBwSigned'),
    overflow: document.getElementById('bcBwOverflow'),
    bitview:  document.getElementById('bcBitView')
  };

  // batch refs
  var batchInput  = document.getElementById('bcBatchInput');
  var batchBaseSel = document.getElementById('bcBatchBase');
  var batchBtn    = document.getElementById('bcBatchBtn');
  var batchClear  = document.getElementById('bcBatchClear');
  var batchCopy   = document.getElementById('bcBatchCopy');
  var batchCsv    = document.getElementById('bcBatchCsv');
  var batchTable  = document.getElementById('bcBatchTable');

  // toast
  var toast = document.getElementById('bcToast');

  // ---------- State ----------
  var state = {
    selectedBase: 0, // 0 = auto
    customBase: 16,
    bitWidth: 32,
    hexUpper: true,
    showPrefix: true,
    currentValue: null // BigInt or null
  };

  // ---------- Toast ----------
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(showToast._tid);
    showToast._tid = setTimeout(function () { toast.classList.remove('is-visible'); }, 1500);
  }

  // ---------- Status ----------
  function setStatus(text, kind) {
    if (!elStatus) return;
    elStatus.textContent = text || '';
    elStatus.className = 'bc-status' + (kind ? ' bc-status--' + kind : '');
  }
  function setBaseHint(text) {
    if (elBaseHint) elBaseHint.textContent = text || '';
  }

  // ---------- Base selection ----------
  function activatePill(base) {
    elPills.forEach(function (p) {
      p.classList.toggle('is-active', Number(p.dataset.base) === base);
    });
    if (elCustomWrap) {
      elCustomWrap.style.display = (base === -1) ? '' : 'none';
    }
    if (elCustomCard) {
      if (base === -1) elCustomCard.removeAttribute('hidden');
      else elCustomCard.setAttribute('hidden', '');
    }
  }

  elPills.forEach(function (p) {
    p.addEventListener('click', function () {
      var b = Number(p.dataset.base);
      state.selectedBase = b;
      activatePill(b);
      runConvert();
      if (typeof gaTrackSettingChange === 'function') gaTrackSettingChange('tools-base', 'base_pill', b);
    });
  });

  if (elCustomBase) {
    elCustomBase.addEventListener('input', function () {
      var n = parseInt(this.value, 10);
      if (!isNaN(n) && n >= 2 && n <= 36) {
        state.customBase = n;
        if (state.selectedBase === -1) runConvert();
      } else {
        runConvert(); // will show error
      }
    });
  }

  // ---------- Hex case / prefix toggles ----------
  if (elHexCase) {
    elHexCase.querySelectorAll('.bc-toggle__btn').forEach(function (b) {
      b.addEventListener('click', function () {
        elHexCase.querySelectorAll('.bc-toggle__btn').forEach(function (x) { x.classList.remove('is-active'); });
        this.classList.add('is-active');
        state.hexUpper = (this.dataset.case === 'upper');
        renderResults();
      });
    });
  }
  if (elPrefixToggle) {
    elPrefixToggle.querySelectorAll('.bc-toggle__btn').forEach(function (b) {
      b.addEventListener('click', function () {
        elPrefixToggle.querySelectorAll('.bc-toggle__btn').forEach(function (x) { x.classList.remove('is-active'); });
        this.classList.add('is-active');
        state.showPrefix = (this.dataset.prefix === 'on');
        renderResults();
      });
    });
  }

  // ---------- Bit-width selection ----------
  bwPills.forEach(function (p) {
    p.addEventListener('click', function () {
      bwPills.forEach(function (x) { x.classList.remove('is-active'); });
      this.classList.add('is-active');
      state.bitWidth = Number(this.dataset.width);
      renderBitWidth();
    });
  });

  // ---------- Buttons ----------
  if (elBtnClear) elBtnClear.addEventListener('click', function () {
    elInput.value = '';
    runConvert();
    elInput.focus();
    if (typeof gaTrackToolInteraction === 'function') gaTrackToolInteraction('tools-base', 'clear');
  });

  if (elBtnConvert) elBtnConvert.addEventListener('click', function () {
    runConvert();
    if (typeof gaTrackFormSubmit === 'function') gaTrackFormSubmit('convert', 'tools-base');
  });

  if (elBtnExample) elBtnExample.addEventListener('click', function () {
    elInput.value = '255';
    state.selectedBase = 0;
    activatePill(0);
    runConvert();
    if (typeof gaTrackToolInteraction === 'function') gaTrackToolInteraction('tools-base', 'example');
  });

  if (elBtnCopyAll) elBtnCopyAll.addEventListener('click', function () {
    if (state.currentValue === null) return;
    var lines = [];
    Object.keys(resultRefs).forEach(function (k) {
      var el = resultRefs[k];
      var v = el.textContent;
      if (v && el.classList.contains('bc-result-card__value') && !el.classList.contains('bc-result-card__value--placeholder')) {
        var label = el.parentElement.parentElement.querySelector('.bc-result-card__label');
        var labelText = label ? label.textContent.trim() : k;
        lines.push(labelText + ': ' + v);
      }
    });
    if (!lines.length) return;
    navigator.clipboard.writeText(lines.join('\n')).then(function () {
      showToast(t('tools.base.toast.copied', 'Copied to clipboard'));
      if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('tools-base', 'text');
    });
  });

  // copy buttons (event delegation) — preserves inner HTML (icons) by saving/restoring innerHTML
  var CHECK_ICON = '<svg class="bc-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy-target]');
    if (!btn) return;
    var target = document.getElementById(btn.dataset.copyTarget);
    if (!target) return;
    var text = target.textContent || '';
    if (!text || target.classList.contains('bc-result-card__value--placeholder')) return;
    navigator.clipboard.writeText(text).then(function () {
      var hasIcon = btn.querySelector('svg') !== null;
      var prev = btn.innerHTML;
      btn.classList.add('copied');
      btn.innerHTML = hasIcon ? CHECK_ICON : '✓';
      showToast(t('tools.base.toast.copied', 'Copied to clipboard'));
      if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('tools-base', 'text');
      setTimeout(function () { btn.classList.remove('copied'); btn.innerHTML = prev; }, 1200);
    });
  });

  if (elInput) {
    elInput.addEventListener('input', function () { runConvert(); });
    elInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); runConvert(); }
    });
  }

  // ---------- Main convert ----------
  function runConvert() {
    var raw = elInput ? elInput.value : '';
    var clean = cleanInput(raw);
    if (!clean) {
      state.currentValue = null;
      setStatus(t('tools.base.status.empty', 'Enter a number to begin.'), '');
      setBaseHint('');
      renderResults();
      renderBitWidth();
      return;
    }

    // Determine base
    var base = state.selectedBase;
    var bodyToParse, negative = false;
    var detected = null;

    if (base === 0) { // auto
      detected = detectBase(clean);
      if (!detected) {
        state.currentValue = null;
        setStatus(t('tools.base.error.invalid', 'Unable to recognize this number.'), 'error');
        setBaseHint('');
        renderResults();
        renderBitWidth();
        return;
      }
      base = detected.base;
      bodyToParse = detected.body;
      negative = detected.negative;
      var hintTpl = t('tools.base.hint.auto', 'Auto detected: base {base}');
      var hint = hintTpl.replace('{base}', String(base));
      if (detected.maybeBinary) {
        hint += ' · ' + t('tools.base.hint.maybe_binary', 'Looks like binary — switch to base 2 to interpret as binary.');
      }
      setBaseHint(hint);
    } else {
      // explicit base. allow 0b/0o/0x prefix to be stripped if it matches.
      var s = clean;
      negative = s[0] === '-';
      if (negative) s = s.slice(1);
      if (base === 2 && /^0b/i.test(s)) s = s.slice(2);
      else if (base === 8 && /^0o/i.test(s)) s = s.slice(2);
      else if (base === 16 && /^0x/i.test(s)) s = s.slice(2);
      // strip BigInt suffix
      if (/^[0-9]+n$/.test(s)) s = s.slice(0, -1);
      bodyToParse = s;
      if (base === -1) base = state.customBase;
      setBaseHint('');
    }

    if (base < 2 || base > 36 || isNaN(base)) {
      state.currentValue = null;
      setStatus(t('tools.base.error.custom_range', 'Custom base must be between 2 and 36.'), 'error');
      renderResults();
      renderBitWidth();
      return;
    }

    if (!bodyToParse || !digitsValid(bodyToParse, base)) {
      state.currentValue = null;
      var msg;
      if (base === 2) msg = t('tools.base.error.binary_only', 'Binary input may only contain 0 and 1.');
      else if (base === 8) msg = t('tools.base.error.octal_only', 'Octal input may only contain 0–7.');
      else if (base === 16) msg = t('tools.base.error.hex_only', 'Hex input may only contain 0–9 and A–F.');
      else msg = (t('tools.base.error.base_only', 'Invalid digit for base {base}.')).replace('{base}', String(base));
      setStatus(msg, 'error');
      renderResults();
      renderBitWidth();
      return;
    }

    var v;
    try {
      v = parseToBigInt(bodyToParse, base);
    } catch (e) {
      state.currentValue = null;
      setStatus(t('tools.base.error.invalid', 'Unable to recognize this number.'), 'error');
      renderResults();
      renderBitWidth();
      return;
    }
    if (negative) v = -v;

    state.currentValue = v;

    // Status — note BigInt usage if needed
    var safeMax = BigInt(Number.MAX_SAFE_INTEGER);
    var abs = v < 0n ? -v : v;
    if (abs > safeMax) {
      setStatus(t('tools.base.status.bigint', 'Value exceeds safe integer range — handled with BigInt.'), 'warn');
    } else {
      setStatus(t('tools.base.status.ok', 'Converted successfully.'), 'ok');
    }

    renderResults();
    renderBitWidth();
  }

  function formatHex(s) {
    return state.hexUpper ? s.toUpperCase() : s.toLowerCase();
  }

  function withPrefix(prefix, body) {
    if (!state.showPrefix) return body;
    if (body[0] === '-') return '-' + prefix + body.slice(1);
    return prefix + body;
  }

  function groupBin(s) {
    // group every 4 from the right
    var negative = s[0] === '-';
    var body = negative ? s.slice(1) : s;
    var parts = [];
    for (var i = body.length; i > 0; i -= 4) {
      parts.unshift(body.slice(Math.max(0, i - 4), i));
    }
    return (negative ? '-' : '') + parts.join(' ');
  }

  function groupHex(s) {
    var negative = s[0] === '-';
    var body = negative ? s.slice(1) : s;
    var parts = [];
    for (var i = body.length; i > 0; i -= 2) {
      parts.unshift(body.slice(Math.max(0, i - 2), i));
    }
    return (negative ? '-' : '') + parts.join(' ');
  }

  function setResult(name, value) {
    var el = resultRefs[name];
    if (!el) return;
    if (value === null || value === undefined || value === '') {
      el.textContent = t('tools.base.result.placeholder', 'Enter a number to see results');
      el.classList.add('bc-result-card__value--placeholder');
    } else {
      el.textContent = value;
      el.classList.remove('bc-result-card__value--placeholder');
    }
  }

  function renderResults() {
    var v = state.currentValue;
    if (v === null) {
      Object.keys(resultRefs).forEach(function (k) { setResult(k, null); });
      Object.keys(devRefs).forEach(function (k) { devRefs[k].textContent = '—'; });
      return;
    }

    var bin = bigIntToBase(v, 2);
    var oct = bigIntToBase(v, 8);
    var dec = bigIntToBase(v, 10);
    var hex = formatHex(bigIntToBase(v, 16));

    setResult('bin', bin);
    setResult('oct', oct);
    setResult('dec', dec);
    setResult('hex', hex);
    setResult('binPrefixed', withPrefix('0b', bin));
    setResult('hexPrefixed', withPrefix('0x', hex));
    setResult('binGrouped', groupBin(bin));
    setResult('hexGrouped', groupHex(hex));

    // custom-base result if user picked custom or selected base != standard
    var customResEl = resultRefs.custom;
    if (customResEl) {
      var b = state.selectedBase === -1 ? state.customBase : state.selectedBase;
      if (state.selectedBase === -1 && b >= 2 && b <= 36) {
        var s = bigIntToBase(v, b);
        if (b === 16) s = formatHex(s);
        setResult('custom', 'base-' + b + ': ' + s);
      } else {
        setResult('custom', null);
      }
    }

    // Developer formats
    devRefs.binLit && (devRefs.binLit.textContent = withPrefix('0b', bin));
    devRefs.octLit && (devRefs.octLit.textContent = withPrefix('0o', oct));
    devRefs.decLit && (devRefs.decLit.textContent = dec);
    devRefs.hexLit && (devRefs.hexLit.textContent = withPrefix('0x', hex));
    if (devRefs.cHex) {
      var hexNeg = hex[0] === '-';
      var hexAbs = hexNeg ? hex.slice(1) : hex;
      hexAbs = hexAbs.padStart(2, '0');
      if (hexAbs.length % 2 !== 0) hexAbs = '0' + hexAbs;
      devRefs.cHex.textContent = (hexNeg ? '-0x' : '0x') + hexAbs;
    }
    devRefs.bigint && (devRefs.bigint.textContent = dec + 'n');
    if (devRefs.color) {
      if (v < 0n || v > 255n) {
        devRefs.color.textContent = t('tools.base.devformat.rgb_oor', 'out of 0-255 range');
      } else {
        var n = Number(v);
        devRefs.color.textContent = 'rgb(' + n + ',' + n + ',' + n + ')';
      }
    }
    devRefs.json && (devRefs.json.textContent = dec);
  }

  // ---------- Bit width / two's complement ----------
  function renderBitWidth() {
    var v = state.currentValue;
    var w = state.bitWidth;
    if (v === null) {
      ['bin','hex','unsigned','signed','overflow'].forEach(function (k) {
        if (bwRefs[k]) bwRefs[k].textContent = '—';
      });
      if (bwRefs.bitview) bwRefs.bitview.innerHTML = '';
      return;
    }

    var mask = (1n << BigInt(w)) - 1n;
    var abs = v < 0n ? -v : v;
    var overflow = abs > mask;

    // Two's complement representation: bits = v & mask  (this gives the canonical bit pattern
    // if v fits in unsigned[0, 2^w-1], or the two's complement if v is negative and fits in signed)
    var bits;
    var unsignedVal;
    var signedVal;

    var halfMask = (1n << BigInt(w - 1));

    if (overflow && v >= 0n) {
      // positive value too large for w bits — show truncated bits but mark overflow
      bits = v & mask;
    } else if (overflow && v < 0n) {
      bits = ((-v) & mask);
      bits = (mask - bits + 1n) & mask;
    } else if (v < 0n) {
      // compute two's complement of |v|
      bits = ((mask + v + 1n)) & mask;
    } else {
      bits = v & mask;
    }

    unsignedVal = bits;
    if (bits >= halfMask) {
      signedVal = bits - (1n << BigInt(w));
    } else {
      signedVal = bits;
    }

    var binStr = bits.toString(2).padStart(w, '0');
    var hexStr = bits.toString(16).padStart(Math.ceil(w / 4), '0');
    if (state.hexUpper) hexStr = hexStr.toUpperCase();

    if (bwRefs.bin) bwRefs.bin.textContent = groupBin(binStr);
    if (bwRefs.hex) bwRefs.hex.textContent = '0x' + hexStr;
    if (bwRefs.unsigned) bwRefs.unsigned.textContent = unsignedVal.toString(10);
    if (bwRefs.signed)   bwRefs.signed.textContent   = signedVal.toString(10);
    if (bwRefs.overflow) {
      bwRefs.overflow.textContent = overflow
        ? t('tools.base.bitwidth.overflow_yes', 'Yes (truncated)')
        : t('tools.base.bitwidth.overflow_no', 'No');
      var stat = bwRefs.overflow.parentElement;
      if (stat) stat.classList.toggle('bc-bitwidth-stat--warn', overflow);
    }

    // bit view
    if (bwRefs.bitview) {
      var groups = [];
      for (var i = 0; i < binStr.length; i += 8) groups.push(binStr.slice(i, i + 8));
      var html = '<div class="bc-bitview__row">' + groups.map(function (g) {
        return '<div class="bc-bitview__group">' +
          g.split('').map(function (b) {
            return '<span class="bc-bitview__bit' + (b === '1' ? ' is-set' : '') + '">' + b + '</span>';
          }).join('') +
          '</div>';
      }).join('') + '</div>' +
      '<div class="bc-bitview__caption">bit ' + (w - 1) + ' ← bit 0</div>';
      bwRefs.bitview.innerHTML = html;
    }
  }

  // ---------- Examples ----------
  document.querySelectorAll('[data-example]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      elInput.value = btn.dataset.example;
      var b = btn.dataset.exampleBase;
      if (b !== undefined) {
        var bn = Number(b);
        state.selectedBase = bn;
        activatePill(bn);
      } else {
        state.selectedBase = 0;
        activatePill(0);
      }
      runConvert();
      var ws = document.getElementById('bcWorkspace');
      if (ws && ws.scrollIntoView) ws.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // ---------- Batch ----------
  function batchDetectAndConvert(line, baseSelection) {
    var clean = cleanInput(line);
    if (!clean) return null;
    var base, body, negative = false, recognized;
    if (baseSelection === 0) {
      var d = detectBase(clean);
      if (!d) throw new Error('invalid');
      base = d.base; body = d.body; negative = d.negative; recognized = base;
    } else {
      var s = clean;
      negative = s[0] === '-';
      if (negative) s = s.slice(1);
      if (baseSelection === 2 && /^0b/i.test(s)) s = s.slice(2);
      else if (baseSelection === 8 && /^0o/i.test(s)) s = s.slice(2);
      else if (baseSelection === 16 && /^0x/i.test(s)) s = s.slice(2);
      if (/^[0-9]+n$/.test(s)) s = s.slice(0, -1);
      base = baseSelection; body = s; recognized = base;
    }
    if (base < 2 || base > 36) throw new Error('invalid');
    if (!digitsValid(body, base)) throw new Error('invalid');
    var v = parseToBigInt(body, base);
    if (negative) v = -v;
    return { value: v, recognized: recognized };
  }

  function renderBatchResults(rows) {
    if (!batchTable) return;
    var headers = [
      t('tools.base.batch.col_input',   'Input'),
      t('tools.base.batch.col_base',    'Base'),
      t('tools.base.batch.col_bin',     'Binary'),
      t('tools.base.batch.col_oct',     'Octal'),
      t('tools.base.batch.col_dec',     'Decimal'),
      t('tools.base.batch.col_hex',     'Hex'),
      t('tools.base.batch.col_status',  'Status')
    ];
    var html = '<table class="bc-batch-table"><thead><tr>' +
      headers.map(function (h) { return '<th>' + h + '</th>'; }).join('') +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      if (r.error) {
        html += '<tr class="bc-batch-row--error">' +
          '<td>' + escapeHtml(r.input) + '</td>' +
          '<td>—</td><td>—</td><td>—</td><td>—</td><td>—</td>' +
          '<td><span class="bc-batch-status bc-batch-status--err">' +
            t('tools.base.batch.status_err', 'Error') + '</span></td>' +
          '</tr>';
      } else {
        var hex = formatHex(bigIntToBase(r.value, 16));
        html += '<tr>' +
          '<td>' + escapeHtml(r.input) + '</td>' +
          '<td>base-' + r.recognized + '</td>' +
          '<td>' + bigIntToBase(r.value, 2) + '</td>' +
          '<td>' + bigIntToBase(r.value, 8) + '</td>' +
          '<td>' + r.value.toString(10) + '</td>' +
          '<td>' + hex + '</td>' +
          '<td><span class="bc-batch-status bc-batch-status--ok">' +
            t('tools.base.batch.status_ok', 'OK') + '</span></td>' +
          '</tr>';
      }
    });
    html += '</tbody></table>';
    batchTable.innerHTML = '<div class="bc-batch-table-wrap">' + html + '</div>';
    batchTable._rows = rows;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  if (batchBtn) batchBtn.addEventListener('click', function () {
    if (typeof gaTrackFormSubmit === 'function') gaTrackFormSubmit('batch_convert', 'tools-base');
    var lines = (batchInput.value || '').split(/\r?\n/);
    var baseSel = parseInt(batchBaseSel.value, 10);
    if (isNaN(baseSel)) baseSel = 0;
    var rows = [];
    var maxRows = 200;
    for (var i = 0; i < lines.length && rows.length < maxRows; i++) {
      var line = lines[i];
      if (!line.trim()) continue;
      try {
        var r = batchDetectAndConvert(line, baseSel);
        if (r) rows.push({ input: line, value: r.value, recognized: r.recognized });
      } catch (e) {
        rows.push({ input: line, error: true });
      }
    }
    renderBatchResults(rows);
    if (lines.length > maxRows) {
      showToast((t('tools.base.batch.truncated', 'Showing first {n} rows')).replace('{n}', String(maxRows)));
    }
  });

  if (batchClear) batchClear.addEventListener('click', function () {
    batchInput.value = '';
    if (batchTable) batchTable.innerHTML = '';
  });

  if (batchCopy) batchCopy.addEventListener('click', function () {
    var rows = batchTable && batchTable._rows;
    if (!rows || !rows.length) return;
    var lines = ['Input\tBase\tBinary\tOctal\tDecimal\tHex\tStatus'];
    rows.forEach(function (r) {
      if (r.error) {
        lines.push(r.input + '\t-\t-\t-\t-\t-\tERROR');
      } else {
        var hex = formatHex(bigIntToBase(r.value, 16));
        lines.push([
          r.input,
          'base-' + r.recognized,
          bigIntToBase(r.value, 2),
          bigIntToBase(r.value, 8),
          r.value.toString(10),
          hex,
          'OK'
        ].join('\t'));
      }
    });
    navigator.clipboard.writeText(lines.join('\n')).then(function () {
      showToast(t('tools.base.toast.copied', 'Copied to clipboard'));
      if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('tools-base', 'text');
    });
  });

  if (batchCsv) batchCsv.addEventListener('click', function () {
    if (typeof gaTrackExport === 'function') gaTrackExport('tools-base', 'csv');
    var rows = batchTable && batchTable._rows;
    if (!rows || !rows.length) return;
    var csv = 'Input,Base,Binary,Octal,Decimal,Hex,Status\n';
    rows.forEach(function (r) {
      var cells;
      if (r.error) {
        cells = [r.input, '-', '-', '-', '-', '-', 'ERROR'];
      } else {
        cells = [r.input, 'base-' + r.recognized, bigIntToBase(r.value, 2), bigIntToBase(r.value, 8), r.value.toString(10), formatHex(bigIntToBase(r.value, 16)), 'OK'];
      }
      csv += cells.map(function (c) {
        var s = String(c);
        if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
        return s;
      }).join(',') + '\n';
    });
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'base-conversion.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 500);
  });

  // ---------- Init ----------
  activatePill(state.selectedBase);
  if (elInput && !elInput.value) {
    elInput.value = '255';
  }
  runConvert();
})();
