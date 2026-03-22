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

  if (!els.generateBtn || !els.qrCanvas) return;
  if (els.year) els.year.textContent = String(new Date().getFullYear());

  let lastReviewUrl = '';

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

  function normalizeUrl(value) {
    const clean = safeTrim(value);
    if (!clean) return '';
    if (/^https?:\/\//i.test(clean)) return clean;
    return 'https://' + clean.replace(/^\/+/, '');
  }

  function looksLikeGoogleReviewUrl(url) {
    const value = String(url || '').toLowerCase();
    return value.includes('google.') || value.includes('g.page') || value.includes('maps.app.goo.gl');
  }

  function updateMeta() {
    const businessName = safeTrim(els.businessName.value) || 'Your business name';
    const url = normalizeUrl(els.reviewUrl.value);

    if (els.charCount) els.charCount.textContent = String(url.length);
    if (els.previewName) els.previewName.textContent = businessName;

    if (els.previewSub) {
      els.previewSub.textContent = url
        ? 'Customers can scan this QR to leave a Google review.'
        : 'Customers can scan this QR to leave a Google review.';
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
      size: '320x320',
      margin: '20',
      color: '000000',
      bgcolor: 'ffffff',
      format: 'png'
    });
    return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
  }

  async function renderQr(text) {
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
  }

  async function generate() {
    updateMeta();
    const url = normalizeUrl(els.reviewUrl.value);
    lastReviewUrl = url;

    if (!url) {
      els.qrCanvas.hidden = true;
      els.qrEmpty.hidden = false;
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      setStatus('<strong>Not enough data.</strong><br>Paste your Google review link first.');
      return;
    }

    try {
      await renderQr(url);
      els.qrCanvas.hidden = false;
      els.qrEmpty.hidden = true;
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';

      const note = looksLikeGoogleReviewUrl(url)
        ? 'Your Google review QR code is ready.'
        : 'Your QR code is ready, but the link may not be a standard Google review URL.';
      setStatus(`<strong>Generated.</strong><br>${note}`);
    } catch (err) {
      console.error('Review QR generation failed:', err);
      els.qrCanvas.hidden = true;
      els.qrEmpty.hidden = false;
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      setStatus('<strong>Generation failed.</strong><br>The review QR code could not be rendered.');
    }
  }

  async function copyText(text, successMessage, failMessage) {
    try {
      if (!text) throw new Error('No text');
      if (navigator.clipboard && window.isSecureContext) {
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
    els.businessName.value = '';
    els.reviewUrl.value = '';
    lastReviewUrl = '';
    els.qrCanvas.hidden = true;
    els.qrEmpty.hidden = false;
    if (els.readyLabel) els.readyLabel.textContent = 'No';
    updateMeta();
    setStatus('<strong>Cleared.</strong><br>Your business name and review link were reset.');
  }

  function loadSample() {
    els.businessName.value = 'InstantQR Coffee';
    els.reviewUrl.value = 'https://g.page/r/EXAMPLE/review';
    updateMeta();
    generate();
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
    await copyText(lastReviewUrl || normalizeUrl(els.reviewUrl.value), 'The review link was copied.', 'Nothing to copy.');
  });

  els.openLinkBtn?.addEventListener('click', () => {
    const url = lastReviewUrl || normalizeUrl(els.reviewUrl.value);
    if (!url) {
      setStatus('<strong>Nothing to open.</strong><br>Paste a review link first.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  });

  els.downloadBtn?.addEventListener('click', () => {
    if (els.qrCanvas.hidden) {
      setStatus('<strong>Nothing to download.</strong><br>Generate a QR code first.');
      return;
    }
    const link = document.createElement('a');
    link.href = els.qrCanvas.toDataURL('image/png');
    link.download = 'google-review-qr-code.png';
    link.click();
  });

  [els.businessName, els.reviewUrl].forEach(el => {
    el?.addEventListener('input', updateMeta);
    el?.addEventListener('change', updateMeta);
  });

  updateMeta();
  els.qrCanvas.hidden = true;
});
