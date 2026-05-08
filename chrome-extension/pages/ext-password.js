// Password Generator — page init (CSP-compliant: no inline scripts allowed)

document.addEventListener('DOMContentLoaded', function() {
  // Back button
  var backBtn = document.querySelector('.ext-topbar__back');
  if (backBtn) {
    backBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.parent.postMessage({action:'go-home'},'*');
    });
  }

  // Length slider display
  var slider = document.getElementById('lengthSlider');
  if (slider) {
    slider.addEventListener('input', function() {
      document.getElementById('lengthDisplay').textContent = this.value;
    });
  }

  // Copy button (icon button next to output)
  var btns = document.querySelectorAll('.password-output-wrap .btn-icon');
  btns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (btn.title === 'Copy') {
        copyPassword();
      } else if (btn.title === 'Refresh') {
        generatePasswords();
      }
    });
  });

  // Generate button
  var genBtn = document.querySelector('.action-row .btn-primary');
  if (genBtn) genBtn.addEventListener('click', generatePasswords);

  // Copy button in action row
  var copyBtns = document.querySelectorAll('.action-row .btn');
  copyBtns.forEach(function(btn) {
    if (btn.textContent.indexOf('Copy') !== -1) {
      btn.addEventListener('click', copyPassword);
    }
  });
});
