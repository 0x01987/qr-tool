document.addEventListener('DOMContentLoaded', function () {
  const $ = (id) => document.getElementById(id);

  const els = {
    urlModeBtn: $('urlModeBtn'),
    textModeBtn: $('textModeBtn'),
    urlModeFields: $('urlModeFields'),
    textModeFields: $('textModeFields'),

    businessName: $('businessName'),
    themeColor: $('themeColor'),
    menuTitle: $('menuTitle'),
    hoursText: $('hoursText'),
    menuUrl: $('menuUrl'),
    menuText: $('menuText'),
    notesText: $('notesText'),
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

    menuCard: $('menuCard'),
    previewBusiness: $('previewBusiness'),
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
    if (els.statusBox) els.statusBox.innerHTML = html;
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
    const businessName = safeTrim(els.businessName.value);
    const menuTitle = safeTrim(els.menuTitle.value);
    const hoursText = safeTrim(els.hoursText.value);
    const menuText = safeTrim(els.menuText.value);
    const notesText = safeTrim(els.notesText.value);

    if (businessName) lines.push('Business: ' + businessName);
    if (menuTitle) lines.push('Menu: ' + menuTitle);
    if (hoursText) lines.push('Hours: ' + hoursText);
    if (menuText) lines.push('Items: ' + menuText);
    if (notesText) lines.push('Notes: ' + notesText);

    return lines.join('\n');
  }

  function getPayload() {
    return currentMode === 'url'
      ? normalizeUrl(els.menuUrl.value)
      : buildTextPayload();
  }

  function getPrimaryTarget() {
    return currentMode === 'url'
      ? normalizeUrl(els.menuUrl.value)
      : buildTextPayload();
  }

  function updatePreviewCard() {
    const businessName = safeTrim(els.businessName.value) || 'Restaurant Menu';
    const menuTitle = safeTrim(els.menuTitle.value) || 'Your Menu';
    const hoursText = safeTrim(els.hoursText.value);
    const notesText = safeTrim(els.notesText.value);
    const themeColor = safeTrim(els.themeColor.value) || '#0f766e';

    let subText = '';
    if (currentMode === 'url') {
      subText = normalizeUrl(els.menuUrl.value) || 'Your hosted menu link preview will appear here.';
    } else {
      subText = safeTrim(els.menuText.value) || 'Your menu text preview will appear here.';
    }

    els.menuCard.style.setProperty('--cardBrand', themeColor);
    els.previewBusiness.textContent = businessName;
    els.previewTitle.textContent = menuTitle;
    els.previewSub.textContent = subText;

    const lines = [];
    if (hoursText) lines.push('Hours • ' + hoursText);
    if (notesText) lines.push('Notes • ' + notesText);

    if (!lines.length) {
      els.previewMeta.innerHTML = '<div class="menu-line">Menu details and notes will appear here.</div>';
    } else {
      els.previewMeta.innerHTML = lines
        .map(function (line) {
          return '<div class="menu-line">' + escapeHtml(line) + '</div>';
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
    if (els.outputCode) els.outputCode.textContent = payload || 'No menu payload generated yet.';
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
      setStatus('<strong>Not enough data.</strong><br>Add a menu URL or menu text to generate a QR code.');
      return;
    }

    try {
      await renderCanvasQr(payload);
      lastPayload = payload;
      showCanvas();
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';
      setStatus('<strong>Generated.</strong><br>Your menu QR code is ready. You can download the PNG or copy the payload.');
    } catch (err) {
      renderFallbackQr(payload);
      lastPayload = payload;
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';
      setStatus('<strong>Generated with fallback.</strong><br>Your menu QR code is ready using the fallback renderer.');
    }
  }

  function resetTool() {
    currentMode = 'url';

    els.businessName.value = '';
    els.themeColor.value = '#0f766e';
    els.menuTitle.value = '';
    els.hoursText.value = '';
    els.menuUrl.value = '';
    els.menuText.value = '';
    els.notesText.value = '';
    els.qrSize.value = '320';
    els.errorLevel.value = 'M';

    lastPayload = '';
    lastPrimaryTarget = '';

    els.qrImage.removeAttribute('src');
    if (els.outputCode) els.outputCode.textContent = 'No menu payload generated yet.';
    if (els.shareOutput) els.shareOutput.value = '';
    if (els.readyLabel) els.readyLabel.textContent = 'No';

    setMode('url');
    showEmptyState();
    updateMetaOnly();
    setStatus('<strong>Ready.</strong><br>Add a menu URL or text details, then click <b>Generate QR Code</b>.');
  }

  function loadSample(preset) {
    resetTool();

    if (preset === 'cafe') {
      setMode('text');
      els.businessName.value = 'Sunrise Café';
      els.themeColor.value = '#b45309';
      els.menuTitle.value = 'Coffee + Pastry Menu';
      els.hoursText.value = 'Mon–Sun • 7 AM to 4 PM';
      els.menuText.value = 'Latte — $5\nCold Brew — $4\nCroissant — $3.50\nBlueberry Muffin — $3';
      els.notesText.value = 'Dine-in • Takeout • Ask about oat milk and seasonal specials.';
    } else if (preset === 'bar') {
      setMode('url');
      els.businessName.value = 'Skyline Bar';
      els.themeColor.value = '#7c3aed';
      els.menuTitle.value = 'Cocktail Menu';
      els.hoursText.value = 'Thu–Sat • 5 PM to Midnight';
      els.menuUrl.value = 'https://example.com/cocktail-menu';
      els.notesText.value = 'Signature cocktails, wine list, and happy hour specials.';
    } else {
      setMode('url');
      els.businessName.value = 'Sunset Grill';
      els.themeColor.value = '#0f766e';
      els.menuTitle.value = 'Lunch Menu';
      els.hoursText.value = 'Daily • 11 AM to 9 PM';
      els.menuUrl.value = 'https://example.com/lunch-menu';
      els.notesText.value = 'Dine-in • Takeout • Scan to view today’s menu and specials.';
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

    const safeName = (safeTrim(els.menuTitle.value) || safeTrim(els.businessName.value) || 'menu-qr')
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
      setStatus('<strong>Downloaded.</strong><br>Your menu QR code PNG was downloaded.');
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
    loadSample('restaurant');
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
      '<strong>Copied.</strong><br>Your menu payload was copied to the clipboard.',
      '<strong>Nothing to copy.</strong><br>Generate a menu QR code first.'
    );
  });

  els.copyLinkBtn.addEventListener('click', function () {
    copyText(
      lastPrimaryTarget,
      '<strong>Copied.</strong><br>Your primary menu target was copied to the clipboard.',
      '<strong>Nothing to copy.</strong><br>Generate a menu QR code first.'
    );
  });

  document.querySelectorAll('[data-preset]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      loadSample(btn.getAttribute('data-preset') || 'restaurant');
    });
  });

  [
    els.businessName,
    els.themeColor,
    els.menuTitle,
    els.hoursText,
    els.menuUrl,
    els.menuText,
    els.notesText,
    els.qrSize,
    els.errorLevel
  ].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', updateMetaOnly);
    el.addEventListener('change', updateMetaOnly);
  });

  resetTool();
});
