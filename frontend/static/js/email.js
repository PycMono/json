/* ============================================
   json - Temp Email JS
   Matching 10minutemail.com Interaction Style
   ============================================ */

let currentPrefix = '';
let currentDomain = '';
let currentAddress = '';
let pollTimer;
let countdownTimer;
const POLL_INTERVAL = 15000;
const TTL_SECONDS = 600; // 10 minutes
let expiresAt = null;
let messages = [];
let notifyEnabled = false;

/* ── Countdown Timer (digit boxes) ─────────── */

function startCountdown(ttl) {
  stopCountdown();
  expiresAt = Date.now() + ttl * 1000;
  countdownTimer = setInterval(updateCountdown, 1000);
  updateCountdown();
}

function updateCountdown() {
  const remaining = Math.max(0, expiresAt - Date.now());
  const secs = Math.floor(remaining / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;

  // Set individual digit boxes
  const digits = [
    Math.floor(m / 10), m % 10,
    Math.floor(s / 10), s % 10
  ];
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById('timerDigit' + i);
    if (el) el.textContent = digits[i];
  }

  // Warning state when < 60s
  const warning = document.getElementById('emailWarning');
  const digitBoxes = document.querySelectorAll('.timer-digit-box');
  const colon = document.querySelector('.timer-colon');
  const digitsContainer = document.querySelector('.timer-digits');
  const btnExtend = document.getElementById('btnExtend');

  if (secs <= 0) {
    // Expired
    if (warning) warning.classList.remove('show');
    if (digitsContainer) digitsContainer.classList.add('timer-expired');
    showExpiredState();
    stopCountdown();
    return;
  }

  // Remove expired state
  if (digitsContainer) digitsContainer.classList.remove('timer-expired');

  if (secs <= 60) {
    // Warning: < 60 seconds
    if (warning) warning.classList.add('show');
    digitBoxes.forEach(function(b) { b.classList.add('warning'); });
    if (colon) colon.classList.add('warning');
  } else {
    if (warning) warning.classList.remove('show');
    digitBoxes.forEach(function(b) { b.classList.remove('warning'); });
    if (colon) colon.classList.remove('warning');
  }

  // Enable extend button always
  if (btnExtend) btnExtend.disabled = false;
}

function stopCountdown() {
  clearInterval(countdownTimer);
}

function showExpiredState() {
  var timer = document.getElementById('emailTimerSection');
  var mainCard = document.getElementById('emailMainCard');
  var expired = document.getElementById('emailExpired');
  if (timer) timer.style.display = 'none';
  if (expired) expired.classList.add('show');
  stopPolling();
}

function hideExpiredState() {
  var timer = document.getElementById('emailTimerSection');
  var expired = document.getElementById('emailExpired');
  if (timer) timer.style.display = '';
  if (expired) expired.classList.remove('show');
}

/* ── Extend Timer ──────────────────────────── */

function extendTimer() {
  if (!currentAddress) return;
  var btnExtend = document.getElementById('btnExtend');
  if (btnExtend) btnExtend.disabled = true;

  fetch('/api/email/extend/' + encodeURIComponent(currentAddress), {
    method: 'POST'
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var ttl = data.expires_in || TTL_SECONDS;
      startCountdown(ttl);
      if (btnExtend) btnExtend.disabled = false;
      showToast('⏱ ' + (window.emailTranslations?.timer_extended || 'Timer extended!'));
    })
    .catch(function(err) {
      // Fallback: just reset timer locally
      startCountdown(TTL_SECONDS);
      if (btnExtend) btnExtend.disabled = false;
      if (typeof gaTrackError === 'function') gaTrackError('temp-email', 'extend_failed', err.message || 'extend error');
    });
}

/* ── Domain Selector ─────────────────────── */

function onDomainChange() {
  var sel = document.getElementById('emailDomain');
  if (sel) currentDomain = sel.value;
  if (currentPrefix) {
    currentAddress = currentPrefix + currentDomain;
    var input = document.getElementById('emailPrefix');
    if (input) input.value = currentPrefix;
  }
}

