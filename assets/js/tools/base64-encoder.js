document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('inputText');
  const outputEl = document.getElementById('outputText');
  const urlSafeEl = document.getElementById('urlSafe');

  const encodeBtn = document.getElementById('encodeBtn');
  const decodeBtn = document.getElementById('decodeBtn');
  const copyBtn = document.getElementById('copyBtn');
  const swapBtn = document.getElementById('swapBtn');
  const clearBtn = document.getElementById('clearBtn');

  const statusBadge = document.getElementById('statusBadge');
  const resultTextEl = document.getElementById('resultText');
  const formulaTextEl = document.getElementById('formulaText');

  const modeLabelEl = document.getElementById('modeLabel');
  const inputLenEl = document.getElementById('inputLen');
  const outputLenEl = document.getElementById('outputLen');
  const formatLabelEl = document.getElementById('formatLabel');

  if (!inputEl || !outputEl) return;

  let lastMode = 'Ready';

  function setStatus(text, kind = '') {
    if (!statusBadge) return;
    statusBadge.className = 'badge' + (kind ? ' ' + kind : '');
    statusBadge.textContent = text;
  }

  function updateCounts() {
    if (inputLenEl) inputLenEl.textContent = String(inputEl.value.length);
    if (outputLenEl) outputLenEl.textContent = String(outputEl.value.length);
    if (modeLabelEl) modeLabelEl.textContent = lastMode;
    if (formatLabelEl) formatLabelEl.textContent = urlSafeEl && urlSafeEl.checked ? 'URL-safe' : 'Standard';
  }

  function setResult(text) {
    if (resultTextEl) resultTextEl.textContent = text;
  }

  function resetOutput() {
    outputEl.value = '';
    lastMode = 'Ready';
    setStatus('Ready');
    setResult('Enter text and choose Encode or Decode.');
    if (formulaTextEl) formulaTextEl.textContent = 'Mode: Waiting for input';
    updateCounts();
  }

  function toBase64Utf8(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  function fromBase64Utf8(base64) {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function toUrlSafe(base64) {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function fromUrlSafe(base64) {
    let normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
    const mod = normalized.length % 4;
    if (mod) normalized += '='.repeat(4 - mod);
    return normalized;
  }

  function encodeInput() {
    const input = inputEl.value;

    if (!input) {
      outputEl.value = '';
      lastMode = 'Encode';
      setStatus('Enter text', 'bad');
      setResult('Enter text to encode.');
      if (formulaTextEl) formulaTextEl.textContent = 'Mode: Encode plain text to Base64';
      updateCounts();
      return;
    }

    try {
      let encoded = toBase64Utf8(input);
      if (urlSafeEl && urlSafeEl.checked) encoded = toUrlSafe(encoded);

      outputEl.value = encoded;
      lastMode = 'Encoded';
      setStatus('Encoded', 'ok');
      setResult(encoded);
      if (formulaTextEl) {
        formulaTextEl.textContent = urlSafeEl && urlSafeEl.checked
          ? 'Mode: URL-safe Base64 encoding'
          : 'Mode: Standard Base64 encoding';
      }
      updateCounts();
    } catch (_) {
      outputEl.value = '';
      lastMode = 'Encode error';
      setStatus('Encode failed', 'bad');
      setResult('Unable to encode the provided input.');
      if (formulaTextEl) formulaTextEl.textContent = 'Mode: Encode failed';
      updateCounts();
    }
  }

  function decodeInput() {
    const input = inputEl.value.trim();

    if (!input) {
      outputEl.value = '';
      lastMode = 'Decode';
      setStatus('Enter Base64', 'bad');
      setResult('Enter Base64 text to decode.');
      if (formulaTextEl) formulaTextEl.textContent = 'Mode: Decode Base64 to plain text';
      updateCounts();
      return;
    }

    try {
      const prepared = (urlSafeEl && urlSafeEl.checked) ? fromUrlSafe(input) : input;
      const decoded = fromBase64Utf8(prepared);

      outputEl.value = decoded;
      lastMode = 'Decoded';
      setStatus('Decoded', 'ok');
      setResult(decoded);
      if (formulaTextEl) {
        formulaTextEl.textContent = urlSafeEl && urlSafeEl.checked
          ? 'Mode: URL-safe Base64 decoding'
          : 'Mode: Standard Base64 decoding';
      }
      updateCounts();
    } catch (_) {
      outputEl.value = '';
      lastMode = 'Decode error';
      setStatus('Invalid Base64', 'bad');
      setResult('The input is not valid Base64 for the selected mode.');
      if (formulaTextEl) formulaTextEl.textContent = 'Mode: Decode failed';
      updateCounts();
    }
  }

  encodeBtn?.addEventListener('click', encodeInput);
  decodeBtn?.addEventListener('click', decodeInput);

  clearBtn?.addEventListener('click', () => {
    inputEl.value = '';
    outputEl.value = '';
    resetOutput();
    inputEl.focus();
  });

  swapBtn?.addEventListener('click', () => {
    const currentInput = inputEl.value;
    inputEl.value = outputEl.value;
    outputEl.value = currentInput;
    lastMode = 'Swapped';
    setStatus('Swapped', 'ok');
    setResult(outputEl.value || 'Values swapped.');
    if (formulaTextEl) formulaTextEl.textContent = 'Mode: Input and output swapped';
    updateCounts();
  });

  copyBtn?.addEventListener('click', async () => {
    const text = outputEl.value || '';
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
        setStatus(lastMode === 'Ready' ? 'Ready' : lastMode, lastMode === 'Ready' ? '' : 'ok');
      }, 1200);
    } catch (_) {
      setStatus('Copy failed', 'bad');
    }
  });

  inputEl.addEventListener('input', updateCounts);
  outputEl.addEventListener('input', updateCounts);
  urlSafeEl?.addEventListener('change', updateCounts);

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      encodeInput();
    }
  });

  document.querySelectorAll('.quick button[data-fill]').forEach((btn) => {
    btn.addEventListener('click', () => {
      inputEl.value = btn.dataset.fill || '';
      outputEl.value = '';
      setStatus('Example loaded', 'ok');
      setResult('Example loaded. Click Encode or Decode.');
      if (formulaTextEl) formulaTextEl.textContent = 'Mode: Example loaded';
      updateCounts();
      inputEl.focus();
    });
  });

  resetOutput();
});
