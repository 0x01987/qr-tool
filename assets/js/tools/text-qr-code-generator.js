document.addEventListener('DOMContentLoaded', () => {
  const els = {
    singleModeBtn: document.getElementById('singleModeBtn'),
    batchModeBtn: document.getElementById('batchModeBtn'),
    singleModeFields: document.getElementById('singleModeFields'),
    batchModeFields: document.getElementById('batchModeFields'),

    textInput: document.getElementById('textInput'),
    batchInput: document.getElementById('batchInput'),
    qrColor: document.getElementById('qrColor'),
    bgColor: document.getElementById('bgColor'),
    sizeSelect: document.getElementById('sizeSelect'),
    logoFile: document.getElementById('logoFile'),

    generateBtn: document.getElementById('generateBtn'),
    sampleBtn: document.getElementById('sampleBtn'),
    clearBtn: document.getElementById('clearBtn'),
    copyTextBtn: document.getElementById('copyTextBtn'),
    removeLogoBtn: document.getElementById('removeLogoBtn'),
    exportSvgBtn: document.getElementById('exportSvgBtn'),
    downloadBtn: document.getElementById('downloadBtn'),

    activeCount: document.getElementById('activeCount'),
    summaryCount: document.getElementById('summaryCount'),
    readyLabel: document.getElementById('readyLabel'),
    resultMode: document.getElementById('resultMode'),

    qrCanvas: document.getElementById('qrCanvas'),
    qrEmpty: document.getElementById('qrEmpty'),
    singlePreviewBox: document.getElementById('singlePreviewBox'),
    batchPreviewBox: document.getElementById('batchPreviewBox'),
    batchList: document.getElementById('batchList'),
    outputCode: document.getElementById('outputCode'),
    statusBox: document.getElementById('statusBox'),
    year: document.getElementById('year')
  };

  if (!els.generateBtn || !els.qrCanvas) return;

  if (els.year) {
    els.year.textContent = String(new Date().getFullYear());
  }

  let currentMode = 'single';
  let logoDataUrl = '';
  let lastSingleText = '';
  let lastBatchItems = [];

  function safeTrim(value) {
    return String(value || '').trim();
  }

  function setStatus(html) {
    if (els.statusBox) els.statusBox.innerHTML = html;
  }

  function setMode(mode) {
    currentMode = mode;
    els.singleModeBtn.classList.toggle('active', mode === 'single');
    els.batchModeBtn.classList.toggle('active', mode === 'batch');
    els.singleModeFields.classList.toggle('hidden', mode !== 'single');
    els.batchModeFields.classList.toggle('hidden', mode !== 'batch');
    els.singlePreviewBox.classList.toggle('hidden', mode !== 'single');
    els.batchPreviewBox.classList.toggle('hidden', mode !== 'batch');
    if (els.resultMode) {
      els.resultMode.textContent = `Mode: ${mode === 'single' ? 'Single' : 'Batch'}`;
    }
    updateCounts();
  }

  function getSize() {
    const size = parseInt(els.sizeSelect.value, 10);
    return Number.isFinite(size) ? size : 320;
  }

  function getSingleText() {
    return safeTrim(els.textInput.value);
  }

  function getBatchItems() {
    return String(els.batchInput.value || '')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  }

  function updateCounts() {
    const count = currentMode === 'single'
      ? (getSingleText() ? 1 : 0)
      : getBatchItems().length;

    if (els.activeCount) els.activeCount.textContent = String(count);
    if (els.summaryCount) els.summaryCount.textContent = String(count);

    if (currentMode === 'single') {
      els.outputCode.textContent = getSingleText() || 'No QR content generated yet.';
    } else {
      const items = getBatchItems();
      els.outputCode.textContent = items.length
        ? items.map((item, i) => `${i + 1}. ${item}`).join('\n')
        : 'No QR content generated yet.';
    }
  }

  function drawLogoOnCanvas(canvas, size) {
    if (!logoDataUrl) return Promise.resolve();

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        const logoBox = Math.round(size * 0.22);
        const x = Math.round((size - logoBox) / 2);
        const y = Math.round((size - logoBox) / 2);
        const pad = Math.round(logoBox * 0.12);

        ctx.fillStyle = '#ffffff';
        roundRect(ctx, x - pad, y - pad, logoBox + pad * 2, logoBox + pad * 2, 12);
        ctx.fill();

        ctx.drawImage(img, x, y, logoBox, logoBox);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = logoDataUrl;
    });
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  async function renderSingleCanvas(text, canvas) {
    const size = getSize();

    await QRCode.toCanvas(canvas, text, {
      width: size,
      margin: 2,
      errorCorrectionLevel: logoDataUrl ? 'H' : 'M',
      color: {
        dark: els.qrColor.value || '#000000',
        light: els.bgColor.value || '#ffffff'
      }
    });

    await drawLogoOnCanvas(canvas, size);
  }

  async function generateSingle() {
    const text = getSingleText();
    lastSingleText = text;

    if (!text) {
      els.qrCanvas.hidden = true;
      els.qrEmpty.hidden = false;
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      setStatus('<strong>Not enough data.</strong><br>Enter some text to generate a QR code.');
      return;
    }

    try {
      await renderSingleCanvas(text, els.qrCanvas);
      els.qrCanvas.hidden = false;
      els.qrEmpty.hidden = true;
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';
      setStatus('<strong>Generated.</strong><br>Your styled text QR code is ready.');
    } catch (err) {
      console.error('Single QR generation failed:', err);
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      setStatus('<strong>Generation failed.</strong><br>The QR code could not be rendered.');
    }
  }

  async function generateBatch() {
    const items = getBatchItems();
    lastBatchItems = items;
    els.batchList.innerHTML = '';

    if (!items.length) {
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      setStatus('<strong>Not enough data.</strong><br>Enter one text item per line for batch generation.');
      return;
    }

    const size = getSize();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const wrapper = document.createElement('div');
      wrapper.className = 'batch-item';

      const head = document.createElement('div');
      head.className = 'batch-item-head';

      const title = document.createElement('div');
      title.className = 'batch-item-title';
      title.textContent = `${i + 1}. ${item.length > 80 ? item.slice(0, 80) + '…' : item}`;

      head.appendChild(title);

      const canvasWrap = document.createElement('div');
      canvasWrap.className = 'batch-canvas-wrap';

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      canvasWrap.appendChild(canvas);

      const actions = document.createElement('div');
      actions.className = 'batch-actions';

      const downloadBtn = document.createElement('button');
      downloadBtn.type = 'button';
      downloadBtn.className = 'mini-btn';
      downloadBtn.textContent = 'Download PNG';
      downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `text-qr-${i + 1}.png`;
        link.click();
      });

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'mini-btn';
      copyBtn.textContent = 'Copy Text';
      copyBtn.addEventListener('click', async () => {
        await copyText(item, 'Text copied.', 'Copy failed.');
      });

      actions.appendChild(downloadBtn);
      actions.appendChild(copyBtn);

      wrapper.appendChild(head);
      wrapper.appendChild(canvasWrap);
      wrapper.appendChild(actions);
      els.batchList.appendChild(wrapper);

      try {
        await QRCode.toCanvas(canvas, item, {
          width: size,
          margin: 2,
          errorCorrectionLevel: logoDataUrl ? 'H' : 'M',
          color: {
            dark: els.qrColor.value || '#000000',
            light: els.bgColor.value || '#ffffff'
          }
        });
        await drawLogoOnCanvas(canvas, size);
      } catch (err) {
        console.error('Batch QR generation failed for item:', item, err);
      }
    }

    if (els.readyLabel) els.readyLabel.textContent = 'Yes';
    setStatus(`<strong>Generated.</strong><br>${items.length} QR code(s) created in batch mode.`);
  }

  async function generate() {
    updateCounts();

    if (currentMode === 'single') {
      await generateSingle();
    } else {
      await generateBatch();
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

  async function exportSvg() {
    const text = getSingleText();
    if (currentMode !== 'single') {
      setStatus('<strong>SVG export unavailable.</strong><br>SVG export is available in single mode only.');
      return;
    }
    if (!text) {
      setStatus('<strong>Nothing to export.</strong><br>Enter text first.');
      return;
    }

    try {
      const svg = await QRCode.toString(text, {
        type: 'svg',
        margin: 2,
        errorCorrectionLevel: logoDataUrl ? 'H' : 'M',
        color: {
          dark: els.qrColor.value || '#000000',
          light: els.bgColor.value || '#ffffff'
        },
        width: getSize()
      });

      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'text-qr-code.svg';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);

      setStatus('<strong>Exported.</strong><br>Your SVG file was downloaded.');
    } catch (err) {
      console.error('SVG export failed:', err);
      setStatus('<strong>Export failed.</strong><br>The SVG file could not be generated.');
    }
  }

  function clearAll() {
    els.textInput.value = '';
    els.batchInput.value = '';
    els.qrColor.value = '#000000';
    els.bgColor.value = '#ffffff';
    els.sizeSelect.value = '320';
    els.logoFile.value = '';
    logoDataUrl = '';
    lastSingleText = '';
    lastBatchItems = [];
    els.qrCanvas.hidden = true;
    els.qrEmpty.hidden = false;
    els.batchList.innerHTML = '';
    if (els.readyLabel) els.readyLabel.textContent = 'No';
    updateCounts();
    setStatus('<strong>Cleared.</strong><br>All text, styling, and logo settings were reset.');
  }

  function loadSample() {
    if (currentMode === 'single') {
      els.textInput.value = 'Hello from InstantQR 🚀\nFast • Free • Styled QR Codes';
    } else {
      els.batchInput.value = 'Hello from InstantQR\nhttps://instantqr.io\nScan me for more tools';
    }
    updateCounts();
    generate();
  }

  function loadLogo(file) {
    return new Promise((resolve) => {
      if (!file) {
        logoDataUrl = '';
        resolve();
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        logoDataUrl = typeof reader.result === 'string' ? reader.result : '';
        resolve();
      };
      reader.onerror = () => {
        logoDataUrl = '';
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }

  els.singleModeBtn?.addEventListener('click', () => setMode('single'));
  els.batchModeBtn?.addEventListener('click', () => setMode('batch'));

  els.generateBtn?.addEventListener('click', async () => {
    await generate();
  });

  els.sampleBtn?.addEventListener('click', () => {
    loadSample();
  });

  els.clearBtn?.addEventListener('click', () => {
    clearAll();
  });

  els.copyTextBtn?.addEventListener('click', async () => {
    const text = currentMode === 'single'
      ? getSingleText()
      : getBatchItems().join('\n');
    await copyText(text, 'The current text was copied.', 'Nothing to copy.');
  });

  els.removeLogoBtn?.addEventListener('click', async () => {
    els.logoFile.value = '';
    logoDataUrl = '';
    setStatus('<strong>Logo removed.</strong><br>The center logo was removed.');
    if ((currentMode === 'single' && getSingleText()) || (currentMode === 'batch' && getBatchItems().length)) {
      await generate();
    }
  });

  els.exportSvgBtn?.addEventListener('click', async () => {
    await exportSvg();
  });

  els.downloadBtn?.addEventListener('click', () => {
    if (currentMode !== 'single' || els.qrCanvas.hidden) {
      setStatus('<strong>Nothing to download.</strong><br>Generate a single QR code first.');
      return;
    }
    const link = document.createElement('a');
    link.href = els.qrCanvas.toDataURL('image/png');
    link.download = 'text-qr-code.png';
    link.click();
  });

  els.logoFile?.addEventListener('change', async () => {
    const file = els.logoFile.files && els.logoFile.files[0];
    await loadLogo(file);
    if ((currentMode === 'single' && getSingleText()) || (currentMode === 'batch' && getBatchItems().length)) {
      await generate();
    }
  });

  [
    els.textInput,
    els.batchInput,
    els.qrColor,
    els.bgColor,
    els.sizeSelect
  ].forEach(el => {
    el?.addEventListener('input', updateCounts);
    el?.addEventListener('change', updateCounts);
  });

  updateCounts();
  els.qrCanvas.hidden = true;
});
