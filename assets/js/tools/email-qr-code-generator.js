document.addEventListener('DOMContentLoaded', () => {
  const els = {
    emailAddress: document.getElementById('emailAddress'),
    emailLabel: document.getElementById('emailLabel'),
    emailSubject: document.getElementById('emailSubject'),
    emailBody: document.getElementById('emailBody'),

    generateBtn: document.getElementById('generateBtn'),
    sampleBtn: document.getElementById('sampleBtn'),
    clearBtn: document.getElementById('clearBtn'),
    copyLinkBtn: document.getElementById('copyLinkBtn'),
    openLinkBtn: document.getElementById('openLinkBtn'),
    downloadBtn: document.getElementById('downloadBtn'),

    charCount: document.getElementById('charCount'),
    readyLabel: document.getElementById('readyLabel'),
    recipientMetric: document.getElementById('recipientMetric'),
    subjectMetric: document.getElementById('subjectMetric'),

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

  let lastEmailUrl = '';

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

  function buildMailtoUrl() {
    const email = safeTrim(els.emailAddress.value);
    const subject = safeTrim(els.emailSubject.value);
    const body = safeTrim(els.emailBody.value);

    if (!email) return '';

    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (body) params.set('body', body);

    const query = params.toString();
    return query ? `mailto:${email}?${query}` : `mailto:${email}`;
  }

  function updateMeta() {
    const label = safeTrim(els.emailLabel.value) || 'Your recipient';
    const email = safeTrim(els.emailAddress.value);
    const subject = safeTrim(els.emailSubject.value);
    const body = safeTrim(els.emailBody.value);
    const url = buildMailtoUrl();

    if (els.charCount) els.charCount.textContent = String(body.length);
    if (els.subjectMetric) els.subjectMetric.textContent = String(subject.length);
    if (els.recipientMetric) els.recipientMetric.textContent = email || '—';

    if (els.previewName) els.previewName.textContent = label;
    if (els.previewSub) {
      els.previewSub.textContent = email
        ? 'An email recipient, subject, and message preview are ready.'
        : 'An email recipient, subject, and message preview will appear here.';
    }

    if (els.previewLines) {
      if (url) {
        const parts = [
          `<div class="email-line">Email: ${escapeHtml(email)}</div>`
        ];
        if (subject) {
          parts.push(`<div class="email-line">Subject: ${escapeHtml(subject)}</div>`);
        }
        if (body) {
          parts.push(`<div class="email-line">Message: ${escapeHtml(body)}</div>`);
        }
        parts.push(`<div class="email-line">${escapeHtml(url)}</div>`);
        els.previewLines.innerHTML = parts.join('');
      } else {
        els.previewLines.innerHTML = '<div class="email-line">A mailto link preview will appear here.</div>';
      }
    }

    if (els.outputCode) {
      els.outputCode.textContent = url || 'No email link generated yet.';
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
    const url = buildMailtoUrl();
    lastEmailUrl = url;

    if (!url) {
      els.qrCanvas.hidden = true;
      els.qrEmpty.hidden = false;
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      setStatus('<strong>Not enough data.</strong><br>Enter an email address first.');
      return;
    }

    try {
      await renderQr(url);
      els.qrCanvas.hidden = false;
      els.qrEmpty.hidden = true;
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';
      setStatus('<strong>Generated.</strong><br>Your email QR code is ready.');
    } catch (err) {
      console.error('Email QR generation failed:', err);
      els.qrCanvas.hidden = true;
      els.qrEmpty.hidden = false;
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      setStatus('<strong>Generation failed.</strong><br>The email QR code could not be rendered.');
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
    els.emailAddress.value = '';
    els.emailLabel.value = '';
    els.emailSubject.value = '';
    els.emailBody.value = '';
    lastEmailUrl = '';
    els.qrCanvas.hidden = true;
    els.qrEmpty.hidden = false;
    if (els.readyLabel) els.readyLabel.textContent = 'No';
    updateMeta();
    setStatus('<strong>Cleared.</strong><br>Your email details were reset.');
  }

  function loadSample() {
    els.emailAddress.value = 'hello@instantqr.io';
    els.emailLabel.value = 'Support Team';
    els.emailSubject.value = 'Inquiry about services';
    els.emailBody.value = 'Hi, I would like more information about your services.';
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
    await copyText(lastEmailUrl || buildMailtoUrl(), 'The email link was copied.', 'Nothing to copy.');
  });

  els.openLinkBtn?.addEventListener('click', () => {
    const url = lastEmailUrl || buildMailtoUrl();
    if (!url) {
      setStatus('<strong>Nothing to open.</strong><br>Enter an email address first.');
      return;
    }
    window.location.href = url;
  });

  els.downloadBtn?.addEventListener('click', () => {
    if (els.qrCanvas.hidden) {
      setStatus('<strong>Nothing to download.</strong><br>Generate a QR code first.');
      return;
    }
    const link = document.createElement('a');
    link.href = els.qrCanvas.toDataURL('image/png');
    link.download = 'email-qr-code.png';
    link.click();
  });

  [els.emailAddress, els.emailLabel, els.emailSubject, els.emailBody].forEach(el => {
    el?.addEventListener('input', updateMeta);
    el?.addEventListener('change', updateMeta);
  });

  updateMeta();
  els.qrCanvas.hidden = true;
});
