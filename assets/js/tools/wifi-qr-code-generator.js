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

  if (
    !ssidEl ||
    !securityEl ||
    !passwordEl ||
    !hiddenEl ||
    !showPassEl ||
    !sizeEl ||
    !levelEl ||
    !generateBtn ||
    !downloadBtn ||
    !copyPayloadBtn ||
    !clearBtn ||
    !qrWrap ||
    !statusEl ||
    !ssidOut ||
    !securityOut ||
    !sizeOut
  ) {
    return;
  }

  let autoTimer = null;
  let lastPayload = '';
  let hasGenerated = false;

  function setStatus(message, kind = '') {
    statusEl.className = `status-box${kind ? ` ${kind}` : ''}`;
    statusEl.innerHTML = message || 'Ready.';
  }

  function getSafeSize() {
    const raw = parseInt(sizeEl.value, 10);
    if (!Number.isFinite(raw)) return 320;
    return Math.max(128, Math.min(1024, raw));
  }

  function normalizeSizeInput() {
    const safe = getSafeSize();
    sizeEl.value = String(safe);
    return safe;
  }

  function updateSummary() {
    ssidOut.textContent = (ssidEl.value || '').trim() || '—';
    securityOut.textContent = securityEl.value || 'WPA';
    sizeOut.textContent = `${getSafeSize()} px`;
  }

  function syncPasswordState() {
    const isOpenNetwork = securityEl.value === 'nopass';

    passwordEl.disabled = isOpenNetwork;
    passwordEl.placeholder = isOpenNetwork ? '(No password)' : '••••••••';

    if (isOpenNetwork) {
      passwordEl.value = '';
      passwordEl.type = 'password';
      showPassEl.checked = false;
    }
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
      throw new Error('Please enter your Wi-Fi password, or choose No password for an open network.');
    }

    return `WIFI:T:${security};S:${escapeWifiValue(ssid)};P:${escapeWifiValue(password)};H:${hidden};;`;
  }

  function renderPlaceholder() {
    qrWrap.innerHTML = `
      <div class="qr-placeholder" id="placeholder">
        Your WiFi QR code will appear here.
      </div>
    `;
    hasGenerated = false;
  }

  function createPreviewTarget(size) {
    qrWrap.innerHTML = `
      <div class="qr-canvas-shell">
        <div id="qrCanvas" style="width:${size}px;height:${size}px;"></div>
      </div>
    `;
    return document.getElementById('qrCanvas');
  }

  function getCorrectLevel(level) {
    if (!window.QRCode || !window.QRCode.CorrectLevel) return null;
    return window.QRCode.CorrectLevel[level] || window.QRCode.CorrectLevel.M;
  }

  function getGeneratedGraphic() {
    const canvas = qrWrap.querySelector('canvas');
    const img = qrWrap.querySelector('img');
    return { canvas, img };
  }

  function generateQr() {
    updateSummary();

    if (!window.QRCode) {
      setStatus('QR library failed to load. Refresh and try again.', 'bad');
      return;
    }

    let payload;
    try {
      payload = buildWifiString();
    } catch (err) {
      setStatus(err.message, 'bad');
      return;
    }

    const size = normalizeSizeInput();
    const target = createPreviewTarget(size);

    try {
      new window.QRCode(target, {
        text: payload,
        width: size,
        height: size,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: getCorrectLevel(levelEl.value || 'M')
      });

      lastPayload = payload;
      hasGenerated = true;
      updateSummary();
      setStatus('WiFi QR code generated successfully.', 'ok');
    } catch (err) {
      hasGenerated = false;
      setStatus('Unable to generate the WiFi QR code. Please try again.', 'bad');
    }
  }

  function dataUrlFromImage(img) {
    try {
      const tempCanvas = document.createElement('canvas');
      const width = img.naturalWidth || img.width || getSafeSize();
      const height = img.naturalHeight || img.height || getSafeSize();
      tempCanvas.width = width;
      tempCanvas.height = height;

      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return '';

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      return tempCanvas.toDataURL('image/png');
    } catch {
      return '';
    }
  }

  function downloadQr() {
    const { canvas, img } = getGeneratedGraphic();

    if (!hasGenerated || (!canvas && !img)) {
      setStatus('Generate a WiFi QR code before downloading.', 'bad');
      return;
    }

    try {
      let dataUrl = '';

      if (canvas && typeof canvas.toDataURL === 'function') {
        dataUrl = canvas.toDataURL('image/png');
      } else if (img && img.src) {
        if (img.src.startsWith('data:image/')) {
          dataUrl = img.src;
        } else if (img.complete) {
          dataUrl = dataUrlFromImage(img);
        }
      }

      if (!dataUrl) {
        setStatus('Unable to prepare the PNG download on this browser.', 'bad');
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
      setStatus('Unable to download PNG on this device or browser.', 'bad');
    }
  }

  async function fallbackCopyText(text) {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.top = '-9999px';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    helper.setSelectionRange(0, helper.value.length);

    let success = false;
    try {
      success = document.execCommand('copy');
    } catch {
      success = false;
    }

    helper.remove();

    if (!success) {
      throw new Error('Copy failed');
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
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(payload);
      } else {
        await fallbackCopyText(payload);
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
    sizeEl.value = '320';
    levelEl.value = 'M';
    passwordEl.type = 'password';

    lastPayload = '';
    syncPasswordState();
    updateSummary();
    renderPlaceholder();
    setStatus('Ready. Enter your Wi-Fi details and click <strong>Generate</strong>.');
    ssidEl.focus();
  }

  function scheduleAutoGenerate() {
    clearTimeout(autoTimer);

    autoTimer = setTimeout(() => {
      const hasSsid = (ssidEl.value || '').trim().length > 0;
      if (!hasSsid) {
        updateSummary();
        return;
      }
      generateQr();
    }, 300);
  }

  showPassEl.addEventListener('change', () => {
    passwordEl.type = showPassEl.checked ? 'text' : 'password';
  });

  securityEl.addEventListener('change', () => {
    syncPasswordState();
    updateSummary();
    if (hasGenerated || (ssidEl.value || '').trim()) {
      scheduleAutoGenerate();
    }
  });

  hiddenEl.addEventListener('change', () => {
    updateSummary();
    if (hasGenerated || (ssidEl.value || '').trim()) {
      scheduleAutoGenerate();
    }
  });

  sizeEl.addEventListener('input', updateSummary);
  sizeEl.addEventListener('change', () => {
    normalizeSizeInput();
    updateSummary();
    if (hasGenerated) {
      generateQr();
    }
  });

  levelEl.addEventListener('change', () => {
    if (hasGenerated || (ssidEl.value || '').trim()) {
      scheduleAutoGenerate();
    }
  });

  [ssidEl, passwordEl].forEach((el) => {
    el.addEventListener('input', scheduleAutoGenerate);
    el.addEventListener('paste', () => {
      setTimeout(scheduleAutoGenerate, 30);
    });
  });

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

  generateBtn.addEventListener('click', generateQr);
  downloadBtn.addEventListener('click', downloadQr);
  copyPayloadBtn.addEventListener('click', copyPayload);
  clearBtn.addEventListener('click', clearAll);

  syncPasswordState();
  normalizeSizeInput();
  updateSummary();
  renderPlaceholder();
  setStatus('Ready. Enter your Wi-Fi details and click <strong>Generate</strong>.');
});
