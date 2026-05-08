/**
 * email-login.js — Email login with verification code
 * Handles the two-step flow: enter email → receive code → verify code → login
 */
;(function () {
  "use strict";

  var formEmail = document.getElementById("form-email");
  var formVerify = document.getElementById("form-email-verify");
  var emailInput = document.getElementById("email-input");
  var codeInput = document.getElementById("code-input");
  var btnEmail = document.getElementById("btn-email");
  var btnVerify = document.getElementById("btn-verify");
  var btnResend = document.getElementById("btn-resend");
  var emailError = document.getElementById("email-error");
  var verifyError = document.getElementById("verify-error");
  var verifyEmailDisplay = document.getElementById("verify-email-display");

  var userEmail = "";
  var resendTimer = null;
  var resendCooldown = 60; // seconds

  if (!formEmail || !formVerify) return;

  // --- Step 1: Send verification code ---
  formEmail.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = emailInput.value.trim();
    if (!email) return;
    var _gaStart = Date.now();
    if (typeof gaTrackToolUse === 'function') gaTrackToolUse('email-login');

    setLoading(btnEmail, true);
    emailError.style.display = "none";

    fetch("/api/auth/email/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email })
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        setLoading(btnEmail, false);
        if (data.success) {
          userEmail = email;
          showVerifyStep();
          showToast(data.message || "Verification code sent!", "success");
          startResendCooldown();
          if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('email-login', 1, Date.now() - _gaStart);
          if (typeof gaTrackLogin === 'function') gaTrackLogin('email');
        } else {
          emailError.textContent = data.error || "Failed to send code. Please try again.";
          emailError.style.display = "block";
        }
      })
      .catch(function () {
        setLoading(btnEmail, false);
        emailError.textContent = "Network error. Please try again.";
        emailError.style.display = "block";
      });
  });

  // --- Step 2: Verify code ---
  formVerify.addEventListener("submit", function (e) {
    e.preventDefault();
    var code = codeInput.value.trim();
    if (!code || code.length !== 6) return;
    var _gaStart = Date.now();
    if (typeof gaTrackToolUse === 'function') gaTrackToolUse('email-login');

    setLoading(btnVerify, true);
    verifyError.style.display = "none";

    fetch("/api/auth/email/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, code: code })
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        setLoading(btnVerify, false);
        if (data.success && data.redirect) {
          if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('email-login', 1, Date.now() - _gaStart);
          if (typeof gaTrackLogin === 'function') gaTrackLogin('email_success');
          window.location.href = data.redirect;
        } else {
          verifyError.textContent = data.error || "Invalid code. Please try again.";
          verifyError.style.display = "block";
        }
      })
      .catch(function () {
        setLoading(btnVerify, false);
        verifyError.textContent = "Network error. Please try again.";
        verifyError.style.display = "block";
      });
  });

  // --- Resend code ---
  if (btnResend) {
    btnResend.addEventListener("click", function () {
      if (!userEmail) return;

      btnResend.disabled = true;
      btnResend.textContent = "Sending...";

      fetch("/api/auth/email/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail })
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (data.success) {
            showToast(data.message || "Code resent!", "success");
            startResendCooldown();
          } else {
            showToast(data.error || "Failed to resend", "error");
            btnResend.disabled = false;
            btnResend.textContent = "Resend code";
          }
        })
        .catch(function () {
          showToast("Network error", "error");
          btnResend.disabled = false;
          btnResend.textContent = "Resend code";
        });
    });
  }

  // --- Helpers ---
  function showVerifyStep() {
    formEmail.style.display = "none";
    formVerify.style.display = "block";
    verifyEmailDisplay.textContent = userEmail;
    codeInput.focus();
  }

  function setLoading(btn, loading) {
    if (loading) {
      btn.classList.add("is-loading");
      btn.disabled = true;
    } else {
      btn.classList.remove("is-loading");
      btn.disabled = false;
    }
  }

  function startResendCooldown() {
    var seconds = resendCooldown;
    btnResend.style.display = "inline-block";
    btnResend.disabled = true;
    btnResend.textContent = "Resend in " + seconds + "s";

    resendTimer = setInterval(function () {
      seconds--;
      if (seconds <= 0) {
        clearInterval(resendTimer);
        btnResend.disabled = false;
        btnResend.textContent = "Resend code";
      } else {
        btnResend.textContent = "Resend in " + seconds + "s";
      }
    }, 1000);
  }

  function showToast(msg, type) {
    if (window.SocialAuth && window.SocialAuth.showToast) {
      window.SocialAuth.showToast(msg, type);
    }
  }
})();