/* ── Notification Toggle ─────────────────── */

function toggleNotify() {
  var cb = document.getElementById('notifyToggle');
  if (!cb) return;
  if (cb.checked && 'Notification' in window) {
    Notification.requestPermission().then(function(perm) {
      if (perm === 'granted') {
        notifyEnabled = true;
        showToast('🔔 ' + (window.emailTranslations?.notify_granted || 'Notifications enabled'));
      } else {
        cb.checked = false;
        notifyEnabled = false;
      }
    });
  } else {
    notifyEnabled = cb.checked;
  }
}

/* ── Core Functions ──────────────────────── */

function randomPrefix() {
  return Math.random().toString(36).substring(2, 10);
}

function createEmail() {
  var prefixInput = document.getElementById('emailPrefix');
  if (prefixInput) prefixInput.value = '';

  fetch('/api/email/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: currentDomain.replace('@', '') })
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var parts = data.address.split('@');
      currentPrefix = parts[0];
      currentDomain = '@' + (parts[1] || 'tempmail.dev');
      currentAddress = data.address;
      if (prefixInput) prefixInput.value = currentPrefix;

      // sync domain selector
      var sel = document.getElementById('emailDomain');
      if (sel) {
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value === currentDomain) { sel.selectedIndex = i; break; }
        }
      }

      var ttl = data.ttl || data.expires_in || TTL_SECONDS;
      startCountdown(ttl);
      startPolling();
      if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('temp-email', 1, 0);
    })
    .catch(function() {
      var sel = document.getElementById('emailDomain');
      currentDomain = sel ? sel.value : '';
      if (!currentDomain) currentDomain = '@tempmail.dev';
      currentPrefix = randomPrefix();
      currentAddress = currentPrefix + currentDomain;
      if (prefixInput) prefixInput.value = currentPrefix;
      startCountdown(TTL_SECONDS);
      startPolling();
      if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('temp-email', 1, 0);
    });
}

function copyEmail() {
  if (!currentAddress) return;
  navigator.clipboard.writeText(currentAddress).then(function() {
    showToast('📋 ' + (window.emailTranslations?.copied || 'Email address copied!'));
  });
}

function changeEmail() {
  stopPolling();
  stopCountdown();
  messages = [];
  renderMessages();
  hideExpiredState();
  createEmail();
}

function setCustomEmail() {
  var input = document.getElementById('emailPrefix');
  var prefix = input ? input.value.trim() : '';
  if (!prefix) {
    showToast(window.emailTranslations?.enter_prefix || 'Enter a prefix first');
    if (input) { input.readOnly = false; input.focus(); }
    return;
  }
  if (input) input.readOnly = true;

  stopPolling();
  stopCountdown();
  messages = [];
  renderMessages();
  hideExpiredState();

  fetch('/api/email/custom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: prefix, domain: currentDomain.replace('@', '') }),
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var parts = data.address.split('@');
      currentPrefix = parts[0];
      currentDomain = '@' + (parts[1] || 'tempmail.dev');
      currentAddress = data.address;
      if (input) input.value = currentPrefix;
      startCountdown(TTL_SECONDS);
      startPolling();
    })
    .catch(function() {
      currentPrefix = prefix;
      currentAddress = prefix + currentDomain;
      startCountdown(TTL_SECONDS);
      startPolling();
    });
}

function destroyEmail() {
  stopPolling();
  stopCountdown();
  if (currentAddress) {
    fetch('/api/email/destroy/' + encodeURIComponent(currentAddress), { method: 'DELETE' }).catch(function() {});
  }
  messages = [];
  renderMessages();
  hideExpiredState();
  createEmail();
}

function refreshInbox() {
  if (!currentAddress) return;
  fetch('/api/email/messages/' + encodeURIComponent(currentAddress))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var newMsgs = data.messages || [];
      var prevCount = messages.length;
      messages = newMsgs;
      renderMessages();
      updateReceivedCount();
      if (messages.length > prevCount && prevCount >= 0) {
        notifyNewMail();
      }
    })
    .catch(function() {});
}

