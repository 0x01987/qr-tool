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

  const genBtn = document.getElementById('genBtn');
  const copyBtn = document.getElementById('copyBtn');
  const genBtnHero = document.getElementById('genBtnHero');
  const copyBtnHero = document.getElementById('copyBtnHero');
  const resetBtn = document.getElementById('resetBtn');

  const meterFill = document.getElementById('meterFill');
  const strengthLabel = document.getElementById('strengthLabel');
  const poolSizeEl = document.getElementById('poolSize');

  const lengthMetric = document.getElementById('lengthMetric');
  const entropyMetric = document.getElementById('entropyMetric');
  const qualityLabel = document.getElementById('qualityLabel');
  const qualityFill = document.getElementById('qualityFill');
  const qualityNote = document.getElementById('qualityNote');
  const status = document.getElementById('status');
  const presetHint = document.getElementById('presetHint');

  const LOWER = 'abcdefghijklmnopqrstuvwxyz';
  const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const NUMS = '0123456789';
  const SYMS = '!@#$%^&*()-_=+[]{};:,.?/|~';

  const AMBIGUOUS = new Set(['O', '0', 'o', 'I', 'l', '1']);
  const SIMILAR = new Set(['v', 'w', 'm', 'n', 'r']);

  function setStatus(html) {
    status.innerHTML = html;
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

  function buildCharset() {
    let chars = '';
    if (elLower.checked) chars += LOWER;
    if (elUpper.checked) chars += UPPER;
    if (elNumbers.checked) chars += NUMS;
    if (elSymbols.checked) chars += SYMS;
    return chars ? filterSet(chars) : '';
  }

  function estimateStrength(length, poolSize) {
    if (poolSize <= 1) return { entropy: 0, label: 'Weak', pct: 0, note: 'Not enough character variety.' };

    const entropy = Math.log2(Math.pow(poolSize, length));

    let label = 'Weak';
    let note = 'Too easy to guess for important accounts.';
    if (entropy >= 80) {
      label = 'Excellent';
      note = 'Very strong for most high-value accounts.';
    } else if (entropy >= 60) {
      label = 'Strong';
      note = 'Strong for most accounts.';
    } else if (entropy >= 40) {
      label = 'Good';
      note = 'Good, but longer is better.';
    } else if (entropy >= 28) {
      label = 'Okay';
      note = 'Usable, but increase length for better security.';
    }

    const pct = Math.min(100, Math.max(0, Math.round((entropy / 80) * 100)));
    return { entropy, label, pct, note };
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

    presetHint.textContent = `Preset: ${elMode.options[elMode.selectedIndex].text}`;

    if (!updateOnly) generate();
  }

  function updateStrengthUI(length, poolSize, strength) {
    lengthMetric.textContent = String(length);
    entropyMetric.textContent = Math.round(strength.entropy);
    strengthLabel.textContent = strength.label;
    poolSizeEl.textContent = poolSize ? `${poolSize} chars` : '—';

    meterFill.style.width = `${strength.pct}%`;
    qualityFill.style.width = `${strength.pct}%`;
    qualityLabel.textContent = strength.label;
    qualityNote.textContent = strength.note;
  }

  function generate() {
    const length = Math.max(6, Math.min(128, Number(elLength.value || 16)));
    elLength.value = String(length);

    const charset = buildCharset();

    if (!charset) {
      elResult.value = '';
      updateStrengthUI(length, 0, { entropy: 0, label: 'Weak', pct: 0, note: 'Select at least one character set.' });
      setStatus('<strong>Missing options.</strong><br>Select at least one character set.');
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

    const strength = estimateStrength(length, charset.length);
    updateStrengthUI(length, charset.length, strength);
    setStatus('<strong>Done.</strong><br>Password generated locally in your browser.');
  }

  async function copyPassword(sourceBtn) {
    const value = elResult.value;
    if (!value) return;

    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(value);
      } else {
        await navigator.clipboard.writeText(value);
      }
    } catch {
      elResult.select();
      document.execCommand('copy');
    }

    const original = sourceBtn.textContent;
    sourceBtn.textContent = 'Copied!';
    setStatus('<strong>Copied.</strong><br>Your password has been copied to the clipboard.');
    setTimeout(() => {
      sourceBtn.textContent = original;
    }, 1200);
  }

  function resetAll() {
    elMode.value = 'default';
    applyPreset(true);
    generate();
    setStatus('<strong>Ready.</strong><br>Settings reset and a fresh password was generated.');
  }

  genBtn.addEventListener('click', generate);
  genBtnHero.addEventListener('click', generate);

  copyBtn.addEventListener('click', () => copyPassword(copyBtn));
  copyBtnHero.addEventListener('click', () => copyPassword(copyBtnHero));

  resetBtn.addEventListener('click', resetAll);
  elMode.addEventListener('change', () => applyPreset(false));

  [elLength, elLower, elUpper, elNumbers, elSymbols, elNoAmbiguous, elNoSimilar].forEach((el) => {
    el.addEventListener('change', generate);
    el.addEventListener('input', generate);
  });

  applyPreset(true);
  generate();
});
