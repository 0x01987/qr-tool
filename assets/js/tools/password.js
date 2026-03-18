document.addEventListener('DOMContentLoaded', () => {
  const elLength = document.getElementById('length');
  const elMode = document.getElementById('mode');

  const elLower = document.getElementById('lower');
  const elUpper = document.getElementById('upper');
  const elNumbers = document.getElementById('numbers');
  const elSymbols = document.getElementById('symbols');
  const elNoAmbiguous = document.getElementById('noAmbiguous');
  const elNoSimilar = document.getElementById('noSimilar');

  const elResult = document.getElementById('result');
  const elStrength = document.getElementById('strengthText');
  const elMeter = document.getElementById('meterFill');

  const copyBtn = document.getElementById('copyBtn');
  const genBtn = document.getElementById('genBtn');

  const headline = document.getElementById('headline');
  const statusText = document.getElementById('statusText');
  const statusDot = document.getElementById('statusDot');
  const presetOut = document.getElementById('presetOut');
  const lengthOut = document.getElementById('lengthOut');
  const summaryOut = document.getElementById('summaryOut');

  const toastEl = document.getElementById('toast');

  const LOWER = 'abcdefghijklmnopqrstuvwxyz';
  const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const NUMS = '0123456789';
  const SYMS = '!@#$%^&*()-_=+[]{};:,.?/|~';

  const AMBIGUOUS = new Set(['O', '0', 'o', 'I', 'l', '1']);
  const SIMILAR = new Set(['v', 'w', 'm', 'n', 'r']);

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(window.__instantqrPasswordToastTimer);
    window.__instantqrPasswordToastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 1300);
  }

  function setStatus(kind, text) {
    statusText.textContent = text;
    statusDot.style.background =
      kind === 'ok' ? 'var(--ok)' :
      kind === 'warn' ? 'var(--warn)' :
      kind === 'bad' ? 'var(--danger)' :
      'var(--muted)';
  }

  function randInt(max) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  }

  function pick(str) {
    return str[randInt(str.length)];
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function filterSet(chars) {
    let filtered = chars.split('');

    if (elNoAmbiguous.checked) {
      filtered = filtered.filter((c) => !AMBIGUOUS.has(c));
    }

    if (elNoSimilar.checked) {
      filtered = filtered.filter((c) => !SIMILAR.has(c.toLowerCase()));
    }

    return Array.from(new Set(filtered)).join('');
  }

  function updateSummary(label, lengthValue, strengthLabel, entropyBits) {
    presetOut.textContent = label;
    lengthOut.textContent = `${lengthValue} characters`;
    summaryOut.textContent = `${strengthLabel} • ~${Math.round(entropyBits)} bits entropy`;
  }

  function estimateStrength(length, poolSize) {
    if (poolSize <= 1) {
      return { entropy: 0, label: 'Weak', pct: 0 };
    }

    const entropy = Math.log2(Math.pow(poolSize, length));

    let label = 'Weak';
    if (entropy >= 80) label = 'Very strong';
    else if (entropy >= 60) label = 'Strong';
    else if (entropy >= 40) label = 'Good';
    else if (entropy >= 28) label = 'Okay';

    const pct = Math.min(100, Math.max(0, Math.round((entropy / 80) * 100)));
    return { entropy, label, pct };
  }

  function buildCharset() {
    let chars = '';

    if (elLower.checked) chars += LOWER;
    if (elUpper.checked) chars += UPPER;
    if (elNumbers.checked) chars += NUMS;
    if (elSymbols.checked) chars += SYMS;

    if (!chars) return '';
    return filterSet(chars);
  }

  function applyPreset(updateOnly = false) {
    const mode = elMode.value;

    if (mode === 'pin') {
      elLength.value = '6';
      elLower.checked = false;
      elUpper.checked = false;
      elNumbers.checked = true;
      elSymbols.checked = false;
      elNoAmbiguous.checked = true;
      elNoSimilar.checked = false;
    } else if (mode === 'memorable') {
      elLength.value = '16';
      elLower.checked = true;
      elUpper.checked = true;
      elNumbers.checked = true;
      elSymbols.checked = false;
      elNoAmbiguous.checked = true;
      elNoSimilar.checked = false;
    } else if (mode === 'max') {
      elLength.value = '24';
      elLower.checked = true;
      elUpper.checked = true;
      elNumbers.checked = true;
      elSymbols.checked = true;
      elNoAmbiguous.checked = false;
      elNoSimilar.checked = false;
    } else {
      elLength.value = '16';
      elLower.checked = true;
      elUpper.checked = true;
      elNumbers.checked = true;
      elSymbols.checked = false;
      elNoAmbiguous.checked = true;
      elNoSimilar.checked = false;
    }

    if (!updateOnly) {
      generate();
    }
  }

  function generate() {
    const length = Math.max(6, Math.min(128, Number(elLength.value || 16)));
    elLength.value = String(length);

    const charset = buildCharset();

    if (!charset) {
      elResult.value = '';
      elStrength.textContent = 'Select at least one character set.';
      elMeter.style.width = '0%';
      headline.textContent = 'Select at least one character set to generate a password.';
      setStatus('warn', 'Missing options');
      updateSummary(elMode.options[elMode.selectedIndex].text, length, 'Weak', 0);
      return;
    }

    const required = [];

    if (elLower.checked) {
      const set = filterSet(LOWER);
      if (set) required.push(pick(set));
    }
    if (elUpper.checked) {
      const set = filterSet(UPPER);
      if (set) required.push(pick(set));
    }
    if (elNumbers.checked) {
      const set = filterSet(NUMS);
      if (set) required.push(pick(set));
    }
    if (elSymbols.checked) {
      const set = filterSet(SYMS);
      if (set) required.push(pick(set));
    }

    const out = [];
    for (let i = 0; i < required.length && out.length < length; i++) {
      out.push(required[i]);
    }

    while (out.length < length) {
      out.push(pick(charset));
    }

    shuffle(out);
    elResult.value = out.join('');

    const s = estimateStrength(length, charset.length);
    elStrength.textContent = `Strength: ${s.label} • ~${Math.round(s.entropy)} bits entropy`;
    elMeter.style.width = `${s.pct}%`;

    headline.textContent = 'Generated a new password locally in your browser.';
    setStatus('ok', 'Generated');
    updateSummary(elMode.options[elMode.selectedIndex].text, length, s.label, s.entropy);
  }

  async function copyToClipboard() {
    const value = elResult.value;
    if (!value) {
      toast('Nothing to copy');
      return;
    }

    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(value);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        throw new Error('Clipboard unavailable');
      }
      copyBtn.textContent = 'Copied!';
      setStatus('ok', 'Copied');
      toast('Copied');
    } catch {
      elResult.select();
      document.execCommand('copy');
      copyBtn.textContent = 'Copied!';
      setStatus('ok', 'Copied');
      toast('Copied');
    }

    setTimeout(() => {
      copyBtn.textContent = 'Copy';
      setStatus('ok', 'Generated');
    }, 1200);
  }

  genBtn.addEventListener('click', generate);
  copyBtn.addEventListener('click', copyToClipboard);

  [elLength, elLower, elUpper, elNumbers, elSymbols, elNoAmbiguous, elNoSimilar].forEach((el) => {
    el.addEventListener('change', generate);
    el.addEventListener('input', generate);
  });

  elMode.addEventListener('change', () => applyPreset(false));

  elResult.addEventListener('focus', () => {
    if (elResult.value) elResult.select();
  });

  applyPreset(true);
  generate();
});
