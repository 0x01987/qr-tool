document.addEventListener('DOMContentLoaded', () => {
  const textEl = document.getElementById('text');
  const sizeEl = document.getElementById('size');
  const levelEl = document.getElementById('level');

  const generateBtn = document.getElementById('generateBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyUrlBtn = document.getElementById('copyUrlBtn');
  const shareBtn = document.getElementById('shareBtn');
  const clearBtn = document.getElementById('clearBtn');

  const qrWrap = document.getElementById('qrWrap');
  const statusEl = document.getElementById('status');

  const charsOut = document.getElementById('charsOut');
  const sizeOut = document.getElementById('sizeOut');
  const levelOut = document.getElementById('levelOut');

  if (
    !textEl ||
    !sizeEl ||
    !levelEl ||
    !generateBtn ||
    !downloadBtn ||
    !copyUrlBtn ||
    !shareBtn ||
    !clearBtn ||
    !qrWrap ||
    !statusEl ||
    !charsOut ||
    !sizeOut ||
    !levelOut
  ) {
    return;
  }

  let qrContainer = null;
  let currentImgDataUrl = '';
  let autoTimer = null;
  let hasGenerated = false;

  function setStatus(message, kind = '') {
    statusEl.className = `status-box${kind ? ` ${kind}` : ''}`;
    statusEl.innerHTML = message || 'Ready.';
  }

  function getRawValue(raw) {
    const value = String(raw || '').trim();
    if (!value) {
      throw new Error('Please enter a website URL.');
    }
    return value;
  }

  function getSafeSize() {
    const n = parseInt(sizeEl.value, 10);
    if (!Number.isFinite(n)) return 320;
    return Math.min(1024, Math.max(128, n));
  }

  function normalizeSizeInput() {
    const safe = getSafeSize();
    sizeEl.value = String(safe);
    return safe;
  }

  function updateSummary() {
    charsOut.textContent = `${String(textEl.value || '').length} chars`;
    sizeOut.textContent = `${getSafeSize()} px`;
    levelOut.textContent = levelEl.value || 'M';
  }

  function renderPlaceholder() {
    qrWrap.innerHTML = '<div class="qr-placeholder">Your URL QR code will appear here.</div>';
    qrContainer = null;
    currentImgDataUrl = '';
    hasGenerated = false;
  }

  function ensureQrLibrary() {
    if (window.QRCode) return true;
    throw new Error('QR library unavailable.');
  }

  function createFreshQrMount() {
    const shell = document.createElement('div');
    shell.className = 'qr-canvas-shell';

    const mount = document.createElement('div');
    mount.id = 'qrCodeMount';
    mount.style.display = 'flex';
    mount.style.alignItems = 'center';
    mount.style.justifyContent = 'center';
    mount.style.width = '100%';

    shell.appendChild(mount);
    qrWrap.innerHTML = '';
    qrWrap.appendChild(shell);

    qrContainer = mount;
    return mount;
  }

  function buildQrOnFreshMount(value) {
    ensureQrLibrary();

    const size = normalizeSizeInput();
    const level = levelEl.value || 'M';
    const mount = createFreshQrMount();

    new window.QRCode(mount, {
      text: value,
      width: size,
      height: size,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel[level] || window.QRCode.CorrectLevel.M
    });

    const canvas = mount.querySelector('canvas');
    const img = mount.querySelector('img');

    if (canvas) {
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.maxWidth = `${size}px`;
      canvas.style.height = 'auto';
      canvas.style.background = '#ffffff';
      currentImgDataUrl = canvas.toDataURL('image/png');
      return canvas;
    }

    if (img) {
      img.style.display = 'block';
      img.style.width = '100%';
      img.style.maxWidth = `${size}px`;
      img.style.height = 'auto';
      img.style.background = '#ffffff';

      currentImgDataUrl = img.src;
      return img;
    }

    throw new Error('QR render output missing.');
  }

  function generateQr() {
    let value;
    try {
      value = getRawValue(textEl.value);
    } catch (err) {
      setStatus(err.message, 'bad');
      return;
    }

    try {
      buildQrOnFreshMount(value);
      hasGenerated = true;
      updateSummary();
      setStatus('QR code generated successfully.', 'ok');
    } catch (err) {
      console.error(err);
      hasGenerated = false;
      renderPlaceholder();
      setStatus('Unable to generate the QR code. Please try again.', 'bad');
    }
  }

  function downloadQr() {
    if (!hasGenerated || !currentImgDataUrl) {
      setStatus('Generate a QR code before downloading.', 'bad');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = currentImgDataUrl;
      link.download = 'url-qr-code.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus('PNG download started.', 'ok');
    } catch (_) {
      setStatus('Unable to download PNG on this browser or device.', 'bad');
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
    } catch (_) {
      success = false;
    }

    helper.remove();

    if (!success) {
      throw new Error('Copy failed');
    }
  }

  async function safeCopyText(text) {
    if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
      await window.InstantQR.copyText(text);
      return;
    }

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    await fallbackCopyText(text);
  }

  async function copyUrlValue() {
    const value = String(textEl.value || '').trim();
    if (!value) {
      setStatus('Nothing to copy. Enter a URL first.', 'bad');
      return;
    }

    try {
      await safeCopyText(value);
      setStatus('URL copied to clipboard.', 'ok');
    } catch (_) {
      setStatus('Unable to copy the URL.', 'bad');
    }
  }

  async function copyShareLink() {
    const current = new URL(window.location.href);
    const value = String(textEl.value || '').trim();
    const size = getSafeSize();
    const level = levelEl.value || 'M';

    if (value) {
      current.searchParams.set('url', value);
    } else {
      current.searchParams.delete('url');
    }

    current.searchParams.set('size', String(size));
    current.searchParams.set('level', level);

    try {
      await safeCopyText(current.toString());
      setStatus('Share link copied to clipboard.', 'ok');
    } catch (_) {
      setStatus('Unable to copy share link.', 'bad');
    }
  }

  function clearAll() {
    textEl.value = '';
    sizeEl.value = '320';
    levelEl.value = 'M';
    renderPlaceholder();
    updateSummary();
    setStatus('Ready. Enter a website URL and click <strong>Generate</strong>.');
    textEl.focus();
  }

  function maybeAutoGenerate() {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      if (String(textEl.value || '').trim()) {
        generateQr();
      } else {
        updateSummary();
        renderPlaceholder();
      }
    }, 250);
  }

  function initFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const paramUrl = params.get('url');
    const paramSize = params.get('size');
    const paramLevel = params.get('level');

    if (paramUrl) {
      textEl.value = paramUrl;
    }

    if (paramSize) {
      const sizeNum = parseInt(paramSize, 10);
      if (Number.isFinite(sizeNum)) {
        sizeEl.value = String(Math.min(1024, Math.max(128, sizeNum)));
      }
    }

    if (paramLevel && ['L', 'M', 'Q', 'H'].includes(paramLevel.toUpperCase())) {
      levelEl.value = paramLevel.toUpperCase();
    }

    normalizeSizeInput();
    updateSummary();

    if (paramUrl) {
      generateQr();
    }
  }

  generateBtn.addEventListener('click', generateQr);
  downloadBtn.addEventListener('click', downloadQr);
  copyUrlBtn.addEventListener('click', copyUrlValue);
  shareBtn.addEventListener('click', copyShareLink);
  clearBtn.addEventListener('click', clearAll);

  textEl.addEventListener('input', () => {
    updateSummary();
    maybeAutoGenerate();
  });

  textEl.addEventListener('paste', () => {
    setTimeout(() => {
      updateSummary();
      maybeAutoGenerate();
    }, 30);
  });

  sizeEl.addEventListener('input', updateSummary);

  sizeEl.addEventListener('change', () => {
    normalizeSizeInput();
    updateSummary();
    if (String(textEl.value || '').trim()) {
      generateQr();
    }
  });

  levelEl.addEventListener('change', () => {
    updateSummary();
    if (String(textEl.value || '').trim()) {
      generateQr();
    }
  });

  textEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      generateQr();
    }
  });

  normalizeSizeInput();
  updateSummary();
  renderPlaceholder();
  initFromQuery();
});
