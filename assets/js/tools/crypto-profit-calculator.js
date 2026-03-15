document.addEventListener('DOMContentLoaded', () => {
  const symbolEl = document.getElementById('symbol');
  const buyPriceEl = document.getElementById('buyPrice');
  const sellPriceEl = document.getElementById('sellPrice');
  const quantityEl = document.getElementById('quantity');
  const buyFeeEl = document.getElementById('buyFee');
  const sellFeeEl = document.getElementById('sellFee');
  const feeModeEl = document.getElementById('feeMode');
  const currencyEl = document.getElementById('currency');
  const showDecimalsEl = document.getElementById('showDecimals');

  const calcBtn = document.getElementById('calcBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');

  const statusBadge = document.getElementById('statusBadge');
  const resultTextEl = document.getElementById('resultText');
  const formulaTextEl = document.getElementById('formulaText');

  const netSummaryEl = document.getElementById('netSummary');
  const roiSummaryEl = document.getElementById('roiSummary');
  const breakEvenSummaryEl = document.getElementById('breakEvenSummary');
  const modeLabelEl = document.getElementById('modeLabel');

  const totalCostEl = document.getElementById('totalCost');
  const totalProceedsEl = document.getElementById('totalProceeds');
  const netProfitEl = document.getElementById('netProfit');
  const roiValueEl = document.getElementById('roiValue');

  const breakEvenPriceEl = document.getElementById('breakEvenPrice');
  const grossProfitEl = document.getElementById('grossProfit');
  const totalFeesEl = document.getElementById('totalFees');

  const assetSummaryEl = document.getElementById('assetSummary');
  const avgEntryEl = document.getElementById('avgEntry');
  const exitPerUnitEl = document.getElementById('exitPerUnit');

  let lastSummary = '';
  let lastMode = 'Ready';

  function setStatus(text, kind = '') {
    if (!statusBadge) return;
    statusBadge.className = 'badge' + (kind ? ' ' + kind : '');
    statusBadge.textContent = text;
  }

  function setResult(text) {
    if (resultTextEl) resultTextEl.textContent = text;
  }

  function parseNum(el) {
    const v = parseFloat(el.value);
    return Number.isFinite(v) ? v : 0;
  }

  function precision() {
    return showDecimalsEl.checked ? 2 : 8;
  }

  function formatMoney(value) {
    if (!Number.isFinite(value)) return '—';
    const d = precision();
    const cur = (currencyEl.value || 'USD').trim().toUpperCase();
    return `${cur} ${value.toFixed(d)}`;
  }

  function formatPlain(value) {
    if (!Number.isFinite(value)) return '—';
    const d = precision();
    return value.toFixed(d);
  }

  function formatPct(value) {
    if (!Number.isFinite(value)) return '—';
    return `${value.toFixed(2)}%`;
  }

  function getFeeAmount(base, feeInput) {
    if (feeModeEl.value === 'percent') {
      return base * (feeInput / 100);
    }
    return feeInput;
  }

  function updateSummaryMode(mode) {
    lastMode = mode;
    if (modeLabelEl) modeLabelEl.textContent = mode;
  }

  function clearOutputs() {
    [
      netSummaryEl, roiSummaryEl, breakEvenSummaryEl,
      totalCostEl, totalProceedsEl, netProfitEl, roiValueEl,
      breakEvenPriceEl, grossProfitEl, totalFeesEl,
      assetSummaryEl, avgEntryEl, exitPerUnitEl
    ].forEach((el) => {
      if (el) el.textContent = '—';
      if (el) el.className = el.className.replace(/\bgoodVal\b|\bbadVal\b|\bneutralVal\b/g, '').trim();
    });
  }

  function setMetricClass(el, value) {
    if (!el) return;
    el.classList.remove('goodVal', 'badVal', 'neutralVal');
    if (value > 0) el.classList.add('goodVal');
    else if (value < 0) el.classList.add('badVal');
    else el.classList.add('neutralVal');
  }

  function calculate() {
    const symbol = (symbolEl.value || '').trim().toUpperCase() || 'ASSET';
    const buyPrice = parseNum(buyPriceEl);
    const sellPrice = parseNum(sellPriceEl);
    const quantity = parseNum(quantityEl);
    const buyFeeInput = parseNum(buyFeeEl);
    const sellFeeInput = parseNum(sellFeeEl);

    if (buyPrice <= 0 || sellPrice < 0 || quantity <= 0) {
      clearOutputs();
      setResult('Enter valid buy price, sell price, and quantity values.');
      setStatus('Invalid input', 'bad');
      if (formulaTextEl) formulaTextEl.textContent = 'Formula: Net P/L = total proceeds − total cost';
      updateSummaryMode('Invalid input');
      lastSummary = '';
      return;
    }

    const buyBase = buyPrice * quantity;
    const sellBase = sellPrice * quantity;

    const buyFee = getFeeAmount(buyBase, buyFeeInput);
    const sellFee = getFeeAmount(sellBase, sellFeeInput);

    const totalCost = buyBase + buyFee;
    const totalProceeds = sellBase - sellFee;
    const grossProfit = sellBase - buyBase;
    const netProfit = totalProceeds - totalCost;
    const totalFees = buyFee + sellFee;
    const roi = totalCost !== 0 ? (netProfit / totalCost) * 100 : 0;

    let breakEvenSellPrice = 0;
    if (feeModeEl.value === 'percent') {
      const sellFeeRate = sellFeeInput / 100;
      const denom = quantity * (1 - sellFeeRate);
      breakEvenSellPrice = denom > 0 ? totalCost / denom : 0;
    } else {
      breakEvenSellPrice = quantity > 0 ? (totalCost + sellFeeInput) / quantity : 0;
    }

    if (netSummaryEl) netSummaryEl.textContent = formatMoney(netProfit);
    if (roiSummaryEl) roiSummaryEl.textContent = formatPct(roi);
    if (breakEvenSummaryEl) breakEvenSummaryEl.textContent = formatMoney(breakEvenSellPrice);
    updateSummaryMode('Calculated');

    if (totalCostEl) totalCostEl.textContent = formatMoney(totalCost);
    if (totalProceedsEl) totalProceedsEl.textContent = formatMoney(totalProceeds);
    if (netProfitEl) netProfitEl.textContent = formatMoney(netProfit);
    if (roiValueEl) roiValueEl.textContent = formatPct(roi);

    if (breakEvenPriceEl) breakEvenPriceEl.textContent = formatMoney(breakEvenSellPrice);
    if (grossProfitEl) grossProfitEl.textContent = formatMoney(grossProfit);
    if (totalFeesEl) totalFeesEl.textContent = formatMoney(totalFees);

    if (assetSummaryEl) assetSummaryEl.textContent = `${symbol} × ${formatPlain(quantity)}`;
    if (avgEntryEl) avgEntryEl.textContent = formatMoney(totalCost / quantity);
    if (exitPerUnitEl) exitPerUnitEl.textContent = formatMoney(sellPrice);

    setMetricClass(netSummaryEl, netProfit);
    setMetricClass(netProfitEl, netProfit);
    setMetricClass(roiSummaryEl, roi);
    setMetricClass(roiValueEl, roi);

    setResult(
      netProfit >= 0
        ? `This trade shows a net profit of ${formatMoney(netProfit)} after fees.`
        : `This trade shows a net loss of ${formatMoney(netProfit)} after fees.`
    );

    setStatus('Calculated', netProfit >= 0 ? 'ok' : 'bad');
    if (formulaTextEl) formulaTextEl.textContent = 'Formula: Net P/L = total proceeds − total cost';

    lastSummary =
`Crypto Profit Calculator
Asset: ${symbol}
Buy Price: ${formatMoney(buyPrice)}
Sell Price: ${formatMoney(sellPrice)}
Quantity: ${formatPlain(quantity)}
Buy Fee: ${formatMoney(buyFee)}
Sell Fee: ${formatMoney(sellFee)}
Total Cost: ${formatMoney(totalCost)}
Total Proceeds: ${formatMoney(totalProceeds)}
Gross Profit Before Fees: ${formatMoney(grossProfit)}
Net Profit/Loss: ${formatMoney(netProfit)}
ROI: ${formatPct(roi)}
Break-even Sell Price: ${formatMoney(breakEvenSellPrice)}`;
  }

  function resetAll() {
    symbolEl.value = '';
    buyPriceEl.value = '';
    sellPriceEl.value = '';
    quantityEl.value = '';
    buyFeeEl.value = '0';
    sellFeeEl.value = '0';
    feeModeEl.value = 'flat';
    currencyEl.value = 'USD';
    showDecimalsEl.checked = true;

    clearOutputs();
    setResult('Enter trade details and click Calculate.');
    setStatus('Ready');
    if (formulaTextEl) formulaTextEl.textContent = 'Formula: Net P/L = total proceeds − total cost';
    updateSummaryMode('Ready');
    lastSummary = '';
  }

  calcBtn?.addEventListener('click', calculate);

  copyBtn?.addEventListener('click', async () => {
    if (!lastSummary) {
      setStatus('Nothing to copy', 'bad');
      return;
    }

    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(lastSummary);
      } else {
        await navigator.clipboard.writeText(lastSummary);
      }
      setStatus('Copied', 'ok');
      setTimeout(() => setStatus(lastMode === 'Ready' ? 'Ready' : 'Calculated', lastMode === 'Ready' ? '' : 'ok'), 1200);
    } catch (_) {
      setStatus('Copy failed', 'bad');
    }
  });

  clearBtn?.addEventListener('click', resetAll);

  [buyPriceEl, sellPriceEl, quantityEl, buyFeeEl, sellFeeEl, feeModeEl, currencyEl, showDecimalsEl].forEach((el) => {
    el?.addEventListener('change', () => {
      if (lastMode === 'Calculated') calculate();
    });
  });

  document.querySelectorAll('.quick button[data-symbol]').forEach((btn) => {
    btn.addEventListener('click', () => {
      symbolEl.value = btn.dataset.symbol || '';
      buyPriceEl.value = btn.dataset.buy || '';
      sellPriceEl.value = btn.dataset.sell || '';
      quantityEl.value = btn.dataset.qty || '';
      buyFeeEl.value = '0';
      sellFeeEl.value = '0';
      feeModeEl.value = 'flat';
      setStatus('Preset loaded', 'ok');
      setResult('Preset loaded. Click Calculate.');
      updateSummaryMode('Preset');
    });
  });

  resetAll();
});
