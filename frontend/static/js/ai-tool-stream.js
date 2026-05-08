// Shared SSE streaming helper for AI tool pages
// Usage: AIToolStream.fetch(payload, { emptyId, contentId, textId, onDone })
(function () {
  'use strict';

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  var AIToolStream = {
    fetch: function (payload, opts) {
      var emptyEl = document.getElementById(opts.emptyId);
      var contentEl = document.getElementById(opts.contentId);
      var textEl = document.getElementById(opts.textId);
      if (!textEl) return Promise.reject('output element not found');

      if (typeof gaTrackToolUse === 'function') gaTrackToolUse('ai-stream');
      var _streamStart = Date.now();

      // Show streaming state
      if (emptyEl) emptyEl.style.display = 'none';
      if (contentEl) contentEl.style.display = 'block';
      textEl.innerHTML = '<span class="atp-cursor"></span>';

      var buffer = '';
      var sseError = false;

      return fetch('/api/ai/humanize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (resp) {
        if (!resp.ok) {
          return resp.text().then(function (txt) {
            throw new Error('API error ' + resp.status + ': ' + txt);
          });
        }
        var reader = resp.body.getReader();
        var decoder = new TextDecoder('utf-8');
        var buf = '';
        var done = false;

        function read() {
          return reader.read().then(function (r) {
            if (r.done || done) {
              if (!done) finish();
              return;
            }
            buf += decoder.decode(r.value, { stream: true });
            var lines = buf.split('\n');
            buf = lines.pop();
            for (var i = 0; i < lines.length; i++) {
              var line = lines[i];
              if (done) break;
              if (line.indexOf('event:') === 0) {
                if (line.indexOf('event: error') !== -1) sseError = true;
                continue;
              }
              if (line.indexOf('data: ') !== 0) continue;
              var token = line.slice(6);
              if (token === '[DONE]') {
                done = true;
                finish();
                return;
              }
              if (sseError) {
                buffer = token;
                finish();
                return;
              }
              token = token.replace(/\\n/g, '\n');
              buffer += token;
              textEl.innerHTML = esc(buffer) + '<span class="atp-cursor"></span>';
              textEl.scrollTop = textEl.scrollHeight;
            }
            if (!done) return read();
          });
        }

        function finish() {
          textEl.textContent = buffer;
          if (opts.onDone) opts.onDone(buffer);
          if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('ai-stream', Date.now() - _streamStart);
        }

        return read();
      }).catch(function (err) {
        textEl.textContent = '';
        if (emptyEl) emptyEl.style.display = '';
        if (contentEl) contentEl.style.display = 'none';
        throw err;
      });
    }
  };

  window.AIToolStream = AIToolStream;
})();
