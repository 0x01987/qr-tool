document.addEventListener('DOMContentLoaded', () => {
  const els = {
    locationName: document.getElementById('locationName'),
    locationInput: document.getElementById('locationInput'),
    mapProvider: document.getElementById('mapProvider'),
    zoomLevel: document.getElementById('zoomLevel'),

    generateBtn: document.getElementById('generateBtn'),
    sampleBtn: document.getElementById('sampleBtn'),
    clearBtn: document.getElementById('clearBtn'),
    copyLinkBtn: document.getElementById('copyLinkBtn'),
    openLinkBtn: document.getElementById('openLinkBtn'),
    downloadBtn: document.getElementById('downloadBtn'),

    charCount: document.getElementById('charCount'),
    providerLabel: document.getElementById('providerLabel'),
    providerMetric: document.getElementById('providerMetric'),
    zoomMetric: document.getElementById('zoomMetric'),
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

  let lastMapUrl = '';

  function safeTrim(value) {
    return String(value || '').trim();
  }

  function setStatus(html) {
    if (els.statusBox) els.statusBox.innerHTML = html;
  }

  function updateMeta() {
    const raw = safeTrim(els.locationInput.value);
    const name = safeTrim(els.locationName.value) || 'Your location name';
    const provider = els.mapProvider.value === 'apple' ? 'Apple Maps' : 'Google Maps';
    const zoom = safeTrim(els.zoomLevel.value) || '15';

    if (els.charCount) els.charCount.textContent = String(raw.length);
    if (els.providerLabel) els.providerLabel.textContent = `Provider: ${provider}`;
    if (els.providerMetric) els.providerMetric.textContent = provider.replace(' Maps', '');
    if (els.zoomMetric) els.zoomMetric.textContent = zoom;

    if (els.previewName) els.previewName.textContent = name;
    if (els.previewSub) {
      els.previewSub.textContent = raw || 'Your address, place, or coordinates will appear here.';
    }

    if (els.previewLines) {
      const url = buildMapUrl();
      if (url) {
        els.previewLines.innerHTML = `<div class="location-line">${provider} • ${escapeHtml(url)}</div>`;
      } else {
        els.previewLines.innerHTML = '<div class="location-line">A map link preview will appear here.</div>';
      }
    }

    if (els.outputCode) {
      els.outputCode.textContent = buildMapUrl() || 'No map link generated yet.';
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function buildMapUrl() {
    const raw = safeTrim(els.locationInput.value);
    if (!raw) return '';

    const provider = els.mapProvider.value;
    const zoom = safeTrim(els.zoomLevel.value) || '15';
    const query = encodeURIComponent(raw);

    if (provider === 'apple') {
      return `https://maps.apple.com/?q=${query}&z=${encodeURIComponent(zoom)}`;
    }

    return `https://www.google.com/maps/search/?api=1&query=${query}`;
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
    const url = buildMapUrl();
    lastMapUrl = url;

    if (!url) {
      els.qrCanvas.hidden = true;
      els.qrEmpty.hidden = false;
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      setStatus('<strong>Not enough data.</strong><br>Enter an address, place name, or coordinates first.');
      return;
    }

    try {
      await renderQr(url);
      els.qrCanvas.hidden = false;
      els.qrEmpty.hidden = true;
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';
      setStatus('<strong>Generated.</strong><br>Your map QR code is ready.');
    } catch (err) {
      console.error('Map QR generation failed:', err);
      els.qrCanvas.hidden = true;
      els.qrEmpty.hidden = false;
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      setStatus('<strong>Generation failed.</strong><br>The map QR code could not be rendered.');
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
    els.locationName.value = '';
    els.locationInput.value = '';
    els.mapProvider.value = 'google';
    els.zoomLevel.value = '15';
    lastMapUrl = '';
    els.qrCanvas.hidden = true;
    els.qrEmpty.hidden = false;
    if (els.readyLabel) els.readyLabel.textContent = 'No';
    updateMeta();
    setStatus('<strong>Cleared.</strong><br>All location fields were reset.');
  }

  function loadSample() {
    els.locationName.value = 'Phoenix Convention Center';
    els.locationInput.value = '100 N 3rd St, Phoenix, AZ 85004';
    els.mapProvider.value = 'google';
    els.zoomLevel.value = '15';
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
    await copyText(lastMapUrl || buildMapUrl(), 'The map link was copied.', 'Nothing to copy.');
  });

  els.openLinkBtn?.addEventListener('click', () => {
    const url = lastMapUrl || buildMapUrl();
    if (!url) {
      setStatus('<strong>Nothing to open.</strong><br>Generate a map link first.');
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
    link.download = 'google-maps-location-qr-code.png';
    link.click();
  });

  [els.locationName, els.locationInput, els.mapProvider, els.zoomLevel].forEach(el => {
    el?.addEventListener('input', updateMeta);
    el?.addEventListener('change', updateMeta);
  });

  updateMeta();
  els.qrCanvas.hidden = true;
});
