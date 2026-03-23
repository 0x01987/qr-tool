document.addEventListener('DOMContentLoaded', () => {
  const els = {
    businessName: document.getElementById('businessName'),
    reviewUrl: document.getElementById('reviewUrl'),

    generateBtn: document.getElementById('generateBtn'),
    sampleBtn: document.getElementById('sampleBtn'),
    clearBtn: document.getElementById('clearBtn'),
    copyLinkBtn: document.getElementById('copyLinkBtn'),
    openLinkBtn: document.getElementById('openLinkBtn'),
    downloadBtn: document.getElementById('downloadBtn'),

    charCount: document.getElementById('charCount'),
    readyLabel: document.getElementById('readyLabel'),

    previewName: document.getElementById('previewName'),
    previewSub: document.getElementById('previewSub'),
    previewLines: document.getElementById('previewLines'),

    qrCanvas: document.getElementById('qrCanvas'),
    qrEmpty: document.getElementById('qrEmpty'),
    outputCode: document.getElementById('outputCode'),
    statusBox: document.getElementById('statusBox'),
    year: document.getElementById('year')
  };

  if (!els.businessName || !els.reviewUrl || !els.generateBtn || !els.qrCanvas) return;

  if (els.year) {
    els.year.textContent = String(new Date().getFullYear());
  }

  let lastReviewUrl = '';
  let autoTimer = null;

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

  function setStatus(html) {
    if (els.statusBox) els.statusBox.innerHTML = html;
  }

  function normalizeUrl(value) {
    const clean = safeTrim(value);
    if (!clean) return '';
    if (/^https?:\/\//i.test(clean)) return clean;
    return `https://${clean.replace(/^\/+/, '')}`;
  }

  function looksLikeGoogleReviewUrl(url) {
    const value = String(url || '').toLowerCase();
    return (
      value.includes('google.') ||
      value.includes('g.page') ||
      value.includes('maps.app.goo.gl') ||
      value.includes('google.com/maps') ||
      value.includes('google.com/local/writereview') ||
      value.includes('/review')
    );
  }

  function updateMeta() {
    const businessName = safeTrim(els.businessName.value) || 'Your business name';
    const url = normalizeUrl(els.reviewUrl.value);

    if (els.charCount) els.charCount.textContent = String(url.length);
    if (els.previewName) els.previewName.textContent = businessName;
    if (els.previewSub) {
      els.previewSub.textContent = 'Customers can scan this QR to leave a Google review.';
    }

    if (els.previewLines) {
      if (url) {
        const note = looksLikeGoogleReviewUrl(url)
          ? 'Google review link detected.'
          : 'This does not look like a standard Google review URL, but it can still be encoded.';
        els.previewLines.innerHTML = `
          <div class="review-line">${escapeHtml(url)}</div>
          <div class="review-line">${escapeHtml(note)}</div>
        `;
      } else {
        els.previewLines.innerHTML = '<div class="review-line">A Google review link preview will appear here.</div>';
      }
    }

    if (els.outputCode) {
      els.outputCode.textContent = url || 'No review link generated yet.';
    }
  }

  function showQr() {
    els.qrCanvas.hidden = false;
    if (els.qrEmpty) els.qrEmpty.hidden = true;
  }

  function hideQr() {
    els.qrCanvas.hidden = true;
    if (els.qrEmpty) els.qrEmpty.hidden = false;
  }

  function clearCanvas() {
    const ctx = els.qrCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, els.qrCanvas.width, els.qrCanvas.height);
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === 'true') {
          resolve();
          return;
        }
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(`Failed: ${src}`)), { once: true });
        return;
      }

      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.addEventListener('load', () => {
        s.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      s.addEventListener('error', () => reject(new Error(`Failed: ${src}`)), { once: true });
      document.head.appendChild(s);
    });
  }

  async function ensureQrLib() {
    if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
      return true;
    }

    const sources = [
      'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js',
      'https://unpkg.com/qrcode@1.5.4/build/qrcode.min.js'
    ];

    for (const src of sources) {
      try {
        await loadScript(src);
        if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
          return true;
        }
      } catch (_) {
        // try next source
      }
    }

    return false;
  }

  async function renderQr(text) {
    const ok = await ensureQrLib();
    if (!ok) {
      throw new Error('QR library unavailable');
    }

    // Ensure visible size is consistent
    els.qrCanvas.width = 320;
    els.qrCanvas.height = 320;

    await window.QRCode.toCanvas(els.qrCanvas, text, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  }

  async function generate() {
    updateMeta();

    const url = normalizeUrl(els.reviewUrl.value);
    lastReviewUrl = url;

    if (!url) {
      clearCanvas();
      hideQr();
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      setStatus('<strong>Not enough data.</strong><br>Paste your Google review link first.');
      return;
    }

    setStatus('<strong>Generating...</strong><br>Rendering your review QR code.');

    try {
      await renderQr(url);
      showQr();
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';

      const msg = looksLikeGoogleReviewUrl(url)
        ? 'Your Google review QR code is ready.'
        : 'Your QR code is ready, but the link may not be a standard Google review URL.';

      setStatus(`<strong>Generated.</strong><br>${msg}`);
    } catch (err) {
      console.error('QR generation failed:', err);
      clearCanvas();
      hideQr();
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      setStatus('<strong>Generation failed.</strong><br>The QR code could not be rendered. Check that the QR library is loading and try again.');
    }
  }

  async function fallbackCopyText(text) {
    const temp = document.createElement('textarea');
    temp.value = text;
    temp.setAttribute('readonly', '');
    temp.style.position = 'fixed';
    temp.style.top = '-9999px';
    temp.style.opacity = '0';
    document.body.appendChild(temp);
    temp.select();
    temp.setSelectionRange(0, temp.value.length);

    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (_) {
      success = false;
    }

    temp.remove();

    if (!success) {
      throw new Error('Copy failed');
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
        await fallbackCopyText(text);
      }

      setStatus(`<strong>Copied.</strong><br>${successMessage}`);
    } catch (_) {
      setStatus(`<strong>Copy failed.</strong><br>${failMessage}`);
    }
  }

  function openReviewLink() {
    const url = lastReviewUrl || normalizeUrl(els.reviewUrl.value);
    if (!url) {
      setStatus('<strong>Nothing to open.</strong><br>Paste a review link first.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function downloadPng() {
    if (els.qrCanvas.hidden) {
      setStatus('<strong>Nothing to download.</strong><br>Generate a QR code first.');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = els.qrCanvas.toDataURL('image/png');
      link.download = 'google-review-qr-code.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus('<strong>Downloaded.</strong><br>Your Google review QR code PNG was downloaded.');
    } catch (_) {
      setStatus('<strong>Download failed.</strong><br>Unable to prepare the PNG download.');
    }
  }

  function clearAll() {
    els.businessName.value = '';
    els.reviewUrl.value = '';
    lastReviewUrl = '';

    clearCanvas();
    hideQr();

    if (els.readyLabel) els.readyLabel.textContent = 'No';
    updateMeta();
    setStatus('<strong>Cleared.</strong><br>Your business name and review link were reset.');
  }

  async function loadSample() {
    els.businessName.value = 'InstantQR Coffee';
    els.reviewUrl.value = 'https://g.page/r/EXAMPLE/review';
    updateMeta();
    await generate();
  }

  function scheduleAutoUpdate() {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      updateMeta();
    }, 120);
  }

  els.generateBtn.addEventListener('click', async () => {
    await generate();
  });

  if (els.sampleBtn) {
    els.sampleBtn.addEventListener('click', async () => {
      await loadSample();
    });
  }

  if (els.clearBtn) {
    els.clearBtn.addEventListener('click', () => {
      clearAll();
    });
  }

  if (els.copyLinkBtn) {
    els.copyLinkBtn.addEventListener('click', async () => {
      await copyText(
        lastReviewUrl || normalizeUrl(els.reviewUrl.value),
        'The review link was copied.',
        'Nothing to copy.'
      );
    });
  }

  if (els.openLinkBtn) {
    els.openLinkBtn.addEventListener('click', () => {
      openReviewLink();
    });
  }

  if (els.downloadBtn) {
    els.downloadBtn.addEventListener('click', () => {
      downloadPng();
    });
  }

  [els.businessName, els.reviewUrl].forEach((el) => {
    if (!el) return;
    el.addEventListener('input', scheduleAutoUpdate);
    el.addEventListener('change', scheduleAutoUpdate);
  });

  if (els.reviewUrl) {
    els.reviewUrl.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        await generate();
      }
    });
  }

  updateMeta();
  hideQr();
});
