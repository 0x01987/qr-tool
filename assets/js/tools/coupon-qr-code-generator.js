document.addEventListener('DOMContentLoaded', () => {
  const modeEl = document.getElementById('mode');
  const couponUrlWrap = document.getElementById('couponUrlWrap');
  const couponUrlEl = document.getElementById('couponUrl');
  const offerTitleEl = document.getElementById('offerTitle');
  const promoCodeEl = document.getElementById('promoCode');
  const discountTypeEl = document.getElementById('discountType');
  const discountValueEl = document.getElementById('discountValue');
  const startDateEl = document.getElementById('startDate');
  const endDateEl = document.getElementById('endDate');
  const descriptionEl = document.getElementById('description');
  const termsEl = document.getElementById('terms');
  const sizeEl = document.getElementById('size');
  const levelEl = document.getElementById('level');
  const marginEl = document.getElementById('margin');

  const generateBtn = document.getElementById('generateBtn');
  const loadSampleBtn = document.getElementById('loadSampleBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyPayloadBtn = document.getElementById('copyPayloadBtn');
  const copyShareBtn = document.getElementById('copyShareBtn');
  const clearBtn = document.getElementById('clearBtn');

  const qrWrap = document.getElementById('qrWrap');
  const charsOut = document.getElementById('charsOut');
  const sizeOut = document.getElementById('sizeOut');
  const levelOut = document.getElementById('levelOut');
  const status = document.getElementById('status');

  if (
    !modeEl || !couponUrlWrap || !couponUrlEl || !offerTitleEl || !promoCodeEl ||
    !discountTypeEl || !discountValueEl || !startDateEl || !endDateEl ||
    !descriptionEl || !termsEl || !sizeEl || !levelEl || !marginEl ||
    !generateBtn || !loadSampleBtn || !downloadBtn || !copyPayloadBtn || !copyShareBtn ||
    !clearBtn || !qrWrap || !charsOut || !sizeOut || !levelOut || !status
  ) {
    return;
  }

  let lastPayload = '';
  let lastCanvas = null;

  function setStatus(message, type = '') {
    status.className = 'status-box';
    if (type === 'ok') status.classList.add('ok');
    if (type === 'bad') status.classList.add('bad');
    status.innerHTML = message;
  }

  function updateModeUI() {
    const isUrl = modeEl.value === 'url';
    couponUrlWrap.classList.toggle('hidden', !isUrl);
  }

  function normalizeUrl(value) {
    const clean = String(value || '').trim();
    if (!clean) return '';
    if (/^https?:\/\//i.test(clean)) return clean;
    return `https://${clean}`;
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function buildTextPayload() {
    const lines = [];
    const offerTitle = cleanText(offerTitleEl.value);
    const promoCode = cleanText(promoCodeEl.value);
    const discountType = cleanText(discountTypeEl.value);
    const discountValue = cleanText(discountValueEl.value);
    const startDate = startDateEl.value;
    const endDate = endDateEl.value;
    const description = cleanText(descriptionEl.value);
    const terms = cleanText(termsEl.value);

    if (offerTitle) lines.push(`Offer: ${offerTitle}`);
    if (promoCode) lines.push(`Code: ${promoCode}`);
    if (discountType || discountValue) {
      lines.push(`Discount: ${[discountType, discountValue].filter(Boolean).join(' - ')}`);
    }
    if (startDate) lines.push(`Start: ${startDate}`);
    if (endDate) lines.push(`Expires: ${endDate}`);
    if (description) lines.push(`Details: ${description}`);
    if (terms) lines.push(`Terms: ${terms}`);

    return lines.join('\n');
  }

  function getPayload() {
    if (modeEl.value === 'url') {
      return normalizeUrl(couponUrlEl.value);
    }
    return buildTextPayload();
  }

  function resetPreview() {
    qrWrap.innerHTML = '<div class="qr-placeholder">Your coupon QR code will appear here.</div>';
    charsOut.textContent = '0 chars';
    sizeOut.textContent = `${sizeEl.value || 320} px`;
    levelOut.textContent = levelEl.value || 'M';
    lastPayload = '';
    lastCanvas = null;
    setStatus('Ready. Fill in your coupon details and click <strong>Generate</strong>.');
  }

  function waitForQRCodeLib(timeoutMs = 4000, intervalMs = 50) {
    return new Promise((resolve) => {
      if (window.QRCode) {
        resolve(true);
        return;
      }

      const start = Date.now();
      const timer = setInterval(() => {
        if (window.QRCode) {
          clearInterval(timer);
          resolve(true);
          return;
        }

        if (Date.now() - start >= timeoutMs) {
          clearInterval(timer);
          resolve(false);
        }
      }, intervalMs);
    });
  }

  async function renderQr() {
    const libReady = await waitForQRCodeLib();

    if (!libReady) {
      setStatus('QR code library failed to load. Please check your connection and try again.', 'bad');
      return;
    }

    const payload = getPayload();
    const size = Math.max(128, Math.min(1024, Number(sizeEl.value || 320)));
    const level = levelEl.value || 'M';
    const margin = Math.max(0, Number(marginEl.value || 2));

    sizeEl.value = String(size);
    sizeOut.textContent = `${size} px`;
    levelOut.textContent = level;

    if (!payload) {
      setStatus('Please enter a coupon URL or coupon details before generating.', 'bad');
      qrWrap.innerHTML = '<div class="qr-placeholder">Your coupon QR code will appear here.</div>';
      charsOut.textContent = '0 chars';
      lastPayload = '';
      lastCanvas = null;
      return;
    }

    const canvas = document.createElement('canvas');

    try {
      await window.QRCode.toCanvas(canvas, payload, {
        width: size,
        margin,
        errorCorrectionLevel: level,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      qrWrap.innerHTML = '';
      const shell = document.createElement('div');
      shell.className = 'qr-canvas-shell';
      shell.appendChild(canvas);
      qrWrap.appendChild(shell);

      lastPayload = payload;
      lastCanvas = canvas;
      charsOut.textContent = `${payload.length} chars`;
      setStatus('Coupon QR code generated successfully. You can now download it or copy the payload.', 'ok');
    } catch (error) {
      qrWrap.innerHTML = '<div class="qr-placeholder">Generation failed. Please review your input and try again.</div>';
      lastPayload = '';
      lastCanvas = null;
      charsOut.textContent = '0 chars';
      setStatus('Generation failed. Please review your coupon input and try again.', 'bad');
    }
  }

  function downloadPng() {
    if (!lastCanvas) {
      setStatus('Generate a coupon QR code before downloading.', 'bad');
      return;
    }

    lastCanvas.toBlob((blob) => {
      if (!blob) {
        setStatus('PNG export failed. Please try again.', 'bad');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'coupon-qr-code.png';
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('PNG download started.', 'ok');
    }, 'image/png');
  }

  async function copyPayload() {
    if (!lastPayload) {
      setStatus('Generate a coupon QR code before copying the payload.', 'bad');
      return;
    }

    try {
      await navigator.clipboard.writeText(lastPayload);
      setStatus('Coupon payload copied to clipboard.', 'ok');
    } catch (error) {
      setStatus('Clipboard copy failed. Please try again.', 'bad');
    }
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus('Tool link copied to clipboard.', 'ok');
    } catch (error) {
      setStatus('Could not copy the tool link.', 'bad');
    }
  }

  async function loadSample() {
    modeEl.value = 'text';
    couponUrlEl.value = 'https://example.com/weekend-sale';
    offerTitleEl.value = 'Weekend Flash Sale';
    promoCodeEl.value = 'FLASH25';
    discountTypeEl.value = 'Percent discount';
    discountValueEl.value = '25%';
    startDateEl.value = '';
    endDateEl.value = '';
    descriptionEl.value = 'Save 25% on orders over $40 this weekend only.';
    termsEl.value = 'One use per customer. Cannot be combined with other offers.';
    sizeEl.value = '320';
    levelEl.value = 'M';
    marginEl.value = '2';

    updateModeUI();
    sizeOut.textContent = `${sizeEl.value} px`;
    levelOut.textContent = levelEl.value;
    setStatus('Sample coupon loaded. Generating preview...', 'ok');

    await renderQr();
  }

  function clearForm() {
    modeEl.value = 'url';
    couponUrlEl.value = '';
    offerTitleEl.value = '';
    promoCodeEl.value = '';
    discountTypeEl.value = 'Percent discount';
    discountValueEl.value = '';
    startDateEl.value = '';
    endDateEl.value = '';
    descriptionEl.value = '';
    termsEl.value = '';
    sizeEl.value = '320';
    levelEl.value = 'M';
    marginEl.value = '2';

    updateModeUI();
    resetPreview();
  }

  generateBtn.addEventListener('click', renderQr);
  loadSampleBtn.addEventListener('click', loadSample);
  downloadBtn.addEventListener('click', downloadPng);
  copyPayloadBtn.addEventListener('click', copyPayload);
  copyShareBtn.addEventListener('click', copyShareLink);
  clearBtn.addEventListener('click', clearForm);
  modeEl.addEventListener('change', updateModeUI);

  [
    couponUrlEl, offerTitleEl, promoCodeEl, discountTypeEl, discountValueEl,
    startDateEl, endDateEl, descriptionEl, termsEl, sizeEl, levelEl, marginEl
  ].forEach((el) => {
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && el.tagName !== 'TEXTAREA') {
        event.preventDefault();
        renderQr();
      }
    });
  });

  sizeOut.textContent = `${sizeEl.value || 320} px`;
  levelOut.textContent = levelEl.value || 'M';
  updateModeUI();
  resetPreview();
});
