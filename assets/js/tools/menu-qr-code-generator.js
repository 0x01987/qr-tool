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

  function setStatus(html) {
    els.statusBox.innerHTML = html;
  }

  function setMode(mode) {
    currentMode = mode === 'text' ? 'text' : 'url';

    els.urlModeBtn.classList.toggle('active', currentMode === 'url');
    els.textModeBtn.classList.toggle('active', currentMode === 'text');
    els.urlModeFields.classList.toggle('hidden', currentMode !== 'url');
    els.textModeFields.classList.toggle('hidden', currentMode !== 'text');

    els.resultMode.textContent = 'Mode: ' + (currentMode === 'url' ? 'URL' : 'Text');
    els.modeLabel.textContent = currentMode === 'url' ? 'URL' : 'Text';

    updateMetaOnly();
  }

  function buildTextPayload() {
    const businessName = safeTrim(els.businessName.value);
    const menuTitle = safeTrim(els.menuTitle.value);
    const hoursText = safeTrim(els.hoursText.value);
    const menuText = normalizeMultiline(els.menuText.value);
    const notesText = normalizeMultiline(els.notesText.value);

    const parts = [];

    if (businessName) parts.push('Business: ' + businessName);
    if (menuTitle) parts.push('Menu: ' + menuTitle);
    if (hoursText) parts.push('Hours: ' + hoursText);
    if (menuText) parts.push('Items:\n' + menuText);
    if (notesText) parts.push('Notes:\n' + notesText);

    return parts.join('\n\n').trim();
  }

  function getPayload() {
    return currentMode === 'url'
      ? normalizeUrl(els.menuUrl.value)
      : buildTextPayload();
  }

  function getPrimaryTarget() {
    return getPayload();
  }

  function updatePreviewCard() {
    const businessName = safeTrim(els.businessName.value) || 'Restaurant Menu';
    const menuTitle = safeTrim(els.menuTitle.value) || 'Your Menu';
    const hoursText = safeTrim(els.hoursText.value);
    const notesText = normalizeMultiline(els.notesText.value);
    const themeColor = safeTrim(els.themeColor.value) || '#0f766e';

    let subText = '';
    if (currentMode === 'url') {
      subText = normalizeUrl(els.menuUrl.value) || 'Your hosted menu link preview will appear here.';
    } else {
      subText = normalizeMultiline(els.menuText.value) || 'Your menu text preview will appear here.';
    }

    els.menuCard.style.setProperty('--cardBrand', themeColor);
    els.previewBusiness.textContent = businessName;
    els.previewTitle.textContent = menuTitle;
    els.previewSub.textContent = subText;

    const lines = [];
    if (hoursText) lines.push('Hours • ' + hoursText);
    if (notesText) lines.push('Notes • ' + notesText.replace(/\n/g, ' / '));

    if (!lines.length) {
      els.previewMeta.innerHTML = '<div class="menu-line">Menu details and notes will appear here.</div>';
    } else {
      els.previewMeta.innerHTML = lines.map(function (line) {
        return '<div class="menu-line">' + escapeHtml(line) + '</div>';
      }).join('');
    }
  }

  function updateMetaOnly() {
    const payload = getPayload();
    const count = payload.length;

    lastPrimaryTarget = getPrimaryTarget();

    els.payloadCount.textContent = String(count);
    els.summaryPayload.textContent = String(count);
    els.outputCode.textContent = payload || 'No menu payload generated yet.';
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
      setStatus('<strong>Not enough data.</strong><br>Add a menu URL or menu text to generate a QR code.');
      return;
    }

    const qrUrl = buildQrUrl(payload);

    lastPayload = payload;
    showQr(qrUrl);
    els.readyLabel.textContent = 'Yes';
    setStatus('<strong>Generated.</strong><br>Your menu QR code is ready. You can download the PNG or copy the payload.');
  }

  function resetTool() {
    els.businessName.value = '';
    els.themeColor.value = '#0f766e';
    els.menuTitle.value = '';
    els.hoursText.value = '';
    els.menuUrl.value = '';
    els.menuText.value = '';
    els.notesText.value = '';
    els.qrSize.value = '320';

    lastPayload = '';
    lastPrimaryTarget = '';
    lastQrUrl = '';

    els.qrImage.removeAttribute('src');
    els.outputCode.textContent = 'No menu payload generated yet.';
    els.shareOutput.value = '';
    els.readyLabel.textContent = 'No';

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
      els.notesText.value = 'Dine-in • Takeout\nAsk about oat milk and seasonal specials.';
    } else if (preset === 'bar') {
      setMode('url');
      els.businessName.value = 'Skyline Bar';
      els.themeColor.value = '#7c3aed';
      els.menuTitle.value = 'Cocktail Menu';
      els.hoursText.value = 'Thu–Sat • 5 PM to Midnight';
      els.menuUrl.value = 'https://example.com/cocktail-menu';
      els.notesText.value = 'Signature cocktails, wine list, and happy hour specials.';
    } else {
      setMode('text');
      els.businessName.value = 'Sunset Grill';
      els.themeColor.value = '#0f766e';
      els.menuTitle.value = 'Lunch Menu';
      els.hoursText.value = 'Daily • 11 AM to 9 PM';
      els.menuText.value = 'Burger + Fries — $12\nCaesar Salad — $9\nIced Tea — $3';
      els.notesText.value = 'Dine-in • Takeout\nAsk about today’s soup and dessert specials.';
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

    const safeName = (safeTrim(els.menuTitle.value) || safeTrim(els.businessName.value) || 'menu-qr')
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

    setStatus('<strong>Opened download source.</strong><br>Your menu QR image was opened for saving.');
  }

  els.urlModeBtn.addEventListener('click', function () { setMode('url'); });
  els.textModeBtn.addEventListener('click', function () { setMode('text'); });
  els.generateBtn.addEventListener('click', generateQr);
  els.sampleBtn.addEventListener('click', function () { loadSample('restaurant'); });
  els.clearBtn.addEventListener('click', resetTool);
  els.downloadBtn.addEventListener('click', downloadPng);

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
    els.qrSize
  ].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', updateMetaOnly);
    el.addEventListener('change', updateMetaOnly);
  });

  resetTool();
});
