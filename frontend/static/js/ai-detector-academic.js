// AI Detector for Academic Writing
(function() {
  const D = window.DetectorAcademic = {
    cfg: { freeLimit: 15000 },
    detecting: false,
    gaugeChart: null,

    init() {
      this.initGauge();
    },

    initGauge() {
      if (typeof Chart === 'undefined') return;
      const ctx = document.getElementById('daGaugeChart');
      if (!ctx) return;

      this.gaugeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [0, 100],
            backgroundColor: ['#059669', '#e5e7eb'],
            borderWidth: 0,
            circumference: 180,
            rotation: 270
          }]
        },
        options: {
          responsive: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          animation: { duration: 800 },
          cutout: '75%'
        }
      });
    },

    updateGauge(score) {
      if (!this.gaugeChart && typeof Chart !== 'undefined') {
        this.initGauge();
      }
      if (!this.gaugeChart) return;

      const pct = Math.min(100, Math.max(0, Math.round(score)));
      // Color gradient: green(0%) → yellow(50%) → red(100%)
      let color;
      if (pct < 40) color = '#059669';
      else if (pct < 70) color = '#d97706';
      else color = '#dc2626';

      this.gaugeChart.data.datasets[0].data = [pct, 100 - pct];
      this.gaugeChart.data.datasets[0].backgroundColor = [color, '#e5e7eb'];
      this.gaugeChart.update();

      const scoreEl = document.getElementById('daGaugeScore');
      if (scoreEl) scoreEl.textContent = pct + '%';
    },

    onInputChange() {
      const text = document.getElementById('daInputText').value;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      document.getElementById('daWordCount').textContent = words + ' words';
    },

    loadSample() {
      document.getElementById('daInputText').value = 'The methodology employed in this study utilizes a mixed-methods approach to data collection and analysis. Quantitative data was gathered through structured surveys, while qualitative insights were obtained via semi-structured interviews with key stakeholders.';
      this.onInputChange();
    },

    clearInput() {
      document.getElementById('daInputText').value = '';
      this.onInputChange();
    },

    detect() {
      if (this.detecting) return;
      const text = document.getElementById('daInputText').value.trim();
      const docType = document.getElementById('daDocType').value;
      const field = document.getElementById('daField').value;

      if (!text) {
        this.showToast('Please enter text to detect.', 'error');
        return;
      }

      if (text.length < 50) {
        this.showToast('Please enter at least 50 characters.', 'error');
        return;
      }

      this.setDetecting(true);
      var _gaStart = Date.now();
      if (typeof gaTrackToolUse === 'function') gaTrackToolUse('ai-detector-academic');

      fetch('/api/ai/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          doc_type: docType,
          field: field
        })
      })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        this.showResult(data);
        if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('ai-detector-academic', 1, Date.now() - _gaStart);
      })
      .catch(err => {
        this.showToast('Detection failed: ' + err.message, 'error');
      })
      .finally(() => {
        this.setDetecting(false);
      });
    },

    setDetecting(state) {
      this.detecting = state;
      const btn = document.getElementById('daDetectBtn');
      const i18n = window.__i18n__ || {};
      if (state) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + (i18n['detector_academic.btn.detecting'] || 'Detecting...');
        btn.disabled = true;
      } else {
        btn.innerHTML = '<i class="fa-solid fa-magnifying-glass-chart"></i> <span>' + (i18n['detector_academic.btn.detect'] || 'Detect AI Content') + '</span>';
        btn.disabled = false;
      }
    },

    showResult(data) {
      document.getElementById('daOutputEmpty').style.display = 'none';
      document.getElementById('daOutputContent').style.display = 'block';

      const score = data.ai_score || 0;
      this.updateGauge(score);

      // Verdict
      const verdictEl = document.getElementById('daVerdict');
      if (score < 40) {
        verdictEl.innerHTML = '<span style="color:#059669;font-weight:600;">Likely Human-Written</span>';
      } else if (score < 70) {
        verdictEl.innerHTML = '<span style="color:#d97706;font-weight:600;">Mixed Content</span>';
      } else {
        verdictEl.innerHTML = '<span style="color:#dc2626;font-weight:600;">Likely AI-Generated</span>';
      }

      // Highlighted text
      document.getElementById('daHighlightText').textContent = data.original_text || document.getElementById('daInputText').value;
    },

    copyReport() {
      const score = document.getElementById('daGaugeScore').textContent;
      const text = 'AI Detection Report\nScore: ' + score + '\n\n' + document.getElementById('daHighlightText').textContent;
      const i18n = window.__i18n__ || {};
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(i18n['detector_academic.btn.copied'] || 'Report copied!', 'success');
        if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('ai-detector-academic', 'text');
      });
    },

    humanize() {
      const text = document.getElementById('daInputText').value;
      window.location.href = '/ai/humanize?tab=humanizer&text=' + encodeURIComponent(text);
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
    document.addEventListener('DOMContentLoaded', () => D.init());
  } else {
    D.init();
  }
})();
