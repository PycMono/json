/**
 * social-auth.js — OAuth login, user profile & error page interactions
 * Wrapped in IIFE to avoid polluting global scope.
 */
;(function () {
  "use strict";

  /* -----------------------------------------------------------------------
   * bindProviderForms — prevent double-submit, show loading spinner,
   * disable other provider buttons, and fire a GA event.
   * --------------------------------------------------------------------- */
  function bindProviderForms() {
    var forms = document.querySelectorAll(
      '#form-google, #form-microsoft'
    );
    var buttons = document.querySelectorAll(
      '#btn-google, #btn-microsoft'
    );

    forms.forEach(function (form) {
      form.addEventListener("submit", function (e) {
        var submitBtn = form.querySelector("button[type='submit']");
        if (submitBtn.disabled || submitBtn.classList.contains("is-loading")) {
          e.preventDefault();
          return;
        }

        // Mark active button as loading
        submitBtn.classList.add("is-loading");
        submitBtn.disabled = true;

        // Disable other buttons
        buttons.forEach(function (btn) {
          if (btn !== submitBtn) {
            btn.disabled = true;
          }
        });

        // GA event
        var provider = "";
        if (form.id === "form-google") provider = "google";
                else if (form.id === "form-microsoft") provider = "microsoft";

        if (typeof gaTrackLogin === 'function') gaTrackLogin(provider);
      });
    });
  }

  /* -----------------------------------------------------------------------
   * resetAllButtons — restore all provider buttons to their default state.
   * --------------------------------------------------------------------- */
  function resetAllButtons() {
    var buttons = document.querySelectorAll(
      '#btn-google, #btn-microsoft'
    );
    buttons.forEach(function (btn) {
      btn.classList.remove("is-loading");
      btn.disabled = false;
    });
  }

  /* -----------------------------------------------------------------------
   * localizeTimes — format [data-ts] ISO timestamps using the browser locale.
   * --------------------------------------------------------------------- */
  function localizeTimes() {
    var els = document.querySelectorAll("[data-ts]");
    els.forEach(function (el) {
      var iso = el.getAttribute("data-ts");
      if (!iso) return;
      try {
        var d = new Date(iso);
        if (!isNaN(d.getTime())) {
          el.textContent = d.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        }
      } catch (_) {
        // Keep the server-rendered fallback text
      }
    });
  }

  /* -----------------------------------------------------------------------
   * showToast — display a brief notification at the bottom-right.
   * @param {string} msg   — message text
   * @param {string} type  — "success" | "error" (default "success")
   * --------------------------------------------------------------------- */
  function showToast(msg, type) {
    var el = document.getElementById("social-auth-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "social-auth-toast";
      el.className = "toast";
      document.body.appendChild(el);
    }

    // Reset classes
    el.className = "toast";
    if (type === "error") {
      el.classList.add("toast--error");
    } else {
      el.classList.add("toast--success");
    }

    el.textContent = msg;

    // Trigger show
    requestAnimationFrame(function () {
      el.classList.add("toast--visible");
    });

    // Auto-hide after 4 seconds
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(function () {
      el.classList.remove("toast--visible");
    }, 4000);
  }

  /* -----------------------------------------------------------------------
   * readURLMessage — read ?msg= from the URL and display as toast.
   * Supports values: "logout" → shows a logout confirmation toast.
   * --------------------------------------------------------------------- */
  function readURLMessage() {
    var params = new URLSearchParams(window.location.search);
    var msg = params.get("msg");
    if (!msg) return;

    var messages = {
      logout: "You have been logged out successfully.",
    };

    var text = messages[msg] || decodeURIComponent(msg);
    showToast(text, "success");
    if (typeof gaTrackToolInteraction === 'function') gaTrackToolInteraction('social-auth', 'logout_msg');

    // Clean the URL without reloading
    if (window.history.replaceState) {
      var clean = window.location.pathname;
      window.history.replaceState({}, document.title, clean);
    }
  }

  /* -----------------------------------------------------------------------
   * bindLogoutForm — show a confirm dialog before submitting the logout form.
   * --------------------------------------------------------------------- */
  function bindLogoutForm() {
    var logoutBtn = document.querySelector(
      '.auth-btn--danger[data-confirm]'
    );
    if (!logoutBtn) return;

    logoutBtn.closest("form").addEventListener("submit", function (e) {
      var confirmMsg = logoutBtn.getAttribute("data-confirm") || "Are you sure you want to log out?";
      if (!window.confirm(confirmMsg)) {
        e.preventDefault();
      } else {
        if (typeof gaTrackLogout === 'function') gaTrackLogout();
      }
    });
  }

  /* -----------------------------------------------------------------------
   * detectLoginSuccess — on the /auth/me page, check ?login=1 and show a
   * welcome toast.
   * --------------------------------------------------------------------- */
  function detectLoginSuccess() {
    var params = new URLSearchParams(window.location.search);
    if (params.get("login") === "1") {
      showToast("Login successful! Welcome back.", "success");
      if (typeof gaTrackLogin === 'function') gaTrackLogin('success');

      // Clean the URL
      if (window.history.replaceState) {
        var clean = window.location.pathname;
        window.history.replaceState({}, document.title, clean);
      }
    }
  }

  /* -----------------------------------------------------------------------
   * Initialise on DOMContentLoaded
   * --------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    bindProviderForms();
    localizeTimes();
    readURLMessage();
    bindLogoutForm();
    detectLoginSuccess();
  });

  /* Expose utilities for debugging (optional) */
  window.SocialAuth = {
    showToast: showToast,
    resetAllButtons: resetAllButtons,
  };
})();
