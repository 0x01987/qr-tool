document.addEventListener('DOMContentLoaded', () => {
  const fahrenheit = document.getElementById('fahrenheit');
  const celsius = document.getElementById('celsius');
  const decimals = document.getElementById('decimals');
  const result = document.getElementById('result');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');

  if (!fahrenheit || !celsius || !decimals || !result || !copyBtn || !clearBtn) {
    return;
  }

  let activeField = null;

  function getDecimals() {
    const d = parseInt(decimals.value, 10);
    return Number.isInteger(d) ? d : 2;
  }

  function formatNumber(value) {
    if (window.InstantQR && typeof window.InstantQR.roundTo === 'function') {
      return window.InstantQR.roundTo(value, getDecimals());
    }
    if (!Number.isFinite(value)) return '';
    const factor = Math.pow(10, getDecimals());
    return (Math.round(value * factor) / factor).toFixed(getDecimals());
  }

  function setResult(text) {
    result.textContent = text;
  }

  function fToC(f) {
    return (f - 32) * 5 / 9;
  }

  function cToF(c) {
    return (c * 9 / 5) + 32;
  }

  function updateFromFahrenheit() {
    const value = parseFloat(fahrenheit.value);

    if (!Number.isFinite(value)) {
      celsius.value = '';
      setResult('Enter a value to convert.');
      return;
    }

    const converted = fToC(value);
    celsius.value = formatNumber(converted);
    setResult(`${formatNumber(value)} °F = ${formatNumber(converted)} °C`);
  }

  function updateFromCelsius() {
    const value = parseFloat(celsius.value);

    if (!Number.isFinite(value)) {
      fahrenheit.value = '';
      setResult('Enter a value to convert.');
      return;
    }

    const converted = cToF(value);
    fahrenheit.value = formatNumber(converted);
    setResult(`${formatNumber(value)} °C = ${formatNumber(converted)} °F`);
  }

  fahrenheit.addEventListener('input', () => {
    activeField = 'fahrenheit';
    updateFromFahrenheit();
  });

  celsius.addEventListener('input', () => {
    activeField = 'celsius';
    updateFromCelsius();
  });

  decimals.addEventListener('change', () => {
    if (activeField === 'fahrenheit') {
      updateFromFahrenheit();
    } else if (activeField === 'celsius') {
      updateFromCelsius();
    }
  });

  copyBtn.addEventListener('click', async () => {
    try {
      const text = result.textContent || '';
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }

      const original = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = original;
      }, 900);
    } catch (err) {
      const original = copyBtn.textContent;
      copyBtn.textContent = 'Copy failed';
      setTimeout(() => {
        copyBtn.textContent = original;
      }, 900);
    }
  });

  clearBtn.addEventListener('click', () => {
    fahrenheit.value = '';
    celsius.value = '';
    activeField = null;
    setResult('Enter a value to convert.');
    fahrenheit.focus();
  });
});
