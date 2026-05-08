/**
 * proxy-list.js — 免费代理列表前端引擎
 */
(function () {
  'use strict';

  var API_DATA    = '/api/proxy-list/data';
  var API_REFRESH = '/api/proxy-list/refresh';
  var API_EXPORT  = '/api/proxy-list/export';
  var TOOL        = 'proxy-list';
  var SYNC_INTERVAL_MS = 30 * 60 * 1000;

  var state = {
    protocol:  'all',
    country:   'all',
    anonymity: 'all',
    sort:      'latency',
    sortDir:   'asc',
    page:      1,
    pageSize:  10,
    searchQuery:   '',
    fullList:      [],
    filteredList:  [],
    total:         0,
    lastSync:      null,
    loading:       false,
    isMobile:      false,
    isSyncing:     false,
    syncTimerID:   null,
    syncCountdown: 0,
    countriesBuilt: false,
    selectedIDs:   {}
  };

  var I18N = window.__PROXY_I18N__ || {};
  function t(key) { return I18N[key] || key; }

  var dom = {};

  function init() {
    dom.protoTabs       = document.querySelectorAll('.proto-tab');
    dom.filterSearch    = document.getElementById('filterSearch');
    dom.filterCountry   = document.getElementById('filterCountry');
    dom.filterAnonymity = document.getElementById('filterAnonymity');
    dom.filterSort      = document.getElementById('filterSort');
    dom.btnReset        = document.getElementById('btnReset');
    dom.btnRefresh      = document.getElementById('btnRefresh');
    dom.btnExportCSV    = document.getElementById('btnExportCSV');
    dom.btnExportAll    = document.getElementById('btnExportAll');
    dom.resultCount     = document.getElementById('filterResultCount');
    dom.loading         = document.getElementById('proxyLoading');
    dom.table           = document.getElementById('proxyTable');
    dom.tableBody       = document.getElementById('proxyTableBody');
    dom.cardList        = document.getElementById('proxyCardList');
    dom.empty           = document.getElementById('proxyEmpty');
    dom.emptyMsg        = document.getElementById('proxyEmptyMsg');
    dom.error           = document.getElementById('proxyError');
    dom.errorMsg        = document.getElementById('proxyErrorMsg');
    dom.pagination      = document.getElementById('proxyPagination');
    dom.btnPrev         = document.getElementById('btnPrevPage');
    dom.btnNext         = document.getElementById('btnNextPage');
    dom.pageInfo        = document.getElementById('pageInfo');
    dom.pageSizeSelect  = document.getElementById('pageSizeSelect');
    dom.syncLabel       = document.getElementById('syncLabel');
    dom.syncProgress    = document.getElementById('syncProgress');
    dom.syncNext        = document.getElementById('syncNext');
    dom.syncDot         = document.getElementById('syncDot');
    dom.toast           = document.getElementById('proxy-list-toast');
    dom.selectAll       = document.getElementById('selectAll');
    dom.bulkActionBar   = document.getElementById('bulkActionBar');
    dom.bulkCount       = document.getElementById('bulkCount');
    dom.btnBulkCopy     = document.getElementById('btnBulkCopy');
    dom.btnBulkExport   = document.getElementById('btnBulkExport');

    state.isMobile = window.innerWidth <= 768;
    window.addEventListener('resize', function () {
      var was = state.isMobile;
      state.isMobile = window.innerWidth <= 768;
      if (was !== state.isMobile && state.fullList.length > 0) applyClientFilters();
    });

    bindEvents();
    fetchData();
  }

  function bindEvents() {
    // 协议标签页
    dom.protoTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        dom.protoTabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        state.protocol = tab.dataset.proto;
        state.page = 1;
        state.countriesBuilt = false;
        ga('filter_protocol', state.protocol);
        fetchData();
      });
    });

    // 搜索（防抖）
    if (dom.filterSearch) {
      var searchTimer = null;
      dom.filterSearch.addEventListener('input', function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          state.searchQuery = dom.filterSearch.value.trim().toLowerCase();
          applyClientFilters();
        }, 200);
      });
    }

    // 下拉筛选
    ['filterCountry', 'filterAnonymity', 'filterSort'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', function () {
        var key = el.dataset.filter || id.replace('filter', '').toLowerCase();
        state[key] = el.value;
        state.page = 1;
        ga('filter_' + key, el.value);
        fetchData();
      });
    });

    // 表头排序
    document.querySelectorAll('.th-sortable').forEach(function (th) {
      th.addEventListener('click', function () {
        var sortBy = th.dataset.sort;
        if (!sortBy) return;
        if (state.sort === sortBy) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sort = sortBy;
          state.sortDir = 'asc';
        }
        updateSortUI();
        fetchData();
      });
    });

    // 全选
    if (dom.selectAll) {
      dom.selectAll.addEventListener('change', function () {
        var checked = dom.selectAll.checked;
        document.querySelectorAll('.row-check').forEach(function (cb) {
          cb.checked = checked;
          if (checked) state.selectedIDs[cb.dataset.id] = cb.dataset.val;
          else delete state.selectedIDs[cb.dataset.id];
        });
        updateBulkBar();
      });
    }

    if (dom.btnBulkCopy) dom.btnBulkCopy.addEventListener('click', bulkCopy);
    if (dom.btnBulkExport) dom.btnBulkExport.addEventListener('click', bulkExport);
    if (dom.btnReset) dom.btnReset.addEventListener('click', resetFilters);
    if (dom.btnRefresh) dom.btnRefresh.addEventListener('click', triggerRefresh);
    if (dom.btnExportCSV) dom.btnExportCSV.addEventListener('click', exportCSV);
    if (dom.btnExportAll) dom.btnExportAll.addEventListener('click', exportAll);
    if (dom.btnPrev) {
      dom.btnPrev.addEventListener('click', function () {
        if (state.page > 1) { state.page--; fetchData(); }
      });
    }
    if (dom.btnNext) {
      dom.btnNext.addEventListener('click', function () {
        if (state.page < Math.ceil(state.total / state.pageSize)) { state.page++; fetchData(); }
      });
    }
    if (dom.pageSizeSelect) {
      dom.pageSizeSelect.addEventListener('change', function () {
        state.pageSize = parseInt(dom.pageSizeSelect.value, 10) || 10;
        state.page = 1;
        updatePageSizeOptions();
        fetchData();
      });
      updatePageSizeOptions();
    }
  }

  function ga(action, val) {
    if (typeof gaTrackSettingChange === 'function') gaTrackSettingChange(TOOL, action, val);
  }

  // ── 获取数据 ──────────────────────────────────────────────────
  function fetchData() {
    if (state.loading) return;
    state.loading = true;
    showLoading();

    var params = new URLSearchParams({
      protocol: state.protocol, country: state.country,
      anonymity: state.anonymity, sort: state.sort,
      page: state.page, page_size: state.pageSize
    });

    fetch(API_DATA + '?' + params.toString())
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        state.loading = false;
        state.fullList = data.list || [];
        state.total = data.total || 0;
        state.filteredList = state.fullList;

        if (data.last_sync) {
          state.lastSync = new Date(data.last_sync);
          state.syncCountdown = Math.max(0, SYNC_INTERVAL_MS - (Date.now() - state.lastSync.getTime()));
          startSyncCountdown();
        }

        if (!state.countriesBuilt && data.country_counts) {
          buildCountryOptions(data.country_counts);
          state.countriesBuilt = true;
        }

        applyClientFilters();
        updateResultCount();
        updatePagination();
        updateSyncLabel();

        if (typeof gaTrackProcessDone === 'function') {
          gaTrackProcessDone(TOOL, state.total, 0);
        }
      })
      .catch(function (err) {
        state.loading = false;
        showError(t('fetchFail'));
        if (typeof gaTrackError === 'function') gaTrackError(TOOL, 'fetch_fail', err.message);
      });
  }

  // ── 客户端筛选（搜索） ────────────────────────────────────────
  function applyClientFilters() {
    if (!state.searchQuery) {
      state.filteredList = state.fullList;
    } else {
      var q = state.searchQuery;
      state.filteredList = state.fullList.filter(function (p) {
        return p.ip.toLowerCase().indexOf(q) !== -1 ||
               String(p.port).indexOf(q) !== -1 ||
               (p.country_name || '').toLowerCase().indexOf(q) !== -1;
      });
    }
    renderList();
  }

  // ── 渲染 ──────────────────────────────────────────────────────
  function renderList() {
    hideAll();
    clearSelection();
    if (state.filteredList.length === 0) { showEmpty(); return; }
    if (state.isMobile) renderCards(); else renderTable();
    if (dom.pagination) dom.pagination.style.display = state.total > 0 ? 'flex' : 'none';
  }

  function renderTable() {
    if (!dom.tableBody) return;
    dom.tableBody.innerHTML = buildTableRows(state.filteredList);
    if (dom.table) dom.table.style.display = 'table';
    bindRowEvents();
  }

  function renderCards() {
    if (!dom.cardList) return;
    dom.cardList.innerHTML = buildCards(state.filteredList);
    if (dom.cardList) dom.cardList.style.display = 'flex';
    bindRowEvents();
  }

  function buildTableRows(list) {
    return list.map(function (p) {
      return '<tr>' +
        '<td><input type="checkbox" class="row-check" data-id="' + p.id + '" data-val="' + escHtml(p.ip + ':' + p.port) + '"></td>' +
        '<td><div class="proxy-ip-cell"><code class="proxy-ip-code">' + escHtml(p.ip) + '</code><span class="proxy-port">:' + p.port + '</span></div></td>' +
        '<td>' + protoBadge(p.protocol) + '</td>' +
        '<td><span class="country-cell"><span class="country-flag">' + countryFlag(p.country_code) + '</span><span class="country-name">' + escHtml(p.country_name || p.country_code) + '</span></span></td>' +
        '<td>' + anonBadge(p.anonymity) + '</td>' +
        '<td>' + latencyBar(p.latency_ms) + '</td>' +
        '<td>' + uptimeBar(p.uptime_pct) + '</td>' +
        '<td>' + relativeTime(p.last_checked) + '</td>' +
        '<td><button class="btn-copy-ip" data-id="' + p.id + '" data-val="' + escHtml(p.ip + ':' + p.port) + '"><span class="btn-icon">📋</span><span class="btn-text">' + t('copy') + '</span></button></td>' +
        '</tr>';
    }).join('');
  }

  function buildCards(list) {
    return list.map(function (p) {
      return '<div class="proxy-card">' +
        '<div class="proxy-card-header">' +
          '<span class="proxy-card-ip">' + escHtml(p.ip) + ':' + p.port + '</span>' +
          '<div class="proxy-card-badges">' + protoBadge(p.protocol) + '</div>' +
        '</div>' +
        '<div class="proxy-card-meta">' +
          '<span>' + countryFlag(p.country_code) + ' ' + escHtml(p.country_name || p.country_code) + '</span>' +
          '<span>' + anonBadge(p.anonymity) + '</span>' +
          '<span class="latency-inline ' + latencyClass(p.latency_ms) + '">' + p.latency_ms + 'ms</span>' +
          '<span>↑' + (p.uptime_pct || 0).toFixed(0) + '%</span>' +
        '</div>' +
        '<div style="margin-top:8px"><button class="btn-copy-ip" data-id="' + p.id + '" data-val="' + escHtml(p.ip + ':' + p.port) + '">' + t('copy') + '</button></div>' +
        '</div>';
    }).join('');
  }

  // ── 行事件绑定 ─────────────────────────────────────────────────
  function bindRowEvents() {
    // 复制按钮
    document.querySelectorAll('.btn-copy-ip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        copyToClipboard(btn.dataset.val, function () {
          var te = btn.querySelector('.btn-text');
          if (te) te.textContent = t('copiedBtn');
          btn.classList.add('copied');
          setTimeout(function () { if (te) te.textContent = t('copy'); btn.classList.remove('copied'); }, 2000);
          showToast(t('copied'), 'success');
          if (typeof gaTrackShare === 'function') gaTrackShare(TOOL, 'copy_ip_port');
        });
      });
    });

    // 行复选框
    document.querySelectorAll('.row-check').forEach(function (cb) {
      cb.addEventListener('change', function () {
        if (cb.checked) state.selectedIDs[cb.dataset.id] = cb.dataset.val;
        else delete state.selectedIDs[cb.dataset.id];
        updateBulkBar();
      });
    });
  }

  // ── 批量操作 ──────────────────────────────────────────────────
  function updateBulkBar() {
    var n = Object.keys(state.selectedIDs).length;
    if (dom.bulkCount) dom.bulkCount.textContent = n + ' selected';
    if (dom.bulkActionBar) dom.bulkActionBar.style.display = n > 0 ? 'flex' : 'none';
    if (dom.selectAll) dom.selectAll.checked = n > 0 && n === document.querySelectorAll('.row-check').length;
  }

  function clearSelection() {
    state.selectedIDs = {};
    if (dom.selectAll) dom.selectAll.checked = false;
    if (dom.bulkActionBar) dom.bulkActionBar.style.display = 'none';
  }

  function bulkCopy() {
    var vals = Object.values(state.selectedIDs);
    if (vals.length === 0) return;
    copyToClipboard(vals.join('\n'), function () {
      showToast((t('bulkCopySuccess') || 'Copied {n} proxies').replace('{n}', vals.length), 'success');
      if (typeof gaTrackShare === 'function') gaTrackShare(TOOL, 'bulk_copy');
    });
  }

  function bulkExport() {
    var vals = Object.values(state.selectedIDs);
    if (vals.length === 0) return;
    var csv = 'IP:Port\n' + vals.join('\n');
    var blob = new Blob([csv], { type: 'text/plain;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'proxy-selected-' + Date.now() + '.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── 筛选重置 ──────────────────────────────────────────────────
  function resetFilters() {
    state.protocol = 'all'; state.country = 'all'; state.anonymity = 'all';
    state.sort = 'latency'; state.page = 1; state.pageSize = 10; state.searchQuery = '';

    dom.protoTabs.forEach(function (tab, i) { tab.classList.toggle('active', i === 0); });
    if (dom.filterSearch) dom.filterSearch.value = '';
    if (dom.filterCountry) dom.filterCountry.value = 'all';
    if (dom.filterAnonymity) dom.filterAnonymity.value = 'all';
    if (dom.filterSort) dom.filterSort.value = 'latency';
    if (dom.pageSizeSelect) dom.pageSizeSelect.value = '10';

    state.countriesBuilt = false;
    fetchData();
  }

  // ── 刷新 ──────────────────────────────────────────────────────
  function triggerRefresh() {
    if (state.isSyncing) return;
    state.isSyncing = true;
    if (dom.syncDot) dom.syncDot.classList.add('syncing');
    if (dom.btnRefresh) { dom.btnRefresh.disabled = true; dom.btnRefresh.innerHTML = '⏳ ' + t('syncing'); }

    fetch(API_REFRESH, { method: 'POST' })
      .then(function (r) {
        if (r.status === 429) { showToast(t('refreshLimit'), 'error'); return; }
        showToast(t('refreshOk'), 'success');
        setTimeout(fetchData, 3000);
      })
      .catch(function () { showToast(t('fetchFail'), 'error'); })
      .finally(function () {
        state.isSyncing = false;
        if (dom.syncDot) dom.syncDot.classList.remove('syncing');
        if (dom.btnRefresh) {
          dom.btnRefresh.disabled = false;
          dom.btnRefresh.innerHTML = '🔄 <span class="btn-text">' + (t('refreshOk').split(',')[0] || 'Refresh') + '</span>';
        }
      });
  }

  // ── 导出 ──────────────────────────────────────────────────────
  function exportCSV() {
    if (state.filteredList.length === 0) return;
    var headers = ['IP', 'Port', 'Protocol', 'Country', 'Anonymity', 'Latency(ms)', 'Uptime(%)', 'Last Checked'];
    var rows = state.filteredList.map(function (p) {
      return [p.ip, p.port, p.protocol, p.country_name || p.country_code, p.anonymity, p.latency_ms, p.uptime_pct, p.last_checked].join(',');
    });
    downloadBlob([headers.join(',')].concat(rows).join('\r\n'), 'proxy-list-' + today() + '.csv', 'text/csv;charset=utf-8;');
    showToast(t('exportOk'), 'success');
  }

  function exportAll() {
    var params = new URLSearchParams({
      format: 'csv', protocol: state.protocol, country: state.country, anonymity: state.anonymity
    });
    window.open(API_EXPORT + '?' + params.toString(), '_blank');
    if (typeof gaTrackDownload === 'function') gaTrackDownload(TOOL, 'csv_all');
  }

  function downloadBlob(content, filename, mime) {
    var blob = new Blob(['\uFEFF' + content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }

  function today() { return new Date().toISOString().slice(0, 10); }

  // ── 同步倒计时（不再自动触发 fetchData） ──────────────────────
  function startSyncCountdown() {
    if (state.syncTimerID) clearInterval(state.syncTimerID);
    if (dom.syncDot) dom.syncDot.classList.remove('stale');

    state.syncTimerID = setInterval(function () {
      if (!state.lastSync) return;
      state.syncCountdown = Math.max(0, SYNC_INTERVAL_MS - (Date.now() - state.lastSync.getTime()));
      var pct = (state.syncCountdown / SYNC_INTERVAL_MS) * 100;
      if (dom.syncProgress) dom.syncProgress.style.width = pct.toFixed(1) + '%';
      updateSyncLabel();

      if (state.syncCountdown <= 0) {
        clearInterval(state.syncTimerID);
        state.syncTimerID = null;
        if (dom.syncNext) dom.syncNext.textContent = t('syncStale') || 'Data may be outdated';
        if (dom.syncDot) dom.syncDot.classList.add('stale');
        if (dom.syncProgress) {
          dom.syncProgress.style.background = 'var(--proxy-latency-mid)';
          dom.syncProgress.style.width = '100%';
        }
      }
    }, 1000);
  }

  function updateSyncLabel() {
    if (!state.lastSync) return;
    if (dom.syncLabel) dom.syncLabel.textContent = t('lastSync') + ': ' + relativeTime(state.lastSync.toISOString());
    if (state.syncCountdown > 0) {
      var min = Math.floor(state.syncCountdown / 60000);
      var sec = Math.floor((state.syncCountdown % 60000) / 1000);
      if (dom.syncNext) dom.syncNext.textContent = t('nextSync') + ': ' + min + 'm ' + (sec < 10 ? '0' : '') + sec + 's';
    }
  }

  // ── 分页 ──────────────────────────────────────────────────────
  function updatePagination() {
    var maxPage = Math.max(1, Math.ceil(state.total / state.pageSize));
    if (dom.pageInfo) dom.pageInfo.textContent = state.page + ' / ' + maxPage;
    if (dom.btnPrev) dom.btnPrev.disabled = state.page <= 1;
    if (dom.btnNext) dom.btnNext.disabled = state.page >= maxPage;
  }

  function updatePageSizeOptions() {
    if (!dom.pageSizeSelect) return;
    var tpl = t('pagPerPage') || '{n} / page';
    dom.pageSizeSelect.querySelectorAll('option').forEach(function (opt) {
      opt.textContent = tpl.replace('{n}', opt.value);
    });
  }

  function updateResultCount() {
    if (!dom.resultCount) return;
    var txt = state.total + ' proxies — page ' + state.page;
    if (state.searchQuery && state.filteredList.length !== state.fullList.length) {
      txt = state.filteredList.length + ' / ' + state.total + ' proxies — page ' + state.page;
    }
    dom.resultCount.textContent = txt;
  }

  function updateSortUI() {
    document.querySelectorAll('.th-sortable').forEach(function (th) {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (th.dataset.sort === state.sort) th.classList.add(state.sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    });
  }

  // ── 国家选项 ──────────────────────────────────────────────────
  function buildCountryOptions(counts) {
    if (!dom.filterCountry) return;
    var html = '<option value="all">' + countryFlag('') + ' ' + (I18N.all || 'All') + '</option>';
    counts.forEach(function (c) {
      html += '<option value="' + escHtml(c.code) + '">' + countryFlag(c.code) + ' ' + escHtml(c.name) + ' (' + c.count + ')</option>';
    });
    dom.filterCountry.innerHTML = html;
  }

  // ── UI 状态 ───────────────────────────────────────────────────
  function showLoading() {
    if (dom.loading) dom.loading.style.display = 'flex';
    if (dom.table) dom.table.style.display = 'none';
    if (dom.cardList) dom.cardList.style.display = 'none';
    if (dom.empty) dom.empty.style.display = 'none';
    if (dom.error) dom.error.style.display = 'none';
    if (dom.pagination) dom.pagination.style.display = 'none';
    if (dom.bulkActionBar) dom.bulkActionBar.style.display = 'none';
  }

  function hideAll() {
    if (dom.loading) dom.loading.style.display = 'none';
    if (dom.table) dom.table.style.display = 'none';
    if (dom.cardList) dom.cardList.style.display = 'none';
    if (dom.empty) dom.empty.style.display = 'none';
    if (dom.error) dom.error.style.display = 'none';
  }

  function showEmpty() {
    if (dom.empty) dom.empty.style.display = 'block';
    if (dom.pagination) dom.pagination.style.display = 'none';
  }

  function showError(msg) {
    hideAll();
    if (dom.errorMsg) dom.errorMsg.textContent = msg;
    if (dom.error) dom.error.style.display = 'block';
  }

  // ── 工具函数 ──────────────────────────────────────────────────
  function showToast(msg, type) {
    if (!dom.toast) return;
    dom.toast.textContent = msg;
    dom.toast.className = 'toast show toast-' + (type || 'info');
    clearTimeout(dom.toast._timer);
    dom.toast._timer = setTimeout(function () { dom.toast.classList.remove('show'); }, 2500);
  }

  function copyToClipboard(text, cb) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(cb).catch(function () { fallbackCopy(text, cb); });
    } else { fallbackCopy(text, cb); }
  }

  function fallbackCopy(text, cb) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); if (cb) cb(); } catch (e) { /* silent */ }
    document.body.removeChild(ta);
  }

  function latencyClass(ms) {
    if (ms < 500) return 'lat-ok';
    if (ms < 2000) return 'lat-mid';
    return 'lat-bad';
  }

  function latencyBar(ms) {
    var cls = latencyClass(ms);
    var pct = Math.min(100, (ms / 5000) * 100);
    return '<div class="latency-cell"><div class="latency-bar-wrap"><div class="latency-bar-fill ' + cls + '" style="width:' + pct.toFixed(0) + '%"></div></div><span class="latency-ms ' + cls + '">' + ms + 'ms</span></div>';
  }

  function anonBadge(level) {
    var labels = { elite: t('anonElite'), anonymous: t('anonAnonymous'), transparent: t('anonTransparent') };
    var classes = { elite: 'anon-elite', anonymous: 'anon-anonymous', transparent: 'anon-transparent' };
    var icons = { elite: '🟢', anonymous: '🟡', transparent: '🔴' };
    var l = level || 'anonymous';
    return '<span class="anon-badge ' + (classes[l] || '') + '">' + (icons[l] || '') + ' ' + (labels[l] || l) + '</span>';
  }

  function protoBadge(protocol) {
    var p = (protocol || 'http').toLowerCase();
    var cls = { http: 'proto-http', https: 'proto-https', socks4: 'proto-socks4', socks5: 'proto-socks5' };
    return '<span class="proto-badge ' + (cls[p] || 'proto-http') + '">' + p.toUpperCase() + '</span>';
  }

  function uptimeBar(pct) {
    var p = Math.min(100, Math.max(0, parseFloat(pct) || 0));
    return '<div class="uptime-bar-wrap"><div class="uptime-bar-bg"><div class="uptime-bar-fill" style="width:' + p.toFixed(0) + '%"></div></div><span class="uptime-pct">' + p.toFixed(0) + '%</span></div>';
  }

  function countryFlag(code) {
    if (!code || code.length !== 2) return '🌐';
    var cp = Array.from(code.toUpperCase()).map(function (c) { return 0x1F1E6 + c.charCodeAt(0) - 65; });
    return String.fromCodePoint(cp[0], cp[1]);
  }

  function relativeTime(isoStr) {
    if (!isoStr) return '—';
    var d = new Date(isoStr);
    var diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return Math.floor(diff) + 's ago';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.ProxyList = { reload: fetchData };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
