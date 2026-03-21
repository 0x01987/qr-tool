(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const pageTitle = document.getElementById('pageTitle');
    const pageUrl = document.getElementById('pageUrl');
    const pageDescription = document.getElementById('pageDescription');
    const titleTagOutput = document.getElementById('titleTagOutput');

    const googleUrl = document.getElementById('googleUrl');
    const googleTitle = document.getElementById('googleTitle');
    const googleDesc = document.getElementById('googleDesc');

    const titleCount = document.getElementById('titleCount');
    const titleBar = document.getElementById('titleBar');
    const titleHint = document.getElementById('titleHint');

    const sampleBtn = document.getElementById('sampleBtn');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const clearBtn = document.getElementById('clearBtn');
    const year = document.getElementById('year');

    if (
      !pageTitle || !pageUrl || !pageDescription || !titleTagOutput ||
      !googleUrl || !googleTitle || !googleDesc ||
      !titleCount || !titleBar || !titleHint ||
      !sampleBtn || !copyBtn || !downloadBtn || !clearBtn || !year
    ) {
      return;
    }

    year.textContent = String(new Date().getFullYear());

    const DEFAULTS = {
      title: 'Your page title will appear here',
      url: 'https://example.com/page',
      description: 'Optional snippet description will appear here for preview purposes.'
    };

    function escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function safeTrim(value) {
      return String(value || '').trim();
    }

    function truncateText(text, max) {
      const clean = safeTrim(text);
      if (!clean) return '';
      if (clean.length <= max) return clean;
      return clean.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
    }

    function normalizeUrl(input) {
      const raw = safeTrim(input);
      if (!raw) return DEFAULTS.url;

      if (/^https?:\/\//i.test(raw)) return raw;

      if (
        raw.startsWith('/') ||
        raw.startsWith('./') ||
        raw.startsWith('../') ||
        raw.startsWith('#') ||
        raw.startsWith('?')
      ) {
        return raw;
      }

      return 'https://' + raw;
    }

    function getTitleStatus(len) {
      if (len === 0) {
        return {
          width: 0,
          text: 'Recommended: about 50–60 characters',
          cls: '',
          bar: 'linear-gradient(90deg, #22c55e, #38bdf8)'
        };
      }

      if (len < 30) {
        return {
          width: Math.min((len / 60) * 100, 100),
          text: 'Title may be too short',
          cls: 'status-warn',
          bar: 'linear-gradient(90deg, #f59e0b, #fbbf24)'
        };
      }

      if (len <= 60) {
        return {
          width: Math.min((len / 60) * 100, 100),
          text: 'Title length looks good',
          cls: 'status-good',
          bar: 'linear-gradient(90deg, #22c55e, #38bdf8)'
        };
      }

      if (len <= 70) {
        return {
          width: 100,
          text: 'Title may get truncated',
          cls: 'status-warn',
          bar: 'linear-gradient(90deg, #f59e0b, #fbbf24)'
        };
      }

      return {
        width: 100,
        text: 'Title is too long',
        cls: 'status-danger',
        bar: 'linear-gradient(90deg, #ef4444, #f87171)'
      };
    }

    function buildTitleTag(title) {
      const cleanTitle = safeTrim(title) || 'Your Page Title';
      return '<title>' + escapeHtml(cleanTitle) + '</title>';
    }

    function updateMeter() {
      const len = safeTrim(pageTitle.value).length;
      const status = getTitleStatus(len);

      titleCount.textContent = len + ' characters';
      titleBar.style.width = status.width + '%';
      titleBar.style.background = status.bar;
      titleHint.textContent = status.text;
      titleHint.className = 'meter-hint ' + (status.cls || '');
    }

    function updatePreview() {
      const rawTitle = safeTrim(pageTitle.value);
      const rawUrl = safeTrim(pageUrl.value);
      const rawDesc = safeTrim(pageDescription.value);

      const previewTitle = rawTitle || DEFAULTS.title;
      const previewUrl = normalizeUrl(rawUrl);
      const previewDesc = rawDesc || DEFAULTS.description;

      googleUrl.textContent = previewUrl;
      googleTitle.textContent = truncateText(previewTitle, 65) || DEFAULTS.title;
      googleDesc.textContent = truncateText(previewDesc, 170) || DEFAULTS.description;
    }

    function updateTitleTag() {
      titleTagOutput.value = buildTitleTag(pageTitle.value);
    }

    function updateAll() {
      updateMeter();
      updatePreview();
      updateTitleTag();
    }

    function loadSample() {
      pageTitle.value = 'Meta Title Preview Tool | Free SEO Title Tag Preview | InstantQR.io';
      pageUrl.value = 'https://instantqr.io/seo-tools/meta-title-preview.html';
      pageDescription.value = 'Preview your title tag in a Google-style snippet, check title length, and improve your SEO before publishing.';
      updateAll();
    }

    function clearAll() {
      pageTitle.value = '';
      pageUrl.value = '';
      pageDescription.value = '';
      updateAll();
      pageTitle.focus();
    }

    async function copyTitleTag() {
      const text = safeTrim(titleTagOutput.value);

      if (!text) {
        alert('Nothing to copy yet.');
        return;
      }

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          titleTagOutput.removeAttribute('readonly');
          titleTagOutput.select();
          titleTagOutput.setSelectionRange(0, titleTagOutput.value.length);
          document.execCommand('copy');
          titleTagOutput.setAttribute('readonly', 'readonly');
        }

        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied';
        copyBtn.disabled = true;

        window.setTimeout(function () {
          copyBtn.textContent = originalText;
          copyBtn.disabled = false;
        }, 1400);
      } catch (error) {
        alert('Copy failed on this device/browser.');
      }
    }

    function downloadTitleTag() {
      const text = safeTrim(titleTagOutput.value);

      if (!text) {
        alert('Nothing to download yet.');
        return;
      }

      const blob = new Blob([text + '\n'], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = blobUrl;
      a.download = 'meta-title-tag.html';
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.setTimeout(function () {
        URL.revokeObjectURL(blobUrl);
      }, 500);
    }

    [pageTitle, pageUrl, pageDescription].forEach(function (el) {
      el.addEventListener('input', updateAll);
      el.addEventListener('change', updateAll);
    });

    sampleBtn.addEventListener('click', loadSample);
    clearBtn.addEventListener('click', clearAll);
    copyBtn.addEventListener('click', copyTitleTag);
    downloadBtn.addEventListener('click', downloadTitleTag);

    updateAll();
  });
})();
