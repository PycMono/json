'use strict';

/**
 * ga-events.js — Google Analytics 4 事件追踪公共库
 * EnableGA=false 时 window.gtag 不存在，所有函数静默忽略，不影响业务逻辑。
 * 引入顺序：ga-events.js 必须在业务 JS 之前加载。
 */

/**
 * 安全封装 gtag 调用 — 当 gtag 不存在时静默忽略
 * @param {string} eventName
 * @param {Object} params
 */
function trackEvent(eventName, params = {}) {
  if (typeof gtag !== 'function') return;
  gtag('event', eventName, params);
}

/* ══════════════════════════════════════════
   通用事件：所有工具页面共用
══════════════════════════════════════════ */

/**
 * 文件上传
 * @param {string} toolName       工具名，如 'img-compress'
 * @param {number} fileCount      文件数量
 * @param {number} totalSizeMB    总大小（MB）
 */
function gaTrackUpload(toolName, fileCount, totalSizeMB) {
  trackEvent('file_upload', {
    event_category: toolName,
    file_count:     fileCount,
    total_size_mb:  parseFloat(totalSizeMB.toFixed(2)),
  });
}

/**
 * 处理完成
 * @param {string} toolName
 * @param {number} fileCount
 * @param {number} durationMs     处理耗时（毫秒）
 */
function gaTrackProcessDone(toolName, fileCount, durationMs) {
  trackEvent('process_complete', {
    event_category: toolName,
    file_count:     fileCount,
    duration_ms:    durationMs,
  });
}

/**
 * 文件下载（单张）
 * @param {string} toolName
 * @param {string} fileType       MIME type，如 'image/jpeg'
 */
function gaTrackDownload(toolName, fileType) {
  trackEvent('file_download', {
    event_category: toolName,
    file_type:      fileType,
  });
}

/**
 * 批量打包下载（ZIP）
 * @param {string} toolName
 * @param {number} fileCount
 */
function gaTrackDownloadAll(toolName, fileCount) {
  trackEvent('download_all_zip', {
    event_category: toolName,
    file_count:     fileCount,
  });
}

/**
 * 导出格式（JSON / CSV / TXT 等）
 * @param {string} toolName
 * @param {string} format         导出格式，如 'csv'
 */
function gaTrackExport(toolName, format) {
  trackEvent('export', {
    event_category: toolName,
    export_format:  format,
  });
}

/**
 * 工具参数变更（如压缩质量、输出格式等）
 * @param {string} toolName
 * @param {string} settingName    设置项名称，如 'quality'
 * @param {*}      value          新值
 */
function gaTrackSettingChange(toolName, settingName, value) {
  trackEvent('setting_change', {
    event_category: toolName,
    setting_name:   settingName,
    setting_value:  String(value),
  });
}

/**
 * 错误发生
 * @param {string} toolName
 * @param {string} errorType      错误类型标识
 * @param {string} errorMsg       错误信息（自动截断至 100 字符）
 */
function gaTrackError(toolName, errorType, errorMsg) {
  trackEvent('tool_error', {
    event_category: toolName,
    error_type:     errorType,
    error_message:  String(errorMsg).slice(0, 100),
  });
}

/**
 * 分享 / 复制
 * @param {string} toolName
 * @param {string} method         'copy_link' | 'copy_field' | 'native_share'
 */
function gaTrackShare(toolName, method) {
  trackEvent('share', {
    event_category: toolName,
    method:         method,
  });
}

/* ══════════════════════════════════════════
   Google Ads 转换事件
   ═════════════════════════════════════════ */

/**
 * 追踪工具使用转化（核心转化事件）
 * @param {string} toolName       工具名，如 'json-formatter'
 * @param {string} conversionLabel  转化标签，由服务端注入
 */
function gaTrackConversion(toolName, conversionLabel) {
  if (typeof gtag !== 'function') return;
  if (typeof window.__GADS_CONV_ID__ !== 'undefined' && conversionLabel) {
    gtag('event', 'conversion', {
      'send_to': window.__GADS_CONV_ID__ + '/' + conversionLabel,
      'value': 1.0,
      'currency': 'USD'
    });
  }
}

