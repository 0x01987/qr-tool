document.addEventListener('DOMContentLoaded', () => {
  const pageUrlEl = document.getElementById('pageUrl');
  const pageTitleEl = document.getElementById('pageTitle');
  const pageDescEl = document.getElementById('pageDesc');

  const previewTitleEl = document.getElementById('previewTitle');
  const previewUrlEl = document.getElementById('previewUrl');
  const previewDescEl = document.getElementById('previewDesc');
  const previewShellEl = document.getElementById('previewShell');

  const titleCharsEl = document.getElementById('titleChars');
  const descCharsEl = document.getElementById('descChars');
  const urlCharsEl = document.getElementById('urlChars');

  const titleLengthSummaryEl = document.getElementById('titleLengthSummary');
  const descLengthSummaryEl = document.getElementById('descLengthSummary');
  const urlLengthSummaryEl = document.getElementById('urlLengthSummary');
  const modeLabelEl = document.getElementById('modeLabel');

  const statusEl = document.getElementById('status');
  const statusBadgeEl = document.getElementById('statusBadge');
  const metaCodeEl = document.getElementById('metaCode');

  const desktopBtn = document.getElementById('desktopBtn');
  const mobileBtn = document.getElementById('mobileBtn');
  const clearBtn = document.getElementById('clearBtn');
  const loadExampleBtn = document.getElementById('loadExampleBtn');
  const copyMetaBtn = document.getElementById('copyMetaBtn');
  const yearEl = document.getElementById('year');

  if (!pageUrlEl || !pageTitleEl || !pageDescEl) return;

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  const DEFAULTS = {
    previewUrl: 'https://example.com/page',
    previewTitle: 'Your SEO title will appear here',
    previewDesc: 'Your meta description preview will appear here. Write a concise, useful description that explains the value of the page.'
  };

  let mode = 'desktop';

  function safeTrim(value) {
    return String(value || '').trim();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function sanitizeText(value) {
    return String(value || '').replace(/[<>]/g, '').trim();
  }

  function normalizeUrl(value) {
    const raw = safeTrim(value);
    if (!raw) return DEFAULTS.previewUrl;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/') || raw.startsWith('#') || raw.startsWith('?')) return raw;
    return 'https://' + raw;
  }

  function setStatusBadge(text, kind = '') {
    if (!statusBadgeEl) return;
    statusBadgeEl.className = 'badge' + (kind ? ' ' + kind : '');
    statusBadgeEl.textContent = text;
  }

  function setMode(nextMode) {
    mode = nextMode;

    if (mode === 'mobile') {
      previewShellEl.classList.remove('desktop');
      previewShellEl.classList.add('mobile');
      mobileBtn.classList.add('primary');
      mobileBtn.classList.remove('ghost');
      desktopBtn.classList.remove('primary');
      desktopBtn.classList.add('ghost');
      if (modeLabelEl) modeLabelEl.textContent = 'Mobile';
    } else {
      previewShellEl.classList.remove('mobile');
      previewShellEl.classList.add('desktop');
      desktopBtn.classList.add('primary');
      desktopBtn.classList.remove('ghost');
      mobileBtn.classList.remove('primary');
      mobileBtn.classList.add('ghost');
      if (modeLabelEl) modeLabelEl.textContent = 'Desktop';
    }
  }

  function buildMetaCode(title, desc) {
    const safeTitle = escapeHtml(title || '');
    const safeDesc = escapeHtml(desc || '');
    return '<title>' + safeTitle + '</title>\n' +
      '<meta name="description" content="' + safeDesc + '" />';
  }

  function updatePreview() {
    const rawUrl = sanitizeText(pageUrlEl.value);
    const rawTitle = sanitizeText(pageTitleEl.value);
    const rawDesc = sanitizeText(pageDescEl.value);

    const url = rawUrl ? normalizeUrl(rawUrl) : DEFAULTS.previewUrl;
    const title = rawTitle || DEFAULTS.previewTitle;
    const desc = rawDesc || DEFAULTS.previewDesc;

    previewUrlEl.textContent = url;
    previewTitleEl.textContent = title;
    previewDescEl.textContent = desc;

    const titleLen = rawTitle.length;
    const descLen = rawDesc.length;
    const urlLen = rawUrl.length;

    titleCharsEl.textContent = String(titleLen);
    descCharsEl.textContent = String(descLen);
    urlCharsEl.textContent = String(urlLen);

    if (titleLengthSummaryEl) titleLengthSummaryEl.textContent = String(titleLen);
    if (descLengthSummaryEl) descLengthSummaryEl.textContent = String(descLen);
    if (urlLengthSummaryEl) urlLengthSummaryEl.textContent = String(urlLen);

    metaCodeEl.textContent = buildMetaCode(rawTitle, rawDesc);

    const notes = [];

    if (titleLen === 0) {
      notes.push('Add a page title.');
    } else if (titleLen < 30) {
      notes.push('Title may be a bit short.');
    } else if (titleLen > 65) {
      notes.push('Title may be too long.');
    }

    if (descLen === 0) {
      notes.push('Add a meta description.');
    } else if (descLen < 70) {
      notes.push('Description may be too short.');
    } else if (descLen > 170) {
      notes.push('Description may be too long.');
    }

    if (!notes.length) {
      statusEl.textContent = 'Looks good. Your title and description are within a common recommended range.';
      statusEl.className = 'status ok';
      setStatusBadge('Good', 'ok');
    } else {
      statusEl.textContent = notes.join(' ');
      statusEl.className = 'status warn';
      setStatusBadge('Needs Review', 'warn');
    }
  }

  async function copyMetaCode() {
    const text = metaCodeEl.textContent;
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
      statusEl.textContent = 'Meta tags copied to clipboard.';
      statusEl.className = 'status ok';
      setStatusBadge('Copied', 'ok');
    } catch (_) {
      statusEl.textContent = 'Unable to copy automatically. Please copy the meta tags manually.';
      statusEl.className = 'status warn';
      setStatusBadge('Copy Failed', 'warn');
    }
  }

  function clearAll() {
    pageUrlEl.value = '';
    pageTitleEl.value = '';
    pageDescEl.value = '';
    updatePreview();
  }

  function loadExample() {
    pageUrlEl.value = 'https://instantqr.io/tools/seo-tools.html';
    pageTitleEl.value = 'SEO Tools | Free Meta, SERP, Sitemap, Robots.txt & Canonical Tools | InstantQR';
    pageDescEl.value = 'Free SEO tools by InstantQR to preview titles, descriptions, SERP snippets, canonical tags, robots.txt files, sitemaps, and more.';
    updatePreview();
    setStatusBadge('Loaded', 'ok');
  }

  pageUrlEl.addEventListener('input', updatePreview);
  pageTitleEl.addEventListener('input', updatePreview);
  pageDescEl.addEventListener('input', updatePreview);

  desktopBtn.addEventListener('click', () => setMode('desktop'));
  mobileBtn.addEventListener('click', () => setMode('mobile'));
  clearBtn.addEventListener('click', clearAll);
  loadExampleBtn.addEventListener('click', loadExample);
  copyMetaBtn.addEventListener('click', copyMetaCode);

  setMode('desktop');
  updatePreview();
});
