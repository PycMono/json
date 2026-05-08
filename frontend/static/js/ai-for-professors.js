// AI Humanizer for Professors
(function() {
  const P = window.ForProfessors = {
    cfg: { freeLimit: 15000 },
    humanizing: false,
    chartInput: null,
    chartOutput: null,

    init() {
      this.initCharts();
    },

    initCharts() {
      if (typeof Chart === 'undefined') return;

      const makeRing = (canvasId) => {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        return new Chart(ctx, {
          type: 'doughnut',
          data: {
            datasets: [{
              data: [0, 100],
              backgroundColor: ['#6366f1', '#e5e7eb'],
              borderWidth: 0,
              cutout: '75%'
            }]
          },
          options: {
            responsive: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            animation: { duration: 600 }
          }
        });
      };

      this.chartInput = makeRing('fpChartInput');
      this.chartOutput = makeRing('fpChartOutput');
    },

    updateChart(chart, canvasId, scoreElId, score) {
      if (!chart) {
        if (typeof Chart !== 'undefined') {
          this.initCharts();
          chart = canvasId === 'fpChartInput' ? this.chartInput : this.chartOutput;
        }
        if (!chart) return;
      }
      const pct = Math.min(100, Math.max(0, Math.round(score)));
      const color = pct < 40 ? '#059669' : pct < 70 ? '#d97706' : '#dc2626';
      chart.data.datasets[0].data = [pct, 100 - pct];
      chart.data.datasets[0].backgroundColor = [color, '#e5e7eb'];
      chart.update();
      const el = document.getElementById(scoreElId);
      if (el) el.textContent = pct + '%';
    },

    onInputChange() {
      const text = document.getElementById('fpInputText').value;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      document.getElementById('fpWordCount').textContent = words + ' words';
    },

    loadSample() {
      document.getElementById('fpInputText').value = 'Welcome to CS101. In this course, we will explore the fundamental concepts of computer science. Students are expected to complete all assignments on time and participate actively in class discussions.';
      this.onInputChange();
    },

    clearInput() {
      document.getElementById('fpInputText').value = '';
      this.onInputChange();
    },

    humanize(again = false) {
      if (this.humanizing) return;
      const text = document.getElementById('fpInputText').value.trim();
      const docType = document.getElementById('fpDocType').value;
      const tone = document.getElementById('fpTone').value;

      if (!text) {
        this.showToast('Please enter text to humanize.', 'error');
        return;
      }

      this.setHumanizing(true);
      var _gaStart = Date.now();
      if (typeof gaTrackToolUse === \'function\') gaTrackToolUse(\'ai-for-professors');

      AIToolStream.fetch({
        text: text,
        mode: 'professor',
        tone: tone,
        doc_type: docType
      }, {
        emptyId: 'fpOutputEmpty',
        contentId: 'fpOutputContent',
        textId: 'fpOutputText',
        onDone: function(finalText) {
          var words = finalText.trim().split(/\s+/).length;
          var wcEl = document.getElementById('fpOutputWords');
          if (wcEl) wcEl.textContent = words + ' words';
        }
      })
      .then(() => {
        if (typeof gaTrackProcessDone === \'function\') gaTrackProcessDone(\'ai-for-professors', 1, Date.now() - _gaStart);
      })
      
        this.showToast('Humanization failed: ' + err.message, 'error');
      })
      .finally(() => {
        this.setHumanizing(false);
      });
    },

    setHumanizing(state) {
      this.humanizing = state;
      const btn = document.getElementById('fpHumanizeBtn');
      const i18n = window.__i18n__ || {};
      if (state) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + (i18n['for_professors.btn.humanizing'] || 'Humanizing...');
        btn.disabled = true;
      } else {
        btn.innerHTML = '<i class="fa-solid fa-wand-sparkles"></i> <span>' + (i18n['for_professors.btn.humanize'] || 'Humanize for Professors') + '</span>';
        btn.disabled = false;
      }
    },

    showOutput(text, scoreBefore, scoreAfter) {
      document.getElementById('fpOutputEmpty').style.display = 'none';
      document.getElementById('fpOutputContent').style.display = 'block';
      document.getElementById('fpOutputText').textContent = text;
      const words = text.trim().split(/\s+/).length;
      document.getElementById('fpOutputWords').textContent = words + ' words';

      if (typeof scoreBefore === 'number') {
        this.updateChart(this.chartInput, 'fpChartInput', 'fpScoreInput', scoreBefore);
      }
      if (typeof scoreAfter === 'number') {
        this.updateChart(this.chartOutput, 'fpChartOutput', 'fpScoreOutput', scoreAfter);
      }
    },

    copyOutput() {
      const text = document.getElementById('fpOutputText').textContent;
      const i18n = window.__i18n__ || {};
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(i18n['for_professors.btn.copied'] || 'Copied!', 'success');
        if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('ai-for-professors', 'text');
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
