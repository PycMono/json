// AI Humanize — page init (CSP-compliant: no inline scripts allowed)

document.addEventListener('DOMContentLoaded', function() {
  // Back button
  var backBtn = document.querySelector('.ext-topbar__back');
  if (backBtn) {
    backBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.parent.postMessage({action:'go-home'},'*');
    });
  }

  var currentMode = 'standard';

  // Mode switching
  document.querySelectorAll('.ah-mode-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.ah-mode-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
    });
  });

  // Character counter
  var ahInput = document.getElementById('ahInput');
  ahInput.addEventListener('input', updateCount);

  function updateCount() {
    document.getElementById('ahCharCount').textContent = ahInput.value.length;
  }

  // Humanize button
  document.getElementById('ahHumanizeBtn').addEventListener('click', humanizeText);

  // Clear button
  var clearBtns = document.querySelectorAll('.ah-actions .btn');
  clearBtns.forEach(function(btn) {
    if (btn.id !== 'ahHumanizeBtn') {
      btn.addEventListener('click', function() {
        ahInput.value = '';
        updateCount();
      });
    }
  });

  // Humanize via API
  function humanizeText() {
    var text = ahInput.value.trim();
    if (!text) { alert('Please enter some text.'); return; }

    var btn = document.getElementById('ahHumanizeBtn');
    var progressDiv = document.getElementById('ahProgress');
    var progressFill = document.getElementById('ahProgressFill');

    btn.disabled = true;
    btn.textContent = '⏳ Humanizing...';
    progressDiv.style.display = 'block';
    progressFill.style.width = '30%';

    extFetch('/api/ai/humanize-json', {
      method: 'POST',
      body: {
        text: text,
        mode: currentMode,
        lang: document.getElementById('ahLang').value
      }
    }).then(function(data) {
      progressFill.style.width = '100%';
      if (data && data.text) {
        document.getElementById('ahResult').style.display = 'none';
        document.getElementById('ahOutputWrap').style.display = 'block';
        document.getElementById('ahOutput').textContent = data.text;
      } else {
        alert('Humanization failed. Please try again.');
      }
    }).catch(function(err) {
      alert('Error: ' + err.message);
    }).finally(function() {
      setTimeout(function() { progressDiv.style.display = 'none'; progressFill.style.width = '0%'; }, 500);
      btn.disabled = false;
      btn.textContent = '✍️ Humanize';
    });
  }

  // Copy output
  document.addEventListener('click', function(e) {
    var copyBtn = e.target.closest('.btn-success');
    if (copyBtn && copyBtn.textContent.indexOf('Copy') !== -1) {
      var text = document.getElementById('ahOutput').textContent;
      navigator.clipboard.writeText(text).then(function() {
        copyBtn.textContent = '✅ Copied!';
        setTimeout(function() { copyBtn.textContent = '📋 Copy'; }, 1500);
      });
    }
  });

  // Re-humanize
  document.addEventListener('click', function(e) {
    if (e.target.closest('.ah-actions .btn') && e.target.textContent.indexOf('Re-humanize') !== -1) {
      document.getElementById('ahResult').style.display = 'block';
      document.getElementById('ahOutputWrap').style.display = 'none';
      humanizeText();
    }
  });

  // Receive data from right-click menu
  document.addEventListener('tool-data', function(e) {
    if (e.detail.tool === 'ai-humanize' && e.detail.data) {
      ahInput.value = e.detail.data;
      updateCount();
    }
  });
});
