// AI Essay Writer
(function() {
  const E = window.EssayWriter = {
    cfg: { freeLimit: 15000 },
    generating: false,

    init() {},

    generate() {
      if (this.generating) return;
      if (typeof gaTrackToolUse === 'function') gaTrackToolUse('ai-essay');
      const topic = document.getElementById('essayTopic').value.trim();
      const type = document.getElementById('essayType').value;
      const length = document.getElementById('essayLength').value;
      const sources = document.getElementById('essaySources').value.trim();
      const citation = document.getElementById('essayCitation').value;
      const tone = document.getElementById('essayTone').value;

      if (!topic) {
        this.showToast('Please enter an essay topic.', 'error');
        return;
      }

      this.setGenerating(true);

      const payload = {
        text: 'Write a ' + length + ' ' + type + ' essay about: ' + topic + '. ' + (sources ? 'Include these sources: ' + sources : '') + '. Use ' + citation + ' citation style. Tone: ' + tone + '.',
        mode: 'essay',
        tone: tone
      };

      AIToolStream.fetch(payload, {
        emptyId: 'essayOutputEmpty',
        contentId: 'essayOutputContent',
        textId: 'essayOutputText'
      })
      .catch(err => {
        this.showToast('Generation failed: ' + err.message, 'error');
      })
      .finally(() => {
        this.setGenerating(false);
      });
    },

    setGenerating(state) {
      this.generating = state;
      const btn = document.getElementById('essayGenerateBtn');
      const i18n = window.__i18n__ || {};
      if (state) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>' + (i18n['essay.btn.generating'] || 'Generating...') + '</span>';
        btn.disabled = true;
      } else {
        btn.innerHTML = '<i class="fa-solid fa-pen-fancy"></i> <span>' + (i18n['essay.btn.generate'] || 'Generate Essay') + '</span>';
        btn.disabled = false;
      }
    },

    copyOutput() {
      const text = document.getElementById('essayOutputText').textContent;
      const i18n = window.__i18n__ || {};
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(i18n['essay.btn.copied'] || 'Copied!', 'success');
        if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('ai-essay');
      });
    },

    downloadDocx() {
      const text = document.getElementById('essayOutputText').textContent;
      if (!text) return;
      if (typeof gaTrackDownload === 'function') gaTrackDownload('ai-essay', 'txt');
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'essay.txt';
      a.click();
      URL.revokeObjectURL(url);
    },

    showToast(msg, type) {
      const container = document.getElementById('atp-toast-container');
      if (!container) { alert(msg); return; }
      const el = document.createElement('div');
      el.className = 'atp-toast atp-toast--' + (type || 'success');
      el.textContent = msg;
      container.appendChild(el);
      setTimeout(() => { el.classList.add('atp-toast--fade'); setTimeout(() => el.remove(), 300); }, 2700);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => E.init());
  } else {
    E.init();
  }
})();
