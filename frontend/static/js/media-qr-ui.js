// /static/js/media-qr-ui.js
// Handles: type switching, panel toggling, FAQ accordion, toast, sticky preview scroll follow

'use strict';

let currentType = window.QR_TYPE || 'url';

/* ── Type Switching ──────────────────────────── */
function switchType(type) {
  if (typeof gaTrackTabSwitch === 'function') gaTrackTabSwitch(type, 'qr-type', 'qr-generator');
  currentType = type;
  document.querySelectorAll('.qr-type-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  renderForm(type);
  history.replaceState(null, '', `?type=${type}`);
}

/* ── Panel Toggle ────────────────────────────── */
function togglePanel(panelId) {
  if (typeof gaTrackModalOpen === 'function') gaTrackModalOpen(panelId, 'qr-generator');
  const panel = document.getElementById(panelId);
  if (panel) panel.classList.toggle('qr-panel--open');
}

/* ── FAQ Accordion ───────────────────────────── */
function toggleFAQ(id) {
  if (typeof gaTrackToolInteraction === 'function') gaTrackToolInteraction('qr-generator', 'faq_toggle');
  const item   = document.getElementById(id);
  const isOpen = item.classList.contains('qr-faq-item--open');
  document.querySelectorAll('.qr-faq-item--open')
    .forEach(i => i.classList.remove('qr-faq-item--open'));
  if (!isOpen) item.classList.add('qr-faq-item--open');
}

/* ── Toast ───────────────────────────────────── */
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className   = `qr-toast qr-toast--${type}`;
  el.textContent = msg;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('qr-toast--show'));
  setTimeout(() => {
    el.classList.remove('qr-toast--show');
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

/* ── Preview Scroll Follow ───────────────────── */
// 让右侧预览卡片随滚轮联动：在左侧面板范围内 fixed 跟随视口，超出底部则贴底
function initPreviewScroll() {
  const previewCard = document.getElementById('previewCard');
  const leftCol     = document.querySelector('.qr-layout__left');
  const rightCol    = document.querySelector('.qr-layout__right');
  if (!previewCard || !leftCol || !rightCol) return;

  const GAP = 12; // px between navbar bottom and card top

  function getNavbarHeight() {
    const nav = document.querySelector('.navbar');
    return nav ? nav.getBoundingClientRect().height : 64;
  }

  function update() {
    // 移动端不做 JS sticky，交给 CSS static
    if (window.innerWidth <= 900) {
      previewCard.style.position = '';
      previewCard.style.top      = '';
      previewCard.style.width    = '';
      previewCard.style.left     = '';
      return;
    }

    const navH      = getNavbarHeight();
    const topOffset = navH + GAP;
    const scrollY   = window.scrollY;
    const previewH  = previewCard.offsetHeight;

    // 左侧面板在页面上的绝对顶部位置
    const leftTop    = leftCol.getBoundingClientRect().top + scrollY;
    // 左侧面板绝对底部位置
    const leftBottom = leftTop + leftCol.offsetHeight;

    // 预览卡片固定时，滚动到多少时底部会超出左侧面板
    const maxScroll  = leftBottom - previewH - topOffset;

    // 开始 sticky 的时机：预览卡片顶部到达导航栏底部
    const stickyStart = leftTop - topOffset;

    if (scrollY <= stickyStart) {
      // 未触发：自然位置
      previewCard.style.position = '';
      previewCard.style.top      = '';
      previewCard.style.width    = '';
      previewCard.style.left     = '';
    } else if (scrollY <= maxScroll) {
      // 跟随视口：fixed 定位
      const rightRect = rightCol.getBoundingClientRect();
      previewCard.style.position = 'fixed';
      previewCard.style.top      = topOffset + 'px';
      previewCard.style.left     = rightRect.left + 'px';
      previewCard.style.width    = rightCol.offsetWidth + 'px';
    } else {
      // 超出左侧底部：贴底（absolute 相对 rightCol）
      previewCard.style.position = 'absolute';
      previewCard.style.top      = (leftCol.offsetHeight - previewH - GAP) + 'px';
      previewCard.style.left     = '';
      previewCard.style.width    = '';
    }
  }

  // rightCol 需要 position:relative 以支持 absolute 贴底
  rightCol.style.position = 'relative';

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', () => {
    // resize 时重置 fixed left（宽度变化）
    previewCard.style.position = '';
    previewCard.style.left     = '';
    previewCard.style.width    = '';
    update();
  }, { passive: true });

  update();
}

/* ── Scan Quality Tips ───────────────────────── */
function renderScanTips(content) {
  const tipsEl = document.getElementById('scanTips');
  const bodyEl = document.getElementById('scanTipsBody');
  if (!tipsEl || !bodyEl) return;

  if (!content) { tipsEl.style.display = 'none'; return; }

  const tips = [];
  const len = content.length;
  const I18N = window.QR_I18N || {};

  // Content length
  if (len < 50) {
    tips.push('<span class="tip-ok">✓</span> ' + (I18N.tipLengthOk || '内容长度适中，扫码识别率高'));
  } else if (len < 200) {
    tips.push('<span class="tip-warn">!</span> ' + (I18N.tipLengthMedium || '内容较长，二维码图案较密，建议增大尺寸或提高纠错等级'));
  } else {
    tips.push('<span class="tip-warn">!</span> ' + (I18N.tipLengthLong || '内容很长，二维码非常密集。建议使用 SVG 格式并确保打印尺寸足够大'));
  }

  // Error correction
  const ec = (QRState.design.ecLevel || 'M').toUpperCase();
  if (ec === 'L' && len > 100) {
    tips.push('<span class="tip-warn">!</span> ' + (I18N.tipEcLow || '当前纠错等级较低（L），建议切换到 M 或更高'));
  }

  // Logo
  if (QRState.design.logoUrl) {
    if (QRState.design.logoSize > 0.25) {
      tips.push('<span class="tip-warn">!</span> ' + (I18N.tipLogoLarge || 'Logo 较大，可能影响扫码。建议使用手机测试'));
    } else {
      tips.push('<span class="tip-ok">✓</span> ' + (I18N.tipLogoAdded || '已添加 Logo，建议下载前扫码测试'));
    }
  }

  // Margin
  if (QRState.design.margin < 8) {
    tips.push('<span class="tip-warn">!</span> ' + (I18N.tipMarginSmall || '边距较小，周围留白不足可能影响识别'));
  }

  bodyEl.innerHTML = tips.map(t => `<p>${t}</p>`).join('');
  tipsEl.style.display = 'block';
}

/* ── Init ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderForm(currentType);
  if (typeof initDesignPanel === 'function') initDesignPanel();
  // initFramePanel is registered by media-qr-frames.js DOMContentLoaded
  initPreviewScroll();
});
