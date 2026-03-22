document.addEventListener('DOMContentLoaded', () => {
  const modeEl = document.getElementById('mode');
  const urlWrap = document.getElementById('urlWrap');
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
  const marginEl = document.getElementById('margin');
  const fgColorEl = document.getElementById('fgColor');
  const bgColorEl = document.getElementById('bgColor');
  const qrStage = document.getElementById('qrStage');
  const payloadPreview = document.getElementById('payloadPreview');

  const generateBtn = document.getElementById('generateBtn');
  const downloadPngBtn = document.getElementById('downloadPngBtn');
  const downloadSvgBtn = document.getElementById('downloadSvgBtn');
  const copyPayloadBtn = document.getElementById('copyPayloadBtn');
  const resetBtn = document.getElementById('resetBtn');

  if (
    !modeEl || !urlWrap || !couponUrlEl || !offerTitleEl || !promoCodeEl ||
    !discountTypeEl || !discountValueEl || !startDateEl || !endDateEl ||
    !descriptionEl || !termsEl || !sizeEl || !marginEl || !fgColorEl ||
    !bgColorEl || !qrStage || !payloadPreview || !generateBtn ||
    !downloadPngBtn || !downloadSvgBtn || !copyPayloadBtn || !resetBtn
  ) {
    return;
  }

  let lastPayload = '';
  let lastSvg = '';
  let lastCanvas = null;

  function escapeText(v) {
    return String(v || '').replace(/\s+/g, ' ').trim();
  }

  function maybeNormalizeUrl(url) {
    const clean = String(url || '').trim();
    if (!clean) return '';
    if (/^https?:\/\//i.test(clean)) return clean;
    return 'https://' + clean;
  }

  function buildTextPayload() {
    const lines = [];
    const offerTitle = escapeText(offerTitleEl.value);
    const promoCode = escapeText(promoCodeEl.value);
    const discountType = escapeText(discountTypeEl.value);
    const discountValue = escapeText(discountValueEl.value);
    const startDate = startDateEl.value;
    const endDate = endDateEl.value;
    const description = escapeText(descriptionEl.value);
    const terms = escapeText(termsEl.value);

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
    const mode = modeEl.value;
    if (mode === 'url') {
      const url = maybeNormalizeUrl(couponUrlEl.value);
      if (!url) return '';
      return url;
    }
    return buildTextPayload();
  }

  function updateModeUI() {
    const isUrl = modeEl.value === 'url';
    urlWrap.style.display = isUrl ? '' : 'none';
  }

  async function renderQr() {
    if (!window.QRCode) {
      payloadPreview.textContent = 'QR library failed to load. Please refresh and try again.';
      return;
    }

    const payload = getPayload();

    if (!payload) {
      payloadPreview.textContent = 'Enter a coupon URL or coupon details to generate a QR code.';
      qrStage.innerHTML = '<div class="hint">Your coupon QR code will appear here.</div>';
      lastPayload = '';
      lastSvg = '';
      lastCanvas = null;
      return;
    }

    const size = Number(sizeEl.value || 320);
    const margin = Number(marginEl.value || 2);
    const dark = fgColorEl.value || '#111827';
    const light = bgColorEl.value || '#ffffff';

    qrStage.innerHTML = '';
    const canvas = document.createElement('canvas');

    try {
      await QRCode.toCanvas(canvas, payload, {
        width: size,
        margin,
        color: { dark, light },
        errorCorrectionLevel: 'M'
      });

      const svgString = await QRCode.toString(payload, {
        type: 'svg',
        width: size,
        margin,
        color: { dark, light },
        errorCorrectionLevel: 'M'
      });

      qrStage.appendChild(canvas);
      payloadPreview.textContent = payload;
      lastPayload = payload;
      lastSvg = svgString;
      lastCanvas = canvas;
    } catch (error) {
      qrStage.innerHTML = '<div class="hint">Generation failed. Please check your input and try again.</div>';
      payloadPreview.textContent = 'Generation failed.';
      lastPayload = '';
      lastSvg = '';
      lastCanvas = null;
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1200);
  }

  function downloadPng() {
    if (!lastCanvas) return;

    lastCanvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, 'coupon-qr-code.png');
    }, 'image/png');
  }

  function downloadSvg() {
    if (!lastSvg) return;

    const blob = new Blob([lastSvg], {
      type: 'image/svg+xml;charset=utf-8'
    });
    downloadBlob(blob, 'coupon-qr-code.svg');
  }

  async function copyPayload() {
    if (!lastPayload) return;

    try {
      await navigator.clipboard.writeText(lastPayload);
      copyPayloadBtn.textContent = 'Copied';
      setTimeout(() => {
        copyPayloadBtn.textContent = 'Copy Payload';
      }, 1400);
    } catch (error) {
      copyPayloadBtn.textContent = 'Copy Failed';
      setTimeout(() => {
        copyPayloadBtn.textContent = 'Copy Payload';
      }, 1400);
    }
  }

  function resetForm() {
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
    marginEl.value = '2';
    fgColorEl.value = '#111827';
    bgColorEl.value = '#ffffff';

    updateModeUI();

    qrStage.innerHTML = '<div class="hint">Your coupon QR code will appear here.</div>';
    payloadPreview.textContent = 'No coupon payload generated yet.';
    lastPayload = '';
    lastSvg = '';
    lastCanvas = null;
  }

  modeEl.addEventListener('change', updateModeUI);
  generateBtn.addEventListener('click', renderQr);
  downloadPngBtn.addEventListener('click', downloadPng);
  downloadSvgBtn.addEventListener('click', downloadSvg);
  copyPayloadBtn.addEventListener('click', copyPayload);
  resetBtn.addEventListener('click', resetForm);

  [
    modeEl,
    couponUrlEl,
    offerTitleEl,
    promoCodeEl,
    discountTypeEl,
    discountValueEl,
    startDateEl,
    endDateEl,
    descriptionEl,
    termsEl,
    sizeEl,
    marginEl,
    fgColorEl,
    bgColorEl
  ].forEach((el) => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && el.tagName !== 'TEXTAREA') {
        e.preventDefault();
        renderQr();
      }
    });
  });

  updateModeUI();
});
