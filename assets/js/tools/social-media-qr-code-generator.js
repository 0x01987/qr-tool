document.addEventListener('DOMContentLoaded', () => {
  const els = {
    singleModeBtn: document.getElementById('singleModeBtn'),
    multiModeBtn: document.getElementById('multiModeBtn'),
    singleModeFields: document.getElementById('singleModeFields'),
    multiModeFields: document.getElementById('multiModeFields'),

    displayNameInput: document.getElementById('displayNameInput'),
    bio: document.getElementById('bio'),
    brandColor: document.getElementById('brandColor'),

    platform: document.getElementById('platform'),
    username: document.getElementById('username'),
    profileUrl: document.getElementById('profileUrl'),

    instagramUrl: document.getElementById('instagramUrl'),
    tiktokUrl: document.getElementById('tiktokUrl'),
    youtubeUrl: document.getElementById('youtubeUrl'),
    xUrl: document.getElementById('xUrl'),
    linkedinUrl: document.getElementById('linkedinUrl'),
    facebookUrl: document.getElementById('facebookUrl'),
    whatsappUrl: document.getElementById('whatsappUrl'),
    telegramUrl: document.getElementById('telegramUrl'),

    generateBtn: document.getElementById('generateBtn'),
    sampleBtn: document.getElementById('sampleBtn'),
    clearBtn: document.getElementById('clearBtn'),
    copyLinkBtn: document.getElementById('copyLinkBtn'),
    copyShareBtn: document.getElementById('copyShareBtn'),
    downloadBtn: document.getElementById('downloadBtn'),

    outputCode: document.getElementById('outputCode'),
    shareLinkOutput: document.getElementById('shareLinkOutput'),
    statusBox: document.getElementById('statusBox'),
    resultMode: document.getElementById('resultMode'),

    activeCount: document.getElementById('activeCount'),
    summaryLinkCount: document.getElementById('summaryLinkCount'),
    readyLabel: document.getElementById('readyLabel'),
    shareReady: document.getElementById('shareReady'),

    qrCanvas: document.getElementById('qrCanvas'),
    qrImage: document.getElementById('qrImage'),
    qrEmpty: document.getElementById('qrEmpty'),
    year: document.getElementById('year'),

    socialCard: document.getElementById('socialCard'),
    socialAvatar: document.getElementById('socialAvatar'),
    previewName: document.getElementById('previewName'),
    previewBio: document.getElementById('previewBio'),
    previewLinks: document.getElementById('previewLinks')
  };

  if (!els.generateBtn || !els.qrCanvas) return;

  if (els.year) {
    els.year.textContent = String(new Date().getFullYear());
  }

  let currentMode = 'single';
  let lastTargetUrl = '';
  let lastShareLink = '';
  let lastQrMode = '';
  let lastQrImageUrl = '';

  const PLATFORM_INFO = {
    instagram: { label: 'Instagram', base: 'https://instagram.com/' },
    tiktok: { label: 'TikTok', base: 'https://www.tiktok.com/@' },
    youtube: { label: 'YouTube', base: 'https://youtube.com/@' },
    x: { label: 'X / Twitter', base: 'https://x.com/' },
    linkedin: { label: 'LinkedIn', base: 'https://linkedin.com/in/' },
    facebook: { label: 'Facebook', base: 'https://facebook.com/' },
    whatsapp: { label: 'WhatsApp', base: 'https://wa.me/' },
    telegram: { label: 'Telegram', base: 'https://t.me/' },
    custom: { label: 'Custom', base: '' }
  };

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

  function normalizeUrl(value) {
    const clean = safeTrim(value);
    if (!clean) return '';
    if (/^https?:\/\//i.test(clean)) return clean;
    return 'https://' + clean.replace(/^\/+/, '');
  }

  function normalizeHandle(value) {
    return safeTrim(value).replace(/^@+/, '').replace(/^\/+/, '');
  }

  function setMode(mode) {
    currentMode = mode;
    els.singleModeBtn.classList.toggle('active', mode === 'single');
    els.multiModeBtn.classList.toggle('active', mode === 'multi');
    els.singleModeFields.classList.toggle('hidden', mode !== 'single');
    els.multiModeFields.classList.toggle('hidden', mode !== 'multi');
    if (els.resultMode) {
      els.resultMode.textContent = `Mode: ${mode === 'single' ? 'Single' : 'Multi-Link'}`;
    }
    updateMetaOnly();
  }

  function buildSingleUrl() {
    const explicit = normalizeUrl(els.profileUrl.value);
    if (explicit) return explicit;

    const platform = els.platform.value || 'instagram';
    const handle = normalizeHandle(els.username.value);
    if (!handle) return '';

    const info = PLATFORM_INFO[platform] || PLATFORM_INFO.custom;
    return info.base ? info.base + handle : handle;
  }

  function getMultiLinks() {
    const rows = [
      ['Instagram', normalizeUrl(els.instagramUrl.value)],
      ['TikTok', normalizeUrl(els.tiktokUrl.value)],
      ['YouTube', normalizeUrl(els.youtubeUrl.value)],
      ['X / Twitter', normalizeUrl(els.xUrl.value)],
      ['LinkedIn', normalizeUrl(els.linkedinUrl.value)],
      ['Facebook', normalizeUrl(els.facebookUrl.value)],
      ['WhatsApp', normalizeUrl(els.whatsappUrl.value)],
      ['Telegram', normalizeUrl(els.telegramUrl.value)]
    ];

    return rows.filter(([, url]) => url);
  }

  function getSingleLinkLabel(url) {
    const platform = els.platform.value || 'instagram';
    const info = PLATFORM_INFO[platform] || PLATFORM_INFO.custom;
    return explicitLabelFromUrl(url) || info.label || 'Profile';
  }

  function explicitLabelFromUrl(url) {
    const value = String(url || '').toLowerCase();
    if (!value) return '';
    if (value.includes('instagram.com')) return 'Instagram';
    if (value.includes('tiktok.com')) return 'TikTok';
    if (value.includes('youtube.com') || value.includes('youtu.be')) return 'YouTube';
    if (value.includes('x.com') || value.includes('twitter.com')) return 'X / Twitter';
    if (value.includes('linkedin.com')) return 'LinkedIn';
    if (value.includes('facebook.com')) return 'Facebook';
    if (value.includes('wa.me') || value.includes('whatsapp')) return 'WhatsApp';
    if (value.includes('t.me') || value.includes('telegram')) return 'Telegram';
    return 'Profile';
  }

  function getActiveLinkCount() {
    if (currentMode === 'single') {
      return buildSingleUrl() ? 1 : 0;
    }
    return getMultiLinks().length;
  }

  function buildSharePayload() {
    return {
      mode: currentMode,
      displayName: safeTrim(els.displayNameInput.value),
      bio: safeTrim(els.bio.value),
      brandColor: safeTrim(els.brandColor.value) || '#2563eb',
      platform: els.platform.value || 'instagram',
      username: safeTrim(els.username.value),
      profileUrl: safeTrim(els.profileUrl.value),
      instagramUrl: safeTrim(els.instagramUrl.value),
      tiktokUrl: safeTrim(els.tiktokUrl.value),
      youtubeUrl: safeTrim(els.youtubeUrl.value),
      xUrl: safeTrim(els.xUrl.value),
      linkedinUrl: safeTrim(els.linkedinUrl.value),
      facebookUrl: safeTrim(els.facebookUrl.value),
      whatsappUrl: safeTrim(els.whatsappUrl.value),
      telegramUrl: safeTrim(els.telegramUrl.value)
    };
  }

  function encodeSharePayload(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  }

  function decodeSharePayload(str) {
    return JSON.parse(decodeURIComponent(escape(atob(str))));
  }

  function buildShareLink() {
    const payload = buildSharePayload();
    const encoded = encodeSharePayload(payload);
    return `${window.location.origin}${window.location.pathname}#s=${encodeURIComponent(encoded)}`;
  }

  function applyPayloadToFields(data) {
    setMode(data.mode === 'multi' ? 'multi' : 'single');

    els.displayNameInput.value = data.displayName || '';
    els.bio.value = data.bio || '';
    els.brandColor.value = data.brandColor || '#2563eb';

    els.platform.value = data.platform || 'instagram';
    els.username.value = data.username || '';
    els.profileUrl.value = data.profileUrl || '';

    els.instagramUrl.value = data.instagramUrl || '';
    els.tiktokUrl.value = data.tiktokUrl || '';
    els.youtubeUrl.value = data.youtubeUrl || '';
    els.xUrl.value = data.xUrl || '';
    els.linkedinUrl.value = data.linkedinUrl || '';
    els.facebookUrl.value = data.facebookUrl || '';
    els.whatsappUrl.value = data.whatsappUrl || '';
    els.telegramUrl.value = data.telegramUrl || '';
  }

  function buildHubUrl() {
    return buildShareLink();
  }

  function updatePreviewCard() {
    const name = safeTrim(els.displayNameInput.value) || 'Your Name or Brand';
    const bio = safeTrim(els.bio.value) || 'Your social hub preview will appear here.';
    const color = safeTrim(els.brandColor.value) || '#2563eb';

    if (els.socialCard) {
      els.socialCard.style.setProperty('--cardBrand', color);
    }

    if (els.previewName) els.previewName.textContent = name;
    if (els.previewBio) els.previewBio.textContent = bio;

    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0])
      .join('')
      .toUpperCase() || 'SM';

    if (els.socialAvatar) els.socialAvatar.textContent = initials;

    if (currentMode === 'single') {
      const url = buildSingleUrl();
      if (!url) {
        els.previewLinks.innerHTML = '<div class="social-line">Add a profile URL or username to preview your social QR.</div>';
      } else {
        els.previewLinks.innerHTML = `<div class="social-line">${escapeHtml(getSingleLinkLabel(url))} • ${escapeHtml(url)}</div>`;
      }
    } else {
      const links = getMultiLinks();
      if (!links.length) {
        els.previewLinks.innerHTML = '<div class="social-line">Add multiple social links to preview your hub QR.</div>';
      } else {
        els.previewLinks.innerHTML = links
          .map(([label, url]) => `<div class="social-line">${escapeHtml(label)} • ${escapeHtml(url)}</div>`)
          .join('');
      }
    }
  }

  function updateMetaOnly() {
    const activeCount = getActiveLinkCount();
    lastTargetUrl = currentMode === 'single' ? buildSingleUrl() : (activeCount ? buildHubUrl() : '');
    lastShareLink = activeCount ? buildShareLink() : '';

    if (els.activeCount) els.activeCount.textContent = String(activeCount);
    if (els.summaryLinkCount) els.summaryLinkCount.textContent = String(activeCount);
    if (els.outputCode) els.outputCode.textContent = lastTargetUrl || 'No social link generated yet.';
    if (els.shareLinkOutput) els.shareLinkOutput.value = lastShareLink;
    if (els.shareReady) els.shareReady.textContent = lastShareLink ? 'Yes' : 'No';

    updatePreviewCard();
  }

  function setStatus(html) {
    if (els.statusBox) els.statusBox.innerHTML = html;
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

    if (!lastTargetUrl) {
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      showEmptyState();
      setStatus('<strong>Not enough data.</strong><br>Add a profile URL, username, or multiple social links to generate a QR code.');
      return;
    }

    setStatus('<strong>Generating...</strong><br>Rendering your social media QR code.');

    try {
      await renderQrCanvas(lastTargetUrl);
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';
      setStatus('<strong>Generated.</strong><br>Your social media QR code is ready. You can download the PNG or copy the generated link.');
    } catch (_) {
      renderQrFallback(lastTargetUrl);
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';
      setStatus('<strong>Generated with fallback.</strong><br>Your social media QR code is ready using the fallback QR renderer.');
    }
  }

  function reset() {
    setMode('single');

    els.displayNameInput.value = '';
    els.bio.value = '';
    els.brandColor.value = '#2563eb';

    els.platform.value = 'instagram';
    els.username.value = '';
    els.profileUrl.value = '';

    els.instagramUrl.value = '';
    els.tiktokUrl.value = '';
    els.youtubeUrl.value = '';
    els.xUrl.value = '';
    els.linkedinUrl.value = '';
    els.facebookUrl.value = '';
    els.whatsappUrl.value = '';
    els.telegramUrl.value = '';

    lastTargetUrl = '';
    lastShareLink = '';
    lastQrMode = '';
    lastQrImageUrl = '';
    els.qrImage.removeAttribute('src');

    if (els.outputCode) els.outputCode.textContent = 'No social link generated yet.';
    if (els.shareLinkOutput) els.shareLinkOutput.value = '';
    if (els.readyLabel) els.readyLabel.textContent = 'No';
    if (els.shareReady) els.shareReady.textContent = 'No';

    showEmptyState();
    updateMetaOnly();

    setStatus('<strong>Ready.</strong><br>Add a social profile or multiple social links, then click <b>Generate QR Code</b>.');
  }

  function loadPreset(kind = 'creator') {
    reset();

    if (kind === 'single') {
      setMode('single');
      els.displayNameInput.value = 'InstantQR';
      els.bio.value = 'Follow our Instagram';
      els.platform.value = 'instagram';
      els.username.value = 'instantqr.io';
      els.brandColor.value = '#dc2626';
    } else if (kind === 'business') {
      setMode('multi');
      els.displayNameInput.value = 'Smith Consulting Group';
      els.bio.value = 'Connect with us across our social channels';
      els.linkedinUrl.value = 'https://linkedin.com/in/smithconsulting';
      els.youtubeUrl.value = 'https://youtube.com/@smithconsulting';
      els.facebookUrl.value = 'https://facebook.com/smithconsulting';
      els.brandColor.value = '#0f766e';
    } else {
      setMode('multi');
      els.displayNameInput.value = 'Danny Bun';
      els.bio.value = 'Founder • Creator • Build with me';
      els.instagramUrl.value = 'https://instagram.com/instantqr.io';
      els.youtubeUrl.value = 'https://youtube.com/@instantqr';
      els.xUrl.value = 'https://x.com/instantqr';
      els.tiktokUrl.value = 'https://www.tiktok.com/@instantqr';
      els.brandColor.value = '#2563eb';
    }

    updateMetaOnly();
    generate();
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
    if (!lastTargetUrl) {
      setStatus('<strong>Nothing to download.</strong><br>Generate a QR code first.');
      return;
    }

    const safeName = (safeTrim(els.displayNameInput.value) || 'social-qr')
      .replace(/[^\w\-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (lastQrMode === 'canvas' && !els.qrCanvas.hidden) {
      const link = document.createElement('a');
      link.href = els.qrCanvas.toDataURL('image/png');
      link.download = `${safeName}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus('<strong>Downloaded.</strong><br>Your social media QR code PNG was downloaded.');
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

  function loadFromShareLink() {
    try {
      const hash = window.location.hash || '';
      const match = hash.match(/#s=([^&]+)/);
      if (!match) return;

      const payload = decodeSharePayload(decodeURIComponent(match[1]));
      applyPayloadToFields(payload);
      updateMetaOnly();
      generate();

      setStatus('<strong>Share link loaded.</strong><br>The social media data was restored from the shared link.');
    } catch (err) {
      console.error('Failed to load shared social data:', err);
    }
  }

  els.singleModeBtn?.addEventListener('click', () => setMode('single'));
  els.multiModeBtn?.addEventListener('click', () => setMode('multi'));

  els.generateBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await generate();
  });

  els.sampleBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    loadPreset('creator');
  });

  els.clearBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    reset();
  });

  els.copyLinkBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await copyText(
      lastTargetUrl,
      '<strong>Copied.</strong><br>Your generated social link was copied to the clipboard.',
      '<strong>Nothing to copy.</strong><br>Generate a social link first.'
    );
  });

  els.copyShareBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await copyText(
      lastShareLink,
      '<strong>Copied.</strong><br>Your share link was copied to the clipboard.',
      '<strong>Nothing to copy.</strong><br>Generate a share link first.'
    );
  });

  els.downloadBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    downloadPng();
  });

  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      loadPreset(btn.getAttribute('data-preset') || 'creator');
    });
  });

  [
    els.displayNameInput, els.bio, els.brandColor,
    els.platform, els.username, els.profileUrl,
    els.instagramUrl, els.tiktokUrl, els.youtubeUrl, els.xUrl,
    els.linkedinUrl, els.facebookUrl, els.whatsappUrl, els.telegramUrl
  ].forEach(el => {
    el?.addEventListener('input', updateMetaOnly);
    el?.addEventListener('change', updateMetaOnly);
  });

  reset();
  loadFromShareLink();
});
