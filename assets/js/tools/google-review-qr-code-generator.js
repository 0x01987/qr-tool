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

  if (
    !els.businessName ||
    !els.reviewUrl ||
    !els.generateBtn ||
    !els.qrEmpty ||
    !els.statusBox
  ) {
    return;
  }

  if (els.year) {
    els.year.textContent = String(new Date().getFullYear());
  }

  let lastReviewUrl = '';
  let lastQrImageUrl = '';
  let autoTimer = null;
  let isGenerating = false;

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
    els.statusBox.innerHTML = html;
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

    if (els.charCount) {
      els.charCount.textContent = String(url.length);
    }

    if (els.previewName) {
      els.previewName.textContent = businessName;
    }

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
        els.previewLines.innerHTML =
          '<div class="review-line">A Google review link preview will appear here.</div>';
      }
    }

    if (els.outputCode) {
      els.outputCode.textContent = url || 'No review link generated yet.';
    }
  }

  function getQrShell() {
    return els.qrEmpty.parentElement;
  }

  function getOrCreatePreviewImage() {
    const shell = getQrShell();
    let img = shell.querySelector('#qrPreviewImage');

    if (!img) {
      img = document.createElement('img');
      img.id = 'qrPreviewImage';
      img.alt = 'Generated Google review QR code';
      img.style.maxWidth = 'min(320px, 100%)';
      img.style.width = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.background = '#ffffff';
      img.style.borderRadius = '12px';
      img.style.boxShadow = '0 10px 25px rgba(0,0,0,.25)';
      img.hidden = true;
      shell.appendChild(img);
    }

    return img;
  }

  function showQrImage(src) {
    const img = getOrCreatePreviewImage();
    img.src = src;
    img.hidden = false;

    if (els.qrCanvas) {
      els.qrCanvas.hidden = true;
    }
    els.qrEmpty.hidden = true;
  }

  function hideQr() {
    const shell = getQrShell();
    const img = shell.querySelector('#qrPreviewImage');

    if (img) {
      img.hidden = true;
      img.removeAttribute('src');
    }

    if (els.qrCanvas) {
      els.qrCanvas.hidden = true;
      const ctx = els.qrCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, els.qrCanvas.width, els.qrCanvas.height);
      }
    }

    els.qrEmpty.hidden = false;
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

  async function preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => reject(new Error('Image failed to load'));
      img.src = url;
    });
  }

  async function generate() {
    if (isGenerating) return;
    isGenerating = true;

    updateMeta();

    const url = normalizeUrl(els.reviewUrl.value);
    lastReviewUrl = url;

    if (!url) {
      hideQr();
      if (els.readyLabel) {
        els.readyLabel.textContent = 'No';
      }
      setStatus('<strong>Not enough data.</strong><br>Paste your Google review link first.');
      isGenerating = false;
      return;
    }

    setStatus('<strong>Generating...</strong><br>Rendering your review QR code...');

    try {
      const qrUrl = `${buildQrApiUrl(url)}&t=${Date.now()}`;
      await preloadImage(qrUrl);

      lastQrImageUrl = qrUrl;
      showQrImage(qrUrl);

      if (els.readyLabel) {
        els.readyLabel.textContent = 'Yes';
      }

      const msg = looksLikeGoogleReviewUrl(url)
        ? 'Your Google review QR code is ready.'
        : 'Your QR code is ready, but the link may not be a standard Google review URL.';

      setStatus(`<strong>Generated.</strong><br>${msg}`);
    } catch (err) {
      console.error('QR generation failed:', err);
      hideQr();

      if (els.readyLabel) {
        els.readyLabel.textContent = 'No';
      }

      setStatus('<strong>Generation failed.</strong><br>The QR code could not be loaded right now. Please try again.');
    } finally {
      isGenerating = false;
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

  async function downloadPng() {
    if (!lastQrImageUrl) {
      setStatus('<strong>Nothing to download.</strong><br>Generate a QR code first.');
      return;
    }

    try {
      const response = await fetch(lastQrImageUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'google-review-qr-code.png';
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

      setStatus('<strong>Downloaded.</strong><br>Your Google review QR code PNG was downloaded.');
    } catch (err) {
      console.error('Download failed:', err);

      // fallback: open image in new tab
      window.open(lastQrImageUrl, '_blank', 'noopener,noreferrer');
      setStatus('<strong>Opened image.</strong><br>Your browser blocked direct download, so the QR image was opened in a new tab.');
    }
  }

  function clearAll() {
    els.businessName.value = '';
    els.reviewUrl.value = '';
    lastReviewUrl = '';
    lastQrImageUrl = '';

    hideQr();

    if (els.readyLabel) {
      els.readyLabel.textContent = 'No';
    }

    updateMeta();
    setStatus('<strong>Cleared.</strong><br>Your business name and review link were reset.');
  }

  async function loadSample() {
    clearAll();
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
    els.downloadBtn.addEventListener('click', async () => {
      await downloadPng();
    });
  }

  [els.businessName, els.reviewUrl].forEach((el) => {
    if (!el) return;
    el.addEventListener('input', scheduleAutoUpdate);
    el.addEventListener('change', scheduleAutoUpdate);
  });

  els.reviewUrl.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      await generate();
    }
  });

  updateMeta();
  hideQr();
});
