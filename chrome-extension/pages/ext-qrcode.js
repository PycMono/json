// QR Code — page init (CSP-compliant: no inline scripts allowed)

document.addEventListener('DOMContentLoaded', function() {
  // Back button
  var backBtn = document.querySelector('.ext-topbar__back');
  if (backBtn) {
    backBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.parent.postMessage({action:'go-home'},'*');
    });
  }

  // Type tab switching
  document.querySelectorAll('.qr-type-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.qr-type-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      if (typeof switchQRType === 'function') switchQRType(btn.dataset.type);
    });
  });

  // Generate button
  var genBtn = document.querySelector('.qr-content-panel .btn-primary');
  if (genBtn) genBtn.addEventListener('click', generateQR);

  // Download/copy buttons
  var qrActions = document.getElementById('qrActions');
  if (qrActions) {
    qrActions.addEventListener('click', function(e) {
      var btn = e.target.closest('.btn');
      if (!btn) return;
      if (btn.textContent.indexOf('PNG') !== -1) downloadQR('png');
      else if (btn.textContent.indexOf('SVG') !== -1) downloadQR('svg');
      else if (btn.textContent.indexOf('Copy') !== -1) copyQR();
    });
  }
});