/**
 * 追踪 SMS 购买转化
 */
function gaTrackSMSConversion() {
  if (typeof gtag !== 'function') return;
  if (typeof window.__GADS_CONV_SMS__ !== 'undefined') {
    gtag('event', 'conversion', {
      'send_to': window.__GADS_CONV_SMS__,
      'value': 1.0,
      'currency': 'USD'
    });
  }
}

/**
 * 追踪页面停留（互动优化 — 用户在页面停留超过 30 秒视为互动）
 */
function gaTrackEngagedVisit() {
  trackEvent('engaged_visit', {
    engagement_duration_seconds: 30,
  });
}

/* ══════════════════════════════════════════
   页面停留时长心跳追踪（PageEngagementTracker）
   ═════════════════════════════════════════ */

var PageEngagementTracker = (function() {
  var HEARTBEAT_INTERVAL = 30000; // 心跳间隔 30 秒
  var FIRST_HEARTBEAT    = 10000; // 首次心跳 10 秒（与 GA4 user_engagement 对齐）

  var activeStart   = Date.now(); // 本次前台活跃开始时间
  var totalActiveMs = 0;          // 累计前台活跃毫秒数
  var timer         = null;
  var path          = location.pathname + location.search;
  var sent          = false; // 是否已发送 leave（防止重复）

  function now() { return Date.now(); }

  function accumulate() {
    totalActiveMs += now() - activeStart;
    activeStart = now();
  }

  function sendHeartbeat() {
    accumulate();
    var sec = Math.round(totalActiveMs / 1000);
    trackEvent('page_heartbeat', {
      engagement_time_msec: totalActiveMs,
      total_engagement_seconds: sec,
      page_path: path,
    });
  }

  function sendLeave() {
    if (sent) return;
    sent = true;
    accumulate();
    var sec = Math.round(totalActiveMs / 1000);
    if (sec < 1) return; // 不足 1 秒不发送
    trackEvent('page_leave', {
      total_engagement_seconds: sec,
      engagement_time_msec: totalActiveMs,
      page_path: path,
    });
  }

  function startTimer(interval) {
    stopTimer();
    timer = setInterval(function() {
      if (!document.hidden) {
        sendHeartbeat();
      }
    }, interval);
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  // ── Visibility 感知 ──────────────────────────────────
  function onVisibilityChange() {
    if (document.hidden) {
      // 切后台：累积时间，停止心跳
      accumulate();
      stopTimer();
      sendLeave();
    } else {
      // 回前台：重新开始计时
      sent = false;
      activeStart = now();
      startTimer(HEARTBEAT_INTERVAL);
    }
  }

  // ── 公开 API ─────────────────────────────────────────
  function init() {
    if (typeof gtag !== 'function') return;

    // 首次心跳：10 秒后
    setTimeout(function() {
      if (!document.hidden) {
        sendHeartbeat();
        startTimer(HEARTBEAT_INTERVAL);
      }
    }, FIRST_HEARTBEAT);

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', sendLeave);
    // mobile: pagehide 比 beforeunload 更可靠
    window.addEventListener('pagehide', sendLeave);
  }

  return { init: init };
})();

/* ══════════════════════════════════════════
   补充通用工具埋点函数
   ═════════════════════════════════════════ */

/**
 * 手动发送 page_view（适用于 SPA / 动态页面）
 * @param {string} pagePath 页面路径
 */
function gaTrackPageView(pagePath) {
  if (typeof gtag !== 'function') return;
  gtag('event', 'page_view', { page_path: pagePath });
}

/**
 * 追踪工具使用事件
 * @param {string} toolName 工具名
 */
function gaTrackToolUse(toolName) {
  trackEvent('tool_use', {
    event_category: toolName,
    tool_name: toolName,
  });
}

/**
 * 追踪页面滚动到 90%
 */
function gaTrackScroll90() {
  trackEvent('scroll_90', {
    page_path: location.pathname,
  });
}

/* ══════════════════════════════════════════
   Weather Tool 追踪函数
   ═════════════════════════════════════════ */

/**
 * 天气图层切换
 * @param {string} layer 'temperature' | 'precipitation' | 'clouds' | 'pressure' | 'wind'
 */
function gaTrackLayerSwitch(layer) {
  trackEvent('weather_layer_switch', {
    layer: layer,
    page_path: location.pathname,
  });
}

/**
 * 天气截图保存
 */
function gaTrackSnapshot() {
  trackEvent('weather_snapshot', {
    page_path: location.pathname,
  });
}

/**
 * 天气单位切换
 * @param {string} type 'temp' | 'wind' | 'pressure'
 * @param {string} value 新单位值
 */
function gaTrackUnitChange(type, value) {
  trackEvent('weather_unit_change', {
    unit_type: type,
    unit_value: value,
    page_path: location.pathname,
  });
}

/**
 * 天气预报标签切换
 * @param {string} tab 'hourly24' | 'daily14' | 'history'
 */
function gaTrackForecastTab(tab) {
  trackEvent('weather_forecast_tab', {
    tab: tab,
    page_path: location.pathname,
  });
}

/**
 * 天气城市搜索
 * @param {string} query 搜索关键词
 * @param {string} method 'text' | 'geolocation' | 'map_click' | 'recent'
 */
function gaTrackWeatherSearch(query, method) {
  trackEvent('weather_search', {
    search_term: String(query).slice(0, 50),
    search_method: method,
    page_path: location.pathname,
  });
}

/**
 * 天气数据加载完成
 * @param {string} cityName
 * @param {number} durationMs 加载耗时
 */
function gaTrackWeatherLoaded(cityName, durationMs) {
  trackEvent('weather_loaded', {
    city: String(cityName).slice(0, 50),
    duration_ms: Math.round(durationMs),
    page_path: location.pathname,
  });
}

/**
 * 天气加载错误
 * @param {string} errorType
 * @param {string} errorMsg
 */
function gaTrackWeatherError(errorType, errorMsg) {
  trackEvent('weather_error', {
    error_type: errorType,
    error_message: String(errorMsg).slice(0, 100),
    page_path: location.pathname,
  });
}

/* ══════════════════════════════════════════
   通用 UI 交互追踪
   ═════════════════════════════════════════ */

/**
 * 表单提交
 * @param {string} formName
 * @param {string} toolName
 */
function gaTrackFormSubmit(formName, toolName) {
  trackEvent('form_submit', {
    event_category: toolName,
    form_name: formName,
    page_path: location.pathname,
  });
}

/**
 * 标签页/选项卡切换
 * @param {string} tabName
 * @param {string} tabGroup
 * @param {string} toolName
 */
function gaTrackTabSwitch(tabName, tabGroup, toolName) {
  trackEvent('tab_switch', {
    event_category: toolName,
    tab_name: tabName,
    tab_group: tabGroup,
    page_path: location.pathname,
  });
}

/**
 * 模态框打开
 * @param {string} modalName
 * @param {string} toolName
 */
function gaTrackModalOpen(modalName, toolName) {
  trackEvent('modal_open', {
    event_category: toolName,
    modal_name: modalName,
    page_path: location.pathname,
  });
}

/**
 * 模态框关闭
 * @param {string} modalName
 * @param {string} toolName
 */
function gaTrackModalClose(modalName, toolName) {
  trackEvent('modal_close', {
    event_category: toolName,
    modal_name: modalName,
    page_path: location.pathname,
  });
}

/* ══════════════════════════════════════════
   增强事件函数：工具交互 / AI / 复制 / 偏好 / 搜索 / 错误
   ═════════════════════════════════════════ */

/**
 * 工具首次交互（输入聚焦 / 按钮点击 / 文件拖入）
 * @param {string} toolName
 * @param {string} interactionType 'input_focus' | 'button_click' | 'file_upload_start'
 */
function gaTrackToolInteraction(toolName, interactionType) {
  trackEvent('tool_interaction', {
    event_category:    toolName,
    interaction_type:  interactionType,
    page_path:         location.pathname,
  });
}

/**
 * AI API 调用追踪
 * @param {string} toolName
 * @param {string} provider   'openai' | 'deepseek' | 'gemini' | 'doubao' | 'claude'
 * @param {string} model
 * @param {number} inputTokens
 * @param {number} outputTokens
 */
function gaTrackAIRequest(toolName, provider, model, inputTokens, outputTokens) {
  trackEvent('ai_request', {
    event_category: toolName,
    ai_provider:    provider,
    ai_model:       model,
    input_tokens:   inputTokens || 0,
    output_tokens:  outputTokens || 0,
  });
}

/**
 * 复制工具输出结果
 * @param {string} toolName
 * @param {string} contentType 'json' | 'text' | 'code' | 'color_value' | 'image'
 */
function gaTrackResultCopy(toolName, contentType) {
  trackEvent('result_copy', {
    event_category: toolName,
    content_type:   contentType,
    page_path:      location.pathname,
  });
}

/**
 * 语言切换
 * @param {string} fromLang
 * @param {string} toLang
 */
function gaTrackLanguageChange(fromLang, toLang) {
  trackEvent('language_change', {
    from_language: fromLang,
    to_language:   toLang,
    page_path:     location.pathname,
  });
}

/**
 * 主题切换
 * @param {string} theme 'light' | 'dark' | 'forest' | 'ocean' | 'sunset'
 */
function gaTrackThemeChange(theme) {
  trackEvent('theme_change', {
    theme:     theme,
    page_path: location.pathname,
  });
}

/**
 * 站内搜索
 * @param {string} searchType  'nav' | 'hero' | 'error' | 'json'
 * @param {string} query
 * @param {number} resultCount
 */
function gaTrackSiteSearch(searchType, query, resultCount) {
  trackEvent('site_search', {
    search_type:  searchType,
    search_term:  String(query).slice(0, 100),
    result_count: resultCount,
  });
}

/**
 * 错误页面浏览（404 / 500）
 * @param {string} errorCode '404' | '500'
 * @param {string} referrer
 */
function gaTrackPageError(errorCode, referrer) {
  trackEvent('page_error', {
    error_code: errorCode,
    referrer:   String(referrer).slice(0, 200),
    page_path:  location.pathname,
  });
}

/* ══════════════════════════════════════════
   Auth 认证追踪（login / register / logout）
   ═════════════════════════════════════════ */

/**
 * 用户登录
 * @param {string} method 'google' | 'microsoft' | 'email' | 'success'
 */
function gaTrackLogin(method) {
  trackEvent('login', {
    method: method,
    page_path: location.pathname,
  });
}

/**
 * 用户注册
 * @param {string} method 'google' | 'microsoft' | 'email'
 */
function gaTrackRegister(method) {
  trackEvent('sign_up', {
    method: method,
    page_path: location.pathname,
  });
}

/**
 * 用户登出
 */
function gaTrackLogout() {
  trackEvent('logout', {
    page_path: location.pathname,
  });
}

/* ══════════════════════════════════════════
   E-Commerce 电商追踪（Token / SMS 购买）
   ═════════════════════════════════════════ */

/**
 * 浏览商品
 * @param {string} itemName  商品名称
 * @param {number} price     价格（USD）
 */
function gaTrackViewItem(itemName, price) {
  trackEvent('view_item', {
    currency: 'USD',
    value: parseFloat(price) || 0,
    items: [{ item_name: String(itemName).slice(0, 100) }],
    page_path: location.pathname,
  });
}

/**
 * 加入购物车
 * @param {string} itemName  商品名称
 * @param {number} price     价格（USD）
 */
function gaTrackAddToCart(itemName, price) {
  trackEvent('add_to_cart', {
    currency: 'USD',
    value: parseFloat(price) || 0,
    items: [{ item_name: String(itemName).slice(0, 100) }],
    page_path: location.pathname,
  });
}

/**
 * 开始结账
 * @param {string} itemName  商品名称
 * @param {number} price     价格（USD）
 */
function gaTrackBeginCheckout(itemName, price) {
  trackEvent('begin_checkout', {
    currency: 'USD',
    value: parseFloat(price) || 0,
    items: [{ item_name: String(itemName).slice(0, 100) }],
    page_path: location.pathname,
  });
}

/**
 * 购买完成
 * @param {string} itemName      商品名称
 * @param {number} price         价格（USD）
 * @param {string} transactionId 交易ID
 */
function gaTrackPurchase(itemName, price, transactionId) {
  trackEvent('purchase', {
    transaction_id: String(transactionId).slice(0, 100),
    currency: 'USD',
    value: parseFloat(price) || 0,
    items: [{ item_name: String(itemName).slice(0, 100) }],
    page_path: location.pathname,
  });
}

/* ══════════════════════════════════════════
   自动追踪（页面加载后自动注册）
   ═════════════════════════════════════════ */

(function autoTrack() {
  // ── 1. 页面停留时长心跳（PageEngagementTracker）──
  // 由 base.html / json/_base.html 模板中显式调用 PageEngagementTracker.init()
  // （需要等待 gtag 可用，由模板控制时机）

  // ── 2. 滚动深度追踪 ──
  var scrollMilestones = [25, 50, 75, 90];
  var scrollFired = {};
  scrollMilestones.forEach(function(p) { scrollFired[p] = false; });

  function onScroll() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    var pct = Math.round((scrollTop / docHeight) * 100);
    scrollMilestones.forEach(function(m) {
      if (!scrollFired[m] && pct >= m) {
        scrollFired[m] = true;
        trackEvent('scroll_depth', {
          percent_scrolled: m,
          page_path: location.pathname,
        });
      }
    });
  }

  var scrollThrottle = false;
  window.addEventListener('scroll', function() {
    if (!scrollThrottle) {
      scrollThrottle = true;
      requestAnimationFrame(function() { onScroll(); scrollThrottle = false; });
    }
  }, { passive: true });

  // ── 3. 外链点击追踪 ──
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a || !a.href) return;
    var isExternal = a.hostname && a.hostname !== location.hostname;
    if (isExternal) {
      trackEvent('outbound_click', {
        link_url: a.href,
        link_domain: a.hostname,
        page_path: location.pathname,
      });
    }
  }, true);

  // ── 4. CTA 按钮点击追踪 ──
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-ga]');
    if (!btn) return;
    var gaEvent = btn.getAttribute('data-ga');
    if (!gaEvent) return;
    trackEvent('cta_click', {
      event_category: btn.closest('[data-ga-category]')?.getAttribute('data-ga-category') || 'general',
      cta_name: gaEvent,
      cta_text: (btn.textContent || '').trim().slice(0, 50),
      page_path: location.pathname,
    });
  }, true);

  // ── 5. 自动 tool_use 追踪（从 URL 路径推导工具名）──
  (function autoToolUse() {
    var skip = ['/','/about','/privacy-policy','/terms-of-service','/contact',
                '/cookie-policy','/sitemap','/health','/ping'];
    var path = location.pathname;
    if (path !== '/' && path.charAt(path.length - 1) === '/') {
      path = path.slice(0, -1);
    }
    if (skip.indexOf(path) >= 0) return;
    var toolName = window.__TBN_TOOL__ || path.replace(/^\//, '').replace(/\//g, '-');
    if (!toolName) return;
    var params = {
      event_category: toolName,
      tool_name:      toolName,
      page_path:      location.pathname,
    };
    if (window.__TBN_TOOL_CATEGORY__) {
      params.tool_category = window.__TBN_TOOL_CATEGORY__;
    }
    trackEvent('tool_use', params);
  })();

  // ── 6. 自动首次交互追踪 ──
  (function() {
    var fired = false;
    function onFirst(type) {
      if (fired) return;
      fired = true;
      var toolName = window.__TBN_TOOL__ || location.pathname.replace(/^\//, '').replace(/\//g, '-');
      gaTrackToolInteraction(toolName, type);
    }
    document.addEventListener('focusin', function(e) {
      var tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) {
        onFirst('input_focus');
      }
    }, true);
    document.addEventListener('drop', function() { onFirst('file_upload_start'); }, true);
    document.addEventListener('click', function(e) {
      if (e.target.closest('button') && !e.target.closest('nav') && !e.target.closest('.cky-')) {
        onFirst('button_click');
      }
    }, true);
  })();

  // ── 7. 自动结果复制追踪 ──
  document.addEventListener('copy', function() {
    var sel = window.getSelection();
    if (!sel || !sel.toString()) return;
    var node = sel.anchorNode;
    while (node && node !== document) {
      if (node.nodeType === 1) {
        var el = node;
        if ((el.classList && (el.classList.contains('result') || el.classList.contains('output') || el.classList.contains('jt-output')))
            || el.closest('[data-ga-copy]')) {
          var toolName = window.__TBN_TOOL__ || location.pathname.replace(/^\//, '').replace(/\//g, '-');
          gaTrackResultCopy(toolName, 'text');
          return;
        }
      }
      node = node.parentNode;
    }
  });

  // ── 8. 自动工具操作按钮点击追踪（在 .tool-container 或 [data-tool-action] 内的按钮）──
  (function autoToolAction() {
    var toolName = window.__TBN_TOOL__ || location.pathname.replace(/^\//, '').replace(/\//g, '-');
    if (!toolName) return;
    var actionSelectors = [
      '[data-tool-action]',
      '.tool-container button:not([data-ga])',
      '.tool-action-btn',
      '.btn-primary:not([data-ga])',
      '.btn-process:not([data-ga])',
      '.btn-generate:not([data-ga])',
      '.btn-convert:not([data-ga])',
      '.btn-encode:not([data-ga])',
      '.btn-decode:not([data-ga])',
      '.btn-format:not([data-ga])',
      '.btn-validate:not([data-ga])',
      '.btn-minify:not([data-ga])',
      '.btn-pretty:not([data-ga])',
      '.btn-check:not([data-ga])',
      '.btn-run:not([data-ga])',
      '.btn-calculate:not([data-ga])',
    ];
    document.addEventListener('click', function(e) {
      var btn = e.target.closest(actionSelectors.join(', '));
      if (!btn) return;
      // Skip nav, cookie banner, and already-tracked elements
      if (e.target.closest('nav') || e.target.closest('.cky-') || e.target.closest('[data-ga]')) return;
      var action = btn.getAttribute('data-tool-action');
      if (!action) {
        // Derive action from button text or class
        var text = (btn.textContent || '').trim().toLowerCase();
        if (text.indexOf('copy') >= 0 || text.indexOf('复制') >= 0) action = 'copy';
        else if (text.indexOf('download') >= 0 || text.indexOf('下载') >= 0) action = 'download';
        else if (text.indexOf('export') >= 0 || text.indexOf('导出') >= 0) action = 'export';
        else if (text.indexOf('save') >= 0 || text.indexOf('保存') >= 0) action = 'save';
        else if (text.indexOf('generate') >= 0 || text.indexOf('生成') >= 0) action = 'generate';
        else if (text.indexOf('convert') >= 0 || text.indexOf('转换') >= 0) action = 'convert';
        else if (text.indexOf('compress') >= 0 || text.indexOf('压缩') >= 0) action = 'compress';
        else if (text.indexOf('resize') >= 0 || text.indexOf('调整') >= 0) action = 'resize';
        else if (text.indexOf('merge') >= 0 || text.indexOf('合并') >= 0) action = 'merge';
        else if (text.indexOf('split') >= 0 || text.indexOf('拆分') >= 0) action = 'split';
        else if (text.indexOf('encrypt') >= 0 || text.indexOf('加密') >= 0) action = 'encrypt';
        else if (text.indexOf('decrypt') >= 0 || text.indexOf('解密') >= 0) action = 'decrypt';
        else if (text.indexOf('validate') >= 0 || text.indexOf('验证') >= 0) action = 'validate';
        else if (text.indexOf('format') >= 0 || text.indexOf('格式化') >= 0) action = 'format';
        else if (text.indexOf('minify') >= 0 || text.indexOf('压缩') >= 0) action = 'minify';
        else if (text.indexOf('pretty') >= 0 || text.indexOf('美化') >= 0) action = 'pretty';
        else if (text.indexOf('check') >= 0 || text.indexOf('检查') >= 0) action = 'check';
        else if (text.indexOf('run') >= 0 || text.indexOf('运行') >= 0) action = 'run';
        else if (text.indexOf('send') >= 0 || text.indexOf('发送') >= 0) action = 'send';
        else if (text.indexOf('start') >= 0 || text.indexOf('开始') >= 0) action = 'start';
        else if (text.indexOf('stop') >= 0 || text.indexOf('停止') >= 0) action = 'stop';
        else if (text.indexOf('refresh') >= 0 || text.indexOf('刷新') >= 0) action = 'refresh';
        else action = 'button_click';
      }
      trackEvent('tool_action', {
        event_category: toolName,
        tool_name: toolName,
        action: action,
        button_text: (btn.textContent || '').trim().slice(0, 50),
        page_path: location.pathname,
      });
    }, true);
  })();

  // ── 9. 自动表单提交追踪 ──
  (function autoFormSubmit() {
    var toolName = window.__TBN_TOOL__ || location.pathname.replace(/^\//, '').replace(/\//g, '-');
    if (!toolName) return;
    document.addEventListener('submit', function(e) {
      var form = e.target;
      if (!form || form.tagName !== 'FORM') return;
      var formName = form.getAttribute('data-form-name') || form.id || form.className || 'unknown';
      trackEvent('form_submit', {
        event_category: toolName,
        tool_name: toolName,
        form_name: formName.slice(0, 50),
        page_path: location.pathname,
      });
    }, true);
  })();

  // ── 10. 自动下载链接追踪 ──
  (function autoDownload() {
    var toolName = window.__TBN_TOOL__ || location.pathname.replace(/^\//, '').replace(/\//g, '-');
    if (!toolName) return;
    document.addEventListener('click', function(e) {
      var el = e.target.closest('a[download], .download-link, [data-download]');
      if (!el) return;
      var fileName = el.getAttribute('download') || el.getAttribute('data-download') || '';
      var fileType = '';
      if (fileName) {
        var ext = fileName.split('.').pop();
        if (ext) fileType = ext.toLowerCase();
      }
      trackEvent('file_download', {
        event_category: toolName,
        tool_name: toolName,
        file_name: fileName.slice(0, 100),
        file_type: fileType,
        page_path: location.pathname,
      });
    }, true);
  })();

  // ── 11. 自动错误提示追踪 ──
  (function autoErrorToast() {
    var toolName = window.__TBN_TOOL__ || location.pathname.replace(/^\//, '').replace(/\//g, '-');
    if (!toolName) return;
    // Observe DOM for toast/error elements appearing
    if (typeof MutationObserver === 'undefined') return;
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType !== 1) return;
          var el = node;
          if (el.classList && (
            el.classList.contains('toast') ||
            el.classList.contains('error') ||
            el.classList.contains('alert') ||
            el.classList.contains('wq-toast--error') ||
            el.getAttribute('data-error')
          )) {
            var msg = (el.textContent || '').trim().slice(0, 100);
            trackEvent('tool_error', {
              event_category: toolName,
              tool_name: toolName,
              error_type: 'client_toast',
              error_message: msg,
              page_path: location.pathname,
            });
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  })();

  // ── 12. 自动输入框粘贴追踪（指示用户正在积极使用工具）──
  (function autoPaste() {
    var toolName = window.__TBN_TOOL__ || location.pathname.replace(/^\//, '').replace(/\//g, '-');
    if (!toolName) return;
    var fired = false;
    document.addEventListener('paste', function(e) {
      if (fired) return;
      var target = e.target;
      if (!target) return;
      var tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
        fired = true;
        trackEvent('tool_paste', {
          event_category: toolName,
          tool_name: toolName,
          page_path: location.pathname,
        });
      }
    }, true);
  })();

  // ── 13. 用户属性设置 ──
  if (typeof gtag === 'function') {
    var isLoggedIn = false;
    try {
      isLoggedIn = !!document.cookie.match(/tbn_session=/);
    } catch (_) {}
    gtag('set', 'user_properties', {
      preferred_language: document.documentElement.lang || 'en',
      theme: localStorage.getItem('tbn-theme') || 'light',
      is_logged_in: isLoggedIn,
    });
  }
})();

