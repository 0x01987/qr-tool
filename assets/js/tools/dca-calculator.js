document.addEventListener('DOMContentLoaded', () => {
  const symbolEl = document.getElementById('symbol');
  const currentPriceEl = document.getElementById('currentPrice');
  const feePercentEl = document.getElementById('feePercent');
  const currencyEl = document.getElementById('currency');

  const calcBtn = document.getElementById('calcBtn');
  const addRowBtn = document.getElementById('addRowBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');

  const rowsWrap = document.getElementById('rowsWrap');

  const statusBadge = document.getElementById('statusBadge');
  const resultTextEl = document.getElementById('resultText');
  const formulaTextEl = document.getElementById('formulaText');

  const netSummaryEl = document.getElementById('netSummary');
  const avgSummaryEl = document.getElementById('avgSummary');
  const unitsSummaryEl = document.getElementById('unitsSummary');
  const modeLabelEl = document.getElementById('modeLabel');

  const totalInvestedEl = document.getElementById('totalInvested');
  const totalUnitsEl = document.getElementById('totalUnits');
  const avgCostEl = document.getElementById('avgCost');
  const currentValueEl = document.getElementById('currentValue');

  const netProfitEl = document.getElementById('netProfit');
  const roiValueEl = document.getElementById('roiValue');
  const totalFeesEl = document.getElementById('totalFees');

  const assetSummaryEl = document.getElementById('assetSummary');
  const currentPriceOutEl = document.getElementById('currentPriceOut');
  const breakEvenPriceEl = document.getElementById('breakEvenPrice');

  let rowId = 0;
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

  function parseNum(value) {
    const v = parseFloat(value);
    return Number.isFinite(v) ? v : 0;
  }

  function cur() {
    return (currencyEl.value || 'USD').trim().toUpperCase();
  }

  function formatMoney(value) {
    if (!Number.isFinite(value)) return '—';
    return `${cur()} ${value.toFixed(2)}`;
  }

  function formatQty(value) {
    if (!Number.isFinite(value)) return '—';
    return value.toFixed(8).replace(/\.?0+$/, '');
  }

  function formatPct(value) {
    if (!Number.isFinite(value)) return '—';
    return `${value.toFixed(2)}%`;
  }

  function updateMode(mode) {
    lastMode = mode;
    if (modeLabelEl) modeLabelEl.textContent = mode;
  }

  function setMetricClass(el, value) {
    if (!el) return;
    el.classList.remove('goodVal', 'badVal', 'neutralVal');
    if (value > 0) el.classList.add('goodVal');
    else if (value < 0) el.classList.add('badVal');
    else el.classList.add('neutralVal');
  }

  function createRow(price = '', amount = '') {
    rowId += 1;
    const row = document.createElement('div');
    row.className = 'dcaRow';
    row.dataset.rowId = String(rowId);
    row.innerHTML = `
      <div class="miniInputs">
        <div class="control">
          <label>Buy Price</label>
          <input class="input js-price" type="number" inputmode="decimal" min="0" step="any" placeholder="e.g. 50000" value="${price}" />
        </div>
        <div class="control">
          <label>Contribution Amount</label>
          <input class="input js-amount" type="number" inputmode="decimal" min="0" step="any" placeholder="e.g. 250" value="${amount}" />
        </div>
      </div>
      <div class="claimRow">
        <div class="claimKey">Units Bought</div>
        <div class="claimVal js-units">—</div>
      </div>
      <button class="cta ghost rowBtn js-removeRow" type="button">Remove</button>
    `;
    rowsWrap.appendChild(row);

    row.querySelector('.js-removeRow').addEventListener('click', () => {
      row.remove();
      if (!rowsWrap.children.length) createRow();
      if (lastMode === 'Calculated') calculate();
    });

    row.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => {
        updateRowUnits(row);
        if (lastMode === 'Calculated') calculate();
      });
    });

    updateRowUnits(row);
  }

  function updateRowUnits(row) {
    const price = parseNum(row.querySelector('.js-price').value);
    const amount = parseNum(row.querySelector('.js-amount').value);
    const feeRate = parseNum(feePercentEl.value) / 100;

    let units = 0;
    if (price > 0 && amount > 0) {
      const netAmount = amount * (1 - feeRate);
      units = netAmount / price;
    }
    row.querySelector('.js-units').textContent = units > 0 ? formatQty(units) : '—';
  }

  function collectRows() {
    return Array.from(rowsWrap.querySelectorAll('.dcaRow')).map((row) => {
      const price = parseNum(row.querySelector('.js-price').value);
      const amount = parseNum(row.querySelector('.js-amount').value);
      return { price, amount };
    }).filter((r) => r.price > 0 && r.amount > 0);
  }

  function clearOutputs() {
    [
      netSummaryEl, avgSummaryEl, unitsSummaryEl,
      totalInvestedEl, totalUnitsEl, avgCostEl, currentValueEl,
      netProfitEl, roiValueEl, totalFeesEl,
      assetSummaryEl, currentPriceOutEl, breakEvenPriceEl
    ].forEach((el) => {
      if (el) el.textContent = '—';
      if (el) el.className = el.className.replace(/\bgoodVal\b|\bbadVal\b|\bneutralVal\b/g, '').trim();
    });
  }

  function calculate() {
    const asset = (symbolEl.value || '').trim().toUpperCase() || 'ASSET';
    const currentPrice = parseNum(currentPriceEl.value);
    const feeRate = parseNum(feePercentEl.value) / 100;
    const rows = collectRows();

    if (!rows.length) {
      clearOutputs();
      setResult('Add at least one valid buy entry.');
      setStatus('No buys', 'bad');
      updateMode('No buys');
      lastSummary = '';
      return;
    }

    let totalInvested = 0;
    let totalUnits = 0;
    let totalFees = 0;

    rows.forEach((row) => {
      const fee = row.amount * feeRate;
      const netAmount = row.amount - fee;
      const units = netAmount / row.price;

      totalInvested += row.amount;
      totalUnits += units;
      totalFees += fee;
    });

    const avgCost = totalUnits > 0 ? totalInvested / totalUnits : 0;
    const currentValue = currentPrice > 0 ? totalUnits * currentPrice : 0;
    const netProfit = currentValue - totalInvested;
    const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;
    const breakEven = totalUnits > 0 ? totalInvested / totalUnits : 0;

    if (netSummaryEl) netSummaryEl.textContent = currentPrice > 0 ? formatMoney(netProfit) : 'Enter current price';
    if (avgSummaryEl) avgSummaryEl.textContent = formatMoney(avgCost);
    if (unitsSummaryEl) unitsSummaryEl.textContent = formatQty(totalUnits);

    if (totalInvestedEl) totalInvestedEl.textContent = formatMoney(totalInvested);
    if (totalUnitsEl) totalUnitsEl.textContent = formatQty(totalUnits);
    if (avgCostEl) avgCostEl.textContent = formatMoney(avgCost);
    if (currentValueEl) currentValueEl.textContent = currentPrice > 0 ? formatMoney(currentValue) : '—';

    if (netProfitEl) netProfitEl.textContent = currentPrice > 0 ? formatMoney(netProfit) : '—';
    if (roiValueEl) roiValueEl.textContent = currentPrice > 0 ? formatPct(roi) : '—';
    if (totalFeesEl) totalFeesEl.textContent = formatMoney(totalFees);

    if (assetSummaryEl) assetSummaryEl.textContent = `${asset} • ${rows.length} buys`;
    if (currentPriceOutEl) currentPriceOutEl.textContent = currentPrice > 0 ? formatMoney(currentPrice) : '—';
    if (breakEvenPriceEl) breakEvenPriceEl.textContent = formatMoney(breakEven);

    setMetricClass(netSummaryEl, currentPrice > 0 ? netProfit : 0);
    setMetricClass(netProfitEl, currentPrice > 0 ? netProfit : 0);
    setMetricClass(roiValueEl, currentPrice > 0 ? roi : 0);

    updateMode('Calculated');
    setStatus('Calculated', currentPrice > 0 ? 'ok' : '');
    setResult(
      currentPrice > 0
        ? (netProfit >= 0
            ? `Your DCA position is up ${formatMoney(netProfit)} with an average cost of ${formatMoney(avgCost)}.`
            : `Your DCA position is down ${formatMoney(netProfit)} with an average cost of ${formatMoney(avgCost)}.`)
        : `Calculated average cost and accumulated units. Add a current price to see profit or loss.`
    );
    if (formulaTextEl) formulaTextEl.textContent = 'Formula: average cost = total invested ÷ total units';

    lastSummary =
`DCA Calculator
Asset: ${asset}
Buys: ${rows.length}
Total Invested: ${formatMoney(totalInvested)}
Total Units: ${formatQty(totalUnits)}
Average Cost: ${formatMoney(avgCost)}
Current Price: ${currentPrice > 0 ? formatMoney(currentPrice) : 'Not entered'}
Current Value: ${currentPrice > 0 ? formatMoney(currentValue) : 'Not available'}
Net Profit/Loss: ${currentPrice > 0 ? formatMoney(netProfit) : 'Not available'}
ROI: ${currentPrice > 0 ? formatPct(roi) : 'Not available'}
Total Fees: ${formatMoney(totalFees)}
Break-even Price: ${formatMoney(breakEven)}`;
  }

  function loadPreset(name) {
    rowsWrap.innerHTML = '';
    if (name === 'btc') {
      symbolEl.value = 'BTC';
      currentPriceEl.value = '68000';
      feePercentEl.value = '0.5';
      createRow('45000', '200');
      createRow('52000', '200');
      createRow('61000', '200');
    } else if (name === 'eth') {
      symbolEl.value = 'ETH';
      currentPriceEl.value = '3400';
      feePercentEl.value = '0.4';
      createRow('1800', '150');
      createRow('2200', '150');
      createRow('2900', '150');
    } else if (name === 'sol') {
      symbolEl.value = 'SOL';
      currentPriceEl.value = '160';
      feePercentEl.value = '0.3';
      createRow('25', '100');
      createRow('60', '100');
      createRow('110', '100');
    }
    setStatus('Preset loaded', 'ok');
    setResult('Preset loaded. Click Calculate.');
    updateMode('Preset');
  }

  function resetAll() {
    symbolEl.value = '';
    currentPriceEl.value = '';
    feePercentEl.value = '0';
    currencyEl.value = 'USD';
    rowsWrap.innerHTML = '';
    createRow();

    clearOutputs();
    setResult('Add one or more buys and click Calculate.');
    setStatus('Ready');
    updateMode('Ready');
    if (formulaTextEl) formulaTextEl.textContent = 'Formula: average cost = total invested ÷ total units';
    lastSummary = '';
  }

  calcBtn?.addEventListener('click', calculate);
  addRowBtn?.addEventListener('click', () => createRow());

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

  [symbolEl, currentPriceEl, feePercentEl, currencyEl].forEach((el) => {
    el?.addEventListener('input', () => {
      Array.from(rowsWrap.querySelectorAll('.dcaRow')).forEach(updateRowUnits);
      if (lastMode === 'Calculated') calculate();
    });
  });

  document.querySelectorAll('.quick button[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => loadPreset(btn.dataset.preset));
  });

  resetAll();
});
