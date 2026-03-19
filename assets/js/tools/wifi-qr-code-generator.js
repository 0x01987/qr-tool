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

  let qrInstance = null;
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

  function escapeWifiValue(value) {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/:/g, '\\:');
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

    return `WIFI:T:${security};S:${escapeWifiValue(ssid)};P:${escapeWifiValue(password)};H:${hidden};;`;
  }

  function clearPreview() {
    qrWrap.innerHTML = '<div class="qr-placeholder">Your WiFi QR code will appear here.</div>';
    qrInstance = null;
  }

  function ensurePreviewShell(size) {
    qrWrap.innerHTML = `
      <div class="qr-canvas-shell">
        <div id="qrCanvas" style="width:${size}px;height:${size}px;"></div>
      </div>
    `;
    return document.getElementById('qrCanvas');
  }

  function getQrLevel(level) {
    if (!window.QRCode || !window.QRCode.CorrectLevel) return null;
    return window.QRCode.CorrectLevel[level] || window.QRCode.CorrectLevel.M;
  }

  function generateQr() {
    updateSummary();

    if (!window.QRCode) {
      setStatus('QR library failed to load. Refresh and try again.', 'bad');
      return;
    }

    let value;
    try {
      value = buildWifiString();
    } catch (err) {
      setStatus(err.message, 'bad');
      return;
    }

    const size = getSafeSize();
    const target = ensurePreviewShell(size);

    try {
      qrInstance = new window.QRCode(target, {
        text: value,
        width: size,
        height: size,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: getQrLevel(levelEl.value || 'M')
      });

      setStatus('WiFi QR code generated successfully.', 'ok');
    } catch (err) {
      setStatus('Unable to generate the WiFi QR code. Please try again.', 'bad');
    }
  }

  function downloadQr() {
    const img = qrWrap.querySelector('img');
    const canvas = qrWrap.querySelector('canvas');

    try {
      let dataUrl = '';

      if (canvas) {
        dataUrl = canvas.toDataURL('image/png');
      } else if (img && img.src) {
        dataUrl = img.src;
      }

      if (!dataUrl) {
        setStatus('Generate a WiFi QR code before downloading.', 'bad');
        return;
      }

      const link = document.createElement('a');
      link.href = dataUrl;
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

    syncPasswordState();
    updateSummary();
    clearPreview();
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
    if (qrWrap.querySelector('#qrCanvas')) generateQr();
  });

  [ssidEl, passwordEl].forEach((el) => {
    el.addEventListener('input', scheduleAutoGenerate);
    el.addEventListener('paste', () => setTimeout(scheduleAutoGenerate, 40));
  });

  hiddenEl.addEventListener('change', () => {
    updateSummary();
    if (qrWrap.querySelector('#qrCanvas')) generateQr();
  });

  sizeEl.addEventListener('change', () => {
    updateSummary();
    if (qrWrap.querySelector('#qrCanvas')) generateQr();
  });

  levelEl.addEventListener('change', () => {
    if (qrWrap.querySelector('#qrCanvas')) generateQr();
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
  clearPreview();
  setStatus('Ready. Enter your Wi-Fi details and click <strong>Generate</strong>.');
});
