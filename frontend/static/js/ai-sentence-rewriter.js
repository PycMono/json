// AI Sentence Rewriter
(function() {
  const S = window.SentenceRewriter = {
    cfg: { freeLimit: 15000 },
    rewriting: false,

    init() {},

    updateCount() {
      const text = document.getElementById('srInputText').value;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      document.getElementById('srWordCount').textContent = words + ' words';
    },

    rewrite() {
      if (this.rewriting) return;
      const text = document.getElementById('srInputText').value.trim();
      const tone = document.getElementById('srTone').value;
      const purpose = document.getElementById('srPurpose').value;

      if (!text) {
        this.showToast('Please enter text to rewrite.', 'error');
        return;
      }

      this.setRewriting(true);
      var _gaStart = Date.now();
      if (typeof gaTrackToolUse === \'function\') gaTrackToolUse(\'ai-sentence-rewriter');

      AIToolStream.fetch({
        text: text,
        mode: 'sentence-rewrite',
        tone: tone,
        purpose: purpose
      }, {
        emptyId: 'srOutputEmpty',
        contentId: 'srOutputContent',
        textId: 'srOutputText'
      })
      .then(() => {
        if (typeof gaTrackProcessDone === \'function\') gaTrackProcessDone(\'ai-sentence-rewriter', 1, Date.now() - _gaStart);
      })
      
        this.showToast('Rewrite failed: ' + err.message, 'error');
      })
      .finally(() => {
        this.setRewriting(false);
      });
    },

    setRewriting(state) {
      this.rewriting = state;
      const btn = document.getElementById('srRewriteBtn');
      const i18n = window.__i18n__ || {};
      if (state) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + (i18n['sentence_rewriter.btn.rewriting'] || 'Rewriting...');
        btn.disabled = true;
      } else {
        btn.innerHTML = '<i class="fa-solid fa-rotate"></i> <span>' + (i18n['sentence_rewriter.btn.rewrite'] || 'Rewrite Sentence') + '</span>';
        btn.disabled = false;
      }
    },

    copyOutput() {
      const text = document.getElementById('srOutputText').textContent;
      const i18n = window.__i18n__ || {};
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(i18n['sentence_rewriter.btn.copied'] || 'Copied!', 'success');
        if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('ai-sentence-rewriter', 'text');

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
    document.addEventListener('DOMContentLoaded', () => S.init());
  } else {
    S.init();
  }
})();
