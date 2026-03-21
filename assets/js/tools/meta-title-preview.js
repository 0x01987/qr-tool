(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const els = {
      pageTitle: document.getElementById('pageTitle'),
      pageUrl: document.getElementById('pageUrl'),
      pageDescription: document.getElementById('pageDescription'),

      sampleBtn: document.getElementById('sampleBtn'),
      copyBtn: document.getElementById('copyBtn'),
      downloadBtn: document.getElementById('downloadBtn'),
      clearBtn: document.getElementById('clearBtn'),
      trimBtn: document.getElementById('trimBtn'),
      pasteBtn: document.getElementById('pasteBtn'),
      brandBtn: document.getElementById('brandBtn'),
      clearDescBtn: document.getElementById('clearDescBtn'),

      titleCount: document.getElementById('titleCount'),
      titleBar: document.getElementById('titleBar'),
      titleHint: document.getElementById('titleHint'),

      googleUrl: document.getElementById('googleUrl'),
      googleTitle: document.getElementById('googleTitle'),
      googleDesc: document.getElementById('googleDesc'),

      titleTagOutput: document.getElementById('titleTagOutput'),
      resultText: document.getElementById('resultText'),

      titleLengthSummary: document.getElementById('titleLengthSummary'),
      titleStatusSummary: document.getElementById('titleStatusSummary'),
      urlSummary: document.getElementById('urlSummary'),
      modeLabel: document.getElementById('modeLabel'),
      statusBadge: document.getElementById('statusBadge'),

      titleGuidanceSummary: document.getElementById('titleGuidanceSummary'),
      titleGuidanceText: document.getElementById('titleGuidanceText'),
      previewSummary: document.getElementById('previewSummary'),
      previewDetails: document.getElementById('previewDetails'),
      outputDetails: document.getElementById('outputDetails'),
      usageNotes: document.getElementById('usageNotes'),
      year: document.getElementById('year')
    };

    if (!els.pageTitle || !els.pageUrl || !els.pageDescription) return;

    const DEFAULTS = {
      title: 'Your page title will appear here',
      url: 'https://example.com/page',
      desc: 'Optional snippet description will appear here for preview purposes.'
    };

    if (els.year) {
      els.year.textContent = String(new Date().getFullYear());
    }

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

    function truncate(text, max) {
      const t = safeTrim(text);
      if (!t) return '';
      if (t.length <= max) return t;
      return t.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
    }

    function normalizeUrl(url) {
      const raw = safeTrim(url);
      if (!raw) return DEFAULTS.url;

      if (/^https?:\/\//i.test(raw)) return raw;
      if (raw.startsWith('/') || raw.startsWith('#') || raw.startsWith('?')) return raw;

      return 'https://' + raw;
    }

    function getStatus(len) {
      if (len === 0) {
        return {
          label: 'Ready',
          hint: 'Recommended: about 50–60 characters.',
          width: 0,
          fill: 'linear-gradient(90deg,#19c37d,#60a5fa)',
          statusClass: 'ok'
        };
      }
      if (len < 30) {
        return {
          label: 'Short',
          hint: 'This title may be too short for many pages.',
          width: Math.min((len / 60) * 100, 100),
          fill: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
          statusClass: 'warn'
        };
      }
      if (len <= 60) {
        return {
          label: 'Good',
          hint: 'Title length looks strong for many search results.',
          width: Math.min((len / 60) * 100, 100),
          fill: 'linear-gradient(90deg,#19c37d,#60a5fa)',
          statusClass: 'ok'
        };
      }
      if (len <= 70) {
        return {
          label: 'Long',
          hint: 'This title may begin truncating in some results.',
          width: 100,
          fill: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
          statusClass: 'warn'
        };
      }
      return {
        label: 'Too Long',
        hint: 'This title has a higher chance of truncation or rewriting.',
        width: 100,
        fill: 'linear-gradient(90deg,#ef4444,#f87171)',
        statusClass: 'bad'
      };
    }

    function setBadgeState(stateText) {
      if (!els.statusBadge) return;
      els.statusBadge.textContent = stateText;
    }

    function buildTitleTag(title) {
      const clean = safeTrim(title) || 'Your Page Title';
      return '<title>' + escapeHtml(clean) + '</title>';
    }

    function updateMeter(title) {
      const len = safeTrim(title).length;
      const status = getStatus(len);

      if (els.titleCount) els.titleCount.textContent = len + ' characters';
      if (els.titleBar) {
        els.titleBar.style.width = status.width + '%';
        els.titleBar.style.background = status.fill;
      }
      if (els.titleHint) els.titleHint.textContent = status.hint;
      if (els.titleLengthSummary) els.titleLengthSummary.textContent = len + ' characters';
      if (els.titleStatusSummary) els.titleStatusSummary.textContent = status.label;
      if (els.modeLabel) els.modeLabel.textContent = len ? 'Editing' : 'Ready';

      return status;
    }

    function updatePreview() {
      const rawTitle = safeTrim(els.pageTitle.value);
      const rawUrl = safeTrim(els.pageUrl.value);
      const rawDesc = safeTrim(els.pageDescription.value);

      const finalUrl = normalizeUrl(rawUrl);
      const finalTitle = rawTitle || DEFAULTS.title;
      const finalDesc = rawDesc || DEFAULTS.desc;

      if (els.googleUrl) els.googleUrl.textContent = finalUrl;
      if (els.googleTitle) els.googleTitle.textContent = truncate(finalTitle, 65) || DEFAULTS.title;
      if (els.googleDesc) els.googleDesc.textContent = truncate(finalDesc, 170) || DEFAULTS.desc;
      if (els.urlSummary) els.urlSummary.textContent = finalUrl;
    }

    function updateOutput() {
      const output = buildTitleTag(els.pageTitle.value);
      if (els.titleTagOutput) els.titleTagOutput.textContent = output;
      if (els.outputDetails) els.outputDetails.textContent = output;
      if (els.usageNotes) {
        els.usageNotes.textContent = 'Paste this inside the <head> section of your page. Keep one clear, unique title per important page.';
      }
    }

    function updateGuidance() {
      const title = safeTrim(els.pageTitle.value);
      const desc = safeTrim(els.pageDescription.value);
      const len = title.length;
      const status = getStatus(len);

      if (els.titleGuidanceSummary) {
        els.titleGuidanceSummary.textContent = status.label + ' • ' + len + ' characters';
      }

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

      if (els.titleGuidanceText) {
        els.titleGuidanceText.textContent = guidance.join(' ');
      }

      const previewParts = [];
      previewParts.push('Preview title may be truncated around common SERP widths.');
      previewParts.push('Preview URL: ' + normalizeUrl(els.pageUrl.value) + '.');
      previewParts.push(desc ? 'Description is included for a fuller preview.' : 'No custom description entered; placeholder text is shown.');

      if (els.previewSummary) {
        els.previewSummary.textContent = title ? 'Live preview active' : 'Waiting for title input';
      }
      if (els.previewDetails) {
        els.previewDetails.textContent = previewParts.join(' ');
      }
    }

    function updateResultText() {
      const title = safeTrim(els.pageTitle.value);
      const url = normalizeUrl(els.pageUrl.value);
      const len = title.length;
      const status = getStatus(len);

      const lines = [];
      lines.push('Title status: ' + status.label);
      lines.push('Title length: ' + len + ' characters');
      lines.push('Preview URL: ' + url);
      lines.push('Title tag: ' + buildTitleTag(title));

      if (els.resultText) els.resultText.textContent = lines.join('\n');
      setBadgeState(status.label);
    }

    function updateAll() {
      const title = safeTrim(els.pageTitle.value);
      updateMeter(title);
      updatePreview();
      updateOutput();
      updateGuidance();
      updateResultText();
    }

    function loadSample() {
      els.pageTitle.value = 'Meta Title Preview Tool | Free SEO Title Tag Preview | InstantQR';
      els.pageUrl.value = 'https://instantqr.io/tools/meta-title-preview.html';
      els.pageDescription.value = 'Preview your title tag in a Google-style result, check title length, and improve clarity before publishing.';
      if (els.modeLabel) els.modeLabel.textContent = 'Sample Loaded';
      updateAll();
    }

    function clearAll() {
      els.pageTitle.value = '';
      els.pageUrl.value = '';
      els.pageDescription.value = '';
      if (els.modeLabel) els.modeLabel.textContent = 'Cleared';
      setBadgeState('Ready');
      updateAll();
      els.pageTitle.focus();
    }

    function trimTitle() {
      els.pageTitle.value = safeTrim(els.pageTitle.value).replace(/\s+/g, ' ');
      if (els.modeLabel) els.modeLabel.textContent = 'Trimmed';
      updateAll();
    }

    function addBrand() {
      const title = safeTrim(els.pageTitle.value);
      if (!title) {
        els.pageTitle.value = 'Your Page Title | InstantQR';
      } else if (!/instantqr/i.test(title)) {
        els.pageTitle.value = title + ' | InstantQR';
      }
      if (els.modeLabel) els.modeLabel.textContent = 'Brand Added';
      updateAll();
    }

    function clearDescription() {
      els.pageDescription.value = '';
      if (els.modeLabel) els.modeLabel.textContent = 'Description Cleared';
      updateAll();
    }

    async function pasteUrl() {
      try {
        if (!navigator.clipboard || !window.isSecureContext) return;
        const text = await navigator.clipboard.readText();
        if (safeTrim(text)) {
          els.pageUrl.value = safeTrim(text);
          if (els.modeLabel) els.modeLabel.textContent = 'Pasted';
          updateAll();
        }
      } catch (err) {}
    }

    async function copyTitleTag() {
      const text = buildTitleTag(els.pageTitle.value);
      try {
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
        const original = els.copyBtn.textContent;
        els.copyBtn.textContent = 'Copied';
        els.copyBtn.disabled = true;
        setTimeout(function () {
          els.copyBtn.textContent = original;
          els.copyBtn.disabled = false;
        }, 1400);
      } catch (err) {
        alert('Copy failed on this device/browser.');
      }
    }

    function downloadTitleTag() {
      const text = buildTitleTag(els.pageTitle.value) + '\n';
      const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'meta-title-tag.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(blobUrl);
      }, 500);
    }

    function copyFromTarget(targetId) {
      const el = document.getElementById(targetId);
      if (!el) return;
      const text = (el.textContent || '').trim();
      if (!text) return;

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).catch(function () {});
        return;
      }

      const temp = document.createElement('textarea');
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      temp.remove();
    }

    [els.pageTitle, els.pageUrl, els.pageDescription].forEach(function (el) {
      el.addEventListener('input', updateAll);
      el.addEventListener('change', updateAll);
    });

    if (els.sampleBtn) els.sampleBtn.addEventListener('click', loadSample);
    if (els.copyBtn) els.copyBtn.addEventListener('click', copyTitleTag);
    if (els.downloadBtn) els.downloadBtn.addEventListener('click', downloadTitleTag);
    if (els.clearBtn) els.clearBtn.addEventListener('click', clearAll);
    if (els.trimBtn) els.trimBtn.addEventListener('click', trimTitle);
    if (els.pasteBtn) els.pasteBtn.addEventListener('click', pasteUrl);
    if (els.brandBtn) els.brandBtn.addEventListener('click', addBrand);
    if (els.clearDescBtn) els.clearDescBtn.addEventListener('click', clearDescription);

    document.querySelectorAll('[data-copy-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        copyFromTarget(btn.getAttribute('data-copy-target'));
      });
    });

    updateAll();
  });
})();
