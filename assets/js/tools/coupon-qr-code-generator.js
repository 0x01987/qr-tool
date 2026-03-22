document.addEventListener('DOMContentLoaded', () => {
  const els = {
    urlModeBtn: document.getElementById('urlModeBtn'),
    textModeBtn: document.getElementById('textModeBtn'),
    urlModeFields: document.getElementById('urlModeFields'),
    textModeFields: document.getElementById('textModeFields'),

    offerTitle: document.getElementById('offerTitle'),
    themeColor: document.getElementById('themeColor'),
    promoCode: document.getElementById('promoCode'),
    discountValue: document.getElementById('discountValue'),
    discountType: document.getElementById('discountType'),
    expiresOn: document.getElementById('expiresOn'),
    couponUrl: document.getElementById('couponUrl'),
    couponText: document.getElementById('couponText'),
    terms: document.getElementById('terms'),
    qrSize: document.getElementById('qrSize'),
    errorLevel: document.getElementById('errorLevel'),

    generateBtn: document.getElementById('generateBtn'),
    sampleBtn: document.getElementById('sampleBtn'),
    clearBtn: document.getElementById('clearBtn'),
    copyPayloadBtn: document.getElementById('copyPayloadBtn'),
    copyLinkBtn: document.getElementById('copyLinkBtn'),
    downloadBtn: document.getElementById('downloadBtn'),

    outputCode: document.getElementById('outputCode'),
    shareOutput: document.getElementById('shareOutput'),
    statusBox: document.getElementById('statusBox'),

    resultMode: document.getElementById('resultMode'),
    payloadCount: document.getElementById('payloadCount'),
    summaryPayload: document.getElementById('summaryPayload'),
    readyLabel: document.getElementById('readyLabel'),
    modeLabel: document.getElementById('modeLabel'),

    qrCanvas: document.getElementById('qrCanvas'),
    qrImage: document.getElementById('qrImage'),
    qrEmpty: document.getElementById('qrEmpty'),
    year: document.getElementById('year'),

    couponCard: document.getElementById('couponCard'),
    previewDiscountType: document.getElementById('previewDiscountType'),
    previewTitle: document.getElementById('previewTitle'),
    previewSub: document.getElementById('previewSub'),
    previewMeta: document.getElementById('previewMeta')
  };

  if (!els.generateBtn || !els.qrCanvas) return;

  if (els.year) {
    els.year.textContent = String(new Date().getFullYear());
  }

  let currentMode = 'url';
  let lastPayload = '';
  let lastPrimaryTarget = '';
  let lastQrMode = '';
  let lastQrImageUrl = '';

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

  function setMode(mode) {
    currentMode = mode === 'text' ? 'text' : 'url';
    els.urlModeBtn.classList.toggle('active', currentMode === 'url');
    els.textModeBtn.classList.toggle('active', currentMode === 'text');
    els.urlModeFields.classList.toggle('hidden', currentMode !== 'url');
    els.textModeFields.classList.toggle('hidden', currentMode !== 'text');

    if (els.resultMode) {
      els.resultMode.textContent = `Mode: ${currentMode === 'url' ? 'URL' : 'Text'}`;
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
    const type = safeTrim(els.discountType.value);
    const value = safeTrim(els.discountValue.value);
    const expires = safeTrim(els.expiresOn.value);
    const details = safeTrim(els.couponText.value);
    const terms = safeTrim(els.terms.value);

    if (title) lines.push(`Offer: ${title}`);
    if (code) lines.push(`Code: ${code}`);
    if (type || value) lines.push(`Discount: ${[type, value].filter(Boolean).join(' - ')}`);
    if (expires) lines.push(`Expires: ${expires}`);
    if (details) lines.push(`Details: ${details}`);
    if (terms) lines.push(`Terms: ${terms}`);

    return lines.join('\n');
  }

  function getPayload() {
    return currentMode === 'url' ? normalizeUrl(els.couponUrl.value) : buildTextPayload();
  }

  function getPrimaryTarget() {
    return currentMode === 'url' ? normalizeUrl(els.couponUrl.value) : buildTextPayload();
  }

  function updatePreviewCard() {
    const title = safeTrim(els.offerTitle.value) || 'Your Coupon Offer';
    const promoCode = safeTrim(els.promoCode.value);
    const discountValue = safeTrim(els.discountValue.value);
    const discountType = safeTrim(els.discountType.value) || 'Offer';
    const expires = safeTrim(els.expiresOn.value);
    const terms = safeTrim(els.terms.value);
    const details = currentMode === 'url'
      ? (normalizeUrl(els.couponUrl.value) || 'Your coupon landing page preview will appear here.')
      : (safeTrim(els.couponText.value) || 'Your coupon text preview will appear here.');
    const themeColor = safeTrim(els.themeColor.value) || '#2563eb';

    if (els.couponCard) {
      els.couponCard.style.setProperty('--cardBrand', themeColor);
    }

    els.previewDiscountType.textContent = discountType;
    els.previewTitle.textContent = title;
    els.previewSub.textContent = details;

    const lines = [];
    if (promoCode) lines.push(`Promo code • ${promoCode}`);
    if (discountValue) lines.push(`Value • ${discountValue}`);
    if (expires) lines.push(`Expires • ${expires}`);
    if (terms) lines.push(`Terms • ${terms}`);

    if (!lines.length) {
      els.previewMeta.innerHTML = '<div class="coupon-line">Promo code and coupon details will appear here.</div>';
    } else {
      els.previewMeta.innerHTML = lines
        .map(line => `<div class="coupon-line">${escapeHtml(line)}</div>`)
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
    if (els.readyLabel && !payload) els.readyLabel.textContent = 'No';

    updatePreviewCard();
  }

  function setStatus(html) {
    if (els.statusBox) els.statusBox.innerHTML = html;
  }

  function showEmptyState() {
    els.qrCanvas.hidden = true;
    els.qrImage.hidden = true;
    els.qrEmpty.hidden = false;
  }

  function showCanvas() {
    els.qrCanvas.hidden = false;
    els.qrImage.hidden = true;
    els.qrEmpty.hidden = true;
  }

  function showImage() {
    els.qrCanvas.hidden = true;
    els.qrImage.hidden = false;
    els.qrEmpty.hidden = true;
  }

  function getFallbackQrUrl(text, size) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=16&data=${encodeURIComponent(text)}`;
  }

  async function renderQrCanvas(text) {
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

    lastQrMode = 'canvas';
    showCanvas();
  }

  function renderQrFallback(text) {
    const size = Number(els.qrSize.value || 320);
    const url = getFallbackQrUrl(text, Math.max(256, size));
    lastQrImageUrl = url;
    els.qrImage.src = url;
    lastQrMode = 'image';
    showImage();
  }

  async function generate() {
    updateMetaOnly();

    const payload = getPayload();

    if (!payload) {
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      showEmptyState();
      setStatus('<strong>Not enough data.</strong><br>Add a coupon URL or coupon text to generate a QR code.');
      return;
    }

    setStatus('<strong>Generating...</strong><br>Rendering your coupon QR code.');

    try {
      await renderQrCanvas(payload);
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';
      lastPayload = payload;
      setStatus('<strong>Generated.</strong><br>Your coupon QR code is ready. You can download the PNG or copy the payload.');
    } catch (_) {
      renderQrFallback(payload);
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';
      lastPayload = payload;
      setStatus('<strong>Generated with fallback.</strong><br>Your coupon QR code is ready using the fallback QR renderer.');
    }
  }

  function reset() {
    setMode('url');

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
    lastQrMode = '';
    lastQrImageUrl = '';
    els.qrImage.removeAttribute('src');

    if (els.outputCode) els.outputCode.textContent = 'No coupon payload generated yet.';
    if (els.shareOutput) els.shareOutput.value = '';
    if (els.readyLabel) els.readyLabel.textContent = 'No';

    showEmptyState();
    updateMetaOnly();

    setStatus('<strong>Ready.</strong><br>Add a coupon URL or text details, then click <b>Generate QR Code</b>.');
  }

  function loadPreset(kind = 'flash') {
    reset();

    if (kind === 'restaurant') {
      setMode('text');
      els.offerTitle.value = 'Lunch Special';
      els.promoCode.value = 'LUNCH10';
      els.discountType.value = 'Fixed amount discount';
      els.discountValue.value = '$10';
      els.couponText.value = 'Get $10 off orders over $35 during lunch hours this week.';
      els.terms.value = 'Valid 11 AM to 2 PM. One use per customer.';
      els.themeColor.value = '#dc2626';
    } else if (kind === 'retail') {
      setMode('url');
      els.offerTitle.value = 'Holiday Savings';
      els.promoCode.value = 'SAVE20';
      els.discountType.value = 'Percent discount';
      els.discountValue.value = '20%';
      els.couponUrl.value = 'https://example.com/holiday-sale';
      els.terms.value = 'Online only. Limited-time offer.';
      els.themeColor.value = '#0f766e';
    } else {
      setMode('text');
      els.offerTitle.value = 'Weekend Flash Sale';
      els.promoCode.value = 'FLASH25';
      els.discountType.value = 'Percent discount';
      els.discountValue.value = '25%';
      els.couponText.value = 'Save 25% on orders over $40 this weekend only.';
      els.terms.value = 'One use per customer. Cannot be combined with other offers.';
      els.themeColor.value = '#2563eb';
    }

    updateMetaOnly();
    generate();
  }

  async function copyText(text, successHtml, failHtml) {
    if (!text) {
      setStatus(failHtml);
      return;
    }

    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(text);
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        temp.remove();
      }
      setStatus(successHtml);
    } catch (_) {
      setStatus(failHtml);
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

    if (lastQrMode === 'canvas' && !els.qrCanvas.hidden) {
      const link = document.createElement('a');
      link.href = els.qrCanvas.toDataURL('image/png');
      link.download = `${safeName}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus('<strong>Downloaded.</strong><br>Your coupon QR code PNG was downloaded.');
      return;
    }

    if (lastQrMode === 'image' && lastQrImageUrl) {
      const link = document.createElement('a');
      link.href = lastQrImageUrl;
      link.download = `${safeName}.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus('<strong>Opened download source.</strong><br>Your fallback QR image was opened for saving.');
      return;
    }

    setStatus('<strong>Nothing to download.</strong><br>Generate a QR code first.');
  }

  els.urlModeBtn?.addEventListener('click', () => setMode('url'));
  els.textModeBtn?.addEventListener('click', () => setMode('text'));

  els.generateBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await generate();
  });

  els.sampleBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    loadPreset('flash');
  });

  els.clearBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    reset();
  });

  els.copyPayloadBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await copyText(
      lastPayload,
      '<strong>Copied.</strong><br>Your coupon payload was copied to the clipboard.',
      '<strong>Nothing to copy.</strong><br>Generate a coupon QR code first.'
    );
  });

  els.copyLinkBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await copyText(
      lastPrimaryTarget,
      '<strong>Copied.</strong><br>Your primary coupon target was copied to the clipboard.',
      '<strong>Nothing to copy.</strong><br>Generate a coupon QR code first.'
    );
  });

  els.downloadBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    downloadPng();
  });

  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      loadPreset(btn.getAttribute('data-preset') || 'flash');
    });
  });

  [
    els.offerTitle, els.themeColor, els.promoCode, els.discountValue, els.discountType,
    els.expiresOn, els.couponUrl, els.couponText, els.terms, els.qrSize, els.errorLevel
  ].forEach(el => {
    el?.addEventListener('input', updateMetaOnly);
    el?.addEventListener('change', updateMetaOnly);
  });

  reset();
});
