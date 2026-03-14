document.addEventListener('DOMContentLoaded', () => {
  const fahrenheit = document.getElementById('fahrenheit');
  const celsius = document.getElementById('celsius');
  const decimals = document.getElementById('decimals');
  const result = document.getElementById('result');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');

  let activeField = null;

  const format = (n) => InstantQR.roundTo(n, parseInt(decimals.value, 10));
  const fToC = (f) => (f - 32) * 5 / 9;
  const cToF = (c) => (c * 9 / 5) + 32;

  function setResult(text) {
    result.textContent = text;
  }

  function updateFromF() {
    const value = parseFloat(fahrenheit.value);
    if (!Number.isFinite(value)) {
      celsius.value = '';
      setResult('Enter a value to convert.');
      return;
    }

    const converted = fToC(value);
    celsius.value = format(converted);
    setResult(`${format(value)} °F = ${format(converted)} °C`);
  }

  function updateFromC() {
    const value = parseFloat(celsius.value);
    if (!Number.isFinite(value)) {
      fahrenheit.value = '';
      setResult('Enter a value to convert.');
      return;
    }

    const converted = cToF(value);
    fahrenheit.value = format(converted);
    setResult(`${format(value)} °C = ${format(converted)} °F`);
  }

  fahrenheit.addEventListener('input', () => {
    activeField = 'f';
    updateFromF();
  });

  celsius.addEventListener('input', () => {
    activeField = 'c';
    updateFromC();
  });

  decimals.addEventListener('change', () => {
    if (activeField === 'f') updateFromF();
    if (activeField === 'c') updateFromC();
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await InstantQR.copyText(result.textContent);
      copyBtn.textContent = 'Copied!';
    } catch {
      copyBtn.textContent = 'Copy failed';
    }
    setTimeout(() => {
      copyBtn.textContent = 'Copy Result';
    }, 900);
  });

  clearBtn.addEventListener('click', () => {
    fahrenheit.value = '';
    celsius.value = '';
    activeField = null;
    setResult('Enter a value to convert.');
    fahrenheit.focus();
  });
});
