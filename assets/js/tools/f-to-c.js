document.addEventListener('DOMContentLoaded', () => {
  const fahrenheitEl = document.getElementById('fahrenheit');
  const celsiusEl = document.getElementById('celsius');
  const decimalsEl = document.getElementById('decimals');
  const convertBtn = document.getElementById('convertBtn');
  const clearBtn = document.getElementById('clearBtn');
  const swapBtn = document.getElementById('swapBtn');
  const copyBtn = document.getElementById('copyBtn');

  const statusBadge = document.getElementById('statusBadge');
  const resultTextEl = document.getElementById('resultText');
  const formulaEl = document.getElementById('formulaText');
  const heroValueEl = document.getElementById('heroValue');
  const heroRoundedEl = document.getElementById('heroRounded');
  const queryLabelEl = document.getElementById('queryLabel');

  if (!fahrenheitEl || !celsiusEl || !decimalsEl) return;

  let lastEdited = 'fahrenheit';

  function setStatus(text, kind) {
    if (!statusBadge) return;
    statusBadge.textContent = text;
    statusBadge.className = 'badge' + (kind ? ' ' + kind : '');
  }

  function getDecimals() {
    const d = parseInt(decimalsEl.value, 10);
    return Number.isInteger(d) ? d : 2;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return '';
    if (window.InstantQR && typeof window.InstantQR.roundTo === 'function') {
      return window.InstantQR.roundTo(value, getDecimals());
    }
    const factor = Math.pow(10, getDecimals());
    return (Math.round(value * factor) / factor).toFixed(getDecimals());
  }

  function fToC(f) {
    return (f - 32) * 5 / 9;
  }

  function cToF(c) {
    return (c * 9 / 5) + 32;
  }

  function updateSummary(fromUnit, inputValue, outputValue, outputUnit) {
    if (resultTextEl) {
      resultTextEl.textContent = `${formatNumber(inputValue)} ${fromUnit} = ${formatNumber(outputValue)} ${outputUnit}`;
    }
    if (heroValueEl) {
      heroValueEl.textContent = `${formatNumber(outputValue)} ${outputUnit}`;
    }
    if (heroRoundedEl) {
      heroRoundedEl.textContent = `${formatNumber(outputValue)}`;
    }
    if (queryLabelEl) {
      queryLabelEl.textContent = `${fromUnit} → ${outputUnit}`;
    }
  }

  function convertFromF() {
    const value = parseFloat(fahrenheitEl.value);

    if (!Number.isFinite(value)) {
      celsiusEl.value = '';
      if (resultTextEl) resultTextEl.textContent = 'Enter a value to convert.';
      if (heroValueEl) heroValueEl.textContent = '—';
      if (heroRoundedEl) heroRoundedEl.textContent = '—';
      if (queryLabelEl) queryLabelEl.textContent = '°F → °C';
      if (formulaEl) formulaEl.textContent = 'Formula: °C = (°F − 32) × 5/9';
      setStatus('Enter a value', 'bad');
      return;
    }

    const converted = fToC(value);
    celsiusEl.value = formatNumber(converted);
    if (formulaEl) formulaEl.textContent = 'Formula: °C = (°F − 32) × 5/9';
    updateSummary('°F', value, converted, '°C');
    setStatus('Converted', 'ok');
  }

  function convertFromC() {
    const value = parseFloat(celsiusEl.value);

    if (!Number.isFinite(value)) {
      fahrenheitEl.value = '';
      if (resultTextEl) resultTextEl.textContent = 'Enter a value to convert.';
      if (heroValueEl) heroValueEl.textContent = '—';
      if (heroRoundedEl) heroRoundedEl.textContent = '—';
      if (queryLabelEl) queryLabelEl.textContent = '°C → °F';
      if (formulaEl) formulaEl.textContent = 'Formula: °F = (°C × 9/5) + 32';
      setStatus('Enter a value', 'bad');
      return;
    }

    const converted = cToF(value);
    fahrenheitEl.value = formatNumber(converted);
    if (formulaEl) formulaEl.textContent = 'Formula: °F = (°C × 9/5) + 32';
    updateSummary('°C', value, converted, '°F');
    setStatus('Converted', 'ok');
  }

  function runConversion() {
    if (lastEdited === 'celsius') {
      convertFromC();
    } else {
      convertFromF();
    }
  }

  fahrenheitEl.addEventListener('input', () => {
    lastEdited = 'fahrenheit';
    convertFromF();
  });

  celsiusEl.addEventListener('input', () => {
    lastEdited = 'celsius';
    convertFromC();
  });

  decimalsEl.addEventListener('change', runConversion);

  if (convertBtn) {
    convertBtn.addEventListener('click', runConversion);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      fahrenheitEl.value = '';
      celsiusEl.value = '';
      lastEdited = 'fahrenheit';

      if (resultTextEl) resultTextEl.textContent = 'Enter a value to convert.';
      if (formulaEl) formulaEl.textContent = 'Formula: °C = (°F − 32) × 5/9';
      if (heroValueEl) heroValueEl.textContent = '—';
      if (heroRoundedEl) heroRoundedEl.textContent = '—';
      if (queryLabelEl) queryLabelEl.textContent = '°F → °C';

      setStatus('Ready');
      fahrenheitEl.focus();
    });
  }

  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      const f = fahrenheitEl.value;
      const c = celsiusEl.value;
      fahrenheitEl.value = c;
      celsiusEl.value = f;
      lastEdited = lastEdited === 'fahrenheit' ? 'celsius' : 'fahrenheit';
      runConversion();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const text = resultTextEl ? resultTextEl.textContent : '';
      if (!text || text === 'Enter a value to convert.') {
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
        setTimeout(() => setStatus('Ready'), 1200);
      } catch (err) {
        setStatus('Copy failed', 'bad');
      }
    });
  }

  [fahrenheitEl, celsiusEl].forEach((el) => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        runConversion();
      }
    });
  });

  document.querySelectorAll('.quick button[data-fill]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.fill || '';
      fahrenheitEl.value = value;
      lastEdited = 'fahrenheit';
      convertFromF();
      fahrenheitEl.focus();
    });
  });

  setStatus('Ready');
});
