// /static/js/media-qr-forms.js
// Handles: form rendering for 8 QR types + content encoding

'use strict';

/* ══ i18n helper ═════════════════════════════ */
function _qi(key, fallback) {
  return (window.QR_I18N && window.QR_I18N[key]) || fallback;
}

/* ══ Form Render Entry ═══════════════════════ */
function renderForm(type) {
  const container = document.getElementById('formContainer');
  if (!container) return;

  const forms = {
    url:      renderURLForm,
    vcard:    renderVCardForm,
    text:     renderTextForm,
    sms:      renderSMSForm,
    email:    renderEmailForm,
    wifi:     renderWiFiForm,
    phone:    renderPhoneForm,
    location: renderLocationForm,
    calendar: renderCalendarForm,
  };

  const fn = forms[type];
  if (fn) {
    container.innerHTML = fn();
    bindFormEvents(type);
  }
}

/* ══ 1. URL ══════════════════════════════════ */
function renderURLForm() {
  return `
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fUrlLabel','网址')} <span class="qr-required">*</span></label>
      <div class="qr-input-wrap">
        <span class="qr-input-prefix">🌐</span>
        <input type="url" id="field_url" class="qr-input qr-input--prefix"
               placeholder="https://example.com"
               autocomplete="off"
               oninput="onFormChange()">
      </div>
      <p class="qr-form-hint">${_qi('fUrlHint','支持 http://、https://、ftp:// 等协议前缀')}</p>
    </div>
  `;
}

function encodeURL() {
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('qr-encode-url');
  let url = getValue('field_url').trim();
  if (!url) return null;
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(url)) {
    url = 'https://' + url;
    const el = document.getElementById('field_url');
    if (el) el.value = url;
  }
  try { new URL(url); } catch(e) {
    showToast((window.QR_I18N && window.QR_I18N.formUrlInvalid) || '请输入合法的网址', 'error');
    return null;
  }
  return url;
}

/* ══ 2. vCard ════════════════════════════════ */
function renderVCardForm() {
  const opt = _qi('fOptional','（可选）');
  return `
    <div class="qr-form-grid-2">
      <div class="qr-form-group">
        <label class="qr-form-label">${_qi('fVcFirstLabel','名')} <span class="qr-required">*</span></label>
        <input type="text" id="field_vcard_firstname" class="qr-input"
               placeholder="${_qi('fVcFirstPh','张')}" oninput="onFormChange()">
      </div>
      <div class="qr-form-group">
        <label class="qr-form-label">${_qi('fVcLastLabel','姓')}</label>
        <input type="text" id="field_vcard_lastname" class="qr-input"
               placeholder="${_qi('fVcLastPh','三')}" oninput="onFormChange()">
      </div>
    </div>
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fVcPhoneLabel','手机号码')}</label>
      <input type="tel" id="field_vcard_phone" class="qr-input"
             placeholder="+86 138 0000 0000" oninput="onFormChange()">
    </div>
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fVcEmailLabel','电子邮件')}</label>
      <input type="email" id="field_vcard_email" class="qr-input"
             placeholder="zhangsan@example.com" oninput="onFormChange()">
    </div>
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fVcCompanyLabel','公司')}</label>
      <input type="text" id="field_vcard_company" class="qr-input"
             placeholder="${_qi('fVcCompanyPh','公司名称')}" oninput="onFormChange()">
    </div>
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fVcJobLabel','职位')}</label>
      <input type="text" id="field_vcard_jobtitle" class="qr-input"
             placeholder="${_qi('fVcJobPh','产品经理')}" oninput="onFormChange()">
    </div>
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fVcWebLabel','网站')}</label>
      <input type="url" id="field_vcard_website" class="qr-input"
             placeholder="https://example.com" oninput="onFormChange()">
    </div>
    <div class="qr-form-section-title">${_qi('fVcAddrSection','地址')}${opt}</div>
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fVcStreetLabel','街道')}</label>
      <input type="text" id="field_vcard_street" class="qr-input"
             placeholder="${_qi('fVcStreetPh','中关村大街 1 号')}" oninput="onFormChange()">
    </div>
    <div class="qr-form-grid-3">
      <div class="qr-form-group">
        <label class="qr-form-label">${_qi('fVcCityLabel','城市')}</label>
        <input type="text" id="field_vcard_city" class="qr-input"
               placeholder="${_qi('fVcCityPh','北京')}" oninput="onFormChange()">
      </div>
      <div class="qr-form-group">
        <label class="qr-form-label">${_qi('fVcZipLabel','邮编')}</label>
        <input type="text" id="field_vcard_zip" class="qr-input"
               placeholder="${_qi('fVcZipPh','100000')}" oninput="onFormChange()">
      </div>
      <div class="qr-form-group">
        <label class="qr-form-label">${_qi('fVcCountryLabel','国家')}</label>
        <input type="text" id="field_vcard_country" class="qr-input"
               placeholder="${_qi('fVcCountryPh','中国')}" oninput="onFormChange()">
      </div>
    </div>
  `;
}

