document.addEventListener('DOMContentLoaded', () => {
  const pageTitleEl = document.getElementById('pageTitle');
  const pageUrlEl = document.getElementById('pageUrl');
  const metaDescriptionEl = document.getElementById('metaDescription');

  const sampleBtn = document.getElementById('sampleBtn');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const clearBtn = document.getElementById('clearBtn');
  const trimTitleBtn = document.getElementById('trimTitleBtn');
  const trimDescBtn = document.getElementById('trimDescBtn');
  const pasteUrlBtn = document.getElementById('pasteUrlBtn');
  const clearDescBtn = document.getElementById('clearDescBtn');

  const statusBadgeEl = document.getElementById('statusBadge');
  const resultTextEl = document.getElementById('resultText');
  const formulaTextEl = document.getElementById('formulaText');

  const modeLabelEl = document.getElementById('modeLabel');
  const titleLengthSummaryEl = document.getElementById('titleLengthSummary');
  const descLengthSummaryEl = document.getElementById('descLengthSummary');
  const urlSummaryEl = document.getElementById('urlSummary');

  const titleCountEl = document.getElementById('titleCount');
  const descCountEl = document.getElementById('descCount');
  const titleBarEl = document.getElementById('titleBar');
  const descBarEl = document.getElementById('descBar');
  const titleHintEl = document.getElementById('titleHint');
  const descHintEl = document.getElementById('descHint');

  const googleUrlEl = document.getElementById('googleUrl');
  const googleTitleEl = document.getElementById('googleTitle');
  const googleMetaLineEl = document.getElementById('googleMetaLine');
  const googleDescEl = document.getElementById('googleDesc');

  const metaTagOutputEl = document.getElementById('metaTagOutput');
  const titleGuidanceSummaryEl = document.getElementById('titleGuidanceSummary');
  const titleGuidanceTextEl = document.getElementById('titleGuidanceText');
  const descGuidanceSummaryEl = document.getElementById('descGuidanceSummary');
  const descGuidanceTextEl = document.getElementById('descGuidanceText');
  const previewSummaryEl = document.getElementById('previewSummary');
  const previewDetailsEl = document.getElementById('previewDetails');
  const yearEl = document.getElementById('year');

  if (!pageTitleEl || !pageUrlEl || !metaDescriptionEl) return;

  const DEFAULTS = {
    sampleTitle: 'Meta Description Preview Tool | Free SEO Snippet Preview | InstantQR',
    sampleUrl: 'https://instantqr.io/tools/meta-description-preview-tool.html',
    sampleDesc: 'Preview your title tag and meta description in a Google-style search result snippet. Test length, improve click-through rate, and optimize SEO before publishing.',
    emptyPreviewTitle: 'Your page title will appear here',
    emptyPreviewUrl: 'https://example.com/page',
    emptyPreviewDesc: 'Your meta description will appear here once you start typing.'
  };

  let lastMode = 'Ready';

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  function setStatus(text, kind = '') {
    if (!statusBadgeEl) return;
    statusBadgeEl.className = 'badge' + (kind ? ' ' + kind : '');
    statusBadgeEl.textContent = text;
  }

  function setText(el, value) {
    if (el) el.textContent = value;
  }

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

  function truncate(text, maxLength) {
    const cleaned = safeTrim(text);
    if (!cleaned) return '';
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.slice(0, Math.max(0, maxLength - 1)).trimEnd() + '…';
  }

  function normalizeUrl(url) {
    const raw = safeTrim(url);
    if (!raw) return DEFAULTS.emptyPreviewUrl;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/') || raw.startsWith('#') || raw.startsWith('?')) return raw;
    return 'https://' + raw;
  }

  function buildMetaTag(desc) {
    const clean = safeTrim(desc) || 'Your page description goes here.';
    return '<meta name="description" content="' + escapeHtml(clean) + '" />';
  }

  function getTitleStatus(length) {
    if (length === 0) return { label: 'Ready', hint: 'Recommended: about 50–60 characters.', width: 0, fill: 'linear-gradient(90deg,#19c37d,#60a5fa)', kind: '' };
    if (length < 30) return { label: 'Short', hint: 'This title may be too short for many pages.', width: Math.min((length / 60) * 100, 100), fill: 'linear-gradient(90deg,#f59e0b,#fbbf24)', kind: 'bad' };
    if (length <= 60) return { label: 'Good', hint: 'Title length looks strong for many search results.', width: Math.min((length / 60) * 100, 100), fill: 'linear-gradient(90deg,#19c37d,#60a5fa)', kind: 'ok' };
    if (length <= 70) return { label: 'Long', hint: 'This title may begin truncating in some results.', width: 100, fill: 'linear-gradient(90deg,#f59e0b,#fbbf24)', kind: 'bad' };
    return { label: 'Too Long', hint: 'This title has a higher chance of truncation or rewriting.', width: 100, fill: 'linear-gradient(90deg,#ef4444,#f87171)', kind: 'bad' };
  }

  function getDescStatus(length) {
    if (length === 0) return { label: 'Ready', hint: 'Recommended: about 150–160 characters.', width: 0, fill: 'linear-gradient(90deg,#19c37d,#60a5fa)', kind: '' };
    if (length < 70) return { label: 'Short', hint: 'This description may be too short for many pages.', width: Math.min((length / 160) * 100, 100), fill: 'linear-gradient(90deg,#f59e0b,#fbbf24)', kind: 'bad' };
    if (length <= 160) return { label: 'Good', hint: 'Description length looks strong for many search results.', width: Math.min((length / 160) * 100, 100), fill: 'linear-gradient(90deg,#19c37d,#60a5fa)', kind: 'ok' };
    if (length <= 180) return { label: 'Long', hint: 'This description may begin truncating in some results.', width: 100, fill: 'linear-gradient(90deg,#f59e0b,#fbbf24)', kind: 'bad' };
    return { label: 'Too Long', hint: 'This description has a higher chance of truncation or rewriting.', width: 100, fill: 'linear-gradient(90deg,#ef4444,#f87171)', kind: 'bad' };
  }

  function updateCounts() {
    const title = safeTrim(pageTitleEl.value);
    const desc = safeTrim(metaDescriptionEl.value);
    const titleLength = title.length;
    const descLength = desc.length;

    const titleStatus = getTitleStatus(titleLength);
    const descStatus = getDescStatus(descLength);

    const hasInput = Boolean(title || safeTrim(pageUrlEl.value) || desc);

    setText(titleCountEl, titleLength + ' characters');
    setText(descCountEl, descLength + ' characters');
    setText(titleLengthSummaryEl, titleLength + ' characters');
    setText(descLengthSummaryEl, descLength + ' characters');
    setText(modeLabelEl, hasInput ? lastMode : 'Ready');
    setText(urlSummaryEl, normalizeUrl(pageUrlEl.value));

    if (titleBarEl) {
      titleBarEl.style.width = titleStatus.width + '%';
      titleBarEl.style.background = titleStatus.fill;
    }

    if (descBarEl) {
      descBarEl.style.width = descStatus.width + '%';
      descBarEl.style.background = descStatus.fill;
    }

    setText(titleHintEl, titleStatus.hint);
    setText(descHintEl, descStatus.hint);
  }

  function updatePreview() {
    const rawTitle = safeTrim(pageTitleEl.value);
    const rawUrl = safeTrim(pageUrlEl.value);
    const rawDesc = safeTrim(metaDescriptionEl.value);

    const finalTitle = rawTitle || DEFAULTS.emptyPreviewTitle;
    const finalUrl = normalizeUrl(rawUrl);
    const finalDesc = rawDesc || DEFAULTS.emptyPreviewDesc;

    setText(googleUrlEl, finalUrl);
    setText(googleTitleEl, truncate(finalTitle, 65) || DEFAULTS.emptyPreviewTitle);
    setText(googleMetaLineEl, 'Preview of how your result may appear');
    setText(googleDescEl, truncate(finalDesc, 170) || DEFAULTS.emptyPreviewDesc);
  }

  function updateOutput() {
    setText(metaTagOutputEl, buildMetaTag(metaDescriptionEl.value));
  }

  function updateGuidance() {
    const title = safeTrim(pageTitleEl.value);
    const desc = safeTrim(metaDescriptionEl.value);
    const titleLen = title.length;
    const descLen = desc.length;

    const titleStatus = getTitleStatus(titleLen);
    const descStatus = getDescStatus(descLen);

    const titleGuidance = [];
    const descGuidance = [];

    if (!title) {
      titleGuidance.push('Start by entering a page title.');
    } else {
      titleGuidance.push('Primary title length: ' + titleLen + ' characters.');
      if (titleLen < 30) titleGuidance.push('Consider adding more context so the title communicates stronger page value.');
      if (titleLen >= 30 && titleLen <= 60) titleGuidance.push('This is within a strong target range for many pages.');
      if (titleLen > 60 && titleLen <= 70) titleGuidance.push('You may want to tighten the wording to reduce truncation risk.');
      if (titleLen > 70) titleGuidance.push('Shorten this title to reduce truncation and improve clarity.');
    }

    if (!desc) {
      descGuidance.push('Start by entering a meta description.');
    } else {
      descGuidance.push('Primary description length: ' + descLen + ' characters.');
      if (descLen < 70) descGuidance.push('Consider adding more detail so the snippet communicates stronger value.');
      if (descLen >= 70 && descLen <= 160) descGuidance.push('This is within a strong target range for many pages.');
      if (descLen > 160 && descLen <= 180) descGuidance.push('You may want to tighten the wording to reduce truncation risk.');
      if (descLen > 180) descGuidance.push('Shorten this description to reduce truncation and improve readability.');
    }

    const previewBits = [];
    previewBits.push('Preview title may truncate around common SERP widths.');
    previewBits.push('Preview description may truncate based on device and query.');
    previewBits.push('Preview URL: ' + normalizeUrl(pageUrlEl.value) + '.');

    setText(titleGuidanceSummaryEl, titleStatus.label + ' • ' + titleLen + ' characters');
    setText(titleGuidanceTextEl, titleGuidance.join(' '));
    setText(descGuidanceSummaryEl, descStatus.label + ' • ' + descLen + ' characters');
    setText(descGuidanceTextEl, descGuidance.join(' '));
    setText(previewSummaryEl, (title || desc) ? 'Live preview active' : 'Waiting for input');
    setText(previewDetailsEl, previewBits.join(' '));
  }

  function setResult(text) {
    if (resultTextEl) resultTextEl.textContent = text;
  }

  function updateResultText() {
    const title = safeTrim(pageTitleEl.value);
    const desc = safeTrim(metaDescriptionEl.value);
    const url = normalizeUrl(pageUrlEl.value);
    const titleStatus = getTitleStatus(title.length);
    const descStatus = getDescStatus(desc.length);

    const lines = [
      'Title status: ' + titleStatus.label,
      'Description status: ' + descStatus.label,
      'Preview URL: ' + url,
      'Meta tag: ' + buildMetaTag(desc)
    ];

    setResult(lines.join('\n'));
  }

  function updateAll() {
    updateCounts();
    updatePreview();
    updateOutput();
    updateGuidance();
    updateResultText();
  }

  function resetOutput() {
    pageTitleEl.value = '';
    pageUrlEl.value = '';
    metaDescriptionEl.value = '';
    lastMode = 'Ready';
    setStatus('Ready');
    setResult('Enter a title, URL, and description to preview your meta description output.');
    if (formulaTextEl) formulaTextEl.textContent = 'Checks: title length + description length + preview truncation + URL formatting + meta tag output';
    updateAll();
  }

  function loadSample() {
    pageTitleEl.value = DEFAULTS.sampleTitle;
    pageUrlEl.value = DEFAULTS.sampleUrl;
    metaDescriptionEl.value = DEFAULTS.sampleDesc;

    lastMode = 'Sample Loaded';
    setStatus('Loaded', 'ok');
    setResult('Sample loaded. Edit the fields or copy the generated meta tag.');
    if (formulaTextEl) formulaTextEl.textContent = 'Mode: Example loaded';
    updateAll();
  }

  function trimTitle() {
    pageTitleEl.value = safeTrim(pageTitleEl.value).replace(/\s+/g, ' ');
    lastMode = 'Title Trimmed';
    setStatus('Trimmed', 'ok');
    setResult('Extra spacing removed from title.');
    if (formulaTextEl) formulaTextEl.textContent = 'Mode: Title whitespace normalized';
    updateAll();
  }

  function trimDescription() {
    metaDescriptionEl.value = safeTrim(metaDescriptionEl.value).replace(/\s+/g, ' ');
    lastMode = 'Description Trimmed';
    setStatus('Trimmed', 'ok');
    setResult('Extra spacing removed from description.');
    if (formulaTextEl) formulaTextEl.textContent = 'Mode: Description whitespace normalized';
    updateAll();
  }

  function clearDescription() {
    metaDescriptionEl.value = '';
    lastMode = 'Description Cleared';
    setStatus('Cleared', 'ok');
    setResult('Description cleared.');
    if (formulaTextEl) formulaTextEl.textContent = 'Mode: Description cleared';
    updateAll();
  }

  async function pasteUrl() {
    try {
      if (!navigator.clipboard || !window.isSecureContext) {
        setStatus('Paste unavailable', 'bad');
        return;
      }

      const text = await navigator.clipboard.readText();
      if (safeTrim(text)) {
        pageUrlEl.value = safeTrim(text);
        lastMode = 'Pasted';
        setStatus('Pasted', 'ok');
        setResult('URL pasted into the URL field.');
        if (formulaTextEl) formulaTextEl.textContent = 'Mode: URL pasted from clipboard';
        updateAll();
      }
    } catch (_) {
      setStatus('Paste failed', 'bad');
    }
  }

  async function copyMetaTag() {
    const text = buildMetaTag(metaDescriptionEl.value);

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

      setStatus('Copied', 'ok');
      setResult(text);
      setTimeout(() => {
        setStatus(lastMode === 'Ready' ? 'Ready' : lastMode, lastMode === 'Ready' ? '' : 'ok');
      }, 1200);
    } catch (_) {
      setStatus('Copy failed', 'bad');
    }
  }

  function downloadMetaTag() {
    const text = buildMetaTag(metaDescriptionEl.value) + '\n';
    const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = blobUrl;
    a.download = 'meta-description-tag.html';
    document.body.appendChild(a);
    a.click();
    a.remove();

    setStatus('Downloaded', 'ok');
    lastMode = 'Downloaded';

    window.setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 500);
  }

  async function copyPlainText(text) {
    const clean = safeTrim(text);
    if (!clean) return;

    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(clean);
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(clean);
      } else {
        const temp = document.createElement('textarea');
        temp.value = clean;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        temp.remove();
      }
      setStatus('Copied', 'ok');
    } catch (_) {
      setStatus('Copy failed', 'bad');
    }
  }

  sampleBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    loadSample();
  });

  copyBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await copyMetaTag();
  });

  downloadBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    downloadMetaTag();
  });

  clearBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    resetOutput();
    pageTitleEl.focus();
  });

  trimTitleBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    trimTitle();
  });

  trimDescBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    trimDescription();
  });

  pasteUrlBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await pasteUrl();
  });

  clearDescBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    clearDescription();
  });

  pageTitleEl.addEventListener('input', () => {
    lastMode = 'Editing';
    setStatus('Editing', 'ok');
    updateAll();
  });

  pageUrlEl.addEventListener('input', () => {
    lastMode = 'Editing';
    setStatus('Editing', 'ok');
    updateAll();
  });

  metaDescriptionEl.addEventListener('input', () => {
    lastMode = 'Editing';
    setStatus('Editing', 'ok');
    updateAll();
  });

  document.querySelectorAll('[data-copy-target]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-copy-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        await copyPlainText(targetEl.textContent || '');
      }
    });
  });

  resetOutput();
});
