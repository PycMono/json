// /static/js/media-qr-design.js
// Handles: Design customization panel (colors, gradients, dot shapes, corners, logo, margin, EC level)

'use strict';

/* ══ i18n helper ═════════════════════════════ */
function _qd(key, fallback) {
  return (window.QR_I18N && window.QR_I18N[key]) || fallback;
}

function getDotStyles() {
  return [
    { value: 'square',         label: _qd('dDotSquare','方形') },
    { value: 'rounded',        label: _qd('dDotRounded','圆角') },
    { value: 'dots',           label: _qd('dDotDots','圆点') },
    { value: 'classy',         label: _qd('dDotClassy','优雅') },
    { value: 'classy-rounded', label: _qd('dDotClassyRounded','优雅圆') },
    { value: 'extra-rounded',  label: _qd('dDotExtraRounded','超圆') },
  ];
}

function getCornerSquareStyles() {
  return [
    { value: 'square',        label: _qd('dCornerSquare','方形') },
    { value: 'extra-rounded', label: _qd('dCornerRounded','圆角') },
    { value: 'dot',           label: _qd('dCornerCircle','圆形') },
  ];
}

function getCornerDotStyles() {
  return [
    { value: 'square', label: _qd('dCornerSquare','方形') },
    { value: 'dot',    label: _qd('dCornerDot','圆点') },
  ];
}

const EC_LEVELS = [
  { value: 'L', pct: '7%' },
  { value: 'M', pct: '15%' },
  { value: 'Q', pct: '25%' },
  { value: 'H', pct: '30%' },
];

const GRADIENT_PRESETS = [
  { c1: '#4f46e5', c2: '#06b6d4' },
  { c1: '#f59e0b', c2: '#ef4444' },
  { c1: '#10b981', c2: '#3b82f6' },
  { c1: '#8b5cf6', c2: '#ec4899' },
  { c1: '#f97316', c2: '#facc15' },
  { c1: '#0f172a', c2: '#475569' },
];

