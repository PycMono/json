/**
 * token-mgr.js — Token 额度中心主引擎
 */
(function () {
  'use strict';

  var API_BAL    = '/api/token/balance';
  var API_HIST   = '/api/token/history';
  var API_STATS  = '/api/token/stats';
  var PAGE_SIZE  = 20;
  var LOW_WARN_THRESHOLD = 200;

  var state = {
    balance:       null,
    histPage:      1,
    histTotal:     0,
    histPages:     0,
    histLoading:   false,
    histData:      [],
    statsDaily:    [],
    statsBreakdown:{},
    initialized:   false
  };

  var I18N = window.__TOKEN_I18N__ || {};
  function t(key) { return I18N[key] || key; }

  var $balNum        = document.getElementById('balanceNum');
  var $totalGranted  = document.getElementById('totalGranted');
  var $totalConsumed = document.getElementById('totalConsumed');
  var $totalRefunded = document.getElementById('totalRefunded');
  var $usedPct       = document.getElementById('usedPct');
  var $ringUsed      = document.getElementById('ringUsed');
  var $tbody         = document.getElementById('historyTbody');
  var $histEmpty     = document.getElementById('historyEmpty');
  var $histLoading   = document.getElementById('historyLoading');
  var $histPagination= document.getElementById('historyPagination');
  var $dailyChart    = document.getElementById('dailyChart');
  var $dailyEmpty    = document.getElementById('dailyChartEmpty');
  var $breakdownPie  = document.getElementById('breakdownPie');
  var $pieLegend     = document.getElementById('pieLegend');
  var $lowBanner     = document.getElementById('balanceLowBanner');
  var $bannerMsg     = document.getElementById('balanceBannerMsg');
  var $btnRefresh    = document.getElementById('btnRefreshBalance');
  var $btnExport     = document.getElementById('btnExportCSV');
  var $mbbVal        = document.getElementById('mbbVal');
  var $toast         = document.getElementById('token-mgr-toast');

  // ── Balance ──────────────────────────────────────────────
  function loadBalance() {
    if ($btnRefresh) { $btnRefresh.classList.add('loading'); $btnRefresh.disabled = true; }
    fetch(API_BAL)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        state.balance = data;
        renderBalance(data);
        checkLowBalance(data);
      })
      .catch(function () { showToast(t('loadFailed'), 'error'); if (typeof gaTrackError === 'function') gaTrackError('token-mgr', 'balance_load_fail', ''); })
      .finally(function () {
        if ($btnRefresh) { $btnRefresh.classList.remove('loading'); $btnRefresh.disabled = false; }
      });
  }

  function renderBalance(data) {
    animateNumber($balNum,        data.balance);
    animateNumber($totalGranted,  data.total_granted);
    animateNumber($totalConsumed, data.total_consumed);
    if ($totalRefunded) animateNumber($totalRefunded, data.total_refunded || 0);
    var pct = Math.round((data.used_percent || 0) * 100);
    if ($usedPct) $usedPct.textContent = pct + '%';
    if ($mbbVal) $mbbVal.textContent = formatNum(data.balance);
    if ($ringUsed) {
      var total = 364.42;
      $ringUsed.style.strokeDashoffset = (total - total * (data.used_percent || 0)).toFixed(2);
      $ringUsed.style.stroke = pct >= 100 ? 'var(--color-error, #ef4444)' : 'var(--tm-primary)';
    }
  }

  function checkLowBalance(data) {
    if (!$lowBanner || !$bannerMsg) return;
    if (data.balance <= 0) {
      $bannerMsg.textContent = t('balanceEmpty');
      $lowBanner.style.display = 'flex';
    } else if (data.balance <= LOW_WARN_THRESHOLD) {
      $bannerMsg.textContent = t('balanceLow').replace('{n}', data.balance);
      $lowBanner.style.display = 'flex';
    } else {
      $lowBanner.style.display = 'none';
    }
  }

  // ── History ──────────────────────────────────────────────
  function loadHistory(page) {
    if (state.histLoading) return;
    state.histLoading = true;
    state.histPage = page || 1;
    if ($tbody) $tbody.innerHTML = '';
    if ($histEmpty) $histEmpty.style.display = 'none';
    if ($histPagination) $histPagination.innerHTML = '';
    if ($histLoading) $histLoading.style.display = 'block';

    fetch(API_HIST + '?page=' + state.histPage + '&size=' + PAGE_SIZE)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.histTotal = data.total;
        state.histPages = data.pages;
        state.histData  = data.list || [];
        if ($histLoading) $histLoading.style.display = 'none';
        renderHistory(state.histData);
        renderPagination();
      })
      .catch(function () {
        if ($histLoading) $histLoading.style.display = 'none';
        showToast(t('loadFailed'), 'error');
        if (typeof gaTrackError === 'function') gaTrackError('token-mgr', 'history_load_fail', '');
      })
      .finally(function () { state.histLoading = false; });
  }

  function renderHistory(list) {
    if (!$tbody) return;
    if (!list || list.length === 0) {
      $tbody.innerHTML = '';
      if ($histEmpty) $histEmpty.style.display = 'block';
      return;
    }
    if ($histEmpty) $histEmpty.style.display = 'none';
    var html = list.map(function (tx) {
      var badgeCls = tx.tx_type === 'grant' ? 'grant' : tx.tx_type === 'refund' ? 'refund' : 'consume';
      var typeLabel = tx.tx_type === 'grant' ? t('statusGrant') : tx.tx_type === 'refund' ? t('statusRefund') : t('statusConsume');
      var sign      = tx.tx_type === 'consume' ? '-' : '+';
      var amtClass  = tx.tx_type === 'consume' ? 'color:var(--tm-primary-dark)' : 'color:#166534';
      var subDetail = (tx.prompt_tokens > 0)
        ? '<span class="token-sub">P:' + tx.prompt_tokens + ' C:' + tx.completion_tokens + '</span>'
        : '';
      var toolLabel = tx.tool_name
        ? (tx.tool_name === 'humanizer' ? t('toolHumanizer')
           : tx.tool_name === 'detector'  ? t('toolDetector')
           : tx.tool_name)
        : '—';
      return '<tr>' +
        '<td style="white-space:nowrap">' + formatDate(tx.created_at) + '</td>' +
        '<td><span class="tx-badge ' + badgeCls + '">' + typeLabel + '</span></td>' +
        '<td>' + toolLabel + '</td>' +
        '<td><div class="token-detail"><span class="token-main-val" style="' + amtClass + '">' + sign + formatNum(tx.amount) + '</span>' + subDetail + '</div></td>' +
        '<td>' + formatNum(tx.balance_after) + '</td>' +
        '<td style="color:var(--color-text-secondary);font-size:12px">' + (tx.note || '—') + '</td>' +
        '</tr>';
    }).join('');
    $tbody.innerHTML = html;
  }

  function renderPagination() {
    if (!$histPagination) return;
    var pageLabel = t('pageOf').replace('{cur}', state.histPage).replace('{total}', state.histPages || 1);
    var prevDisabled = state.histPage <= 1 ? ' disabled' : '';
    var nextDisabled = state.histPage >= state.histPages ? ' disabled' : '';
    $histPagination.innerHTML =
      '<button class="pg-btn" id="pgPrev"' + prevDisabled + '>' + t('pagePrev') + '</button>' +
      '<span>' + pageLabel + '</span>' +
      '<button class="pg-btn" id="pgNext"' + nextDisabled + '>' + t('pageNext') + '</button>';
    var prevBtn = document.getElementById('pgPrev');
    var nextBtn = document.getElementById('pgNext');
    if (prevBtn) prevBtn.addEventListener('click', function () { loadHistory(state.histPage - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { loadHistory(state.histPage + 1); });
  }

  // ── CSV Export ───────────────────────────────────────────
  function exportCSV() {
    if (typeof gaTrackExport === 'function') gaTrackExport('token-mgr', 'csv');
    if (!state.histData || state.histData.length === 0) {
      showToast(t('historyEmpty'), 'info');
      return;
    }
    var headers = ['Date', 'Type', 'Tool', 'Tokens', 'Balance After', 'Note'];
    var rows = state.histData.map(function (tx) {
      var typeLabel = tx.tx_type === 'grant' ? t('statusGrant') : tx.tx_type === 'refund' ? t('statusRefund') : t('statusConsume');
      var toolLabel = tx.tool_name
        ? (tx.tool_name === 'humanizer' ? t('toolHumanizer')
           : tx.tool_name === 'detector'  ? t('toolDetector')
           : tx.tool_name)
        : '—';
      return [
        tx.created_at || '',
        typeLabel,
        toolLabel,
        tx.amount || 0,
        tx.balance_after || 0,
        (tx.note || '').replace(/"/g, '""')
      ];
    });
    var csv = [headers.join(','), rows.map(function (r) {
      return r.map(function (c) {
        var s = String(c);
        if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      }).join(',');
    }).join('\n')].join('\n');

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    var filename = (t('exportFilename') || 'token-history') + '.csv';
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(t('exportSuccess') || 'Exported', 'success');
  }

  // ── Stats ──────────────────────────────────────────────
  function loadStats() {
    fetch(API_STATS + '?days=30')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.statsDaily = data.daily || [];
        state.statsBreakdown = data.breakdown || {};
        renderLineChart(state.statsDaily);
        renderPieChart(state.statsBreakdown);
      })
      .catch(function () {
        if ($dailyEmpty) { $dailyEmpty.style.display = 'block'; if ($dailyChart) $dailyChart.style.display = 'none'; }
        if (typeof gaTrackError === 'function') gaTrackError('token-mgr', 'stats_load_fail', '');
      });
  }

  // ── Charts ──────────────────────────────────────────────
  function loadStats() {
    fetch(API_STATS + '?days=30')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.statsDaily = data.daily || [];
        state.statsBreakdown = data.breakdown || {};
        renderLineChart(state.statsDaily);
        renderPieChart(state.statsBreakdown);
      })
      .catch(function () {
        if ($dailyEmpty) { $dailyEmpty.style.display = 'block'; if ($dailyChart) $dailyChart.style.display = 'none'; }
      });
  }

  function renderLineChart(data) {
    if (!$dailyChart) return;
    var canvas = $dailyChart;
    var ctx = canvas.getContext('2d');
    if (!data || data.length === 0) {
      canvas.style.display = 'none';
      if ($dailyEmpty) $dailyEmpty.style.display = 'block';
      return;
    }
    canvas.style.display = 'block';
    if ($dailyEmpty) $dailyEmpty.style.display = 'none';

    var W = canvas.offsetWidth || 800;
    var H = 220;
    canvas.width  = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    var pad  = { top: 20, right: 20, bottom: 36, left: 52 };
    var cW   = W - pad.left - pad.right;
    var cH   = H - pad.top  - pad.bottom;
    var vals = data.map(function (d) { return d.total_tokens || 0; });
    var maxV = Math.max.apply(null, vals) || 1;

    var primary = getComputedStyle(document.documentElement).getPropertyValue('--tm-primary').trim() || '#f59e0b';
    var gridColor = getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim() || '#e5e7eb';
    var textColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim() || '#9ca3af';

    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
      var y = pad.top + cH * (1 - i / 4);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
      ctx.fillStyle = textColor; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(formatNum(Math.round(maxV * i / 4)), pad.left - 8, y + 3);
    }

    // Fill gradient
    var grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
    grad.addColorStop(0, primary + '44');
    grad.addColorStop(1, primary + '00');
    ctx.beginPath();
    data.forEach(function (d, idx) {
      var x = pad.left + idx * cW / (data.length - 1 || 1);
      var y = pad.top  + cH * (1 - (d.total_tokens || 0) / maxV);
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + cW, pad.top + cH);
    ctx.lineTo(pad.left, pad.top + cH);
    ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath();
    data.forEach(function (d, idx) {
      var x = pad.left + idx * cW / (data.length - 1 || 1);
      var y = pad.top  + cH * (1 - (d.total_tokens || 0) / maxV);
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = primary; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();

    // X labels
    ctx.fillStyle = textColor; ctx.textAlign = 'center'; ctx.font = '11px sans-serif';
    [0, Math.floor((data.length - 1) / 2), data.length - 1].forEach(function (idx) {
      if (!data[idx]) return;
      var x = pad.left + idx * cW / (data.length - 1 || 1);
      ctx.fillText(data[idx].date ? data[idx].date.slice(5) : '', x, H - 10);
    });
  }

  function renderPieChart(breakdown) {
    if (!$breakdownPie || !$pieLegend) return;
    var entries = Object.keys(breakdown).map(function (k) {
      var label = k === 'humanizer' ? t('toolHumanizer') : k === 'detector' ? t('toolDetector') : t('toolOther');
      return { key: k, label: label, val: breakdown[k] || 0 };
    }).filter(function (e) { return e.val > 0; });

    if (entries.length === 0) {
      $breakdownPie.innerHTML = '';
      $pieLegend.innerHTML = '<div style="color:var(--color-text-secondary);font-size:13px">' + t('chartEmpty') + '</div>';
      return;
    }

    var colors = ['#f59e0b','#10b981','#6366f1','#ef4444','#8b5cf6'];
    var total  = entries.reduce(function (s, e) { return s + e.val; }, 0);
    var cx = 100, cy = 100, r = 80;
    var startAngle = -Math.PI / 2;
    var paths = [];
    var legendHtml = '';

    entries.forEach(function (e, i) {
      var angle    = (e.val / total) * 2 * Math.PI;
      var endAngle = startAngle + angle;
      var x1 = cx + r * Math.cos(startAngle);
      var y1 = cy + r * Math.sin(startAngle);
      var x2 = cx + r * Math.cos(endAngle);
      var y2 = cy + r * Math.sin(endAngle);
      var large = angle > Math.PI ? 1 : 0;
      var d = 'M ' + cx + ' ' + cy +
              ' L ' + x1.toFixed(2) + ' ' + y1.toFixed(2) +
              ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' +
              x2.toFixed(2) + ' ' + y2.toFixed(2) + ' Z';
      paths.push('<path d="' + d + '" fill="' + colors[i % colors.length] + '" opacity="0.9"/>');
      var pct = Math.round(e.val / total * 100);
      legendHtml += '<div class="legend-item"><span class="legend-dot" style="background:' + colors[i % colors.length] + '"></span><span>' + e.label + ' ' + pct + '%</span></div>';
      startAngle = endAngle;
    });

    $breakdownPie.innerHTML = paths.join('');
    $pieLegend.innerHTML    = legendHtml;
  }

  // ── Utilities ──────────────────────────────────────────────
  function animateNumber(el, target) {
    if (!el) return;
    var start = 0, startTs = null, duration = 500;
    function step(ts) {
      if (!startTs) startTs = ts;
      var progress = Math.min((ts - startTs) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatNum(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function formatNum(n) { return (n || 0).toLocaleString(); }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      return d.toLocaleString(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) { return iso.slice(0, 16).replace('T', ' '); }
  }

  function showToast(msg, type) {
    if (!$toast) return;
    $toast.className = 'tm-toast ' + (type || 'info');
    $toast.textContent = msg;
    requestAnimationFrame(function () { $toast.classList.add('show'); });
    setTimeout(function () { $toast.classList.remove('show'); }, 2500);
  }

  // ── Events ──────────────────────────────────────────────
  function bindEvents() {
    if ($btnRefresh) {
      $btnRefresh.addEventListener('click', function () {
        loadBalance();
        loadHistory(1);
        loadStats();
        if (typeof gaTrackToolInteraction === 'function') gaTrackToolInteraction('token-mgr', 'refresh');
      });
    }
    if ($btnExport) {
      $btnExport.addEventListener('click', exportCSV);
    }
    var closeBtn = document.getElementById('closeLowBanner');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () { if ($lowBanner) $lowBanner.style.display = 'none'; });
    }
    window.addEventListener('resize', debounce(function () { renderLineChart(state.statsDaily); }, 200));
  }

  function debounce(fn, delay) {
    var timer;
    return function () { clearTimeout(timer); timer = setTimeout(fn, delay); };
  }

  // ── Init ──────────────────────────────────────────────
  function init() {
    if (state.initialized) return;
    state.initialized = true;
    bindEvents();
    loadBalance();
    loadHistory(1);
    loadStats();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
