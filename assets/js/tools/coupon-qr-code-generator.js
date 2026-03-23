document.addEventListener('DOMContentLoaded', function () {
  const $ = (id) => document.getElementById(id);

  const els = {
    urlModeBtn: $('urlModeBtn'),
    textModeBtn: $('textModeBtn'),
    urlModeFields: $('urlModeFields'),
    textModeFields: $('textModeFields'),

    offerTitle: $('offerTitle'),
    themeColor: $('themeColor'),
    promoCode: $('promoCode'),
    discountValue: $('discountValue'),
    discountType: $('discountType'),
    expiresOn: $('expiresOn'),
    couponUrl: $('couponUrl'),
    couponText: $('couponText'),
    terms: $('terms'),
    qrSize: $('qrSize'),

    generateBtn: $('generateBtn'),
    sampleBtn: $('sampleBtn'),
    clearBtn: $('clearBtn'),
    copyPayloadBtn: $('copyPayloadBtn'),
    copyLinkBtn: $('copyLinkBtn'),
    downloadBtn: $('downloadBtn'),

    outputCode: $('outputCode'),
    shareOutput: $('shareOutput'),
    statusBox: $('statusBox'),

    resultMode: $('resultMode'),
    payloadCount: $('payloadCount'),
    summaryPayload: $('summaryPayload'),
    readyLabel: $('readyLabel'),
    modeLabel: $('modeLabel'),

    qrImage: $('qrImage'),
    qrEmpty: $('qrEmpty'),
    year: $('year'),

    couponCard: $('couponCard'),
    previewDiscountType: $('previewDiscountType'),
    previewTitle: $('previewTitle'),
    previewSub: $('previewSub'),
    previewMeta: $('previewMeta')
  };

  if (!els.generateBtn) return;

  let currentMode = 'url';
  let lastPayload = '';
  let lastPrimaryTarget = '';
  let lastQrUrl = '';

  if (els.year) {
    els.year.textContent = String(new Date().getFullYear());
  }

  function safeTrim(value) {
    return String(value || '').trim();
  }

  function normalizeMultiline(value) {
    return String(value || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(function (line) { return line.trim(); })
      .filter(Boolean)
      .join('\n');
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeUrl(value) {
    const clean = safeTrim(value);
    if (!clean) return '';
    if (/^https?:\/\//i.test(clean)) return clean;
    return 'https://' + clean.replace(/^\/+/, '');
  }

  function base64UrlEncode(str) {
    const utf8 = new TextEncoder().encode(str);
    let binary = '';
    utf8.forEach(function (b) { binary += String.fromCharCode(b); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function buildViewerUrl() {
    const data = {
      offerTitle: safeTrim(els.offerTitle.value),
      themeColor: safeTrim(els.themeColor.value) || '#2563eb',
      promoCode: safeTrim(els.promoCode.value),
      discountValue: safeTrim(els.discountValue.value),
      discountType: safeTrim(els.discountType.value),
      expiresOn: safeTrim(els.expiresOn.value),
      couponText: normalizeMultiline(els.couponText.value),
      terms: normalizeMultiline(els.terms.value)
    };

    const encoded = base64UrlEncode(JSON.stringify(data));
    return window.location.origin + '/tools/coupon-viewer.html?d=' + encodeURIComponent(encoded);
  }

  function getPayload() {
    if (currentMode === 'url') {
      return normalizeUrl(els.couponUrl.value);
    }
    return buildViewerUrl();
  }

  function getPrimaryTarget() {
    return getPayload();
  }

  function setStatus(html) {
    els.statusBox.innerHTML = html;
  }

  function setMode(mode) {
    currentMode = mode === 'text' ? 'text' : 'url';

    els.urlModeBtn.classList.toggle('active', currentMode === 'url');
    els.textModeBtn.classList.toggle('active', currentMode === 'text');
    els.urlModeFields.classList.toggle('hidden', currentMode !== 'url');
    els.textModeFields.classList.toggle('hidden', currentMode !== 'text');

    els.resultMode.textContent = 'Mode: ' + (currentMode === 'url' ? 'URL' : 'Viewer');
    els.modeLabel.textContent = currentMode === 'url' ? 'URL' : 'Viewer';

    updateMetaOnly();
  }

  function updatePreviewCard() {
    const offerTitle = safeTrim(els.offerTitle.value) || 'Your Coupon Offer';
    const promoCode = safeTrim(els.promoCode.value);
    const discountValue = safeTrim(els.discountValue.value);
    const discountType = safeTrim(els.discountType.value) || 'Offer';
    const expiresOn = safeTrim(els.expiresOn.value);
    const terms = normalizeMultiline(els.terms.value);
    const themeColor = safeTrim(els.themeColor.value) || '#2563eb';

    let subText = '';
    if (currentMode === 'url') {
      subText = normalizeUrl(els.couponUrl.value) || 'Your coupon landing page preview will appear here.';
    } else {
      subText = normalizeMultiline(els.couponText.value) || 'Your coupon viewer page will be generated from this offer.';
    }

    els.couponCard.style.setProperty('--cardBrand', themeColor);
    els.previewDiscountType.textContent = discountType;
    els.previewTitle.textContent = offerTitle;
    els.previewSub.textContent = subText;

    const lines = [];
    if (promoCode) lines.push('Promo code • ' + promoCode);
    if (discountValue) lines.push('Value • ' + discountValue);
    if (expiresOn) lines.push('Expires • ' + expiresOn);
    if (terms) lines.push('Terms • ' + terms.replace(/\n/g, ' / '));

    if (!lines.length) {
      els.previewMeta.innerHTML = '<div class="coupon-line">Promo code and coupon details will appear here.</div>';
    } else {
      els.previewMeta.innerHTML = lines
        .map(function (line) {
          return '<div class="coupon-line">' + escapeHtml(line) + '</div>';
        })
        .join('');
    }
  }

  function updateMetaOnly() {
    const payload = getPayload();
    const count = payload.length;

    lastPrimaryTarget = getPrimaryTarget();
    els.payloadCount.textContent = String(count);
    els.summaryPayload.textContent = String(count);
    els.outputCode.textContent = payload || 'No coupon payload generated yet.';
    els.shareOutput.value = lastPrimaryTarget || '';

    updatePreviewCard();
  }

  function showEmptyState() {
    els.qrImage.hidden = true;
    els.qrEmpty.hidden = false;
    lastQrUrl = '';
  }

  function showQr(url) {
    els.qrImage.src = url;
    els.qrImage.hidden = false;
    els.qrEmpty.hidden = true;
    lastQrUrl = url;
  }

  function buildQrUrl(text) {
    const size = Math.max(256, Number(els.qrSize.value || 320));
    return 'https://api.qrserver.com/v1/create-qr-code/?size=' +
      encodeURIComponent(size + 'x' + size) +
      '&margin=16&data=' + encodeURIComponent(text);
  }

  function generateQr() {
    updateMetaOnly();

    const payload = getPayload();

    if (!payload || !String(payload).trim()) {
      els.readyLabel.textContent = 'No';
      showEmptyState();
      setStatus('<strong>Not enough data.</strong><br>Add a coupon URL or coupon details to generate a QR code.');
      return;
    }

    const qrUrl = buildQrUrl(payload);

    lastPayload = payload;
    showQr(qrUrl);
    els.readyLabel.textContent = 'Yes';

    if (currentMode === 'text') {
      setStatus('<strong>Generated.</strong><br>Your Coupon Viewer QR is ready. Scanning it will open a clean coupon page instead of a raw text payload.');
    } else {
      setStatus('<strong>Generated.</strong><br>Your Coupon URL QR is ready. Scanning it will open the linked coupon page.');
    }
  }

  function resetTool() {
    els.offerTitle.value = '';
    els.themeColor.value = '#2563eb';
    els.promoCode.value = '';
    els.discountValue.value = '';
    els.discountType.value = 'Percent discount';
    els.expiresOn.value = '';
    els.couponUrl.value = '';
    els.couponText.value = '';
    els.terms.value = '';
    els.qrSize.value = '320';

    lastPayload = '';
    lastPrimaryTarget = '';
    lastQrUrl = '';

    els.qrImage.removeAttribute('src');
    els.outputCode.textContent = 'No coupon payload generated yet.';
    els.shareOutput.value = '';
    els.readyLabel.textContent = 'No';

    setMode('url');
    showEmptyState();
    updateMetaOnly();
    setStatus('<strong>Ready.</strong><br>Add a coupon URL or coupon details, then click <b>Generate QR Code</b>.');
  }

  function loadSample(preset) {
    resetTool();

    if (preset === 'restaurant') {
      setMode('text');
      els.offerTitle.value = 'Lunch Special';
      els.themeColor.value = '#dc2626';
      els.promoCode.value = 'LUNCH10';
      els.discountType.value = 'Fixed amount discount';
      els.discountValue.value = '$10';
      els.couponText.value = 'Get $10 off orders over $35 during lunch hours this week.';
      els.terms.value = 'Valid 11 AM to 2 PM.\nOne use per customer.';
    } else if (preset === 'retail') {
      setMode('url');
      els.offerTitle.value = 'Holiday Savings';
      els.themeColor.value = '#0f766e';
      els.promoCode.value = 'SAVE20';
      els.discountType.value = 'Percent discount';
      els.discountValue.value = '20%';
      els.couponUrl.value = 'https://example.com/holiday-sale';
      els.terms.value = 'Online only.\nLimited-time offer.';
    } else {
      setMode('text');
      els.offerTitle.value = 'Weekend Flash Sale';
      els.themeColor.value = '#2563eb';
      els.promoCode.value = 'FLASH25';
      els.discountType.value = 'Percent discount';
      els.discountValue.value = '25%';
      els.couponText.value = 'Save 25% on orders over $40 this weekend only.';
      els.terms.value = 'One use per customer.\nCannot be combined with other offers.';
    }

    updateMetaOnly();
    generateQr();
  }

  async function copyText(text, okMsg, failMsg) {
    if (!text) {
      setStatus(failMsg);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setStatus(okMsg);
    } catch (err) {
      setStatus(failMsg);
    }
  }

  function downloadPng() {
    if (!lastQrUrl) {
      setStatus('<strong>Nothing to download.</strong><br>Generate a QR code first.');
      return;
    }

    const safeName = (safeTrim(els.offerTitle.value) || 'coupon-qr')
      .replace(/[^\w\-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const link = document.createElement('a');
    link.href = lastQrUrl;
    link.download = safeName + '.png';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    link.remove();

    setStatus('<strong>Opened download source.</strong><br>Your coupon QR image was opened for saving.');
  }

  els.urlModeBtn.addEventListener('click', function () { setMode('url'); });
  els.textModeBtn.addEventListener('click', function () { setMode('text'); });
  els.generateBtn.addEventListener('click', generateQr);
  els.sampleBtn.addEventListener('click', function () { loadSample('flash'); });
  els.clearBtn.addEventListener('click', resetTool);
  els.downloadBtn.addEventListener('click', downloadPng);

  els.copyPayloadBtn.addEventListener('click', function () {
    copyText(
      lastPayload,
      '<strong>Copied.</strong><br>Your coupon payload was copied to the clipboard.',
      '<strong>Nothing to copy.</strong><br>Generate a coupon QR code first.'
    );
  });

  els.copyLinkBtn.addEventListener('click', function () {
    copyText(
      lastPrimaryTarget,
      '<strong>Copied.</strong><br>Your primary coupon target was copied to the clipboard.',
      '<strong>Nothing to copy.</strong><br>Generate a coupon QR code first.'
    );
  });

  document.querySelectorAll('[data-preset]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      loadSample(btn.getAttribute('data-preset') || 'flash');
    });
  });

  [
    els.offerTitle,
    els.themeColor,
    els.promoCode,
    els.discountValue,
    els.discountType,
    els.expiresOn,
    els.couponUrl,
    els.couponText,
    els.terms,
    els.qrSize
  ].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', updateMetaOnly);
    el.addEventListener('change', updateMetaOnly);
  });

  resetTool();
});
