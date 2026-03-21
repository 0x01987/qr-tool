document.addEventListener('DOMContentLoaded', () => {
  const pageTitleEl = document.getElementById('pageTitle');
  const pageUrlEl = document.getElementById('pageUrl');
  const pageDescriptionEl = document.getElementById('pageDescription');

  const sampleBtn = document.getElementById('sampleBtn');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const clearBtn = document.getElementById('clearBtn');
  const trimBtn = document.getElementById('trimBtn');
  const pasteBtn = document.getElementById('pasteBtn');
  const brandBtn = document.getElementById('brandBtn');
  const clearDescBtn = document.getElementById('clearDescBtn');

  const statusBadgeEl = document.getElementById('statusBadge');
  const resultTextEl = document.getElementById('resultText');
  const formulaTextEl = document.getElementById('formulaText');

  const modeLabelEl = document.getElementById('modeLabel');
  const titleLengthSummaryEl = document.getElementById('titleLengthSummary');
  const titleStatusSummaryEl = document.getElementById('titleStatusSummary');
  const urlSummaryEl = document.getElementById('urlSummary');

  const titleCountEl = document.getElementById('titleCount');
  const titleBarEl = document.getElementById('titleBar');
  const titleHintEl = document.getElementById('titleHint');

  const googleUrlEl = document.getElementById('googleUrl');
  const googleTitleEl = document.getElementById('googleTitle');
  const googleDescEl = document.getElementById('googleDesc');

  const titleTagOutputEl = document.getElementById('titleTagOutput');
  const titleGuidanceSummaryEl = document.getElementById('titleGuidanceSummary');
  const titleGuidanceTextEl = document.getElementById('titleGuidanceText');
  const previewSummaryEl = document.getElementById('previewSummary');
  const previewDetailsEl = document.getElementById('previewDetails');
  const outputDetailsEl = document.getElementById('outputDetails');
  const usageNotesEl = document.getElementById('usageNotes');
  const yearEl = document.getElementById('year');

  if (!pageTitleEl || !pageUrlEl || !pageDescriptionEl) return;

  const DEFAULTS = {
    sampleTitle: 'Meta Title Preview Tool | Free SEO Title Tag Preview | InstantQR',
    sampleUrl: 'https://instantqr.io/tools/meta-title-preview.html',
    sampleDesc: 'Preview your title tag in a Google-style result, check title length, and improve clarity before publishing.',
    emptyPreviewTitle: 'Your page title will appear here',
    emptyPreviewUrl: 'https://example.com/page',
    emptyPreviewDesc: 'Optional snippet description will appear here for preview purposes.'
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

  function buildTitleTag(title) {
    const clean = safeTrim(title) || 'Your Page Title';
    return '<title>' + escapeHtml(clean) + '</title>';
  }

  function getTitleStatus(length) {
    if (length === 0) {
      return {
        label: 'Ready',
        hint: 'Recommended: about 50–60 characters.',
        width: 0,
        fill: 'linear-gradient(90deg,#19c37d,#60a5fa)',
        kind: ''
      };
    }

    if (length < 30) {
      return {
        label: 'Short',
        hint: 'This title may be too short for many pages.',
        width: Math.min((length / 60) * 100, 100),
        fill: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
        kind: 'bad'
      };
    }

    if (length <= 60) {
      return {
        label: 'Good',
        hint: 'Title length looks strong for many search results.',
        width: Math.min((length / 60) * 100, 100),
        fill: 'linear-gradient(90deg,#19c37d,#60a5fa)',
        kind: 'ok'
      };
    }

    if (length <= 70) {
      return {
        label: 'Long',
        hint: 'This title may begin truncating in some results.',
        width: 100,
        fill: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
        kind: 'bad'
      };
    }

    return {
      label: 'Too Long',
      hint: 'This title has a higher chance of truncation or rewriting.',
      width: 100,
      fill: 'linear-gradient(90deg,#ef4444,#f87171)',
      kind: 'bad'
    };
  }

  function updateCounts() {
    const title = safeTrim(pageTitleEl.value);
    const titleLength = title.length;
    const status = getTitleStatus(titleLength);
    const hasInput = Boolean(
      title ||
      safeTrim(pageUrlEl.value) ||
      safeTrim(pageDescriptionEl.value)
    );

    if (titleCountEl) titleCountEl.textContent = String(titleLength) + ' characters';
    if (titleLengthSummaryEl) titleLengthSummaryEl.textContent = String(titleLength) + ' characters';
    if (titleStatusSummaryEl) titleStatusSummaryEl.textContent = status.label;
    if (modeLabelEl) modeLabelEl.textContent = hasInput ? lastMode : 'Ready';
    if (urlSummaryEl) urlSummaryEl.textContent = normalizeUrl(pageUrlEl.value);

    if (titleBarEl) {
      titleBarEl.style.width = status.width + '%';
      titleBarEl.style.background = status.fill;
    }

    if (titleHintEl) titleHintEl.textContent = status.hint;
  }

  function updatePreview() {
    const rawTitle = safeTrim(pageTitleEl.value);
    const rawUrl = safeTrim(pageUrlEl.value);
    const rawDesc = safeTrim(pageDescriptionEl.value);

    const finalTitle = rawTitle || DEFAULTS.emptyPreviewTitle;
    const finalUrl = normalizeUrl(rawUrl);
    const finalDesc = rawDesc || DEFAULTS.emptyPreviewDesc;

    setText(googleUrlEl, finalUrl);
    setText(googleTitleEl, truncate(finalTitle, 65) || DEFAULTS.emptyPreviewTitle);
    setText(googleDescEl, truncate(finalDesc, 170) || DEFAULTS.emptyPreviewDesc);
  }

  function updateOutput() {
    const output = buildTitleTag(pageTitleEl.value);
    setText(titleTagOutputEl, output);
    setText(outputDetailsEl, output);
    setText(
      usageNotesEl,
      'Paste this inside the <head> section of your page. Keep one clear, unique title per important page.'
    );
  }

  function updateGuidance() {
    const title = safeTrim(pageTitleEl.value);
    const desc = safeTrim(pageDescriptionEl.value);
    const len = title.length;
    const status = getTitleStatus(len);

    const guidance = [];
    if (!title) {
      guidance.push('Start by entering a page title.');
    } else {
      guidance.push('Primary title length: ' + len + ' characters.');
      if (len < 30) guidance.push('Consider adding more context so the title communicates stronger page value.');
      if (len >= 30 && len <= 60) guidance.push('This is within a strong target range for many pages.');
      if (len > 60 && len <= 70) guidance.push('You may want to tighten the wording to reduce truncation risk.');
      if (len > 70) guidance.push('Shorten this title to reduce truncation and improve clarity.');
      if (!/\|/.test(title) && !/-/.test(title)) guidance.push('You can optionally add a brand separator near the end if useful.');
    }

    const previewBits = [];
    previewBits.push('Preview title may be truncated around common SERP widths.');
    previewBits.push('Preview URL: ' + normalizeUrl(pageUrlEl.value) + '.');
    previewBits.push(desc ? 'Description is included for a fuller preview.' : 'No custom description entered; placeholder text is shown.');

    setText(titleGuidanceSummaryEl, status.label + ' • ' + len + ' characters');
    setText(titleGuidanceTextEl, guidance.join(' '));
    setText(previewSummaryEl, title ? 'Live preview active' : 'Waiting for title input');
    setText(previewDetailsEl, previewBits.join(' '));
  }

  function setResult(text) {
    if (resultTextEl) resultTextEl.textContent = text;
  }

  function updateResultText() {
    const title = safeTrim(pageTitleEl.value);
    const url = normalizeUrl(pageUrlEl.value);
    const len = title.length;
    const status = getTitleStatus(len);

    const lines = [
      'Title status: ' + status.label,
      'Title length: ' + len + ' characters',
      'Preview URL: ' + url,
      'Title tag: ' + buildTitleTag(title)
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
    pageDescriptionEl.value = '';
    lastMode = 'Ready';
    setStatus('Ready');
    setResult('Enter a title and URL to preview your meta title output.');
    if (formulaTextEl) formulaTextEl.textContent = 'Checks: title length + preview truncation + URL formatting + title tag output';
    updateAll();
  }

  function loadSample() {
    pageTitleEl.value = DEFAULTS.sampleTitle;
    pageUrlEl.value = DEFAULTS.sampleUrl;
    pageDescriptionEl.value = DEFAULTS.sampleDesc;

    lastMode = 'Sample Loaded';
    setStatus('Loaded', 'ok');
    setResult('Sample loaded. Edit the fields or copy the generated title tag.');
    if (formulaTextEl) formulaTextEl.textContent = 'Mode: Example loaded';
    updateAll();
  }

  function trimTitle() {
    pageTitleEl.value = safeTrim(pageTitleEl.value).replace(/\s+/g, ' ');
    lastMode = 'Trimmed';
    setStatus('Trimmed', 'ok');
    setResult('Extra spacing removed from title.');
    if (formulaTextEl) formulaTextEl.textContent = 'Mode: Title whitespace normalized';
    updateAll();
  }

  function addBrand() {
    const title = safeTrim(pageTitleEl.value);

    if (!title) {
      pageTitleEl.value = 'Your Page Title | InstantQR';
    } else if (!/instantqr/i.test(title)) {
      pageTitleEl.value = title + ' | InstantQR';
    }

    lastMode = 'Brand Added';
    setStatus('Updated', 'ok');
    setResult('Brand added to the title.');
    if (formulaTextEl) formulaTextEl.textContent = 'Mode: Brand appended to title';
    updateAll();
  }

  function clearDescription() {
    pageDescriptionEl.value = '';
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

  async function copyTitleTag() {
    const text = buildTitleTag(pageTitleEl.value);

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

  function downloadTitleTag() {
    const text = buildTitleTag(pageTitleEl.value) + '\n';
    const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = blobUrl;
    a.download = 'meta-title-tag.html';
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
    await copyTitleTag();
  });

  downloadBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    downloadTitleTag();
  });

  clearBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    resetOutput();
    pageTitleEl.focus();
  });

  trimBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    trimTitle();
  });

  pasteBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await pasteUrl();
  });

  brandBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    addBrand();
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

  pageDescriptionEl.addEventListener('input', () => {
    lastMode = 'Editing';
    setStatus('Editing', 'ok');
    updateAll();
  });

  pageTitleEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      loadSample();
    }
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