/* ══ Init Design Panel ═══════════════════════ */
function initDesignPanel() {
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('qr-design-panel');
  const body = document.getElementById('designPanelBody');
  if (!body) return;

  const DOT_STYLES = getDotStyles();
  const CORNER_SQUARE_STYLES = getCornerSquareStyles();
  const CORNER_DOT_STYLES = getCornerDotStyles();

  body.innerHTML = `
    <!-- Colors -->
    <div class="qr-design-section">
      <h4 class="qr-design-section-title">${_qd('dColorsTitle','颜色')}</h4>
      <div class="qr-gradient-toggle">
        <label class="qr-radio-pill">
          <input type="radio" name="colorMode" value="solid" checked onchange="onColorModeChange('solid')">
          <span>${_qd('dColorSolid','纯色')}</span>
        </label>
        <label class="qr-radio-pill">
          <input type="radio" name="colorMode" value="linear" onchange="onColorModeChange('linear')">
          <span>${_qd('dColorLinear','线性渐变')}</span>
        </label>
        <label class="qr-radio-pill">
          <input type="radio" name="colorMode" value="radial" onchange="onColorModeChange('radial')">
          <span>${_qd('dColorRadial','径向渐变')}</span>
        </label>
      </div>

      <div id="solidColorRow" class="qr-color-row">
        <div class="qr-color-item">
          <label class="qr-color-label">${_qd('dColorFg','前景色')}</label>
          <div class="qr-color-pick">
            <input type="color" id="fgColorPicker" value="#000000"
                   oninput="onFgColorChange(this.value)">
            <input type="text"  id="fgColorHex"    value="#000000" maxlength="7"
                   class="qr-hex-input" oninput="onFgHexInput(this.value)">
          </div>
        </div>
        <div class="qr-color-item">
          <label class="qr-color-label">${_qd('dColorBg','背景色')}</label>
          <div class="qr-color-pick">
            <input type="color" id="bgColorPicker" value="#ffffff"
                   oninput="onBgColorChange(this.value)">
            <input type="text"  id="bgColorHex"    value="#ffffff" maxlength="7"
                   class="qr-hex-input" oninput="onBgHexInput(this.value)">
          </div>
          <label class="qr-form-checkbox" style="margin-top:6px">
            <input type="checkbox" id="bgTransparent" onchange="onBgTransparentChange(this.checked)">
            <span style="font-size:0.75rem">${_qd('dColorBgTransparent','透明背景（PNG/SVG）')}</span>
          </label>
        </div>
      </div>

      <div id="gradientColorRow" class="qr-color-row" style="display:none">
        <div class="qr-color-item">
          <label class="qr-color-label">${_qd('dColorGrad1','渐变色 1')}</label>
          <div class="qr-color-pick">
            <input type="color" id="gradColor1" value="#4f46e5" oninput="onGradientChange()">
            <input type="text"  id="gradHex1"   value="#4f46e5" maxlength="7"
                   class="qr-hex-input" oninput="onGradHexInput(1, this.value)">
          </div>
        </div>
        <div class="qr-color-item">
          <label class="qr-color-label">${_qd('dColorGrad2','渐变色 2')}</label>
          <div class="qr-color-pick">
            <input type="color" id="gradColor2" value="#06b6d4" oninput="onGradientChange()">
            <input type="text"  id="gradHex2"   value="#06b6d4" maxlength="7"
                   class="qr-hex-input" oninput="onGradHexInput(2, this.value)">
          </div>
        </div>
        <div class="qr-gradient-presets">
          <span class="qr-design-sublabel">${_qd('dColorPresets','预设')}</span>
          <div class="qr-gradient-preset-list">
            ${GRADIENT_PRESETS.map((p, i) => `
              <button class="qr-gradient-preset"
                      style="background:linear-gradient(135deg,${p.c1},${p.c2})"
                      onclick="applyGradientPreset(${i})" title="${p.c1}→${p.c2}"></button>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Dot Style -->
    <div class="qr-design-section">
      <h4 class="qr-design-section-title">${_qd('dDotShapeTitle','点形状')}</h4>
      <div class="qr-dot-grid" id="dotStyleGrid">
        ${DOT_STYLES.map(s => `
          <button class="qr-dot-btn ${s.value === 'rounded' ? 'active' : ''}"
                  data-value="${s.value}"
                  onclick="onDotStyleChange('${s.value}', this)"
                  title="${s.label}">
            <canvas class="qr-dot-preview" width="48" height="48" data-style="${s.value}"></canvas>
            <span>${s.label}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <!-- Corner Shapes -->
    <div class="qr-design-section">
      <h4 class="qr-design-section-title">${_qd('dCornersTitle','角落形状')}</h4>
      <div class="qr-corner-row">
        <div class="qr-corner-group">
          <label class="qr-design-sublabel">${_qd('dCornerOuter','外框')}</label>
          <div class="qr-corner-options">
            ${CORNER_SQUARE_STYLES.map(s => `
              <button class="qr-corner-btn ${s.value === 'extra-rounded' ? 'active' : ''}"
                      data-corner="square" data-value="${s.value}"
                      onclick="onCornerSquareChange('${s.value}', this)"
                      title="${s.label}">
                <span class="qr-corner-preview qr-corner-preview--sq-${s.value}"></span>
                <span>${s.label}</span>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="qr-corner-group">
          <label class="qr-design-sublabel">${_qd('dCornerInner','内点')}</label>
          <div class="qr-corner-options">
            ${CORNER_DOT_STYLES.map(s => `
              <button class="qr-corner-btn ${s.value === 'dot' ? 'active' : ''}"
                      data-corner="dot" data-value="${s.value}"
                      onclick="onCornerDotChange('${s.value}', this)"
                      title="${s.label}">
                <span class="qr-corner-preview qr-corner-preview--dot-${s.value}"></span>
                <span>${s.label}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Logo -->
    <div class="qr-design-section">
      <h4 class="qr-design-section-title">${_qd('dLogoTitle','Logo')}</h4>
      <div class="qr-logo-upload-area" id="logoUploadArea" onclick="triggerLogoUpload()">
        <div id="logoEmpty">
          <span class="qr-logo-upload-icon">🖼️</span>
          <p>${_qd('dLogoUploadHint','点击上传 Logo（JPG/PNG/SVG，≤ 2MB）')}</p>
        </div>
        <div id="logoPreview" style="display:none">
          <img id="logoPreviewImg" alt="Logo" style="max-width:80px;max-height:80px;border-radius:8px;">
          <button class="qr-logo-remove" onclick="removeLogo(event)" title="${_qd('dLogoRemoveTitle','移除 Logo')}">✕</button>
        </div>
        <input type="file" id="logoFileInput" accept="image/jpeg,image/png,image/svg+xml,image/webp"
               style="display:none" onchange="onLogoFileSelect(this)">
      </div>
      <div id="logoSizeRow" style="display:none;margin-top:12px">
        <div class="qr-slider-row">
          <label class="qr-design-sublabel">${_qd('dLogoSizeLabel','Logo 大小')}</label>
          <span class="qr-slider-value" id="logoSizeValue">30%</span>
        </div>
        <input type="range" id="logoSizeSlider" min="10" max="40" value="30" step="5"
               class="qr-slider" oninput="onLogoSizeChange(this.value)">
        <p style="font-size:0.7rem;color:#a8a49e;margin-top:4px">
          ⚠️ ${_qd('dLogoSizeWarn','Logo 较大时请提高纠错级别至 Q 或 H')}
        </p>
      </div>
    </div>

    <!-- Advanced -->
    <div class="qr-design-section">
      <h4 class="qr-design-section-title">${_qd('dAdvancedTitle','高级')}</h4>
      <div class="qr-slider-row">
        <label class="qr-design-sublabel">${_qd('dMarginLabel','边距')}</label>
        <span class="qr-slider-value" id="marginValue">16px</span>
      </div>
      <input type="range" id="marginSlider" min="0" max="50" value="16" step="2"
             class="qr-slider" oninput="onMarginChange(this.value)">

      <div style="margin-top:16px">
        <label class="qr-design-sublabel" style="display:block;margin-bottom:8px">${_qd('dEcLabel','纠错级别')}</label>
        <div class="qr-ec-options">
          ${EC_LEVELS.map(l => `
            <label class="qr-ec-option ${l.value === 'M' ? 'active' : ''}">
              <input type="radio" name="ecLevel" value="${l.value}"
                     ${l.value === 'M' ? 'checked' : ''}
                     onchange="onEcLevelChange('${l.value}', this.closest('.qr-ec-option'))">
              <strong>${l.value}</strong>
              <span>${l.pct}</span>
            </label>
          `).join('')}
        </div>
        <p class="qr-form-hint" style="margin-top:6px">
          ${_qd('dEcHint','级别越高容错越强，二维码越复杂。含 Logo 时建议 Q 或 H。')}
        </p>
      </div>
    </div>
  `;

  renderDotPreviews();
}

/* ══ Color Events ════════════════════════════ */
function onColorModeChange(mode) {
  if (typeof gaTrackSettingChange === 'function') gaTrackSettingChange('qr-design', 'color_mode', mode);
  const solidRow    = document.getElementById('solidColorRow');
  const gradientRow = document.getElementById('gradientColorRow');

  if (mode === 'solid') {
    solidRow.style.display    = 'flex';
    gradientRow.style.display = 'none';
    QRState.design.gradient   = null;
  } else {
    solidRow.style.display    = 'none';
    gradientRow.style.display = 'flex';
    onGradientChange();
  }
  updatePreview();
}

function onFgColorChange(val) {
  QRState.design.fgColor = val;
  const hex = document.getElementById('fgColorHex');
  if (hex) hex.value = val;
  updatePreview();
}

function onFgHexInput(val) {
  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
    QRState.design.fgColor = val;
    const picker = document.getElementById('fgColorPicker');
    if (picker) picker.value = val;
    updatePreview();
  }
}

function onBgColorChange(val) {
  QRState.design.bgColor = val;
  const hex = document.getElementById('bgColorHex');
  if (hex) hex.value = val;
  updatePreview();
}

function onBgHexInput(val) {
  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
    QRState.design.bgColor = val;
    const picker = document.getElementById('bgColorPicker');
    if (picker) picker.value = val;
    updatePreview();
  }
}

function onBgTransparentChange(checked) {
  QRState.design.bgTransparent = checked;
  const bgPicker = document.getElementById('bgColorPicker');
  const bgHex    = document.getElementById('bgColorHex');
  if (bgPicker) bgPicker.disabled = checked;
  if (bgHex)    bgHex.disabled    = checked;
  updatePreview();
}

function onGradientChange() {
  const c1   = document.getElementById('gradColor1')?.value || '#4f46e5';
  const c2   = document.getElementById('gradColor2')?.value || '#06b6d4';
  const mode = document.querySelector('input[name="colorMode"]:checked')?.value || 'linear';

  QRState.design.gradient = {
    type: mode === 'radial' ? 'radial' : 'linear',
    color1: c1,
    color2: c2,
  };
  updatePreview();
}

function onGradHexInput(idx, val) {
  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
    const picker = document.getElementById(`gradColor${idx}`);
    if (picker) picker.value = val;
    onGradientChange();
  }
}

function applyGradientPreset(idx) {
  const preset = GRADIENT_PRESETS[idx];
  if (!preset) return;
  const c1 = document.getElementById('gradColor1');
  const c2 = document.getElementById('gradColor2');
  const h1 = document.getElementById('gradHex1');
  const h2 = document.getElementById('gradHex2');
  if (c1) c1.value = preset.c1;
  if (c2) c2.value = preset.c2;
  if (h1) h1.value = preset.c1;
  if (h2) h2.value = preset.c2;
  onGradientChange();
}

/* ══ Shape Events ════════════════════════════ */
function onDotStyleChange(val, btn) {
  QRState.design.dotStyle = val;
  document.querySelectorAll('.qr-dot-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updatePreview();
}

function onCornerSquareChange(val, btn) {
  QRState.design.cornerSquare = val;
  document.querySelectorAll('[data-corner="square"]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updatePreview();
}

function onCornerDotChange(val, btn) {
  QRState.design.cornerDot = val;
  document.querySelectorAll('[data-corner="dot"]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updatePreview();
}

/* ══ Logo Events ═════════════════════════════ */
function triggerLogoUpload() {
  if (typeof gaTrackToolInteraction === 'function') gaTrackToolInteraction('qr-design', 'file_upload_start');
  document.getElementById('logoFileInput')?.click();
}

function onLogoFileSelect(input) {
  const file = input.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showToast(_qd('dLogoTooLarge','Logo 图片不能超过 2MB'), 'error'); return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    QRState.design.logoUrl = dataUrl;

    const previewImg = document.getElementById('logoPreviewImg');
    const emptyDiv   = document.getElementById('logoEmpty');
    const prevDiv    = document.getElementById('logoPreview');
    const sizeRow    = document.getElementById('logoSizeRow');

    if (previewImg) previewImg.src = dataUrl;
    if (emptyDiv)   emptyDiv.style.display = 'none';
    if (prevDiv)    prevDiv.style.display  = 'flex';
    if (sizeRow)    sizeRow.style.display  = 'block';

    if (['L', 'M'].includes(QRState.design.ecLevel)) {
      setEcLevel('Q');
      showToast(_qd('dLogoEcAutoUpgraded','已自动提升纠错级别至 Q（适合含 Logo 的二维码）'), 'info');
    }

    updatePreview();
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function removeLogo(e) {
  e.stopPropagation();
  QRState.design.logoUrl = null;

  const emptyDiv = document.getElementById('logoEmpty');
  const prevDiv  = document.getElementById('logoPreview');
  const sizeRow  = document.getElementById('logoSizeRow');

  if (emptyDiv) emptyDiv.style.display = 'block';
  if (prevDiv)  prevDiv.style.display  = 'none';
  if (sizeRow)  sizeRow.style.display  = 'none';

  updatePreview();
}

function onLogoSizeChange(val) {
  QRState.design.logoSize = parseInt(val) / 100;
  const valueEl = document.getElementById('logoSizeValue');
  if (valueEl) valueEl.textContent = `${val}%`;
  updatePreview();
}

/* ══ Advanced Events ═════════════════════════ */
function onMarginChange(val) {
  QRState.design.margin = parseInt(val);
  const valueEl = document.getElementById('marginValue');
  if (valueEl) valueEl.textContent = `${val}px`;
  updatePreview();
}

function onEcLevelChange(val, labelEl) {
  QRState.design.ecLevel = val;
  document.querySelectorAll('.qr-ec-option').forEach(l => l.classList.remove('active'));
  if (labelEl) labelEl.classList.add('active');
  updatePreview();
}

function setEcLevel(val) {
  QRState.design.ecLevel = val;
  document.querySelectorAll('input[name="ecLevel"]').forEach(r => {
    r.checked = r.value === val;
    r.closest('.qr-ec-option')?.classList.toggle('active', r.value === val);
  });
}

/* ══ Dot Preview Canvas ══════════════════════ */
function renderDotPreviews() {
  document.querySelectorAll('.qr-dot-preview').forEach(canvas => {
    const style = canvas.dataset.style;
    const ctx   = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a1a1a';

    const dotSize = 10;
    const gap     = 5;
    const startX  = (w - 3 * dotSize - 2 * gap) / 2;
    const startY  = (h - 3 * dotSize - 2 * gap) / 2;

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const x = startX + c * (dotSize + gap);
        const y = startY + r * (dotSize + gap);
        drawDot(ctx, x, y, dotSize, style);
      }
    }
  });
}

function drawDot(ctx, x, y, size, style) {
  ctx.beginPath();
  const r = size / 2;
  const cx = x + r, cy = y + r;

  switch (style) {
    case 'square':
      ctx.rect(x, y, size, size);
      break;
    case 'rounded':
      if (ctx.roundRect) {
        ctx.roundRect(x, y, size, size, r * 0.4);
      } else {
        ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
      }
      break;
    case 'dots':
    case 'dot':
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      break;
    case 'classy':
    case 'classy-rounded':
      if (ctx.roundRect) {
        ctx.roundRect(x, y, size, size, r * 0.5);
      } else {
        ctx.rect(x, y, size, size);
      }
      break;
    case 'extra-rounded':
      ctx.arc(cx, cy, r * 0.95, 0, Math.PI * 2);
      break;
    default:
      ctx.rect(x, y, size, size);
  }
  ctx.fill();
}

