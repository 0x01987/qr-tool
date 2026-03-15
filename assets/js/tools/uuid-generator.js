document.addEventListener('DOMContentLoaded', () => {
  const countEl = document.getElementById('count');
  const separatorEl = document.getElementById('separator');
  const uppercaseEl = document.getElementById('uppercase');
  const withBracesEl = document.getElementById('withBraces');

  const generateBtn = document.getElementById('generateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const clearBtn = document.getElementById('clearBtn');

  const outputTextEl = document.getElementById('outputText');
  const resultTextEl = document.getElementById('resultText');
  const formulaTextEl = document.getElementById('formulaText');
  const statusBadge = document.getElementById('statusBadge');

  const modeLabelEl = document.getElementById('modeLabel');
  const countLabelEl = document.getElementById('countLabel');
  const lineCountEl = document.getElementById('lineCount');
  const formatLabelEl = document.getElementById('formatLabel');

  let lastMode = 'Ready';

  function setStatus(text, kind = '') {
    if (!statusBadge) return;
    statusBadge.className = 'badge' + (kind ? ' ' + kind : '');
    statusBadge.textContent = text;
  }

  function setResult(text) {
    if (resultTextEl) resultTextEl.textContent = text;
  }

  function getSeparatorValue() {
    const value = separatorEl.value;
    if (value === 'comma') return ', ';
    if (value === 'space') return ' ';
    return '\n';
  }

  function getSafeCount() {
    const raw = parseInt(countEl.value, 10);
    if (!Number.isFinite(raw) || raw < 1) return 1;
    return Math.min(raw, 500);
  }

  function formatUuid(uuid) {
    let value = uuid;
    if (uppercaseEl.value === 'upper') value = value.toUpperCase();
    if (withBracesEl.value === 'yes') value = `{${value}}`;
    return value;
  }

  function updateMeta(mode = lastMode) {
    lastMode = mode;
    if (modeLabelEl) modeLabelEl.textContent = mode;
    if (countLabelEl) countLabelEl.textContent = String(getSafeCount());

    const output = outputTextEl.value || '';
    const lines = output ? output.split('\n').filter(Boolean).length : 0;
    if (lineCountEl) lineCountEl.textContent = String(lines);

    const caseText = uppercaseEl.value === 'upper' ? 'Uppercase' : 'Lowercase';
    const braceText = withBracesEl.value === 'yes' ? ' + Braces' : '';
    if (formatLabelEl) formatLabelEl.textContent = caseText + braceText;
  }

  function fallbackUuidV4() {
    const bytes = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 16; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20)
    ].join('-');
  }

  function generateUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return fallbackUuidV4();
  }

  function generateMany() {
    const count = getSafeCount();
    const separator = getSeparatorValue();

    const uuids = [];
    for (let i = 0; i < count; i++) {
      uuids.push(formatUuid(generateUuid()));
    }

    outputTextEl.value = uuids.join(separator);
    setResult(count === 1 ? uuids[0] : `Generated ${count} UUID v4 values.`);
    setStatus('Generated', 'ok');
    if (formulaTextEl) formulaTextEl.textContent = `Format: UUID v4 • ${count} item${count === 1 ? '' : 's'}`;
    updateMeta('Generated');
  }

  function clearAll() {
    outputTextEl.value = '';
    setResult('Choose your options and generate one or more UUID v4 values.');
    setStatus('Ready');
    if (formulaTextEl) formulaTextEl.textContent = 'Format: UUID v4';
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
    a.download = 'uuids.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus('Downloaded', 'ok');
  }

  generateBtn?.addEventListener('click', generateMany);

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

  [countEl, separatorEl, uppercaseEl, withBracesEl].forEach((el) => {
    el?.addEventListener('change', () => updateMeta(lastMode));
  });

  countEl?.addEventListener('input', () => updateMeta(lastMode));

  document.querySelectorAll('.quick button[data-count]').forEach((btn) => {
    btn.addEventListener('click', () => {
      countEl.value = btn.dataset.count || '1';
      separatorEl.value = btn.dataset.separator || 'newline';
      updateMeta('Preset');
      setStatus('Preset loaded', 'ok');
      setResult('Preset loaded. Click Generate UUID.');
    });
  });

  clearAll();
});
