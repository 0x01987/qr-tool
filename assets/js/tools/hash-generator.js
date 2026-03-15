document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('inputText');
  const outputEl = document.getElementById('outputHash');
  const hashBtn = document.getElementById('hashBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');

  const algorithmEl = document.getElementById('algorithm');
  const uppercaseEl = document.getElementById('uppercase');
  const liveHashEl = document.getElementById('liveHash');

  const statusBadge = document.getElementById('statusBadge');
  const resultTextEl = document.getElementById('resultText');
  const formulaTextEl = document.getElementById('formulaText');

  const algoLabelEl = document.getElementById('algoLabel');
  const inputLenEl = document.getElementById('inputLen');
  const hashLenEl = document.getElementById('hashLen');
  const modeLabelEl = document.getElementById('modeLabel');

  let liveTimer = null;
  let lastMode = 'Ready';

  function setStatus(text, kind = '') {
    if (!statusBadge) return;
    statusBadge.className = 'badge' + (kind ? ' ' + kind : '');
    statusBadge.textContent = text;
  }

  function updateMeta(mode = lastMode) {
    lastMode = mode;
    if (algoLabelEl) algoLabelEl.textContent = algorithmEl.value;
    if (inputLenEl) inputLenEl.textContent = String((inputEl.value || '').length);
    if (hashLenEl) hashLenEl.textContent = String((outputEl.value || '').length);
    if (modeLabelEl) modeLabelEl.textContent = mode;
  }

  function setResult(text) {
    if (resultTextEl) resultTextEl.textContent = text;
  }

  function resetOutput() {
    outputEl.value = '';
    lastMode = 'Ready';
    setStatus('Ready');
    setResult('Enter text and generate a hash.');
    if (formulaTextEl) formulaTextEl.textContent = `Algorithm: ${algorithmEl.value}`;
    updateMeta('Ready');
  }

  function bufferToHex(buffer, uppercase) {
    const bytes = new Uint8Array(buffer);
    let hex = '';
    for (const b of bytes) {
      hex += b.toString(16).padStart(2, '0');
    }
    return uppercase ? hex.toUpperCase() : hex.toLowerCase();
  }

  async function generateHash() {
    const input = inputEl.value || '';
    const algorithm = algorithmEl.value;
    const uppercase = !!uppercaseEl.checked;

    if (!input) {
      outputEl.value = '';
      setResult('Enter text to hash.');
      setStatus('Enter text', 'bad');
      if (formulaTextEl) formulaTextEl.textContent = `Algorithm: ${algorithm}`;
      updateMeta('No input');
      return;
    }

    if (!window.crypto || !window.crypto.subtle) {
      outputEl.value = '';
      setResult('This browser does not support the required Web Crypto API.');
      setStatus('Unsupported', 'bad');
      if (formulaTextEl) formulaTextEl.textContent = `Algorithm: ${algorithm}`;
      updateMeta('Unsupported');
      return;
    }

    try {
      const encoded = new TextEncoder().encode(input);
      const digest = await window.crypto.subtle.digest(algorithm, encoded);
      const hash = bufferToHex(digest, uppercase);

      outputEl.value = hash;
      setResult(hash);
      setStatus('Hash generated', 'ok');
      if (formulaTextEl) formulaTextEl.textContent = `Algorithm: ${algorithm}`;
      updateMeta('Generated');
    } catch (_) {
      outputEl.value = '';
      setResult('Failed to generate hash.');
      setStatus('Hash failed', 'bad');
      if (formulaTextEl) formulaTextEl.textContent = `Algorithm: ${algorithm}`;
      updateMeta('Error');
    }
  }

  function scheduleLiveHash() {
    updateMeta(lastMode);
    if (!liveHashEl.checked) return;
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      generateHash();
    }, 250);
  }

  hashBtn?.addEventListener('click', generateHash);

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
        setStatus(lastMode === 'Ready' ? 'Ready' : 'Hash generated', lastMode === 'Ready' ? '' : 'ok');
      }, 1200);
    } catch (_) {
      setStatus('Copy failed', 'bad');
    }
  });

  clearBtn?.addEventListener('click', () => {
    inputEl.value = '';
    outputEl.value = '';
    resetOutput();
    inputEl.focus();
  });

  inputEl?.addEventListener('input', scheduleLiveHash);
  algorithmEl?.addEventListener('change', () => {
    if (formulaTextEl) formulaTextEl.textContent = `Algorithm: ${algorithmEl.value}`;
    updateMeta(lastMode);
    if (liveHashEl.checked && inputEl.value) generateHash();
  });
  uppercaseEl?.addEventListener('change', () => {
    updateMeta(lastMode);
    if (liveHashEl.checked && inputEl.value) generateHash();
  });
  liveHashEl?.addEventListener('change', () => {
    updateMeta(lastMode);
    if (liveHashEl.checked && inputEl.value) generateHash();
  });

  inputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      generateHash();
    }
  });

  document.querySelectorAll('.quick button[data-fill]').forEach((btn) => {
    btn.addEventListener('click', () => {
      inputEl.value = btn.dataset.fill || '';
      outputEl.value = '';
      setResult('Example loaded. Generate a hash or enable live hash.');
      setStatus('Example loaded', 'ok');
      updateMeta('Example');
      inputEl.focus();
      if (liveHashEl.checked) generateHash();
    });
  });

  resetOutput();
});
