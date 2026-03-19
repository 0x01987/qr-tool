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

  if (!textEl || !sizeEl || !levelEl || !qrWrap) return;

  let qr = null;
  let canvas = null;
  let autoTimer = null;
  let libraryReady = false;

  function setStatus(message, kind = '') {
    if (!statusEl) return;
    statusEl.className = 'status-box' + (kind ? ' ' + kind : '');
    statusEl.innerHTML = message || 'Ready.';
  }

  function updateSummary() {
    if (charsOut) charsOut.textContent = `${textEl.value.length} chars`;
    if (sizeOut) sizeOut.textContent = `${getSafeSize()} px`;
    if (levelOut) levelOut.textContent = levelEl.value || 'M';
  }

  function getRawValue(raw) {
    const value = String(raw || '').trim();
    if (!value) throw new Error('Please enter a website URL.');
    return value;
  }

  function getSafeSize() {
    const n = parseInt(sizeEl.value, 10);
    if (!Number.isFinite(n)) return 320;
    return Math.min(1024, Math.max(128, n));
  }

  function resetPreview() {
    qrWrap.innerHTML = '<div class="qr-placeholder">Your URL QR code will appear here.</div>';
    qr = null;
    canvas = null;
  }

  function ensureCanvas(size) {
    if (canvas) return canvas;

    canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.style.width = '100%';
    canvas.style.maxWidth = `${size}px`;
    canvas.style.height = 'auto';
    canvas.style.display = 'block';

    const shell = document.createElement('div');
    shell.className = 'qr-canvas-shell';
    shell.appendChild(canvas);

    qrWrap.innerHTML = '';
    qrWrap.appendChild(shell);

    return canvas;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function loadQrLibrary() {
    if (window.QRious) {
      libraryReady = true;
      return;
    }

    const sources = [
      'https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js'
    ];

    for (const src of sources) {
      try {
        await loadScript(src);
        if (window.QRious) {
          libraryReady = true;
          return;
        }
      } catch (_) {}
    }

    throw new Error('QR library failed to load.');
  }

  async function generateQr() {
    let value;
    try {
      value = getRawValue(textEl.value);
    } catch (err) {
      setStatus(err.message, 'bad');
      return;
    }

    try {
      if (!libraryReady && !window.QRious) {
        setStatus('Loading QR generator library…');
        await loadQrLibrary();
      }
    } catch (_) {
      setStatus('The QR generator library failed to load. Check your connection and try again.', 'bad');
      return;
    }

    if (!window.QRious) {
      setStatus('QR library is not available right now.', 'bad');
      return;
    }

    const size = getSafeSize();
    const level = levelEl.value || 'M';
    const el = ensureCanvas(size);

    try {
      if (!qr) {
        qr = new window.QRious({
          element: el,
          value,
          size,
          level,
          padding: 10,
          background: 'white',
          foreground: 'black'
        });
      } else {
        qr.value = value;
        qr.size = size;
        qr.level = level;
        qr.padding = 10;
        qr.background = 'white';
        qr.foreground = 'black';
      }

      el.style.maxWidth = `${size}px`;
      setStatus('QR code generated successfully.', 'ok');
    } catch (err) {
      setStatus('Unable to generate the QR code. Please try again.', 'bad');
      console.error(err);
    }
  }

  function downloadQr() {
    if (!canvas) {
      setStatus('Generate a QR code before downloading.', 'bad');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'url-qr-code.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus('PNG download started.', 'ok');
    } catch (_) {
      setStatus('Unable to download PNG on this browser or device.', 'bad');
    }
  }

  async function copyUrlValue() {
    const value = String(textEl.value || '').trim();
    if (!value) {
      setStatus('Nothing to copy. Enter a URL first.', 'bad');
      return;
    }

    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(value);
      } else {
        await navigator.clipboard.writeText(value);
      }
      setStatus('URL copied to clipboard.', 'ok');
    } catch (_) {
      setStatus('Unable to copy the URL.', 'bad');
    }
  }

  async function copyShareLink() {
    const url = new URL(window.location.href);
    const value = String(textEl.value || '').trim();
    const size = getSafeSize();
    const level = levelEl.value || 'M';

    if (value) url.searchParams.set('url', value);
    else url.searchParams.delete('url');

    url.searchParams.set('size', String(size));
    url.searchParams.set('level', level);

    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(url.toString());
      } else {
        await navigator.clipboard.writeText(url.toString());
      }
      setStatus('Share link copied to clipboard.', 'ok');
    } catch (_) {
      setStatus('Unable to copy share link.', 'bad');
    }
  }

  function clearAll() {
    textEl.value = '';
    sizeEl.value = '320';
    levelEl.value = 'M';
    resetPreview();
    updateSummary();
    setStatus('Ready. Enter a URL and click <strong>Generate</strong>.');
    textEl.focus();
  }

  function maybeAutoGenerate() {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      if (String(textEl.value || '').trim()) {
        generateQr();
      }
    }, 350);
  }

  function initFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const paramUrl = params.get('url');
    const paramSize = params.get('size');
    const paramLevel = params.get('level');

    if (paramUrl) textEl.value = paramUrl;

    if (paramSize) {
      const sizeNum = parseInt(paramSize, 10);
      if (Number.isFinite(sizeNum)) {
        sizeEl.value = String(Math.min(1024, Math.max(128, sizeNum)));
      }
    }

    if (paramLevel && ['L', 'M', 'Q', 'H'].includes(paramLevel.toUpperCase())) {
      levelEl.value = paramLevel.toUpperCase();
    }

    updateSummary();

    if (paramUrl) generateQr();
  }

  generateBtn?.addEventListener('click', generateQr);
  downloadBtn?.addEventListener('click', downloadQr);
  copyUrlBtn?.addEventListener('click', copyUrlValue);
  shareBtn?.addEventListener('click', copyShareLink);
  clearBtn?.addEventListener('click', clearAll);

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
    updateSummary();
    if (canvas) {
      qr = null;
      canvas = null;
      resetPreview();
      if (String(textEl.value || '').trim()) generateQr();
    }
  });

  levelEl.addEventListener('change', () => {
    updateSummary();
    if (canvas) generateQr();
  });

  textEl.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      generateQr();
    }
  });

  updateSummary();
  initFromQuery();
});
