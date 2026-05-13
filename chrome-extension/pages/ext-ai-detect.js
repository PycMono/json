// AI Detect — page init (CSP-compliant: no inline scripts allowed)

document.addEventListener('DOMContentLoaded', function() {
  // Back button
  var backBtn = document.querySelector('.ext-topbar__back');
  if (backBtn) {
    backBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.parent.postMessage({action:'go-home'},'*');
    });
  }

  // Character/word counter
  var aidInput = document.getElementById('aidInput');
  aidInput.addEventListener('input', updateCount);

  function updateCount() {
    var text = aidInput.value;
    document.getElementById('aidCharCount').textContent = text.length;
    document.getElementById('aidWordCount').textContent = text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  // Detect button
  document.getElementById('aidDetectBtn').addEventListener('click', detectAI);

  // Clear button
  var clearBtn = document.querySelector('.aid-actions .btn:not(.btn-primary)');
  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      aidInput.value = '';
      updateCount();
    });
  }

  // AI Detection via API
  function detectAI() {
    var text = aidInput.value.trim();
    if (!text) { alert('Please enter some text.'); return; }

    var btn = document.getElementById('aidDetectBtn');
    var resultDiv = document.getElementById('aidResult');
    btn.disabled = true;
    btn.textContent = '⏳ Analyzing...';
    resultDiv.innerHTML = '<div class="aid-loading"><div class="spinner"></div><p style="margin-top:12px;color:#666;">Analyzing content...</p></div>';

    extFetch('/api/ai/detect', {
      method: 'POST',
      body: { text: text }
    }).then(function(data) {
      if (data && data.score !== undefined) {
        var score = Math.round(data.score * 100);
        var verdict = score >= 70 ? 'ai' : score >= 40 ? 'mixed' : 'human';
        var verdictText = { ai: 'Likely AI-Generated', mixed: 'Mixed Content', human: 'Likely Human-Written' };
        var verdictColor = { ai: '#c62828', mixed: '#e65100', human: '#2e7d32' };

        var html = '<div class="aid-score-ring">' +
          '<div class="aid-score-value" style="color:' + verdictColor[verdict] + '">' + score + '%</div>' +
          '<div class="aid-score-label">AI Probability</div>' +
          '</div>' +
          '<div class="aid-verdict ' + verdict + '">' + verdictText[verdict] + '</div>';

        if (data.detector_scores && data.detector_scores.length > 0) {
          html += '<div class="aid-breakdown"><h4 style="font-size:13px;color:#888;margin:12px 0 8px;">Detector Breakdown</h4>';
          data.detector_scores.forEach(function(d) {
            var pct = Math.round(d.score * 100);
            var color = pct >= 70 ? '#c62828' : pct >= 40 ? '#e65100' : '#2e7d32';
            html += '<div class="aid-detector-row">' +
              '<span class="aid-detector-name">' + (d.name || d.detector) + '</span>' +
              '<div class="aid-detector-bar"><div class="aid-detector-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
              '<span class="aid-detector-pct" style="color:' + color + '">' + pct + '%</span>' +
              '</div>';
          });
          html += '</div>';
        }

        if (data.sentences && data.sentences.length > 0) {
          html += '<div class="aid-breakdown"><h4 style="font-size:13px;color:#888;margin:12px 0 8px;">Sentence Analysis</h4>';
          html += '<div class="aid-sentences">';
          data.sentences.forEach(function(s) {
            var sScore = Math.round((s.score || 0) * 100);
            var bgColor = sScore >= 70 ? 'rgba(198,40,40,0.1)' : sScore >= 40 ? 'rgba(230,81,0,0.1)' : 'rgba(46,125,50,0.1)';
            html += '<span class="aid-sentence" style="background:' + bgColor + '" title="AI: ' + sScore + '%">' + s.text + ' </span>';
          });
          html += '</div></div>';
        }

        resultDiv.innerHTML = html;
      } else {
        resultDiv.innerHTML = '<p style="color:#e53935;">Detection failed. Please try again.</p>';
      }
    }).catch(function(err) {
      resultDiv.innerHTML = '<p style="color:#e53935;">Error: ' + err.message + '</p>' +
        '<p style="font-size:12px;color:#999;margin-top:8px;">Make sure you have internet access and ycjson.top is reachable.</p>';
    }).finally(function() {
      btn.disabled = false;
      btn.textContent = '🔍 Detect AI Content';
    });
  }

  // Receive data from right-click menu
  document.addEventListener('tool-data', function(e) {
    if (e.detail.tool === 'ai-detect' && e.detail.data) {
      aidInput.value = e.detail.data;
      updateCount();
    }
  });
});
