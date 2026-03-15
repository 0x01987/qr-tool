document.addEventListener('DOMContentLoaded', () => {
  const lengthEl = document.getElementById('length');
  const quantityEl = document.getElementById('quantity');
  const separatorEl = document.getElementById('separator');
  const customCharsEl = document.getElementById('customChars');

  const useUpperEl = document.getElementById('useUpper');
  const useLowerEl = document.getElementById('useLower');
  const useNumbersEl = document.getElementById('useNumbers');
  const useSymbolsEl = document.getElementById('useSymbols');
  const excludeSimilarEl = document.getElementById('excludeSimilar');

  const generateBtn = document.getElementById('generateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const clearBtn = document.getElementById('clearBtn');

  const outputTextEl = document.getElementById('outputText');
  const resultTextEl = document.getElementById('resultText');
  const formulaTextEl = document.getElementById('formulaText');
  const statusBadge = document.getElementById('statusBadge');

  const modeLabelEl = document.getElementById('modeLabel');
  const lengthLabelEl = document.getElementById('lengthLabel');
  const quantityLabelEl = document.getElementById('quantityLabel');
  const charsetLabelEl = document.getElementById('charsetLabel');

  let lastMode = 'Ready';

  const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LOWER = 'abcdefghijklmnopqrstuvwxyz';
  const NUMBERS = '0123456789';
  const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?/|~';
  const SIMILAR = new Set(['0', 'O', 'o', '1', 'l', 'I']);

  function setStatus(text, kind = '') {
    if (!statusBadge) return;
    statusBadge.className = 'badge' + (kind ? ' ' + kind : '');
    statusBadge.textContent = text;
  }

  function setResult(text) {
    if (resultTextEl) resultTextEl.textContent = text;
  }

  function getSafeLength() {
    const raw = parseInt(lengthEl.value, 10);
    if (!Number.isFinite(raw) || raw < 1) return 16;
    return Math.min(raw, 512);
  }

  function getSafeQuantity() {
    const raw = parseInt(quantityEl.value, 10);
    if (!Number.isFinite(raw) || raw < 1) return 1;
    return Math.min(raw, 500);
  }

  function getSeparatorValue() {
    const value = separatorEl.value;
    if (value === 'comma') return ', ';
    if (value === 'space') return ' ';
    return '\n';
  }

  function buildCharset() {
    const custom = (customCharsEl.value || '').trim();
    let chars = '';

    if (custom) {
      chars = custom;
    } else {
      if (useUpperEl.checked) chars += UPPER;
      if (useLowerEl.checked) chars += LOWER;
      if (useNumbersEl.checked) chars += NUMBERS;
      if (useSymbolsEl.checked) chars += SYMBOLS;
    }

    let unique = Array.from(new Set(chars.split('')));

    if (excludeSimilarEl.checked) {
      unique = unique.filter((ch) => !SIMILAR.has(ch));
    }

    return unique.join('');
  }

  function describeCharset(chars) {
    if (!chars) return 'None selected';
    if ((customCharsEl.value || '').trim()) return 'Custom set';
    const parts = [];
    if (useUpperEl.checked) parts.push('A-Z');
    if (useLowerEl.checked) parts.push('a-z');
    if (useNumbersEl.checked) parts.push('0-9');
    if (useSymbolsEl.checked) parts.push('Symbols');
    if (excludeSimilarEl.checked) parts.push('No similar');
    return parts.join(' ') || 'None selected';
  }

  function updateMeta(mode = lastMode) {
    lastMode = mode;
    const charset = buildCharset();

    if (modeLabelEl) modeLabelEl.textContent = mode;
    if (lengthLabelEl) lengthLabelEl.textContent = String(getSafeLength());
    if (quantityLabelEl) quantityLabelEl.textContent = String(getSafeQuantity());
    if (charsetLabelEl) charsetLabelEl.textContent = describeCharset(charset);
  }

  function getRandomInt(maxExclusive) {
    if (!window.crypto || !window.crypto.getRandomValues) {
      return Math.floor(Math.random() * maxExclusive);
    }

    const array = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;

    let value;
    do {
      window.crypto.getRandomValues(array);
      value = array[0];
    } while (value >= limit);

    return value % maxExclusive;
  }

  function generateString(length, chars) {
    let out = '';
    for (let i = 0; i < length; i++) {
      out += chars[getRandomInt(chars.length)];
    }
    return out;
  }

  function generateStrings() {
    const length = getSafeLength();
    const quantity = getSafeQuantity();
    const separator = getSeparatorValue();
    const charset = buildCharset();

    if (!charset) {
      outputTextEl.value = '';
      setResult('Select at least one character set or provide custom characters.');
      setStatus('No charset', 'bad');
      if (formulaTextEl) formulaTextEl.textContent = 'Mode: Random string generation';
      updateMeta('No charset');
      return;
    }

    const lines = [];
    for (let i = 0; i < quantity; i++) {
      lines.push(generateString(length, charset));
    }

    outputTextEl.value = lines.join(separator);
    setResult(quantity === 1 ? lines[0] : `Generated ${quantity} random strings.`);
    setStatus('Generated', 'ok');
    if (formulaTextEl) formulaTextEl.textContent = `Mode: ${quantity} string${quantity === 1 ? '' : 's'} × ${length} chars`;
    updateMeta('Generated');
  }

  function clearAll() {
    outputTextEl.value = '';
    setResult('Choose your options and generate one or more random strings.');
    setStatus('Ready');
    if (formulaTextEl) formulaTextEl.textContent = 'Mode: Random string generation';
    updateMeta('Ready');
  }

  function downloadOutput() {
    const text = outputTextEl.value || '';
    if (!text) {
      setStatus('No output', 'bad');
      return;
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'random-strings.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus('Downloaded', 'ok');
  }

  generateBtn?.addEventListener('click', generateStrings);

  copyBtn?.addEventListener('click', async () => {
    const text = outputTextEl.value || '';
    if (!text) {
      setStatus('Nothing to copy', 'bad');
      return;
    }

    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setStatus('Copied', 'ok');
      setTimeout(() => {
        setStatus(lastMode === 'Ready' ? 'Ready' : 'Generated', lastMode === 'Ready' ? '' : 'ok');
      }, 1200);
    } catch (_) {
      setStatus('Copy failed', 'bad');
    }
  });

  downloadBtn?.addEventListener('click', downloadOutput);
  clearBtn?.addEventListener('click', clearAll);

  [
    lengthEl,
    quantityEl,
    separatorEl,
    customCharsEl,
    useUpperEl,
    useLowerEl,
    useNumbersEl,
    useSymbolsEl,
    excludeSimilarEl
  ].forEach((el) => {
    el?.addEventListener('input', () => updateMeta(lastMode));
    el?.addEventListener('change', () => updateMeta(lastMode));
  });

  document.querySelectorAll('.quick button[data-length]').forEach((btn) => {
    btn.addEventListener('click', () => {
      lengthEl.value = btn.dataset.length || '16';
      quantityEl.value = btn.dataset.quantity || '1';
      updateMeta('Preset');
      setStatus('Preset loaded', 'ok');
      setResult('Preset loaded. Click Generate Strings.');
    });
  });

  clearAll();
});
