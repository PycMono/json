// AI Humanizer for College
(function() {
  const C = window.ForCollege = {
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

      this.chartInput = makeRing('fcChartInput');
      this.chartOutput = makeRing('fcChartOutput');
    },

    updateChart(chart, canvasId, scoreElId, score) {
      if (!chart) {
        // Chart.js may not be loaded yet; try init
        if (typeof Chart !== 'undefined') {
          this.initCharts();
          chart = canvasId === 'fcChartInput' ? this.chartInput : this.chartOutput;
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
      const text = document.getElementById('fcInputText').value;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      document.getElementById('fcWordCount').textContent = words + ' words';
    },

    loadSample() {
      document.getElementById('fcInputText').value = 'I am writing to express my interest in the Computer Science program at your esteemed institution. I have always been passionate about technology and innovation. This program will help me achieve my career goals and contribute meaningfully to the field.';
      this.onInputChange();
    },

    clearInput() {
      document.getElementById('fcInputText').value = '';
      this.onInputChange();
    },

    humanize(again = false) {
      if (this.humanizing) return;
      const text = document.getElementById('fcInputText').value.trim();
      const docType = document.getElementById('fcDocType').value;
      const tone = document.getElementById('fcTone').value;

      if (!text) {
        this.showToast('Please enter text to humanize.', 'error');
        return;
      }

      this.setHumanizing(true);
      var _gaStart = Date.now();
      if (typeof gaTrackToolUse === \'function\') gaTrackToolUse(\'ai-for-college');

      AIToolStream.fetch({
        text: text,
        mode: 'college',
        tone: tone,
        doc_type: docType
      }, {
        emptyId: 'fcOutputEmpty',
        contentId: 'fcOutputContent',
        textId: 'fcOutputText',
        onDone: function(finalText) {
          var words = finalText.trim().split(/\s+/).length;
          var wcEl = document.getElementById('fcOutputWords');
          if (wcEl) wcEl.textContent = words + ' words';
        }
      })
      .then(() => {
        if (typeof gaTrackProcessDone === \'function\') gaTrackProcessDone(\'ai-for-college', 1, Date.now() - _gaStart);
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
      const btn = document.getElementById('fcHumanizeBtn');
      const i18n = window.__i18n__ || {};
      if (state) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + (i18n['for_college.btn.humanizing'] || 'Humanizing...');
        btn.disabled = true;
      } else {
        btn.innerHTML = '<i class="fa-solid fa-wand-sparkles"></i> <span>' + (i18n['for_college.btn.humanize'] || 'Humanize for College') + '</span>';
        btn.disabled = false;
      }
    },

    showOutput(text, scoreBefore, scoreAfter) {
      document.getElementById('fcOutputEmpty').style.display = 'none';
      document.getElementById('fcOutputContent').style.display = 'block';
      document.getElementById('fcOutputText').textContent = text;
      const words = text.trim().split(/\s+/).length;
      document.getElementById('fcOutputWords').textContent = words + ' words';

      // Update charts if scores provided
      if (typeof scoreBefore === 'number') {
        this.updateChart(this.chartInput, 'fcChartInput', 'fcScoreInput', scoreBefore);
      }
      if (typeof scoreAfter === 'number') {
        this.updateChart(this.chartOutput, 'fcChartOutput', 'fcScoreOutput', scoreAfter);
      }
    },

    copyOutput() {
      const text = document.getElementById('fcOutputText').textContent;
      const i18n = window.__i18n__ || {};
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(i18n['for_college.btn.copied'] || 'Copied!', 'success');
        if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('ai-for-college', 'text');
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
    document.addEventListener('DOMContentLoaded', () => C.init());
  } else {
    C.init();
  }
})();
