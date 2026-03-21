document.addEventListener('DOMContentLoaded', () => {
  const els = {
    firstName: document.getElementById('firstName'),
    lastName: document.getElementById('lastName'),
    org: document.getElementById('org'),
    title: document.getElementById('title'),
    phone: document.getElementById('phone'),
    email: document.getElementById('email'),
    website: document.getElementById('website'),
    street: document.getElementById('street'),
    city: document.getElementById('city'),
    state: document.getElementById('state'),
    postal: document.getElementById('postal'),
    country: document.getElementById('country'),
    note: document.getElementById('note'),

    generateBtn: document.getElementById('generateBtn'),
    sampleBtn: document.getElementById('sampleBtn'),
    clearBtn: document.getElementById('clearBtn'),
    copyBtn: document.getElementById('copyBtn'),
    downloadBtn: document.getElementById('downloadBtn'),

    outputCode: document.getElementById('outputCode'),
    statusBox: document.getElementById('statusBox'),
    displayName: document.getElementById('displayName'),
    fieldCount: document.getElementById('fieldCount'),
    readyLabel: document.getElementById('readyLabel'),
    charCount: document.getElementById('charCount'),

    qrCanvas: document.getElementById('qrCanvas'),
    qrEmpty: document.getElementById('qrEmpty'),
    year: document.getElementById('year')
  };

  if (!els.firstName || !els.qrCanvas) return;

  if (els.year) {
    els.year.textContent = String(new Date().getFullYear());
  }

  let lastVCard = '';

  function safeTrim(value) {
    return String(value || '').trim();
  }

  function escapeText(value) {
    return String(value || '')
      .replace(/\r?\n/g, '\\n')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,');
  }

  function normalizeWebsite(value) {
    const clean = safeTrim(value);
    if (!clean) return '';
    if (/^https?:\/\//i.test(clean)) return clean;
    return 'https://' + clean;
  }

  function countFilledFields() {
    const fields = [
      els.firstName.value, els.lastName.value, els.org.value, els.title.value,
      els.phone.value, els.email.value, els.website.value, els.street.value,
      els.city.value, els.state.value, els.postal.value, els.country.value, els.note.value
    ];
    return fields.filter(v => safeTrim(v)).length;
  }

  function buildDisplayName() {
    const first = safeTrim(els.firstName.value);
    const last = safeTrim(els.lastName.value);
    const full = `${first} ${last}`.trim();
    return full || safeTrim(els.org.value) || '—';
  }

  function buildAddressLine() {
    const street = safeTrim(els.street.value);
    const city = safeTrim(els.city.value);
    const state = safeTrim(els.state.value);
    const postal = safeTrim(els.postal.value);
    const country = safeTrim(els.country.value);

    if (!street && !city && !state && !postal && !country) return '';

    return [
      '',
      '',
      street,
      city,
      state,
      postal,
      country
    ].map(escapeText).join(';');
  }

  function buildVCard() {
    const first = safeTrim(els.firstName.value);
    const last = safeTrim(els.lastName.value);
    const org = safeTrim(els.org.value);
    const title = safeTrim(els.title.value);
    const phone = safeTrim(els.phone.value);
    const email = safeTrim(els.email.value);
    const website = normalizeWebsite(els.website.value);
    const note = safeTrim(els.note.value);
    const fullName = `${first} ${last}`.trim();

    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${escapeText(last)};${escapeText(first)};;;`,
      `FN:${escapeText(fullName || org || 'Contact')}`
    ];

    if (org) lines.push(`ORG:${escapeText(org)}`);
    if (title) lines.push(`TITLE:${escapeText(title)}`);
    if (phone) lines.push(`TEL;TYPE=CELL:${escapeText(phone)}`);
    if (email) lines.push(`EMAIL:${escapeText(email)}`);
    if (website) lines.push(`URL:${escapeText(website)}`);

    const adr = buildAddressLine();
    if (adr) lines.push(`ADR;TYPE=WORK:${adr}`);

    if (note) lines.push(`NOTE:${escapeText(note)}`);

    lines.push('END:VCARD');
    return lines.join('\n');
  }

  function setStatus(html) {
    if (els.statusBox) els.statusBox.innerHTML = html;
  }

  function updateMetaOnly() {
    const vcard = buildVCard();
    lastVCard = vcard;

    if (els.displayName) els.displayName.textContent = `Contact: ${buildDisplayName()}`;
    if (els.fieldCount) els.fieldCount.textContent = String(countFilledFields());
    if (els.charCount) els.charCount.textContent = String(vcard.length);
    if (els.outputCode) {
      els.outputCode.textContent = countFilledFields() ? vcard : 'No vCard generated yet.';
    }
  }

  async function renderQr(text) {
    if (typeof QRCode === 'undefined') {
      throw new Error('QRCode library is unavailable.');
    }

    await QRCode.toCanvas(els.qrCanvas, text, {
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
    updateMetaOnly();

    const fieldCount = countFilledFields();
    const displayName = buildDisplayName();
    const vcard = buildVCard();

    if (fieldCount === 0) {
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      if (els.qrCanvas) els.qrCanvas.hidden = true;
      if (els.qrEmpty) els.qrEmpty.hidden = false;
      setStatus('<strong>Not enough data.</strong><br>Add at least a name, phone, email, or company to generate a useful contact QR code.');
      return;
    }

    try {
      await renderQr(vcard);

      if (els.qrCanvas) els.qrCanvas.hidden = false;
      if (els.qrEmpty) els.qrEmpty.hidden = true;
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';

      setStatus(
        `<strong>Generated.</strong><br>` +
        `Your vCard QR code is ready for <b>${displayName}</b>. ` +
        `You can scan it, copy the vCard, or download the PNG.`
      );
    } catch (err) {
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      if (els.qrCanvas) els.qrCanvas.hidden = true;
      if (els.qrEmpty) els.qrEmpty.hidden = false;

      setStatus(
        '<strong>QR library not ready.</strong><br>' +
        'Your contact fields and vCard text loaded correctly, but the QR image could not be rendered yet.'
      );
    }
  }

  function reset() {
    [
      els.firstName, els.lastName, els.org, els.title, els.phone, els.email,
      els.website, els.street, els.city, els.state, els.postal, els.country, els.note
    ].forEach(el => {
      if (el) el.value = '';
    });

    lastVCard = '';
    if (els.outputCode) els.outputCode.textContent = 'No vCard generated yet.';
    if (els.displayName) els.displayName.textContent = 'Contact: —';
    if (els.fieldCount) els.fieldCount.textContent = '0';
    if (els.charCount) els.charCount.textContent = '0';
    if (els.readyLabel) els.readyLabel.textContent = 'No';
    if (els.qrCanvas) els.qrCanvas.hidden = true;
    if (els.qrEmpty) els.qrEmpty.hidden = false;

    setStatus('<strong>Ready.</strong><br>Add your contact details, then click <b>Generate QR Code</b>.');
  }

  function fillSample(kind = 'basic') {
    if (kind === 'creator') {
      els.firstName.value = 'Danny';
      els.lastName.value = 'Bun';
      els.org.value = 'InstantQR';
      els.title.value = 'Founder';
      els.phone.value = '+1 555 555 1212';
      els.email.value = 'hello@instantqr.io';
      els.website.value = 'https://instantqr.io';
      els.city.value = 'Phoenix';
      els.state.value = 'AZ';
      els.country.value = 'USA';
      els.note.value = 'Founder of InstantQR. Free tools, SEO, QR, Web3, and utility apps.';
    } else if (kind === 'business') {
      els.firstName.value = 'Jane';
      els.lastName.value = 'Smith';
      els.org.value = 'Smith Consulting Group';
      els.title.value = 'Business Development Manager';
      els.phone.value = '+1 602 555 0108';
      els.email.value = 'jane@smithconsulting.com';
      els.website.value = 'smithconsulting.com';
      els.street.value = '100 Business Ave';
      els.city.value = 'Scottsdale';
      els.state.value = 'AZ';
      els.postal.value = '85251';
      els.country.value = 'USA';
      els.note.value = 'Schedule a consultation or connect for partnership opportunities.';
    } else {
      els.firstName.value = 'John';
      els.lastName.value = 'Doe';
      els.phone.value = '+1 555 123 4567';
      els.email.value = 'john@example.com';
    }
  }

  async function loadSample(kind = 'business') {
    reset();
    fillSample(kind);
    updateMetaOnly();
    await generate();
  }

  async function copyVCard() {
    if (!lastVCard) {
      setStatus('<strong>Nothing to copy.</strong><br>Generate a vCard first.');
      return;
    }

    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(lastVCard);
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(lastVCard);
      } else {
        const temp = document.createElement('textarea');
        temp.value = lastVCard;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        temp.remove();
      }
      setStatus('<strong>Copied.</strong><br>Your vCard data was copied to the clipboard.');
    } catch (_) {
      setStatus('<strong>Copy failed.</strong><br>Please copy the vCard output manually.');
    }
  }

  function downloadPng() {
    if (!lastVCard || !els.qrCanvas || els.qrCanvas.hidden) {
      setStatus('<strong>Nothing to download.</strong><br>Generate a QR code first.');
      return;
    }

    const link = document.createElement('a');
    const name = buildDisplayName()
      .replace(/[^\w\-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'vcard-qr';

    link.href = els.qrCanvas.toDataURL('image/png');
    link.download = `${name}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setStatus('<strong>Downloaded.</strong><br>Your vCard QR code PNG was downloaded.');
  }

  els.generateBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await generate();
  });

  els.sampleBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await loadSample('business');
  });

  els.clearBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    reset();
  });

  els.copyBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await copyVCard();
  });

  els.downloadBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    downloadPng();
  });

  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const preset = btn.getAttribute('data-preset') || 'basic';
      await loadSample(preset);
    });
  });

  [
    els.firstName, els.lastName, els.org, els.title, els.phone, els.email,
    els.website, els.street, els.city, els.state, els.postal, els.country, els.note
  ].forEach(el => {
    el?.addEventListener('input', updateMetaOnly);
  });

  reset();
});
