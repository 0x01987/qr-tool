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
    errorLevel: $('errorLevel'),

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

    qrCanvas: $('qrCanvas'),
    qrImage: $('qrImage'),
    qrEmpty: $('qrEmpty'),
    year: $('year'),

    couponCard: $('couponCard'),
    previewDiscountType: $('previewDiscountType'),
    previewTitle: $('previewTitle'),
    previewSub: $('previewSub'),
    previewMeta: $('previewMeta')
  };

  if (!els.generateBtn || !els.sampleBtn || !els.clearBtn) return;

  let currentMode = 'url';
  let lastPayload = '';
  let lastPrimaryTarget = '';
  let lastRenderType = '';

  if (els.year) {
    els.year.textContent = String(new Date().getFullYear());
  }

  function safeTrim(value) {
    return String(value || '').trim();
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

  function setStatus(html) {
    if (els.statusBox) {
      els.statusBox.innerHTML = html;
    }
  }

  function setMode(mode) {
    currentMode = mode === 'text' ? 'text' : 'url';

    els.urlModeBtn.classList.toggle('active', currentMode === 'url');
    els.textModeBtn.classList.toggle('active', currentMode === 'text');
    els.urlModeFields.classList.toggle('hidden', currentMode !== 'url');
    els.textModeFields.classList.toggle('hidden', currentMode !== 'text');

    if (els.resultMode) {
      els.resultMode.textContent = 'Mode: ' + (currentMode === 'url' ? 'URL' : 'Text');
    }
    if (els.modeLabel) {
      els.modeLabel.textContent = currentMode === 'url' ? 'URL' : 'Text';
    }

    updateMetaOnly();
  }

  function buildTextPayload() {
    const lines = [];
    const title = safeTrim(els.offerTitle.value);
    const code = safeTrim(els.promoCode.value);
    const discountType = safeTrim(els.discountType.value);
    const discountValue = safeTrim(els.discountValue.value);
    const expiresOn = safeTrim(els.expiresOn.value);
    const couponText = safeTrim(els.couponText.value);
    const terms = safeTrim(els.terms.value);

    if (title) lines.push('Offer: ' + title);
    if (code) lines.push('Code: ' + code);
    if (discountType || discountValue) {
      lines.push('Discount: ' + [discountType, discountValue].filter(Boolean).join(' - '));
    }
    if (expiresOn) lines.push('Expires: ' + expiresOn);
    if (couponText) lines.push('Details: ' + couponText);
    if (terms) lines.push('Terms: ' + terms);

    return lines.join('\n');
  }

  function getPayload() {
    return currentMode === 'url'
      ? normalizeUrl(els.couponUrl.value)
      : buildTextPayload();
  }

  function getPrimaryTarget() {
    return currentMode === 'url'
      ? normalizeUrl(els.couponUrl.value)
      : buildTextPayload();
  }

  function updatePreviewCard() {
    const title = safeTrim(els.offerTitle.value) || 'Your Coupon Offer';
    const code = safeTrim(els.promoCode.value);
    const discountType = safeTrim(els.discountType.value) || 'Offer';
    const discountValue = safeTrim(els.discountValue.value);
    const expiresOn = safeTrim(els.expiresOn.value);
    const terms = safeTrim(els.terms.value);
    const themeColor = safeTrim(els.themeColor.value) || '#2563eb';

    let subText = '';
    if (currentMode === 'url') {
      subText = normalizeUrl(els.couponUrl.value) || 'Your coupon landing page preview will appear here.';
    } else {
      subText = safeTrim(els.couponText.value) || 'Your coupon text preview will appear here.';
    }

    els.couponCard.style.setProperty('--cardBrand', themeColor);
    els.previewDiscountType.textContent = discountType;
    els.previewTitle.textContent = title;
    els.previewSub.textContent = subText;

    const lines = [];
    if (code) lines.push('Promo code • ' + code);
    if (discountValue) lines.push('Value • ' + discountValue);
    if (expiresOn) lines.push('Expires • ' + expiresOn);
    if (terms) lines.push('Terms • ' + terms);

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

    if (els.payloadCount) els.payloadCount.textContent = String(count);
    if (els.summaryPayload) els.summaryPayload.textContent = String(count);
    if (els.outputCode) els.outputCode.textContent = payload || 'No coupon payload generated yet.';
    if (els.shareOutput) els.shareOutput.value = lastPrimaryTarget || '';

    updatePreviewCard();
  }

  function showEmptyState() {
    els.qrCanvas.hidden = true;
    els.qrImage.hidden = true;
    els.qrEmpty.hidden = false;
    lastRenderType = '';
  }

  function showCanvas() {
    els.qrCanvas.hidden = false;
    els.qrImage.hidden = true;
    els.qrEmpty.hidden = true;
    lastRenderType = 'canvas';
  }

  function showImage() {
    els.qrCanvas.hidden = true;
    els.qrImage.hidden = false;
    els.qrEmpty.hidden = true;
    lastRenderType = 'image';
  }

  function getFallbackQrUrl(text, size) {
    return 'https://api.qrserver.com/v1/create-qr-code/?size=' +
      encodeURIComponent(size + 'x' + size) +
      '&margin=16&data=' + encodeURIComponent(text);
  }

  async function renderCanvasQr(text) {
    if (!window.QRCode || typeof window.QRCode.toCanvas !== 'function') {
      throw new Error('QRCode library unavailable');
    }

    const size = Number(els.qrSize.value || 320);
    const level = safeTrim(els.errorLevel.value) || 'M';

    await window.QRCode.toCanvas(els.qrCanvas, text, {
      width: size,
      margin: 2,
      errorCorrectionLevel: level,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  }

  function renderFallbackQr(text) {
    const size = Math.max(256, Number(els.qrSize.value || 320));
    const fallbackUrl = getFallbackQrUrl(text, size);
    els.qrImage.src = fallbackUrl;
    showImage();
  }

  async function generateQr() {
    updateMetaOnly();

    const payload = getPayload();
    if (!payload) {
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      showEmptyState();
      setStatus('<strong>Not enough data.</strong><br>Add a coupon URL or coupon text to generate a QR code.');
      return;
    }

    try {
      await renderCanvasQr(payload);
      lastPayload = payload;
      showCanvas();
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';
      setStatus('<strong>Generated.</strong><br>Your coupon QR code is ready. You can download the PNG or copy the payload.');
    } catch (err) {
      renderFallbackQr(payload);
      lastPayload = payload;
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';
      setStatus('<strong>Generated with fallback.</strong><br>Your coupon QR code is ready using the fallback renderer.');
    }
  }

  function resetTool() {
    currentMode = 'url';

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
    els.errorLevel.value = 'M';

    lastPayload = '';
    lastPrimaryTarget = '';

    els.qrImage.removeAttribute('src');
    if (els.outputCode) els.outputCode.textContent = 'No coupon payload generated yet.';
    if (els.shareOutput) els.shareOutput.value = '';
    if (els.readyLabel) els.readyLabel.textContent = 'No';

    setMode('url');
    showEmptyState();
    updateMetaOnly();
    setStatus('<strong>Ready.</strong><br>Add a coupon URL or text details, then click <b>Generate QR Code</b>.');
  }

  function loadSample(preset) {
    resetTool();

    if (preset === 'restaurant') {
      setMode('text');
      els.offerTitle.value = 'Lunch Special';
      els.themeColor.value = '#dc2626';
      els.promoCode.value = 'LUNCH10';
      els.discountValue.value = '$10';
      els.discountType.value = 'Fixed amount discount';
      els.couponText.value = 'Get $10 off orders over $35 during lunch hours this week.';
      els.terms.value = 'Valid 11 AM to 2 PM. One use per customer.';
    } else if (preset === 'retail') {
      setMode('url');
      els.offerTitle.value = 'Holiday Savings';
      els.themeColor.value = '#0f766e';
      els.promoCode.value = 'SAVE20';
      els.discountValue.value = '20%';
      els.discountType.value = 'Percent discount';
      els.couponUrl.value = 'https://example.com/holiday-sale';
      els.terms.value = 'Online only. Limited-time offer.';
    } else {
      setMode('text');
      els.offerTitle.value = 'Weekend Flash Sale';
      els.themeColor.value = '#2563eb';
      els.promoCode.value = 'FLASH25';
      els.discountValue.value = '25%';
      els.discountType.value = 'Percent discount';
      els.couponText.value = 'Save 25% on orders over $40 this weekend only.';
      els.terms.value = 'One use per customer. Cannot be combined with other offers.';
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
    if (!lastPayload) {
      setStatus('<strong>Nothing to download.</strong><br>Generate a QR code first.');
      return;
    }

    const safeName = (safeTrim(els.offerTitle.value) || 'coupon-qr')
      .replace(/[^\w\-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (lastRenderType === 'canvas' && !els.qrCanvas.hidden) {
      const link = document.createElement('a');
      link.href = els.qrCanvas.toDataURL('image/png');
      link.download = safeName + '.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus('<strong>Downloaded.</strong><br>Your coupon QR code PNG was downloaded.');
      return;
    }

    if (lastRenderType === 'image' && els.qrImage.src) {
      const link = document.createElement('a');
      link.href = els.qrImage.src;
      link.download = safeName + '.png';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus('<strong>Opened download source.</strong><br>Your fallback QR image was opened for saving.');
      return;
    }

    setStatus('<strong>Nothing to download.</strong><br>Generate a QR code first.');
  }

  els.urlModeBtn.addEventListener('click', function () {
    setMode('url');
  });

  els.textModeBtn.addEventListener('click', function () {
    setMode('text');
  });

  els.generateBtn.addEventListener('click', function () {
    generateQr();
  });

  els.sampleBtn.addEventListener('click', function () {
    loadSample('flash');
  });

  els.clearBtn.addEventListener('click', function () {
    resetTool();
  });

  els.downloadBtn.addEventListener('click', function () {
    downloadPng();
  });

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
    els.qrSize,
    els.errorLevel
  ].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', updateMetaOnly);
    el.addEventListener('change', updateMetaOnly);
  });

  resetTool();
});
