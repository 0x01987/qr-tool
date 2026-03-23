document.addEventListener('DOMContentLoaded', () => {
  const els = {
    phoneNumber: document.getElementById('phoneNumber'),
    smsLabel: document.getElementById('smsLabel'),
    smsMessage: document.getElementById('smsMessage'),

    generateBtn: document.getElementById('generateBtn'),
    sampleBtn: document.getElementById('sampleBtn'),
    clearBtn: document.getElementById('clearBtn'),
    copyLinkBtn: document.getElementById('copyLinkBtn'),
    openLinkBtn: document.getElementById('openLinkBtn'),
    downloadBtn: document.getElementById('downloadBtn'),

    charCount: document.getElementById('charCount'),
    readyLabel: document.getElementById('readyLabel'),
    recipientMetric: document.getElementById('recipientMetric'),
    messageMetric: document.getElementById('messageMetric'),

    previewName: document.getElementById('previewName'),
    previewSub: document.getElementById('previewSub'),
    previewLines: document.getElementById('previewLines'),

    qrCanvas: document.getElementById('qrCanvas'),
    qrImage: document.getElementById('qrImage'),
    qrEmpty: document.getElementById('qrEmpty'),
    outputCode: document.getElementById('outputCode'),
    statusBox: document.getElementById('statusBox'),
    year: document.getElementById('year')
  };

  if (!els.generateBtn || !els.qrCanvas || !els.qrImage) return;
  if (els.year) els.year.textContent = String(new Date().getFullYear());

  let lastSmsUrl = '';
  let lastQrMode = '';
  let lastQrImageUrl = '';

  function safeTrim(value) {
    return String(value || '').trim();
  }

  function setStatus(html) {
    if (els.statusBox) els.statusBox.innerHTML = html;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizePhone(value) {
    return safeTrim(value).replace(/[^\d+]/g, '');
  }

  function buildSmsUrl() {
    const phone = normalizePhone(els.phoneNumber.value);
    const message = safeTrim(els.smsMessage.value);

    if (!phone) return '';

    if (!message) {
      return `sms:${phone}`;
    }

    return `sms:${phone}?body=${encodeURIComponent(message)}`;
  }

  function updateMeta() {
    const label = safeTrim(els.smsLabel.value) || 'Your recipient';
    const phone = normalizePhone(els.phoneNumber.value);
    const message = safeTrim(els.smsMessage.value);
    const url = buildSmsUrl();

    if (els.charCount) els.charCount.textContent = String(message.length);
    if (els.messageMetric) els.messageMetric.textContent = String(message.length);
    if (els.recipientMetric) els.recipientMetric.textContent = phone || '—';

    if (els.previewName) els.previewName.textContent = label;
    if (els.previewSub) {
      els.previewSub.textContent = phone
        ? 'A phone number and optional message preview are ready.'
        : 'A phone number and optional message preview will appear here.';
    }

    if (els.previewLines) {
      if (url) {
        const parts = [
          `<div class="sms-line">Phone: ${escapeHtml(phone)}</div>`
        ];
        if (message) {
          parts.push(`<div class="sms-line">Message: ${escapeHtml(message)}</div>`);
        }
        parts.push(`<div class="sms-line">${escapeHtml(url)}</div>`);
        els.previewLines.innerHTML = parts.join('');
      } else {
        els.previewLines.innerHTML = '<div class="sms-line">An SMS link preview will appear here.</div>';
      }
    }

    if (els.outputCode) {
      els.outputCode.textContent = url || 'No SMS link generated yet.';
    }
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

  async function fetchBlob(url) {
    const res = await fetch(url, { mode: 'cors', cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.blob();
  }

  async function blobToImage(blob) {
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = objectUrl;
      });
      return img;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function buildQrApiUrl(text) {
    const params = new URLSearchParams({
      data: text,
      size: '640x640',
      margin: '20',
      color: '000000',
      bgcolor: 'ffffff',
      format: 'png'
    });
    return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
  }

  function getFallbackQrUrl(text) {
    return buildQrApiUrl(text);
  }

  async function renderQrCanvas(text) {
    const blob = await fetchBlob(buildQrApiUrl(text));
    const qrImg = await blobToImage(blob);

    const canvas = els.qrCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = 320;
    canvas.height = 320;
    ctx.clearRect(0, 0, 320, 320);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 320, 320);
    ctx.drawImage(qrImg, 0, 0, 320, 320);

    lastQrMode = 'canvas';
    showCanvas();
  }

  function renderQrFallback(text) {
    const url = getFallbackQrUrl(text);
    lastQrImageUrl = url;
    els.qrImage.src = url;
    lastQrMode = 'image';
    showImage();
  }

  async function generate() {
    updateMeta();
    const url = buildSmsUrl();
    lastSmsUrl = url;

    if (!url) {
      showEmptyState();
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      setStatus('<strong>Not enough data.</strong><br>Enter a phone number first.');
      return;
    }

    try {
      await renderQrCanvas(url);
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';
      setStatus('<strong>Generated.</strong><br>Your SMS QR code is ready.');
    } catch (err) {
      console.error('SMS QR generation failed:', err);
      renderQrFallback(url);
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';
      setStatus('<strong>Generated with fallback.</strong><br>Your SMS QR code is ready using the fallback renderer.');
    }
  }

  async function copyText(text, successMessage, failMessage) {
    try {
      if (!text) throw new Error('No text');

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

      setStatus(`<strong>Copied.</strong><br>${successMessage}`);
    } catch (_) {
      setStatus(`<strong>Copy failed.</strong><br>${failMessage}`);
    }
  }

  function clearAll() {
    els.phoneNumber.value = '';
    els.smsLabel.value = '';
    els.smsMessage.value = '';

    lastSmsUrl = '';
    lastQrMode = '';
    lastQrImageUrl = '';
    els.qrImage.removeAttribute('src');

    if (els.readyLabel) els.readyLabel.textContent = 'No';
    updateMeta();
    showEmptyState();
    setStatus('<strong>Cleared.</strong><br>Your SMS details were reset.');
  }

  function loadSample() {
    els.phoneNumber.value = '+15551234567';
    els.smsLabel.value = 'Sales Team';
    els.smsMessage.value = 'Hi, I would like more information about your services.';
    updateMeta();
    generate();
  }

  function openSmsLink() {
    const url = lastSmsUrl || buildSmsUrl();
    if (!url) {
      setStatus('<strong>Nothing to open.</strong><br>Enter a phone number first.');
      return;
    }
    window.location.href = url;
  }

  function downloadPng() {
    if (!lastSmsUrl) {
      setStatus('<strong>Nothing to download.</strong><br>Generate a QR code first.');
      return;
    }

    if (lastQrMode === 'canvas' && !els.qrCanvas.hidden) {
      const link = document.createElement('a');
      link.href = els.qrCanvas.toDataURL('image/png');
      link.download = 'sms-qr-code.png';
      link.click();
      setStatus('<strong>Downloaded.</strong><br>Your SMS QR code PNG was downloaded.');
      return;
    }

    if (lastQrMode === 'image' && lastQrImageUrl) {
      const link = document.createElement('a');
      link.href = lastQrImageUrl;
      link.download = 'sms-qr-code.png';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus('<strong>Opened download source.</strong><br>Your fallback QR image was opened for saving.');
      return;
    }

    setStatus('<strong>Nothing to download.</strong><br>Generate a QR code first.');
  }

  els.generateBtn?.addEventListener('click', async () => {
    await generate();
  });

  els.sampleBtn?.addEventListener('click', () => {
    loadSample();
  });

  els.clearBtn?.addEventListener('click', () => {
    clearAll();
  });

  els.copyLinkBtn?.addEventListener('click', async () => {
    await copyText(lastSmsUrl || buildSmsUrl(), 'The SMS link was copied.', 'Nothing to copy.');
  });

  els.openLinkBtn?.addEventListener('click', () => {
    openSmsLink();
  });

  els.downloadBtn?.addEventListener('click', () => {
    downloadPng();
  });

  [els.phoneNumber, els.smsLabel, els.smsMessage].forEach(el => {
    el?.addEventListener('input', updateMeta);
    el?.addEventListener('change', updateMeta);
  });

  updateMeta();
  showEmptyState();
});
