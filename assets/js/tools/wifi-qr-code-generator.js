document.addEventListener('DOMContentLoaded', () => {
  const ssidEl = document.getElementById('ssid');
  const securityEl = document.getElementById('security');
  const passwordEl = document.getElementById('password');
  const hiddenEl = document.getElementById('hidden');
  const showPassEl = document.getElementById('showPass');
  const sizeEl = document.getElementById('size');
  const levelEl = document.getElementById('level');

  const generateBtn = document.getElementById('generateBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyPayloadBtn = document.getElementById('copyPayloadBtn');
  const clearBtn = document.getElementById('clearBtn');

  const qrWrap = document.getElementById('qrWrap');
  const statusEl = document.getElementById('status');

  const ssidOut = document.getElementById('ssidOut');
  const securityOut = document.getElementById('securityOut');
  const sizeOut = document.getElementById('sizeOut');

  if (!ssidEl || !securityEl || !passwordEl || !qrWrap || !statusEl) return;

  let qr = null;
  let canvas = null;
  let qriousReady = false;
  let autoTimer = null;

  function setStatus(message, kind = '') {
    statusEl.className = 'status-box' + (kind ? ' ' + kind : '');
    statusEl.innerHTML = message || 'Ready.';
  }

  function updateSummary() {
    ssidOut.textContent = (ssidEl.value || '').trim() || '—';
    securityOut.textContent = securityEl.value || 'WPA';
    sizeOut.textContent = `${getSafeSize()} px`;
  }

  function escapeWifiValue(value) {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/:/g, '\\:');
  }

  function getSafeSize() {
    const n = parseInt(sizeEl.value, 10);
    if (!Number.isFinite(n)) return 320;
    return Math.min(1024, Math.max(128, n));
  }

  function syncPasswordState() {
    const noPass = securityEl.value === 'nopass';
    passwordEl.disabled = noPass;
    passwordEl.placeholder = noPass ? '(No password)' : '••••••••';
    if (noPass) passwordEl.value = '';
  }

  function buildWifiString() {
    const ssid = (ssidEl.value || '').trim();
    const security = securityEl.value || 'WPA';
    const hidden = hiddenEl.value === 'true' ? 'true' : 'false';
    const password = passwordEl.value || '';

    if (!ssid) {
      throw new Error('Please enter your Wi-Fi name (SSID).');
    }

    if (security !== 'nopass' && !password) {
      throw new Error('Please enter your Wi-Fi password, or choose No password for open networks.');
    }

    const safeSsid = escapeWifiValue(ssid);
    const safePass = escapeWifiValue(password);

    return `WIFI:T:${security};S:${safeSsid};P:${safePass};H:${hidden};;`;
  }

  function createPlaceholder() {
    qrWrap.innerHTML = '<div class="qr-placeholder">Your WiFi QR code will appear here.</div>';
  }

  function ensureCanvas() {
    if (canvas) return canvas;

    canvas = document.createElement('canvas');
    const holder = document.createElement('div');
    holder.className = 'qr-canvas-shell';
    holder.appendChild(canvas);

    qrWrap.innerHTML = '';
    qrWrap.appendChild(holder);

    return canvas;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensureQrLibrary() {
    if (window.QRious) {
      qriousReady = true;
      return;
    }

    const sources = [
      'https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js'
    ];

    let lastError = null;

    for (const src of sources) {
      try {
        await loadScript(src);
        if (window.QRious) {
          qriousReady = true;
          return;
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to load QR library.');
  }

  async function generateQr() {
    updateSummary();

    let value;
    try {
      value = buildWifiString();
    } catch (err) {
      setStatus(err.message, 'bad');
      return;
    }

    try {
      if (!qriousReady) {
        setStatus('Loading QR generator…', '');
        await ensureQrLibrary();
      }

      const size = getSafeSize();
      const level = levelEl.value || 'M';
      const el = ensureCanvas();

      if (!qr) {
        qr = new window.QRious({
          element: el,
          value,
          size,
          level,
          padding: 10,
          background: '#ffffff',
          foreground: '#000000'
        });
      } else {
        qr.value = value;
        qr.size = size;
        qr.level = level;
        qr.padding = 10;
        qr.background = '#ffffff';
        qr.foreground = '#000000';
      }

      el.width = size;
      el.height = size;
      el.style.width = '100%';
      el.style.maxWidth = `${size}px`;
      el.style.height = 'auto';
      el.style.background = '#ffffff';

      setStatus('WiFi QR code generated successfully.', 'ok');
    } catch (err) {
      setStatus('Unable to generate the WiFi QR code. Please try again.', 'bad');
    }
  }

  function downloadQr() {
    if (!canvas) {
      setStatus('Generate a WiFi QR code before downloading.', 'bad');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'wifi-qr-code.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus('PNG download started.', 'ok');
    } catch (err) {
      setStatus('Unable to download PNG on this device/browser.', 'bad');
    }
  }

  async function copyPayload() {
    let payload = '';
    try {
      payload = buildWifiString();
    } catch (err) {
      setStatus(err.message, 'bad');
      return;
    }

    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(payload);
      } else {
        await navigator.clipboard.writeText(payload);
      }
      setStatus('WiFi payload copied.', 'ok');
    } catch (err) {
      setStatus('Unable to copy WiFi payload.', 'bad');
    }
  }

  function clearAll() {
    ssidEl.value = '';
    securityEl.value = 'WPA';
    passwordEl.value = '';
    hiddenEl.value = 'false';
    showPassEl.checked = false;
    passwordEl.type = 'password';
    sizeEl.value = '320';
    levelEl.value = 'M';

    qr = null;
    canvas = null;

    syncPasswordState();
    updateSummary();
    createPlaceholder();
    setStatus('Ready. Enter your Wi-Fi details and click <strong>Generate</strong>.');
    ssidEl.focus();
  }

  function scheduleAutoGenerate() {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      if ((ssidEl.value || '').trim()) {
        generateQr();
      } else {
        updateSummary();
      }
    }, 350);
  }

  showPassEl?.addEventListener('change', () => {
    passwordEl.type = showPassEl.checked ? 'text' : 'password';
  });

  securityEl.addEventListener('change', () => {
    syncPasswordState();
    updateSummary();
    if (canvas) generateQr();
  });

  [ssidEl, passwordEl].forEach((el) => {
    el.addEventListener('input', scheduleAutoGenerate);
    el.addEventListener('paste', () => setTimeout(scheduleAutoGenerate, 40));
  });

  hiddenEl.addEventListener('change', () => {
    updateSummary();
    if (canvas) generateQr();
  });

  sizeEl.addEventListener('change', () => {
    updateSummary();
    if (canvas) generateQr();
  });

  levelEl.addEventListener('change', () => {
    if (canvas) generateQr();
  });

  generateBtn?.addEventListener('click', generateQr);
  downloadBtn?.addEventListener('click', downloadQr);
  copyPayloadBtn?.addEventListener('click', copyPayload);
  clearBtn?.addEventListener('click', clearAll);

  ssidEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      generateQr();
    }
  });

  passwordEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      generateQr();
    }
  });

  syncPasswordState();
  updateSummary();
  createPlaceholder();
  setStatus('Ready. Enter your Wi-Fi details and click <strong>Generate</strong>.');
});