function encodeVCard() {
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('qr-encode-vcard');
  const firstname = getValue('field_vcard_firstname').trim();
  if (!firstname) { showToast((window.QR_I18N && window.QR_I18N.formVcardFirstname) || '请填写姓名', 'error'); return null; }

  const fields = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${esc(getValue('field_vcard_lastname'))};${esc(firstname)};;;`,
    `FN:${esc(firstname)} ${esc(getValue('field_vcard_lastname'))}`.trim(),
  ];

  const phone   = getValue('field_vcard_phone').trim();
  const email   = getValue('field_vcard_email').trim();
  const company = getValue('field_vcard_company').trim();
  const title   = getValue('field_vcard_jobtitle').trim();
  const website = getValue('field_vcard_website').trim();
  const street  = getValue('field_vcard_street').trim();
  const city    = getValue('field_vcard_city').trim();
  const zip     = getValue('field_vcard_zip').trim();
  const country = getValue('field_vcard_country').trim();

  if (phone)   fields.push(`TEL;TYPE=CELL:${phone}`);
  if (email)   fields.push(`EMAIL:${email}`);
  if (company) fields.push(`ORG:${esc(company)}`);
  if (title)   fields.push(`TITLE:${esc(title)}`);
  if (website) fields.push(`URL:${website}`);
  if (street || city || zip || country) {
    fields.push(`ADR:;;${esc(street)};${esc(city)};;${esc(zip)};${esc(country)}`);
  }

  fields.push('END:VCARD');
  return fields.join('\n');
}

/* ══ 3. Plain Text ═══════════════════════════ */
function renderTextForm() {
  return `
    <div class="qr-form-group">
      <div class="qr-form-label-row">
        <label class="qr-form-label">${_qi('fTextLabel','文字内容')} <span class="qr-required">*</span></label>
        <span class="qr-char-count" id="textCharCount">0 / 300</span>
      </div>
      <textarea id="field_text" class="qr-textarea" rows="5"
                placeholder="${_qi('fTextPh','请输入要编码的文字内容（最多 300 字符）')}"
                maxlength="300"
                oninput="onTextInput(this)"></textarea>
    </div>
  `;
}

function onTextInput(el) {
  const count = el.value.length;
  const countEl = document.getElementById('textCharCount');
  if (countEl) {
    countEl.textContent = `${count} / 300`;
    countEl.style.color = count > 280 ? '#dc2626' : '';
  }
  onFormChange();
}

function encodeText() {
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('qr-encode-text');
  const text = getValue('field_text').trim();
  if (!text) { showToast((window.QR_I18N && window.QR_I18N.formTextEmpty) || '请输入文字内容', 'error'); return null; }
  if (text.length > 300) { showToast((window.QR_I18N && window.QR_I18N.formTextTooLong) || '文字内容不能超过 300 字符', 'error'); return null; }
  return text;
}

/* ══ 4. SMS ══════════════════════════════════ */
function renderSMSForm() {
  const opt = _qi('fOptional','（可选）');
  return `
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fSmsPhoneLabel','手机号码')} <span class="qr-required">*</span></label>
      <input type="tel" id="field_sms_phone" class="qr-input"
             placeholder="+86 138 0000 0000" oninput="onFormChange()">
    </div>
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fSmsMsgLabel','短信内容')}${opt}</label>
      <textarea id="field_sms_message" class="qr-textarea" rows="3"
                placeholder="${_qi('fSmsMsgPh','输入预填短信内容')}" oninput="onFormChange()"></textarea>
    </div>
  `;
}

function encodeSMS() {
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('qr-encode-sms');
  const phone = getValue('field_sms_phone').trim();
  if (!phone) { showToast((window.QR_I18N && window.QR_I18N.formSmsPhone) || '请填写手机号码', 'error'); return null; }
  const message = getValue('field_sms_message').trim();
  return message ? `SMSTO:${phone}:${message}` : `SMSTO:${phone}`;
}

/* ══ 5. Email ════════════════════════════════ */
function renderEmailForm() {
  const opt = _qi('fOptional','（可选）');
  return `
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fEmailToLabel','收件人邮箱')} <span class="qr-required">*</span></label>
      <input type="email" id="field_email_to" class="qr-input"
             placeholder="recipient@example.com" oninput="onFormChange()">
    </div>
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fEmailSubjectLabel','邮件主题')}${opt}</label>
      <input type="text" id="field_email_subject" class="qr-input"
             placeholder="${_qi('fEmailSubjectPh','邮件主题')}" oninput="onFormChange()">
    </div>
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fEmailBodyLabel','邮件正文')}${opt}</label>
      <textarea id="field_email_body" class="qr-textarea" rows="4"
                placeholder="${_qi('fEmailBodyPh','邮件正文内容')}" oninput="onFormChange()"></textarea>
    </div>
  `;
}

function encodeEmail() {
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('qr-encode-email');
  const to = getValue('field_email_to').trim();
  if (!to) { showToast((window.QR_I18N && window.QR_I18N.formEmailTo) || '请填写收件人邮箱', 'error'); return null; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    showToast((window.QR_I18N && window.QR_I18N.formEmailInvalid) || '请输入合法的邮箱地址', 'error'); return null;
  }
  const subject = getValue('field_email_subject').trim();
  const body    = getValue('field_email_body').trim();

  let mailto = `mailto:${encodeURIComponent(to)}`;
  const params = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body)    params.push(`body=${encodeURIComponent(body)}`);
  if (params.length) mailto += '?' + params.join('&');
  return mailto;
}

/* ══ 6. WiFi ═════════════════════════════════ */
function renderWiFiForm() {
  return `
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fWifiSsidLabel','WiFi 名称（SSID）')}<span class="qr-required">*</span></label>
      <input type="text" id="field_wifi_ssid" class="qr-input"
             placeholder="${_qi('fWifiSsidPh','我的 WiFi 名称')}" oninput="onFormChange()">
    </div>
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fWifiEncLabel','加密类型')}</label>
      <select id="field_wifi_encryption" class="qr-select" onchange="onWiFiEncChange()">
        <option value="WPA">${_qi('fWifiEncWpa','WPA / WPA2')}</option>
        <option value="WEP">${_qi('fWifiEncWep','WEP')}</option>
        <option value="nopass">${_qi('fWifiEncNone','无密码（开放网络）')}</option>
      </select>
    </div>
    <div class="qr-form-group" id="wifiPasswordGroup">
      <label class="qr-form-label">${_qi('fWifiPwLabel','密码')}</label>
      <div class="qr-input-wrap">
        <input type="password" id="field_wifi_password" class="qr-input"
               placeholder="${_qi('fWifiPwPh','WiFi 密码')}" oninput="onFormChange()">
        <button type="button" class="qr-input-toggle-pw"
                onclick="togglePasswordVisibility('field_wifi_password', this)">👁</button>
      </div>
    </div>
    <div class="qr-form-group">
      <label class="qr-form-checkbox">
        <input type="checkbox" id="field_wifi_hidden" onchange="onFormChange()">
        <span>${_qi('fWifiHiddenLabel','隐藏网络（Hidden Network）')}</span>
      </label>
    </div>
  `;
}

function onWiFiEncChange() {
  const enc = getValue('field_wifi_encryption');
  const pwGroup = document.getElementById('wifiPasswordGroup');
  if (pwGroup) pwGroup.style.display = enc === 'nopass' ? 'none' : 'block';
  onFormChange();
}

function togglePasswordVisibility(fieldId, btn) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁' : '🙈';
}

function encodeWiFi() {
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('qr-encode-wifi');
  const ssid = getValue('field_wifi_ssid').trim();
  if (!ssid) { showToast((window.QR_I18N && window.QR_I18N.formWifiSsid) || '请填写 WiFi 名称', 'error'); return null; }

  const enc    = getValue('field_wifi_encryption') || 'WPA';
  const pwd    = getValue('field_wifi_password').trim();
  const hidden = document.getElementById('field_wifi_hidden')?.checked ? 'true' : 'false';

  const ssidEsc = wifiEscape(ssid);
  const pwdEsc  = wifiEscape(pwd);
  return `WIFI:T:${enc};S:${ssidEsc};P:${pwdEsc};H:${hidden};;`;
}

function wifiEscape(str) {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/"/g, '\\"').replace(/,/g, '\\,');
}

/* ══ 7. Phone ════════════════════════════════ */
function renderPhoneForm() {
  return `
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fPhoneLabel','电话号码')} <span class="qr-required">*</span></label>
      <div class="qr-input-wrap">
        <span class="qr-input-prefix">📞</span>
        <input type="tel" id="field_phone" class="qr-input qr-input--prefix"
               placeholder="+86 138 0000 0000" oninput="onFormChange()">
      </div>
      <p class="qr-form-hint">${_qi('fPhoneHint','扫码后将自动拨打电话')}</p>
    </div>
  `;
}

function encodePhone() {
  const phone = getValue('field_phone').trim();
  if (!phone) { showToast((window.QR_I18N && window.QR_I18N.formPhoneRequired) || '请填写电话号码', 'error'); return null; }
  return `tel:${phone}`;
}

/* ══ 8. Location ═════════════════════════════ */
function renderLocationForm() {
  const opt = _qi('fOptional','（可选）');
  return `
    <div class="qr-form-grid-2">
      <div class="qr-form-group">
        <label class="qr-form-label">${_qi('fLocLatLabel','纬度')} <span class="qr-required">*</span></label>
        <input type="text" id="field_location_lat" class="qr-input"
               placeholder="39.9042" oninput="onFormChange()">
      </div>
      <div class="qr-form-group">
        <label class="qr-form-label">${_qi('fLocLngLabel','经度')} <span class="qr-required">*</span></label>
        <input type="text" id="field_location_lng" class="qr-input"
               placeholder="116.4074" oninput="onFormChange()">
      </div>
    </div>
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fLocNameLabel','地点名称')}${opt}</label>
      <input type="text" id="field_location_name" class="qr-input"
             placeholder="${_qi('fLocNamePh','例如：天安门广场')}" oninput="onFormChange()">
    </div>
  `;
}

function encodeLocation() {
  const lat = getValue('field_location_lat').trim();
  const lng = getValue('field_location_lng').trim();
  if (!lat || !lng) { showToast((window.QR_I18N && window.QR_I18N.formLocationCoords) || '请填写纬度和经度', 'error'); return null; }
  const name = getValue('field_location_name').trim();
  const query = name ? `?q=${encodeURIComponent(name)}` : '';
  return `geo:${lat},${lng}${query}`;
}

/* ══ 9. Calendar Event ═══════════════════════ */
function renderCalendarForm() {
  const opt = _qi('fOptional','（可选）');
  return `
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fCalTitleLabel','事件标题')} <span class="qr-required">*</span></label>
      <input type="text" id="field_cal_title" class="qr-input"
             placeholder="${_qi('fCalTitlePh','团队周会')}" oninput="onFormChange()">
    </div>
    <div class="qr-form-grid-2">
      <div class="qr-form-group">
        <label class="qr-form-label">${_qi('fCalStartLabel','开始时间')} <span class="qr-required">*</span></label>
        <input type="datetime-local" id="field_cal_start" class="qr-input"
               oninput="onFormChange()">
      </div>
      <div class="qr-form-group">
        <label class="qr-form-label">${_qi('fCalEndLabel','结束时间')}</label>
        <input type="datetime-local" id="field_cal_end" class="qr-input"
               oninput="onFormChange()">
      </div>
    </div>
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fCalLocLabel','地点')}${opt}</label>
      <input type="text" id="field_cal_location" class="qr-input"
             placeholder="${_qi('fCalLocPh','会议室 A')}" oninput="onFormChange()">
    </div>
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fCalDescLabel','描述')}${opt}</label>
      <textarea id="field_cal_desc" class="qr-textarea" rows="3"
                placeholder="${_qi('fCalDescPh','事件描述')}" oninput="onFormChange()"></textarea>
    </div>
  `;
}

function encodeCalendar() {
  const title = getValue('field_cal_title').trim();
  if (!title) { showToast((window.QR_I18N && window.QR_I18N.formCalendarTitle) || '请填写事件标题', 'error'); return null; }

  const start = getValue('field_cal_start').trim();
  if (!start) { showToast((window.QR_I18N && window.QR_I18N.formCalendarStart) || '请填写开始时间', 'error'); return null; }

  const end = getValue('field_cal_end').trim();
  const location = getValue('field_cal_location').trim();
  const desc = getValue('field_cal_desc').trim();

  function fmtDate(d) {
    return d.replace(/[-:]/g, '').replace('T', 'T');
  }

  const parts = [
    'BEGIN:VEVENT',
    `SUMMARY:${esc(title)}`,
    `DTSTART:${fmtDate(start)}`,
  ];
  if (end) parts.push(`DTEND:${fmtDate(end)}`);
  if (location) parts.push(`LOCATION:${esc(location)}`);
  if (desc) parts.push(`DESCRIPTION:${esc(desc)}`);
  parts.push('END:VEVENT');
  return parts.join('\n');
}

/* ══ 10. Twitter/X (legacy) ══════════════════ */
function renderTwitterForm() {
  return `
    <div class="qr-form-group">
      <div class="qr-form-label-row">
        <label class="qr-form-label">${_qi('fTweetLabel','推文内容')} <span class="qr-required">*</span></label>
        <span class="qr-char-count" id="tweetCharCount">0 / 280</span>
      </div>
      <textarea id="field_tweet" class="qr-textarea" rows="4"
                placeholder="${_qi('fTweetPh','输入推文内容（最多 280 字符）')}"
                maxlength="280"
                oninput="onTweetInput(this)"></textarea>
    </div>
    <p class="qr-form-hint">${_qi('fTweetHint','扫码后将在 Twitter/X App 中打开预填推文界面')}</p>
  `;
}

function onTweetInput(el) {
  const count = el.value.length;
  const countEl = document.getElementById('tweetCharCount');
  if (countEl) {
    countEl.textContent = `${count} / 280`;
    countEl.style.color = count > 260 ? '#dc2626' : '';
  }
  onFormChange();
}

function encodeTwitter() {
  const tweet = getValue('field_tweet').trim();
  if (!tweet) { showToast((window.QR_I18N && window.QR_I18N.formTweetEmpty) || '请填写推文内容', 'error'); return null; }
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
}

/* ══ 8. Bitcoin / Crypto ═════════════════════ */
function renderBitcoinForm() {
  const opt = _qi('fOptional','（可选）');
  return `
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fBtcCoinLabel','币种')}</label>
      <div class="qr-crypto-tabs" id="cryptoTabs">
        <button class="qr-crypto-tab active" data-coin="bitcoin" onclick="switchCoin(this, 'bitcoin')">₿ Bitcoin</button>
        <button class="qr-crypto-tab" data-coin="ethereum" onclick="switchCoin(this, 'ethereum')">Ξ Ethereum</button>
        <button class="qr-crypto-tab" data-coin="litecoin" onclick="switchCoin(this, 'litecoin')">Ł Litecoin</button>
      </div>
    </div>
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fBtcAddrLabel','钱包地址')} <span class="qr-required">*</span></label>
      <input type="text" id="field_crypto_address" class="qr-input"
             placeholder="1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf..." oninput="onFormChange()">
    </div>
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fBtcAmountLabel','金额')}${opt}</label>
      <div class="qr-input-wrap">
        <input type="number" id="field_crypto_amount" class="qr-input"
               placeholder="0.001" min="0" step="any" oninput="onFormChange()">
        <span class="qr-input-suffix" id="cryptoUnit">BTC</span>
      </div>
    </div>
    <div class="qr-form-group">
      <label class="qr-form-label">${_qi('fBtcMsgLabel','备注')}${opt}</label>
      <input type="text" id="field_crypto_message" class="qr-input"
             placeholder="${_qi('fBtcMsgPh','付款说明')}" oninput="onFormChange()">
    </div>
  `;
}

let currentCoin = 'bitcoin';

function switchCoin(btn, coin) {
  currentCoin = coin;
  document.querySelectorAll('.qr-crypto-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const units = { bitcoin: 'BTC', ethereum: 'ETH', litecoin: 'LTC' };
  const unitEl = document.getElementById('cryptoUnit');
  if (unitEl) unitEl.textContent = units[coin] || 'BTC';
  onFormChange();
}

function encodeBitcoin() {
  const address = getValue('field_crypto_address').trim();
  if (!address) { showToast((window.QR_I18N && window.QR_I18N.formBitcoinAddress) || '请填写钱包地址', 'error'); return null; }

  const amount  = getValue('field_crypto_amount').trim();
  const message = getValue('field_crypto_message').trim();

  const schemes = { bitcoin: 'bitcoin', ethereum: 'ethereum', litecoin: 'litecoin' };
  const scheme  = schemes[currentCoin] || 'bitcoin';

  let uri = `${scheme}:${address}`;
  const params = [];
  if (amount)  params.push(`amount=${encodeURIComponent(amount)}`);
  if (message) params.push(`message=${encodeURIComponent(message)}`);
  if (params.length) uri += '?' + params.join('&');
  return uri;
}

/* ══ Content Encoder Entry ═══════════════════ */
function getQRContent(type) {
  const encoders = {
    url:      encodeURL,
    vcard:    encodeVCard,
    text:     encodeText,
    sms:      encodeSMS,
    email:    encodeEmail,
    wifi:     encodeWiFi,
    phone:    encodePhone,
    location: encodeLocation,
    calendar: encodeCalendar,
  };
  return (encoders[type] || (() => null))();
}

/* ══ Utilities ═══════════════════════════════ */
function getValue(id) {
  return document.getElementById(id)?.value || '';
}

function esc(str) {
  return str.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

let autoPreviewTimer = null;
function onFormChange() {
  clearTimeout(autoPreviewTimer);
  autoPreviewTimer = setTimeout(() => {
    if (window.QR_AUTO_PREVIEW) generateQR();
  }, 600);
}

function bindFormEvents(type) {
  if (type === 'wifi') onWiFiEncChange();
}