function clearInbox() {
  messages = [];
  renderMessages();
  updateReceivedCount();
}

function updateReceivedCount() {
  var el = document.getElementById('emailsReceived');
  var countEl = document.getElementById('inboxCount');
  if (el) el.textContent = messages.length;
  if (countEl) countEl.textContent = messages.length;
}

function notifyNewMail() {
  showToast('📧 New email received!', 3000);
  if (notifyEnabled && 'Notification' in window && Notification.permission === 'granted') {
    new Notification('New Email', {
      body: 'You have received a new email at ' + currentAddress,
      icon: '/static/favicon.ico'
    });
  }
  // Title flicker
  var flickers = 0;
  var origTitle = document.title;
  var timer = setInterval(function() {
    document.title = flickers % 2 === 0 ? '📧 New Mail!' : origTitle;
    flickers++;
    if (flickers > 8) { clearInterval(timer); document.title = origTitle; }
  }, 500);
}

/* ── Message Rendering ───────────────────── */

function renderMessages() {
  var waiting = document.getElementById('emailWaiting');
  var container = document.getElementById('emailMessages');
  if (!waiting || !container) return;

  if (!messages || messages.length === 0) {
    waiting.style.display = 'flex';
    container.innerHTML = '';
  } else {
    waiting.style.display = 'none';
    container.innerHTML = messages.map(function(m, i) {
      var from = m.from || 'Unknown Sender';
      var initial = escHtml(from.charAt(0).toUpperCase());
      return '<div class="email-message-card">' +
        '<div class="email-msg-header" onclick="toggleMsg(' + i + ')">' +
          '<div class="email-msg-left">' +
            '<div class="email-msg-avatar">' + initial + '</div>' +
            '<div class="email-msg-meta">' +
              '<div class="email-msg-from">' + escHtml(from) + '</div>' +
              '<div class="email-msg-subject">' + escHtml(m.subject || '(No Subject)') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="email-msg-time">' + (m.received_at || '') + '</div>' +
        '</div>' +
        '<div class="email-msg-body" id="msgBody' + i + '">' +
          (m.html_body && m.html_body.length > 0
            ? '<iframe sandbox="" id="msgFrame' + i + '"></iframe>'
            : '<pre>' + escHtml(m.body || m.content || '') + '</pre>') +
        '</div>' +
      '</div>';
    }).join('');

    // Set iframe srcdoc via DOM property
    messages.forEach(function(m, i) {
      if (m.html_body && m.html_body.length > 0) {
        var frame = document.getElementById('msgFrame' + i);
        if (frame) {
          frame.srcdoc = m.html_body;
        }
      }
    });
  }
}

function escHtml(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function toggleMsg(i) {
  var body = document.getElementById('msgBody' + i);
  if (body) body.classList.toggle('expanded');
}

/* ── Polling ─────────────────────────────── */

function startPolling() {
  stopPolling();
  pollTimer = setInterval(refreshInbox, POLL_INTERVAL);
  refreshInbox();
}

function stopPolling() {
  clearInterval(pollTimer);
}

/* ── Stats ───────────────────────────────── */

function loadStats() {
  fetch('/api/email/stats')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var todayEl = document.getElementById('todayCreated');
      var spamEl = document.getElementById('spamIntercepted');
      if (todayEl) todayEl.textContent = d.today_created || '-';
      if (spamEl) spamEl.textContent = d.spam_intercepted || '-';
    })
    .catch(function() {});
}

/* ── Toast ───────────────────────────────── */

function showToast(msg, duration) {
  duration = duration || 2000;
  var existing = document.querySelector('.toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.className = 'toast show';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.remove();
  }, duration);
}

/* ── Init ────────────────────────────────── */

window.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('emailPrefix')) {
    var sel = document.getElementById('emailDomain');
    if (sel && sel.options.length > 0) currentDomain = sel.value;
    createEmail();
    loadStats();
  }
});