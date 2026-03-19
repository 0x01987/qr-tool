document.addEventListener('DOMContentLoaded', () => {
  const converters = {
    length: {
      label: 'Length',
      units: [
        { key: 'in', name: 'Inches (in)', factorToBase: 0.0254 },
        { key: 'ft', name: 'Feet (ft)', factorToBase: 0.3048 },
        { key: 'yd', name: 'Yards (yd)', factorToBase: 0.9144 },
        { key: 'mi', name: 'Miles (mi)', factorToBase: 1609.344 },
        { key: 'mm', name: 'Millimeters (mm)', factorToBase: 0.001 },
        { key: 'cm', name: 'Centimeters (cm)', factorToBase: 0.01 },
        { key: 'm', name: 'Meters (m)', factorToBase: 1 },
        { key: 'km', name: 'Kilometers (km)', factorToBase: 1000 }
      ],
      convert: (v, from, to) => (v * from.factorToBase) / to.factorToBase,
      formula: (v, from, to) => `${v} ${from.key} = ${to.key} conversion using meters as the base unit`
    },

    weight: {
      label: 'Weight',
      units: [
        { key: 'oz', name: 'Ounces (oz)', factorToBase: 28.349523125 },
        { key: 'lb', name: 'Pounds (lb)', factorToBase: 453.59237 },
        { key: 'g', name: 'Grams (g)', factorToBase: 1 },
        { key: 'kg', name: 'Kilograms (kg)', factorToBase: 1000 }
      ],
      convert: (v, from, to) => (v * from.factorToBase) / to.factorToBase,
      formula: (v, from, to) => `${v} ${from.key} = ${to.key} conversion using grams as the base unit`
    },

    volume: {
      label: 'Volume',
      units: [
        { key: 'tsp', name: 'Teaspoons (tsp)', factorToBase: 4.92892159375 },
        { key: 'tbsp', name: 'Tablespoons (tbsp)', factorToBase: 14.78676478125 },
        { key: 'floz', name: 'Fluid ounces (fl oz)', factorToBase: 29.5735295625 },
        { key: 'cup', name: 'Cups (US)', factorToBase: 236.5882365 },
        { key: 'pt', name: 'Pints (US)', factorToBase: 473.176473 },
        { key: 'qt', name: 'Quarts (US)', factorToBase: 946.352946 },
        { key: 'gal', name: 'Gallons (US)', factorToBase: 3785.411784 },
        { key: 'ml', name: 'Milliliters (mL)', factorToBase: 1 },
        { key: 'l', name: 'Liters (L)', factorToBase: 1000 }
      ],
      convert: (v, from, to) => (v * from.factorToBase) / to.factorToBase,
      formula: (v, from, to) => `${v} ${from.key} = ${to.key} conversion using milliliters as the base unit`
    },

    speed: {
      label: 'Speed',
      units: [
        { key: 'mph', name: 'Miles per hour (mph)', factorToBase: 0.44704 },
        { key: 'kmh', name: 'Kilometers per hour (km/h)', factorToBase: 0.2777777777778 },
        { key: 'ms', name: 'Meters per second (m/s)', factorToBase: 1 }
      ],
      convert: (v, from, to) => (v * from.factorToBase) / to.factorToBase,
      formula: (v, from, to) => `${v} ${from.key} = ${to.key} conversion using meters per second as the base unit`
    },

    temperature: {
      label: 'Temperature',
      units: [
        { key: 'f', name: 'Fahrenheit (°F)' },
        { key: 'c', name: 'Celsius (°C)' },
        { key: 'k', name: 'Kelvin (K)' }
      ],
      convert: (v, from, to) => {
        const toC = (value, unitKey) => {
          if (unitKey === 'c') return value;
          if (unitKey === 'f') return (value - 32) * 5 / 9;
          return value - 273.15;
        };

        const fromC = (valueC, unitKey) => {
          if (unitKey === 'c') return valueC;
          if (unitKey === 'f') return (valueC * 9 / 5) + 32;
          return valueC + 273.15;
        };

        return fromC(toC(v, from.key), to.key);
      },
      formula: (v, from, to) => `${v} ${from.key.toUpperCase()} = ${to.key.toUpperCase()} conversion through Celsius`
    }
  };

  const categoryPills = document.getElementById('categoryPills');
  const presetPills = document.getElementById('presetPills');

  const fromValueEl = document.getElementById('fromValue');
  const precisionEl = document.getElementById('precision');
  const fromUnitEl = document.getElementById('fromUnit');
  const toUnitEl = document.getElementById('toUnit');

  const convertBtn = document.getElementById('convertBtn');
  const swapBtn = document.getElementById('swapBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');

  const resultTextEl = document.getElementById('resultText');
  const formulaTextEl = document.getElementById('formulaText');

  const categoryOut = document.getElementById('categoryOut');
  const fromOut = document.getElementById('fromOut');
  const toOut = document.getElementById('toOut');
  const statusText = document.getElementById('statusText');

  if (!fromValueEl || !fromUnitEl || !toUnitEl) return;

  let currentConvKey = 'length';
  let lastResultText = '';

  function setStatus(message) {
    statusText.innerHTML = message;
  }

  function setActiveButtons(container, selector, activeTest) {
    container.querySelectorAll(selector).forEach((el) => {
      el.classList.toggle('active', activeTest(el));
    });
  }

  function getUnit(conv, key) {
    return conv.units.find((u) => u.key === key) || null;
  }

  function parseNumber(value) {
    const cleaned = String(value || '').trim().replace(/,/g, '');
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatNumber(value) {
    const precision = Number(precisionEl.value || 2);
    const safeValue = Object.is(value, -0) ? 0 : value;

    if (precision === 0) {
      return String(Math.round(safeValue));
    }

    return Number(safeValue).toFixed(precision);
  }

  function updateSummary() {
    const conv = converters[currentConvKey];
    categoryOut.textContent = conv.label;
    fromOut.textContent = fromUnitEl.value || '—';
    toOut.textContent = toUnitEl.value || '—';
  }

  function fillUnits() {
    const conv = converters[currentConvKey];
    fromUnitEl.innerHTML = '';
    toUnitEl.innerHTML = '';

    conv.units.forEach((unit) => {
      const optionA = document.createElement('option');
      optionA.value = unit.key;
      optionA.textContent = unit.name;
      fromUnitEl.appendChild(optionA);

      const optionB = document.createElement('option');
      optionB.value = unit.key;
      optionB.textContent = unit.name;
      toUnitEl.appendChild(optionB);
    });

    if (currentConvKey === 'volume') {
      fromUnitEl.value = 'gal';
      toUnitEl.value = 'l';
    } else if (currentConvKey === 'length') {
      fromUnitEl.value = 'in';
      toUnitEl.value = 'cm';
    } else if (currentConvKey === 'weight') {
      fromUnitEl.value = 'lb';
      toUnitEl.value = 'kg';
    } else if (currentConvKey === 'speed') {
      fromUnitEl.value = 'mph';
      toUnitEl.value = 'kmh';
    } else if (currentConvKey === 'temperature') {
      fromUnitEl.value = 'f';
      toUnitEl.value = 'c';
    }

    updateSummary();
    render();
  }

  function render() {
    const value = parseNumber(fromValueEl.value);

    if (value === null) {
      resultTextEl.textContent = '—';
      formulaTextEl.textContent = 'Enter a valid number to convert.';
      lastResultText = '';
      setStatus('Ready. Choose a category, enter a value, and click <strong>Convert</strong>.');
      updateSummary();
      return;
    }

    const conv = converters[currentConvKey];
    const from = getUnit(conv, fromUnitEl.value);
    const to = getUnit(conv, toUnitEl.value);

    if (!from || !to) {
      resultTextEl.textContent = '—';
      formulaTextEl.textContent = 'Select units to continue.';
      lastResultText = '';
      setStatus('Select both units to continue.');
      updateSummary();
      return;
    }

    const result = conv.convert(value, from, to);
    const formatted = `${formatNumber(result)} ${to.key}`;

    resultTextEl.textContent = formatted;
    formulaTextEl.textContent = conv.formula(value, from, to);
    lastResultText = formatted;

    setStatus(`Converted <strong>${value}</strong> ${from.key} to <strong>${formatted}</strong>.`);
    updateSummary();
  }

  function applyPreset(preset) {
    const map = {
      in_cm: { conv: 'length', from: 'in', to: 'cm' },
      cm_in: { conv: 'length', from: 'cm', to: 'in' },
      lb_kg: { conv: 'weight', from: 'lb', to: 'kg' },
      kg_lb: { conv: 'weight', from: 'kg', to: 'lb' },
      f_c: { conv: 'temperature', from: 'f', to: 'c' },
      c_f: { conv: 'temperature', from: 'c', to: 'f' },
      oz_g: { conv: 'weight', from: 'oz', to: 'g' },
      gal_l: { conv: 'volume', from: 'gal', to: 'l' },
      mph_kmh: { conv: 'speed', from: 'mph', to: 'kmh' }
    };

    const selected = map[preset];
    if (!selected) return;

    currentConvKey = selected.conv;

    setActiveButtons(categoryPills, '.category-pill', (el) => el.dataset.conv === currentConvKey);
    setActiveButtons(presetPills, '.preset-pill', (el) => el.dataset.preset === preset);

    fillUnits();
    fromUnitEl.value = selected.from;
    toUnitEl.value = selected.to;
    updateSummary();
    render();
  }

  categoryPills?.addEventListener('click', (event) => {
    const btn = event.target.closest('.category-pill');
    if (!btn) return;

    currentConvKey = btn.dataset.conv || 'length';
    setActiveButtons(categoryPills, '.category-pill', (el) => el.dataset.conv === currentConvKey);
    setActiveButtons(presetPills, '.preset-pill', () => false);
    fillUnits();
  });

  presetPills?.addEventListener('click', (event) => {
    const btn = event.target.closest('.preset-pill');
    if (!btn) return;
    applyPreset(btn.dataset.preset || '');
  });

  convertBtn?.addEventListener('click', render);

  swapBtn?.addEventListener('click', () => {
    const currentFrom = fromUnitEl.value;
    fromUnitEl.value = toUnitEl.value;
    toUnitEl.value = currentFrom;
    updateSummary();
    render();
  });

  clearBtn?.addEventListener('click', () => {
    fromValueEl.value = '';
    resultTextEl.textContent = '—';
    formulaTextEl.textContent = 'Enter a valid number to convert.';
    lastResultText = '';
    setStatus('Cleared. Enter a new value to convert.');
    fromValueEl.focus();
  });

  copyBtn?.addEventListener('click', async () => {
    if (!lastResultText) {
      setStatus('Nothing to copy yet. Run a conversion first.');
      return;
    }

    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(lastResultText);
      } else {
        await navigator.clipboard.writeText(lastResultText);
      }
      setStatus(`Copied <strong>${lastResultText}</strong> to clipboard.`);
    } catch (_) {
      setStatus('Copy failed. Try again.');
    }
  });

  [fromValueEl, precisionEl, fromUnitEl, toUnitEl].forEach((el) => {
    el.addEventListener('input', render);
    el.addEventListener('change', render);
  });

  fromValueEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      render();
    }
  });

  fillUnits();
});
