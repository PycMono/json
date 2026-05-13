/** Cmd+K Command Palette — global tool navigation */
(function() {
  'use strict';

  const ALL_TOOLS = [
    // JSON Validate & Format
    { key: 'validate', icon: '✓', name: 'JSON Validator', nameZH: 'JSON 验证器', group: 'Validate & Format', keywords: 'validate check syntax' },
    { key: 'pretty', icon: '✨', name: 'JSON Formatter', nameZH: 'JSON 格式化', group: 'Validate & Format', keywords: 'format beautify prettify' },
    { key: 'minify', icon: '🗜️', name: 'JSON Minifier', nameZH: 'JSON 压缩', group: 'Validate & Format', keywords: 'compress compact shrink' },
    { key: 'repair', icon: '🔧', name: 'JSON Repair', nameZH: 'JSON 修复', group: 'Validate & Format', keywords: 'fix broken malformed' },
    { key: 'sort-keys', icon: '🔤', name: 'Sort Keys', nameZH: '排序键', group: 'Validate & Format', keywords: 'sort order alphabetize' },
    { key: 'escape', icon: '⛓️', name: 'JSON Escape', nameZH: 'JSON 转义', group: 'Validate & Format', keywords: 'escape stringify encode' },
    { key: 'unescape', icon: '🔓', name: 'JSON Unescape', nameZH: 'JSON 反转义', group: 'Validate & Format', keywords: 'unescape decode' },
    { key: 'stringify', icon: '📝', name: 'JSON Stringify', nameZH: 'JSON 字符串化', group: 'Validate & Format', keywords: 'string to json' },

    // JSON View & Query
    { key: 'tree', icon: '🌳', name: 'JSON Tree View', nameZH: 'JSON 树视图', group: 'View & Query', keywords: 'tree visual explorer' },
    { key: 'table', icon: '📊', name: 'JSON Table View', nameZH: 'JSON 表格视图', group: 'View & Query', keywords: 'table grid spreadsheet' },
    { key: 'diff', icon: '📑', name: 'JSON Diff', nameZH: 'JSON 对比', group: 'View & Query', keywords: 'diff compare difference' },
    { key: 'path', icon: '📍', name: 'JSONPath', nameZH: 'JSONPath', group: 'View & Query', keywords: 'jsonpath query selector' },
    { key: 'search', icon: '🔍', name: 'JSON Search', nameZH: 'JSON 搜索', group: 'View & Query', keywords: 'search find grep' },
    { key: 'size', icon: '📏', name: 'JSON Size', nameZH: 'JSON 大小', group: 'View & Query', keywords: 'size bytes analyze' },
    { key: 'flatten', icon: '🗂️', name: 'JSON Flatten', nameZH: 'JSON 扁平化', group: 'View & Query', keywords: 'flatten unflatten dot' },

    // JSON Converters
    { key: 'to-csv', icon: '📄', name: 'JSON to CSV', nameZH: 'JSON 转 CSV', group: 'Converters', keywords: 'csv export excel' },
    { key: 'from-csv', icon: '📥', name: 'CSV to JSON', nameZH: 'CSV 转 JSON', group: 'Converters', keywords: 'csv import parse' },
    { key: 'to-yaml', icon: '📋', name: 'JSON to YAML', nameZH: 'JSON 转 YAML', group: 'Converters', keywords: 'yaml yml export' },
    { key: 'from-yaml', icon: '📥', name: 'YAML to JSON', nameZH: 'YAML 转 JSON', group: 'Converters', keywords: 'yaml yml import' },
    { key: 'to-xml', icon: '🌐', name: 'JSON to XML', nameZH: 'JSON 转 XML', group: 'Converters', keywords: 'xml export convert' },
    { key: 'from-xml', icon: '📥', name: 'XML to JSON', nameZH: 'XML 转 JSON', group: 'Converters', keywords: 'xml import parse' },
    { key: 'to-sql', icon: '🗃️', name: 'JSON to SQL', nameZH: 'JSON 转 SQL', group: 'Converters', keywords: 'sql database export' },
    { key: 'from-sql', icon: '📥', name: 'SQL to JSON', nameZH: 'SQL 转 JSON', group: 'Converters', keywords: 'sql import parse' },
    { key: 'to-toml', icon: '⚙️', name: 'JSON to TOML', nameZH: 'JSON 转 TOML', group: 'Converters', keywords: 'toml config export' },
    { key: 'from-toml', icon: '📥', name: 'TOML to JSON', nameZH: 'TOML 转 JSON', group: 'Converters', keywords: 'toml config import' },
    { key: 'to-markdown', icon: '📝', name: 'JSON to Markdown', nameZH: 'JSON 转 Markdown', group: 'Converters', keywords: 'markdown md table' },
    { key: 'to-query', icon: '🔗', name: 'JSON to Query', nameZH: 'JSON 转查询', group: 'Converters', keywords: 'querystring url params' },
    { key: 'from-query', icon: '📥', name: 'Query to JSON', nameZH: '查询转 JSON', group: 'Converters', keywords: 'querystring url parse' },
    { key: 'to-excel', icon: '📗', name: 'JSON to Excel', nameZH: 'JSON 转 Excel', group: 'Converters', keywords: 'excel xlsx export' },
    { key: 'from-excel', icon: '📥', name: 'Excel to JSON', nameZH: 'Excel 转 JSON', group: 'Converters', keywords: 'excel xlsx import' },

    // JSON Code Generators
    { key: 'to-typescript', icon: '🔷', name: 'JSON to TypeScript', nameZH: 'JSON 转 TypeScript', group: 'Code Generators', keywords: 'typescript ts types interface' },
    { key: 'to-python', icon: '🐍', name: 'JSON to Python', nameZH: 'JSON 转 Python', group: 'Code Generators', keywords: 'python py dataclass' },
    { key: 'to-go', icon: '🔵', name: 'JSON to Go', nameZH: 'JSON 转 Go', group: 'Code Generators', keywords: 'go golang struct' },
    { key: 'to-java', icon: '☕', name: 'JSON to Java', nameZH: 'JSON 转 Java', group: 'Code Generators', keywords: 'java class pojo' },
    { key: 'to-rust', icon: '🦀', name: 'JSON to Rust', nameZH: 'JSON 转 Rust', group: 'Code Generators', keywords: 'rust struct serde' },
    { key: 'to-csharp', icon: '🔷', name: 'JSON to C#', nameZH: 'JSON 转 C#', group: 'Code Generators', keywords: 'csharp dotnet class' },
    { key: 'to-kotlin', icon: '🟣', name: 'JSON to Kotlin', nameZH: 'JSON 转 Kotlin', group: 'Code Generators', keywords: 'kotlin data class' },
    { key: 'to-swift', icon: '🍎', name: 'JSON to Swift', nameZH: 'JSON 转 Swift', group: 'Code Generators', keywords: 'swift codable struct' },
    { key: 'to-php', icon: '🐘', name: 'JSON to PHP', nameZH: 'JSON 转 PHP', group: 'Code Generators', keywords: 'php array class' },
    { key: 'to-dart', icon: '🎯', name: 'JSON to Dart', nameZH: 'JSON 转 Dart', group: 'Code Generators', keywords: 'dart flutter class' },
    { key: 'to-cpp', icon: '⚡', name: 'JSON to C++', nameZH: 'JSON 转 C++', group: 'Code Generators', keywords: 'cpp cplusplus struct' },
    { key: 'to-ruby', icon: '💎', name: 'JSON to Ruby', nameZH: 'JSON 转 Ruby', group: 'Code Generators', keywords: 'ruby hash class' },
    { key: 'to-scala', icon: '🔴', name: 'JSON to Scala', nameZH: 'JSON 转 Scala', group: 'Code Generators', keywords: 'scala case class' },
    { key: 'to-zod', icon: '🛡️', name: 'JSON to Zod', nameZH: 'JSON 转 Zod', group: 'Code Generators', keywords: 'zod schema validation typescript' },
    { key: 'to-graphql', icon: '◈', name: 'JSON to GraphQL', nameZH: 'JSON 转 GraphQL', group: 'Code Generators', keywords: 'graphql schema types' },
    { key: 'to-env', icon: '🔧', name: 'JSON to ENV', nameZH: 'JSON 转 ENV', group: 'Code Generators', keywords: 'env dotenv environment' },

    // JSON Schema & Misc
    { key: 'schema-validate', icon: '📋', name: 'Schema Validate', nameZH: 'Schema 验证', group: 'Schema & Misc', keywords: 'schema validate ajv' },
    { key: 'schema-generate', icon: '🏗️', name: 'Schema Generate', nameZH: 'Schema 生成', group: 'Schema & Misc', keywords: 'schema generate jsonschema' },
    { key: 'base64', icon: '🔡', name: 'Base64', nameZH: 'Base64', group: 'Schema & Misc', keywords: 'base64 encode decode' },
    { key: 'jwt', icon: '🔐', name: 'JWT Decode', nameZH: 'JWT 解码', group: 'Schema & Misc', keywords: 'jwt token decode verify' },
    { key: 'jsonc', icon: '📝', name: 'JSONC', nameZH: 'JSONC', group: 'Schema & Misc', keywords: 'jsonc comment trailing comma' },
    { key: 'token-count', icon: '🔢', name: 'Token Count', nameZH: 'Token 计数', group: 'Schema & Misc', keywords: 'token tiktoken gpt count' },
    { key: 'json-generator', icon: '🎲', name: 'JSON Generator', nameZH: 'JSON 生成器', group: 'Schema & Misc', keywords: 'generate random mock data' },
    { key: 'jsonl', icon: '📄', name: 'JSONL', nameZH: 'JSONL', group: 'Schema & Misc', keywords: 'jsonlines ndjson stream' },
    { key: 'merge', icon: '🔀', name: 'JSON Merge', nameZH: 'JSON 合并', group: 'Schema & Misc', keywords: 'merge combine concat' },
    { key: 'transform', icon: '⚡', name: 'JSON Transform', nameZH: 'JSON 转换', group: 'Schema & Misc', keywords: 'transform map filter' },
    { key: 'patch', icon: '🩹', name: 'JSON Patch', nameZH: 'JSON 补丁', group: 'Schema & Misc', keywords: 'patch rfc6902 diff' },
    { key: 'mock', icon: '🎭', name: 'JSON Mock', nameZH: 'JSON Mock', group: 'Schema & Misc', keywords: 'mock fake data generator' },
    { key: 'redact', icon: '🚫', name: 'JSON Redact', nameZH: 'JSON 脱敏', group: 'Schema & Misc', keywords: 'redact mask sensitive' },
    { key: 'array', icon: '📚', name: 'JSON Array', nameZH: 'JSON 数组', group: 'Schema & Misc', keywords: 'array manipulate operations' },
    { key: 'key-transform', icon: '🔤', name: 'Key Transform', nameZH: '键转换', group: 'Schema & Misc', keywords: 'key rename camel snake' },

    // Dev Tools
    { key: 'hash', icon: '🔐', name: 'Hash Generator', nameZH: '哈希生成器', group: 'Dev Tools', path: '/dev/hash', keywords: 'hash md5 sha1 sha256' },
    { key: 'base64-dev', icon: '🔡', name: 'Base64 Tool', nameZH: 'Base64 工具', group: 'Dev Tools', path: '/dev/base64', keywords: 'base64 encode decode' },
    { key: 'url-encode', icon: '🔗', name: 'URL Encode', nameZH: 'URL 编码', group: 'Dev Tools', path: '/dev/url-encode', keywords: 'url encode decode percent' },
    { key: 'ip', icon: '🌐', name: 'IP Lookup', nameZH: 'IP 查询', group: 'Dev Tools', path: '/dev/ip', keywords: 'ip address lookup geo' },
    { key: 'whois', icon: '🔍', name: 'WHOIS', nameZH: 'WHOIS', group: 'Dev Tools', path: '/dev/whois', keywords: 'whois domain lookup' },
    { key: 'uuid', icon: '🆔', name: 'UUID Generator', nameZH: 'UUID 生成器', group: 'Dev Tools', path: '/dev/uuid', keywords: 'uuid guid generate' },
    { key: 'word-counter', icon: '📝', name: 'Word Counter', nameZH: '字数统计', group: 'Dev Tools', path: '/dev/word-counter', keywords: 'word count character' },
    { key: 'diff', icon: '📑', name: 'Text Diff', nameZH: '文本对比', group: 'Dev Tools', path: '/dev/diff', keywords: 'diff compare text' },
    { key: 'user-agent', icon: '🧭', name: 'User Agent', nameZH: 'User Agent', group: 'Dev Tools', path: '/dev/user-agent', keywords: 'user agent parser ua' },
    { key: 'timestamp', icon: '🕐', name: 'Timestamp', nameZH: '时间戳', group: 'Dev Tools', path: '/tools/timestamp', keywords: 'timestamp epoch convert' },
    { key: 'base-converter', icon: '🔢', name: 'Base Converter', nameZH: '进制转换', group: 'Dev Tools', path: '/tools/base-converter', keywords: 'base binary hex octal' },
    { key: 'regex', icon: '🔍', name: 'Regex Tester', nameZH: '正则测试', group: 'Dev Tools', path: '/tools/regex', keywords: 'regex regular expression test' },
    { key: 'markdown', icon: '📝', name: 'Markdown', nameZH: 'Markdown', group: 'Dev Tools', path: '/tools/markdown', keywords: 'markdown preview editor' },
    { key: 'case-converter', icon: '🔤', name: 'Case Converter', nameZH: '大小写转换', group: 'Dev Tools', path: '/tools/case-converter', keywords: 'case camel snake kebab' },
  ];

  let overlay = null;
  let input = null;
  let body = null;
  let items = [];
  let activeIndex = -1;
  let isOpen = false;

  function getLang() {
    return document.cookie.match(/lang=(\w+)/)?.[1] || document.documentElement.lang || 'en';
  }

  function displayName(tool) {
    return getLang() === 'zh' ? (tool.nameZH || tool.name) : tool.name;
  }

  function buildOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'cmd-palette-overlay';
    overlay.id = 'cmdPaletteOverlay';
    overlay.innerHTML =
      '<div class="cmd-palette" role="dialog" aria-modal="true" aria-label="Command palette">' +
        '<div class="cmd-palette-header">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '<input type="text" class="cmd-palette-input" id="cmdPaletteInput" placeholder="Search tools..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' +
          '<kbd class="cmd-palette-kbd">ESC</kbd>' +
        '</div>' +
        '<div class="cmd-palette-body" id="cmdPaletteBody"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    input = document.getElementById('cmdPaletteInput');
    body = document.getElementById('cmdPaletteBody');

    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeyDown);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closePalette();
    });
  }

  function openPalette() {
    buildOverlay();
    isOpen = true;
    overlay.classList.add('visible');
    input.value = '';
    input.focus();
    activeIndex = -1;
    renderResults(ALL_TOOLS);
    if (typeof gaTrackToolInteraction === 'function') {
      gaTrackToolInteraction('cmd-palette', 'open');
    }
  }

  function closePalette() {
    if (!overlay) return;
    isOpen = false;
    overlay.classList.remove('visible');
    activeIndex = -1;
  }

  function onInput() {
    const q = input.value.trim().toLowerCase();
    const filtered = q ? fuzzySearch(q) : ALL_TOOLS;
    activeIndex = -1;
    renderResults(filtered);
  }

  function fuzzySearch(q) {
    return ALL_TOOLS.filter(function(tool) {
      const text = (displayName(tool) + ' ' + tool.group + ' ' + tool.keywords + ' ' + tool.key).toLowerCase();
      return text.indexOf(q) >= 0;
    }).sort(function(a, b) {
      const aName = displayName(a).toLowerCase();
      const bName = displayName(b).toLowerCase();
      const aStart = aName.startsWith(q) ? 2 : aName.indexOf(q) >= 0 ? 1 : 0;
      const bStart = bName.startsWith(q) ? 2 : bName.indexOf(q) >= 0 ? 1 : 0;
      return bStart - aStart;
    });
  }

  function renderResults(tools) {
    if (!tools.length) {
      body.innerHTML = '<div class="cmd-palette-empty">No tools found</div>';
      items = [];
      return;
    }
    const lang = getLang();
    const grouped = {};
    tools.forEach(function(tool) {
      if (!grouped[tool.group]) grouped[tool.group] = [];
      grouped[tool.group].push(tool);
    });

    const order = ['Validate & Format', 'View & Query', 'Converters', 'Code Generators', 'Schema & Misc', 'Dev Tools'];
    let html = '';
    order.forEach(function(group) {
      if (!grouped[group]) return;
      html += '<div class="cmd-palette-group">' +
        '<div class="cmd-palette-group-title">' + escapeHtml(group) + '</div>';
      grouped[group].forEach(function(tool, idx) {
        const url = (tool.path || ('/json/' + tool.key)) + '?lang=' + lang;
        html += '<a class="cmd-palette-item" href="' + url + '" data-index="' + items.length + '">' +
          '<span class="cmd-palette-item-icon">' + tool.icon + '</span>' +
          '<span class="cmd-palette-item-name">' + escapeHtml(displayName(tool)) + '</span>' +
          '<span class="cmd-palette-item-key">' + escapeHtml(tool.key) + '</span>' +
        '</a>';
        items.push({ tool: tool, url: url });
      });
      html += '</div>';
    });
    body.innerHTML = html;

    body.querySelectorAll('.cmd-palette-item').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        navigateTo(items[parseInt(el.dataset.index)].url);
      });
      el.addEventListener('mouseenter', function() {
        setActive(parseInt(el.dataset.index));
      });
    });
  }

  function setActive(index) {
    body.querySelectorAll('.cmd-palette-item').forEach(function(el) {
      el.classList.remove('active');
    });
    activeIndex = index;
    const el = body.querySelector('.cmd-palette-item[data-index="' + index + '"]');
    if (el) {
      el.classList.add('active');
      el.scrollIntoView({ block: 'nearest' });
    }
  }

  function navigateTo(url) {
    closePalette();
    window.location.href = url;
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, items.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) {
        navigateTo(items[activeIndex].url);
      } else if (items.length) {
        navigateTo(items[0].url);
      }
      return;
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Global keyboard shortcut
  document.addEventListener('keydown', function(e) {
    // Cmd/Ctrl + K
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      // Don't trigger if inside an input/textarea (unless it's the palette input)
      const tag = e.target.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;
      if (isInput && e.target.id !== 'cmdPaletteInput') return;
      e.preventDefault();
      if (isOpen) closePalette(); else openPalette();
    }
  });

  // Expose for debug
  window.CmdPalette = { open: openPalette, close: closePalette };
})();
