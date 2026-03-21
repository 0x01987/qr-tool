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
    brandColor: document.getElementById('brandColor'),
    avatarUrl: document.getElementById('avatarUrl'),

    generateBtn: document.getElementById('generateBtn'),
    sampleBtn: document.getElementById('sampleBtn'),
    clearBtn: document.getElementById('clearBtn'),
    copyBtn: document.getElementById('copyBtn'),
    copyShareBtn: document.getElementById('copyShareBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    downloadVcfBtn: document.getElementById('downloadVcfBtn'),

    outputCode: document.getElementById('outputCode'),
    shareLinkOutput: document.getElementById('shareLinkOutput'),
    statusBox: document.getElementById('statusBox'),
    displayName: document.getElementById('displayName'),
    fieldCount: document.getElementById('fieldCount'),
    readyLabel: document.getElementById('readyLabel'),
    shareReady: document.getElementById('shareReady'),
    charCount: document.getElementById('charCount'),

    qrCanvas: document.getElementById('qrCanvas'),
    qrImage: document.getElementById('qrImage'),
    qrEmpty: document.getElementById('qrEmpty'),
    year: document.getElementById('year'),

    profileCard: document.getElementById('profileCard'),
    avatarBox: document.getElementById('avatarBox'),
    avatarFallback: document.getElementById('avatarFallback'),
    avatarImg: document.getElementById('avatarImg'),
    profileName: document.getElementById('profileName'),
    profileRole: document.getElementById('profileRole'),
    profileLines: document.getElementById('profileLines'),
    profileNote: document.getElementById('profileNote')
  };

  if (!els.firstName || !els.qrCanvas || !els.qrImage) return;

  if (els.year) {
    els.year.textContent = String(new Date().getFullYear());
  }

  let lastVCard = '';
  let lastQrMode = '';
  let lastQrImageUrl = '';
  let lastShareLink = '';

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
      els.city.value, els.state.value, els.postal.value, els.country.value,
      els.note.value, els.avatarUrl.value
    ];
    return fields.filter(v => safeTrim(v)).length;
  }

  function buildDisplayName() {
    const first = safeTrim(els.firstName.value);
    const last = safeTrim(els.lastName.value);
    const full = `${first} ${last}`.trim();
    return full || safeTrim(els.org.value) || '—';
  }

  function buildInitials() {
    const first = safeTrim(els.firstName.value);
    const last = safeTrim(els.lastName.value);
    const fallback = safeTrim(els.org.value);
    const initials = `${first.charAt(0)}${last.charAt(0)}`.trim();
    if (initials) return initials.toUpperCase();
    return (fallback.slice(0, 2) || 'VC').toUpperCase();
  }

  function buildAddressLine() {
    const street = safeTrim(els.street.value);
    const city = safeTrim(els.city.value);
    const state = safeTrim(els.state.value);
    const postal = safeTrim(els.postal.value);
    const country = safeTrim(els.country.value);

    if (!street && !city && !state && !postal && !country) return '';

    return ['', '', street, city, state, postal, country]
      .map(escapeText)
      .join(';');
  }

  function buildHumanAddress() {
    return [
      safeTrim(els.street.value),
      [safeTrim(els.city.value), safeTrim(els.state.value), safeTrim(els.postal.value)].filter(Boolean).join(', '),
      safeTrim(els.country.value)
    ].filter(Boolean).join(' • ');
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

  function buildShareLink(vcard) {
    const encoded = btoa(unescape(encodeURIComponent(vcard)));
    return `${window.location.origin}${window.location.pathname}?vcard=${encodeURIComponent(encoded)}`;
  }

  function updateProfilePreview() {
    const name = buildDisplayName();
    const org = safeTrim(els.org.value);
    const title = safeTrim(els.title.value);
    const phone = safeTrim(els.phone.value);
    const email = safeTrim(els.email.value);
    const website = normalizeWebsite(els.website.value);
    const address = buildHumanAddress();
    const note = safeTrim(els.note.value);
    const color = safeTrim(els.brandColor.value) || '#2563eb';
    const avatarUrl = safeTrim(els.avatarUrl.value);

    if (els.profileCard) {
      els.profileCard.style.setProperty('--cardBrand', color);
    }

    if (els.profileName) {
      els.profileName.textContent = name === '—' ? 'Your Name' : name;
    }

    if (els.profileRole) {
      const roleParts = [org, title].filter(Boolean);
      els.profileRole.textContent = roleParts.length ? roleParts.join(' • ') : 'Company • Title';
    }

    if (els.profileLines) {
      const lines = [];
      if (phone) lines.push(phone);
      if (email) lines.push(email);
      if (website) lines.push(website);
      if (address) lines.push(address);

      if (!lines.length) {
        els.profileLines.innerHTML = '<div class="profile-line">Phone, email, website, and address preview will appear here.</div>';
      } else {
        els.profileLines.innerHTML = lines.map(line => `<div class="profile-line">${escapeHtml(line)}</div>`).join('');
      }
    }

    if (els.profileNote) {
      els.profileNote.textContent = note || 'Optional note or bio will appear here.';
    }

    if (els.avatarFallback) {
      els.avatarFallback.textContent = buildInitials();
    }

    if (els.avatarImg) {
      if (avatarUrl) {
        els.avatarImg.src = avatarUrl;
        els.avatarImg.hidden = false;
        els.avatarFallback.hidden = true;
        els.avatarImg.onerror = () => {
          els.avatarImg.hidden = true;
          els.avatarFallback.hidden = false;
        };
      } else {
        els.avatarImg.removeAttribute('src');
        els.avatarImg.hidden = true;
        els.avatarFallback.hidden = false;
      }
    }
  }

  function updateMetaOnly() {
    const vcard = buildVCard();
    const name = buildDisplayName();
    const fieldCount = countFilledFields();

    lastVCard = vcard;
    lastShareLink = fieldCount ? buildShareLink(vcard) : '';

    if (els.displayName) {
      els.displayName.textContent = `Contact: ${name}`;
    }

    if (els.fieldCount) {
      els.fieldCount.textContent = String(fieldCount);
    }

    if (els.charCount) {
      els.charCount.textContent = String(vcard.length);
    }

    if (els.outputCode) {
      els.outputCode.textContent = fieldCount ? vcard : 'No vCard generated yet.';
    }

    if (els.shareLinkOutput) {
      els.shareLinkOutput.value = lastShareLink;
    }

    if (els.shareReady) {
      els.shareReady.textContent = lastShareLink ? 'Yes' : 'No';
    }

    updateProfilePreview();
  }

  function showEmptyState() {
    els.qrCanvas.hidden = true;
    els.qrImage.hidden = true;
    els.qrEmpty.hidden = false;
  }

  function showCanvas() {
    els.qrCanvas.hidden = false;
    els.qrImage.hidden = true;
    els.qrEmpty.hidden = true;
  }

  function showImage() {
    els.qrCanvas.hidden = true;
    els.qrImage.hidden = false;
    els.qrEmpty.hidden = true;
  }

  function getFallbackQrUrl(text) {
    return 'https://api.qrserver.com/v1/create-qr-code/?size=640x640&margin=16&data=' + encodeURIComponent(text);
  }

  async function renderQrCanvas(text) {
    if (!window.QRCode || typeof window.QRCode.toCanvas !== 'function') {
      throw new Error('QRCode library unavailable');
    }

    await window.QRCode.toCanvas(els.qrCanvas, text, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    lastQrMode = 'canvas';
    showCanvas();
  }

  function renderQrFallback(text) {
    const url = getFallbackQrUrl(text);
    lastQrImageUrl = url;
    els.qrImage.src = url;
    lastQrMode = 'image';
    showImage();
  }

  async function generate() {
    updateMetaOnly();

    const fieldCount = countFilledFields();
    const displayName = buildDisplayName();
    const vcard = buildVCard();

    if (fieldCount === 0) {
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      showEmptyState();
      setStatus('<strong>Not enough data.</strong><br>Add at least a name, phone, email, or company to generate a useful contact QR code.');
      return;
    }

    setStatus('<strong>Generating...</strong><br>Rendering your branded contact QR code.');

    try {
      await renderQrCanvas(vcard);
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';

      setStatus(
        `<strong>Generated.</strong><br>` +
        `Your branded vCard QR code is ready for <b>${displayName}</b>. ` +
        `You can download the PNG, download the VCF, or copy the share link.`
      );
    } catch (_) {
      renderQrFallback(vcard);
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';

      setStatus(
        `<strong>Generated with fallback.</strong><br>` +
        `Your contact QR code is ready for <b>${displayName}</b>. ` +
        `The page used the fallback QR renderer because the local QR library was unavailable.`
      );
    }
  }

  function reset() {
    [
      els.firstName, els.lastName, els.org, els.title, els.phone, els.email,
      els.website, els.street, els.city, els.state, els.postal, els.country,
      els.note, els.avatarUrl
    ].forEach(el => {
      if (el) el.value = '';
    });

    if (els.brandColor) els.brandColor.value = '#2563eb';

    lastVCard = '';
    lastShareLink = '';
    lastQrMode = '';
    lastQrImageUrl = '';
    els.qrImage.removeAttribute('src');

    if (els.outputCode) els.outputCode.textContent = 'No vCard generated yet.';
    if (els.shareLinkOutput) els.shareLinkOutput.value = '';
    if (els.displayName) els.displayName.textContent = 'Contact: —';
    if (els.fieldCount) els.fieldCount.textContent = '0';
    if (els.charCount) els.charCount.textContent = '0';
    if (els.readyLabel) els.readyLabel.textContent = 'No';
    if (els.shareReady) els.shareReady.textContent = 'No';

    showEmptyState();
    updateProfilePreview();

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
      els.brandColor.value = '#dc2626';
    } else if (kind === 'business') {
      els.firstName.value = 'Jane';
      els.lastName.value = 'Smith';
      els.org.value = 'Smith Consulting Group';
      els.title.value = 'Business Development Manager';
      els.phone.value = '+1 602 555 0108';
      els.email.value = 'jane@smithconsulting.com';
      els.website.value = 'https://smithconsulting.com';
      els.street.value = '100 Business Ave';
      els.city.value = 'Scottsdale';
      els.state.value = 'AZ';
      els.postal.value = '85251';
      els.country.value = 'USA';
      els.note.value = 'Schedule a consultation or connect for partnership opportunities.';
      els.brandColor.value = '#0f766e';
    } else {
      els.firstName.value = 'John';
      els.lastName.value = 'Doe';
      els.phone.value = '+1 555 123 4567';
      els.email.value = 'john@example.com';
      els.brandColor.value = '#2563eb';
    }
  }

  async function loadSample(kind = 'business') {
    reset();
    fillSample(kind);
    updateMetaOnly();
    await generate();
  }

  async function copyText(text, successHtml, failHtml) {
    if (!text) {
      setStatus(failHtml);
      return;
    }

    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(text);
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        temp.remove();
      }
      setStatus(successHtml);
    } catch (_) {
      setStatus(failHtml);
    }
  }

  function downloadPng() {
    if (!lastVCard) {
      setStatus('<strong>Nothing to download.</strong><br>Generate a QR code first.');
      return;
    }

    const safeName = buildDisplayName()
      .replace(/[^\w\-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'vcard-qr';

    if (lastQrMode === 'canvas' && !els.qrCanvas.hidden) {
      const link = document.createElement('a');
      link.href = els.qrCanvas.toDataURL('image/png');
      link.download = `${safeName}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus('<strong>Downloaded.</strong><br>Your vCard QR code PNG was downloaded.');
      return;
    }

    if (lastQrMode === 'image' && lastQrImageUrl) {
      const link = document.createElement('a');
      link.href = lastQrImageUrl;
      link.download = `${safeName}.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus('<strong>Opened download source.</strong><br>Your fallback QR image was opened for saving.');
      return;
    }

    setStatus('<strong>Nothing to download.</strong><br>Generate a QR code first.');
  }

  function downloadVcf() {
    if (!lastVCard) {
      setStatus('<strong>Nothing to download.</strong><br>Generate a vCard first.');
      return;
    }

    const safeName = buildDisplayName()
      .replace(/[^\w\-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'contact';

    const blob = new Blob([lastVCard + '\n'], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}.vcf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 600);

    setStatus('<strong>Downloaded.</strong><br>Your VCF contact file was downloaded.');
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function loadFromShareLink() {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get('vcard');
      if (!raw) return;

      const decoded = decodeURIComponent(raw);
      const text = decodeURIComponent(escape(atob(decoded)));

      if (!text.includes('BEGIN:VCARD')) return;

      lastVCard = text;
      if (els.outputCode) els.outputCode.textContent = text;
      if (els.shareLinkOutput) els.shareLinkOutput.value = window.location.href;
      if (els.shareReady) els.shareReady.textContent = 'Yes';
      setStatus('<strong>Share link loaded.</strong><br>The vCard data was loaded from the URL.');
    } catch (_) {
      /* ignore malformed shared links */
    }
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
    await copyText(
      lastVCard,
      '<strong>Copied.</strong><br>Your vCard data was copied to the clipboard.',
      '<strong>Copy failed.</strong><br>Please copy the vCard output manually.'
    );
  });

  els.copyShareBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await copyText(
      lastShareLink,
      '<strong>Copied.</strong><br>Your share link was copied to the clipboard.',
      '<strong>Nothing to copy.</strong><br>Generate a contact first to create a share link.'
    );
  });

  els.downloadBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    downloadPng();
  });

  els.downloadVcfBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    downloadVcf();
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
    els.website, els.street, els.city, els.state, els.postal, els.country,
    els.note, els.brandColor, els.avatarUrl
  ].forEach(el => {
    el?.addEventListener('input', updateMetaOnly);
  });

  reset();
  loadFromShareLink();
});
