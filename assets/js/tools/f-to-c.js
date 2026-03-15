document.addEventListener('DOMContentLoaded', () => {
  const fahrenheitEl = document.getElementById('fahrenheit');
  const celsiusEl = document.getElementById('celsius');
  const decimalsEl = document.getElementById('decimals');
  const convertBtn = document.getElementById('convertBtn');
  const clearBtn = document.getElementById('clearBtn');
  const copyBtn = document.getElementById('copyBtn');

  const statusBadge = document.getElementById('statusBadge');
  const resultTextEl = document.getElementById('resultText');
  const formulaEl = document.getElementById('formulaText');
  const heroValueEl = document.getElementById('heroValue');
  const heroRoundedEl = document.getElementById('heroRounded');
  const queryLabelEl = document.getElementById('queryLabel');

  if (!fahrenheitEl || !celsiusEl || !decimalsEl || !resultTextEl) return;

  let lastEdited = 'fahrenheit';

  function setStatus(text, kind = '') {
    if (!statusBadge) return;
    statusBadge.className = 'badge' + (kind ? ' ' + kind : '');
    statusBadge.textContent = text;
  }

  function getDecimals() {
    const d = parseInt(decimalsEl.value, 10);
    return Number.isInteger(d) ? d : 2;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return '';
    const d = getDecimals();
    const factor = Math.pow(10, d);
    return (Math.round(value * factor) / factor).toFixed(d);
  }

  function fToC(f) {
    return (f - 32) * 5 / 9;
  }

  function cToF(c) {
    return (c * 9 / 5) + 32;
  }

  function resetOutput() {
    resultTextEl.textContent = 'Enter a value to convert.';
    if (formulaEl) formulaEl.textContent = 'Formula: °C = (°F − 32) × 5/9';
    if (heroValueEl) heroValueEl.textContent = '—';
    if (heroRoundedEl) heroRoundedEl.textContent = '—';
    if (queryLabelEl) queryLabelEl.textContent = '°F → °C';
    setStatus('Ready');
  }

  function updateSummary(fromUnit, inputValue, outputValue, outputUnit, formulaText) {
    const inputFormatted = formatNumber(inputValue);
    const outputFormatted = formatNumber(outputValue);

    resultTextEl.textContent = `${inputFormatted} ${fromUnit} = ${outputFormatted} ${outputUnit}`;
    if (formulaEl) formulaEl.textContent = formulaText;
    if (heroValueEl) heroValueEl.textContent = `${outputFormatted} ${outputUnit}`;
    if (heroRoundedEl) heroRoundedEl.textContent = outputFormatted;
    if (queryLabelEl) queryLabelEl.textContent = `${fromUnit} → ${outputUnit}`;
    setStatus('Converted', 'ok');
  }

  function convertFromF() {
    const value = parseFloat(fahrenheitEl.value);

    if (!Number.isFinite(value)) {
      celsiusEl.value = '';
      resetOutput();
      return;
    }

    const converted = fToC(value);
    celsiusEl.value = formatNumber(converted);
    updateSummary('°F', value, converted, '°C', 'Formula: °C = (°F − 32) × 5/9');
  }

  function convertFromC() {
    const value = parseFloat(celsiusEl.value);

    if (!Number.isFinite(value)) {
      fahrenheitEl.value = '';
      resultTextEl.textContent = 'Enter a value to convert.';
      if (formulaEl) formulaEl.textContent = 'Formula: °F = (°C × 9/5) + 32';
      if (heroValueEl) heroValueEl.textContent = '—';
      if (heroRoundedEl) heroRoundedEl.textContent = '—';
      if (queryLabelEl) queryLabelEl.textContent = '°C → °F';
      setStatus('Ready');
      return;
    }

    const converted = cToF(value);
    fahrenheitEl.value = formatNumber(converted);
    updateSummary('°C', value, converted, '°F', 'Formula: °F = (°C × 9/5) + 32');
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
      resetOutput();
      fahrenheitEl.focus();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const text = resultTextEl.textContent || '';

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
      } catch (_) {
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
      fahrenheitEl.value = btn.dataset.fill || '';
      celsiusEl.value = '';
      lastEdited = 'fahrenheit';
      convertFromF();
      fahrenheitEl.focus();
    });
  });

  resetOutput();
});
