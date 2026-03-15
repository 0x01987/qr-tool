document.addEventListener('DOMContentLoaded', () => {
  const patternInputEl = document.getElementById('patternInput');
  const replaceInputEl = document.getElementById('replaceInput');
  const textInputEl = document.getElementById('textInput');
  const sampleSelectEl = document.getElementById('sampleSelect');

  const flagGEl = document.getElementById('flagG');
  const flagIEl = document.getElementById('flagI');
  const flagMEl = document.getElementById('flagM');
  const flagSEl = document.getElementById('flagS');
  const flagUEl = document.getElementById('flagU');
  const flagYEl = document.getElementById('flagY');
  const liveTestEl = document.getElementById('liveTest');

  const testBtn = document.getElementById('testBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');

  const statusBadge = document.getElementById('statusBadge');
  const resultTextEl = document.getElementById('resultText');
  const formulaTextEl = document.getElementById('formulaText');

  const modeLabelEl = document.getElementById('modeLabel');
  const flagsLabelEl = document.getElementById('flagsLabel');
  const matchesLabelEl = document.getElementById('matchesLabel');
  const groupsLabelEl = document.getElementById('groupsLabel');

  const previewBoxEl = document.getElementById('previewBox');
  const matchesBoxEl = document.getElementById('matchesBox');
  const replaceBoxEl = document.getElementById('replaceBox');

  let liveTimer = null;
  let lastMode = 'Ready';
  let lastMatchesText = '';

  const samples = {
    email: {
      pattern: '\\b\\w+@\\w+\\.\\w+\\b',
      text: 'Contact hello@example.com or admin@test.org'
    },
    url: {
      pattern: 'https?:\\/\\/[^\\s]+',
      text: 'Visit https://instantqr.io and http://example.com today.'
    },
    numbers: {
      pattern: '\\d+',
      text: 'Invoice 123 has 45 items and 678 reward points.'
    },
    dates: {
      pattern: '\\b\\d{4}-\\d{2}-\\d{2}\\b',
      text: 'Important dates: 2026-03-15 and 2026-12-31.'
    },
    words: {
      pattern: '\\b\\w{4}\\b',
      text: 'This line has many four word size bits for regex tests.'
    }
  };

  function setStatus(text, kind = '') {
    if (!statusBadge) return;
    statusBadge.className = 'badge' + (kind ? ' ' + kind : '');
    statusBadge.textContent = text;
  }

  function setResult(text) {
    if (resultTextEl) resultTextEl.textContent = text;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function getFlags() {
    return [
      flagGEl.checked ? 'g' : '',
      flagIEl.checked ? 'i' : '',
      flagMEl.checked ? 'm' : '',
      flagSEl.checked ? 's' : '',
      flagUEl.checked ? 'u' : '',
      flagYEl.checked ? 'y' : ''
    ].join('');
  }

  function updateMeta(mode = lastMode, matches = 0, groups = 0) {
    lastMode = mode;
    const flags = getFlags() || '—';
    if (modeLabelEl) modeLabelEl.textContent = mode;
    if (flagsLabelEl) flagsLabelEl.textContent = flags;
    if (matchesLabelEl) matchesLabelEl.textContent = String(matches);
    if (groupsLabelEl) groupsLabelEl.textContent = String(groups);
  }

  function resetOutputs() {
    lastMatchesText = '';
    if (previewBoxEl) previewBoxEl.innerHTML = '<div class="emptyState">Run a regex test to see highlighted matches.</div>';
    if (matchesBoxEl) matchesBoxEl.innerHTML = '<div class="emptyState">Matches will appear here after testing.</div>';
    if (replaceBoxEl) replaceBoxEl.innerHTML = '<div class="emptyState">Add replacement text to preview replaced output.</div>';
  }

  function resetAll() {
    patternInputEl.value = '';
    replaceInputEl.value = '';
    textInputEl.value = '';
    sampleSelectEl.value = '';
    flagGEl.checked = true;
    flagIEl.checked = false;
    flagMEl.checked = false;
    flagSEl.checked = false;
    flagUEl.checked = false;
    flagYEl.checked = false;
    liveTestEl.checked = false;

    setStatus('Ready');
    setResult('Enter a regex pattern and some test text.');
    if (formulaTextEl) formulaTextEl.textContent = 'Format: /pattern/flags';
    updateMeta('Ready', 0, 0);
    resetOutputs();
  }

  function renderHighlightedText(text, matches) {
    if (!matches.length) {
      previewBoxEl.innerHTML = `<div class="emptyState">${escapeHtml(text || 'No matches to highlight.')}</div>`;
      return;
    }

    let html = '';
    let cursor = 0;

    matches.forEach((match) => {
      const start = match.index;
      const end = start + match.value.length;

      html += escapeHtml(text.slice(cursor, start));
      html += `<span class="mark">${escapeHtml(match.value)}</span>`;
      cursor = end;
    });

    html += escapeHtml(text.slice(cursor));
    previewBoxEl.innerHTML = `<div class="preview">${html}</div>`;
  }

  function renderMatches(matches) {
    if (!matches.length) {
      matchesBoxEl.innerHTML = '<div class="emptyState">No matches found.</div>';
      lastMatchesText = '';
      return;
    }

    matchesBoxEl.innerHTML = matches.map((match, idx) => {
      const groupsHtml = match.groups.length
        ? match.groups.map((group, i) => `
            <div class="claimRow">
              <div class="claimKey">Group ${i + 1}</div>
              <div class="claimVal">${escapeHtml(group ?? '')}</div>
            </div>
          `).join('')
        : '<div class="claimVal">No capture groups.</div>';

      return `
        <div class="claimRow">
          <div class="claimKey">Match ${idx + 1}</div>
          <div class="claimVal">Value: ${escapeHtml(match.value)}</div>
          <div class="claimVal">Index: ${match.index}</div>
          ${groupsHtml}
        </div>
      `;
    }).join('');

    lastMatchesText = matches.map((match, idx) => {
      const groupLines = match.groups.map((group, i) => `  Group ${i + 1}: ${group ?? ''}`).join('\n');
      return `Match ${idx + 1}\nValue: ${match.value}\nIndex: ${match.index}${groupLines ? '\n' + groupLines : ''}`;
    }).join('\n\n');
  }

  function renderReplacement(text, regex) {
    const replacement = replaceInputEl.value || '';
    if (!replacement) {
      replaceBoxEl.innerHTML = '<div class="emptyState">Add replacement text to preview replaced output.</div>';
      return;
    }

    try {
      const replaced = text.replace(regex, replacement);
      replaceBoxEl.innerHTML = `
        <div class="claimRow">
          <div class="claimKey">Replaced Output</div>
          <div class="claimVal">${escapeHtml(replaced)}</div>
        </div>
      `;
    } catch (_) {
      replaceBoxEl.innerHTML = '<div class="emptyState">Replacement preview unavailable.</div>';
    }
  }

  function collectMatches(regex, text) {
    const matches = [];
    let totalGroups = 0;

    if (!regex.global && !regex.sticky) {
      const single = regex.exec(text);
      if (!single) return { matches, totalGroups };
      matches.push({
        value: single[0],
        index: single.index,
        groups: single.slice(1)
      });
      totalGroups += single.length - 1;
      return { matches, totalGroups };
    }

    let match;
    let guard = 0;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        value: match[0],
        index: match.index,
        groups: match.slice(1)
      });
      totalGroups += match.length - 1;
      guard += 1;

      if (guard > 10000) break;

      if (match[0] === '') {
        regex.lastIndex += 1;
      }
    }

    return { matches, totalGroups };
  }

  function runTest() {
    const pattern = patternInputEl.value || '';
    const text = textInputEl.value || '';
    const flags = getFlags();

    if (!pattern) {
      setStatus('Enter pattern', 'bad');
      setResult('Enter a regex pattern first.');
      if (formulaTextEl) formulaTextEl.textContent = 'Format: /pattern/flags';
      updateMeta('No pattern', 0, 0);
      resetOutputs();
      return;
    }

    try {
      const regex = new RegExp(pattern, flags);
      const regexForMatches = new RegExp(pattern, flags);
      const { matches, totalGroups } = collectMatches(regexForMatches, text);

      renderHighlightedText(text, matches);
      renderMatches(matches);
      renderReplacement(text, regex);

      setStatus('Tested', 'ok');
      setResult(matches.length
        ? `Regex test completed. Found ${matches.length} match${matches.length === 1 ? '' : 'es'}.`
        : 'Regex test completed. No matches found.'
      );
      if (formulaTextEl) formulaTextEl.textContent = `Format: /${pattern}/${flags}`;
      updateMeta('Tested', matches.length, totalGroups);
    } catch (err) {
      setStatus('Invalid regex', 'bad');
      setResult(`Regex error: ${err.message || String(err)}`);
      if (formulaTextEl) formulaTextEl.textContent = 'Format: /pattern/flags';
      updateMeta('Invalid regex', 0, 0);
      resetOutputs();
    }
  }

  function scheduleLiveTest() {
    updateMeta(lastMode, Number(matchesLabelEl.textContent || 0), Number(groupsLabelEl.textContent || 0));
    if (!liveTestEl.checked) return;
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => runTest(), 250);
  }

  testBtn?.addEventListener('click', runTest);

  copyBtn?.addEventListener('click', async () => {
    if (!lastMatchesText) {
      setStatus('Nothing to copy', 'bad');
      return;
    }

    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(lastMatchesText);
      } else {
        await navigator.clipboard.writeText(lastMatchesText);
      }
      setStatus('Copied', 'ok');
      setTimeout(() => {
        setStatus(lastMode === 'Ready' ? 'Ready' : 'Tested', lastMode === 'Ready' ? '' : 'ok');
      }, 1200);
    } catch (_) {
      setStatus('Copy failed', 'bad');
    }
  });

  clearBtn?.addEventListener('click', resetAll);

  [patternInputEl, replaceInputEl, textInputEl].forEach((el) => {
    el?.addEventListener('input', scheduleLiveTest);
  });

  [flagGEl, flagIEl, flagMEl, flagSEl, flagUEl, flagYEl, liveTestEl].forEach((el) => {
    el?.addEventListener('change', scheduleLiveTest);
  });

  sampleSelectEl?.addEventListener('change', () => {
    const key = sampleSelectEl.value;
    const sample = samples[key];
    if (!sample) return;

    patternInputEl.value = sample.pattern;
    textInputEl.value = sample.text;
    flagGEl.checked = true;
    setStatus('Sample loaded', 'ok');
    setResult('Sample loaded. Click Test Regex.');
    updateMeta('Sample', 0, 0);

    if (liveTestEl.checked) runTest();
  });

  document.querySelectorAll('.quick button[data-pattern]').forEach((btn) => {
    btn.addEventListener('click', () => {
      patternInputEl.value = btn.dataset.pattern || '';
      textInputEl.value = btn.dataset.text || '';
      flagGEl.checked = true;
      setStatus('Preset loaded', 'ok');
      setResult('Preset loaded. Click Test Regex.');
      updateMeta('Preset', 0, 0);

      if (liveTestEl.checked) runTest();
    });
  });

  resetAll();
});
