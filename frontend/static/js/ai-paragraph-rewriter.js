// AI Paragraph Rewriter
(function() {
  const P = window.ParagraphRewriter = {
    cfg: { freeLimit: 15000 },
    rewriting: false,

    init() {},

    updateCount() {
      const text = document.getElementById('prInputText').value;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      document.getElementById('prWordCount').textContent = words + ' words';
    },

    rewrite() {
      if (this.rewriting) return;
      const text = document.getElementById('prInputText').value.trim();
      const style = document.getElementById('prStyle').value;
      const purpose = document.getElementById('prPurpose').value;

      if (!text) {
        this.showToast('Please enter text to rewrite.', 'error');
        return;
      }

      this.setRewriting(true);
      var _gaStart = Date.now();
      if (typeof gaTrackToolUse === \'function\') gaTrackToolUse(\'ai-paragraph-rewriter');

      AIToolStream.fetch({
        text: text,
        mode: 'paragraph-rewrite',
        style: style,
        purpose: purpose
      }, {
        emptyId: 'prOutputEmpty',
        contentId: 'prOutputContent',
        textId: 'prOutputText'
      })
      .then(() => {
        if (typeof gaTrackProcessDone === \'function\') gaTrackProcessDone(\'ai-paragraph-rewriter', 1, Date.now() - _gaStart);
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
      const btn = document.getElementById('prRewriteBtn');
      const i18n = window.__i18n__ || {};
      if (state) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + (i18n['paragraph_rewriter.btn.rewriting'] || 'Rewriting...');
        btn.disabled = true;
      } else {
        btn.innerHTML = '<i class="fa-solid fa-rotate"></i> <span>' + (i18n['paragraph_rewriter.btn.rewrite'] || 'Rewrite Paragraph') + '</span>';
        btn.disabled = false;
      }
    },

    copyOutput() {
      const text = document.getElementById('prOutputText').textContent;
      const i18n = window.__i18n__ || {};
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(i18n['paragraph_rewriter.btn.copied'] || 'Copied!', 'success');
        if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('ai-paragraph-rewriter', 'text');
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
    document.addEventListener('DOMContentLoaded', () => P.init());
  } else {
    P.init();
  }
})();
