document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'instantqr_crypto_staking_rewards_tracker_v1';

  const ASSETS = [
    { symbol: 'ETH', name: 'Ethereum', geckoId: 'ethereum', defaultRate: 3.3, type: 'APR' },
    { symbol: 'SOL', name: 'Solana', geckoId: 'solana', defaultRate: 7.2, type: 'APR' },
    { symbol: 'ADA', name: 'Cardano', geckoId: 'cardano', defaultRate: 3.0, type: 'APR' },
    { symbol: 'ATOM', name: 'Cosmos Hub', geckoId: 'cosmos', defaultRate: 14.0, type: 'APR' },
    { symbol: 'DOT', name: 'Polkadot', geckoId: 'polkadot', defaultRate: 12.0, type: 'APR' },
    { symbol: 'AVAX', name: 'Avalanche', geckoId: 'avalanche-2', defaultRate: 7.5, type: 'APR' },
    { symbol: 'BNB', name: 'BNB', geckoId: 'binancecoin', defaultRate: 2.5, type: 'APR' },
    { symbol: 'MATIC', name: 'Polygon', geckoId: 'matic-network', defaultRate: 4.8, type: 'APR' },
    { symbol: 'XTZ', name: 'Tezos', geckoId: 'tezos', defaultRate: 5.5, type: 'APR' },
    { symbol: 'TRX', name: 'TRON', geckoId: 'tron', defaultRate: 4.2, type: 'APR' },
    { symbol: 'SUI', name: 'Sui', geckoId: 'sui', defaultRate: 5.6, type: 'APR' },
    { symbol: 'NEAR', name: 'NEAR', geckoId: 'near', defaultRate: 7.0, type: 'APR' },
    { symbol: 'SEI', name: 'Sei', geckoId: 'sei-network', defaultRate: 4.5, type: 'APR' },
    { symbol: 'KAVA', name: 'Kava', geckoId: 'kava', defaultRate: 8.0, type: 'APR' },
    { symbol: 'OSMO', name: 'Osmosis', geckoId: 'osmosis', defaultRate: 9.0, type: 'APR' }
  ];

  const COMPOUND_OPTIONS = [
    { value: 'none', label: 'No compounding', periods: 0 },
    { value: 'daily', label: 'Daily', periods: 365 },
    { value: 'weekly', label: 'Weekly', periods: 52 },
    { value: 'monthly', label: 'Monthly', periods: 12 },
    { value: 'quarterly', label: 'Quarterly', periods: 4 },
    { value: 'yearly', label: 'Yearly', periods: 1 }
  ];

  const els = {
    year: document.getElementById('year'),
    addRowBtn: document.getElementById('addRowBtn'),
    refreshPricesBtn: document.getElementById('refreshPricesBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    resetTrackerBtn: document.getElementById('resetTrackerBtn'),
    positionsBody: document.getElementById('positionsBody'),
    statusNote: document.getElementById('statusNote'),
    priceSourceNote: document.getElementById('priceSourceNote'),
    positionsCount: document.getElementById('positionsCount'),
    portfolioValue: document.getElementById('portfolioValue'),
    dailyRewards: document.getElementById('dailyRewards'),
    monthlyRewards: document.getElementById('monthlyRewards'),
    yearlyRewards: document.getElementById('yearlyRewards'),
    bestYield: document.getElementById('bestYield')
  };

  if (!els.positionsBody) return;

  if (els.year) {
    els.year.textContent = String(new Date().getFullYear());
  }

  let state = {
    rows: [],
    prices: {}
  };

  function uid() {
    return 'row_' + Math.random().toString(36).slice(2, 10);
  }

  function formatUsd(value) {
    if (!Number.isFinite(value)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value >= 1000 ? 0 : 2
    }).format(value);
  }

  function formatToken(value, symbol) {
    if (!Number.isFinite(value)) return `0 ${symbol}`;
    const digits = value >= 1000 ? 2 : 6;
    return `${value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    })} ${symbol}`;
  }

  function formatPercent(value) {
    if (!Number.isFinite(value)) return '0%';
    return `${value.toFixed(2)}%`;
  }

  function getAsset(symbol) {
    return ASSETS.find((asset) => asset.symbol === symbol) || ASSETS[0];
  }

  function getCompoundPeriods(value) {
    return COMPOUND_OPTIONS.find((item) => item.value === value)?.periods ?? 0;
  }

  function createDefaultRow() {
    const asset = ASSETS[0];
    return {
      id: uid(),
      symbol: asset.symbol,
      amount: 1,
      rateType: asset.type,
      rate: asset.defaultRate,
      compound: 'none'
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.rows));
    } catch (_error) {}
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state.rows = [createDefaultRow()];
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) {
        state.rows = [createDefaultRow()];
        return;
      }
      state.rows = parsed.map((row) => ({
        id: row.id || uid(),
        symbol: ASSETS.some((a) => a.symbol === row.symbol) ? row.symbol : ASSETS[0].symbol,
        amount: Number.isFinite(Number(row.amount)) ? Number(row.amount) : 0,
        rateType: row.rateType === 'APY' ? 'APY' : 'APR',
        rate: Number.isFinite(Number(row.rate)) ? Number(row.rate) : 0,
        compound: COMPOUND_OPTIONS.some((c) => c.value === row.compound) ? row.compound : 'none'
      }));
    } catch (_error) {
      state.rows = [createDefaultRow()];
    }
  }

  function buildAssetSelect(selected) {
    return `
      <select class="cell-select" data-field="symbol">
        ${ASSETS.map((asset) => `
          <option value="${asset.symbol}" ${asset.symbol === selected ? 'selected' : ''}>
            ${asset.symbol} — ${asset.name}
          </option>
        `).join('')}
      </select>
    `;
  }

  function buildRateTypeSelect(selected) {
    return `
      <select class="cell-select" data-field="rateType">
        <option value="APR" ${selected === 'APR' ? 'selected' : ''}>APR</option>
        <option value="APY" ${selected === 'APY' ? 'selected' : ''}>APY</option>
      </select>
    `;
  }

  function buildCompoundSelect(selected) {
    return `
      <select class="cell-select" data-field="compound">
        ${COMPOUND_OPTIONS.map((opt) => `
          <option value="${opt.value}" ${opt.value === selected ? 'selected' : ''}>
            ${opt.label}
          </option>
        `).join('')}
      </select>
    `;
  }

  function computeRow(row) {
    const asset = getAsset(row.symbol);
    const price = Number(state.prices[asset.geckoId] || 0);
    const amount = Number(row.amount || 0);
    const principalUsd = amount * price;
    const rateDecimal = Number(row.rate || 0) / 100;
    const periods = getCompoundPeriods(row.compound);

    let yearlyTokenRewards = 0;

    if (row.rateType === 'APR') {
      if (periods > 0) {
        yearlyTokenRewards = amount * (Math.pow(1 + rateDecimal / periods, periods) - 1);
      } else {
        yearlyTokenRewards = amount * rateDecimal;
      }
    } else {
      yearlyTokenRewards = amount * rateDecimal;
    }

    const monthlyTokenRewards = yearlyTokenRewards / 12;
    const dailyTokenRewards = yearlyTokenRewards / 365;

    return {
      asset,
      price,
      amount,
      principalUsd,
      dailyTokenRewards,
      monthlyTokenRewards,
      yearlyTokenRewards,
      dailyUsd: dailyTokenRewards * price,
      monthlyUsd: monthlyTokenRewards * price,
      yearlyUsd: yearlyTokenRewards * price
    };
  }

  function renderRows() {
    els.positionsBody.innerHTML = state.rows.map((row) => {
      const calc = computeRow(row);

      return `
        <tr data-id="${row.id}">
          <td>${buildAssetSelect(row.symbol)}</td>
          <td>
            <input
              class="cell-input mono"
              data-field="amount"
              type="number"
              min="0"
              step="any"
              value="${row.amount}"
              placeholder="0"
            />
          </td>
          <td class="mono">${calc.price > 0 ? formatUsd(calc.price) : '—'}</td>
          <td class="mono">${formatUsd(calc.principalUsd)}</td>
          <td>${buildRateTypeSelect(row.rateType)}</td>
          <td>
            <input
              class="cell-input mono"
              data-field="rate"
              type="number"
              min="0"
              step="0.01"
              value="${row.rate}"
              placeholder="0"
            />
          </td>
          <td>${buildCompoundSelect(row.compound)}</td>
          <td class="mono">${formatUsd(calc.dailyUsd)}</td>
          <td class="mono">${formatUsd(calc.monthlyUsd)}</td>
          <td class="mono">${formatUsd(calc.yearlyUsd)}</td>
          <td>
            <div class="row-actions">
              <button class="miniBtn" data-action="duplicate" type="button">Duplicate</button>
              <button class="miniBtn" data-action="remove" type="button">Remove</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    updateSummary();
  }

  function updateSummary() {
    const totals = state.rows.map(computeRow);
    const portfolioValue = totals.reduce((sum, row) => sum + row.principalUsd, 0);
    const dailyRewards = totals.reduce((sum, row) => sum + row.dailyUsd, 0);
    const monthlyRewards = totals.reduce((sum, row) => sum + row.monthlyUsd, 0);
    const yearlyRewards = totals.reduce((sum, row) => sum + row.yearlyUsd, 0);

    let best = null;
    for (const result of totals) {
      if (!best || result.yearlyUsd > best.yearlyUsd) {
        best = result;
      }
    }

    els.positionsCount.textContent = String(state.rows.length);
    els.portfolioValue.textContent = formatUsd(portfolioValue);
    els.dailyRewards.textContent = formatUsd(dailyRewards);
    els.monthlyRewards.textContent = formatUsd(monthlyRewards);
    els.yearlyRewards.textContent = formatUsd(yearlyRewards);
    els.bestYield.textContent = best && best.yearlyUsd > 0
      ? `${best.asset.symbol} • ${formatUsd(best.yearlyUsd)}`
      : '—';
  }

  function updateRow(id, field, value) {
    const row = state.rows.find((item) => item.id === id);
    if (!row) return;

    if (field === 'amount' || field === 'rate') {
      row[field] = Number.isFinite(Number(value)) ? Number(value) : 0;
    } else {
      row[field] = value;
    }

    if (field === 'symbol') {
      const asset = getAsset(value);
      if (!row.rate || row.rate <= 0) {
        row.rate = asset.defaultRate;
      }
      if (!row.rateType) {
        row.rateType = asset.type;
      }
    }

    saveState();
    renderRows();
  }

  function addRow() {
    state.rows.push(createDefaultRow());
    saveState();
    renderRows();
    els.statusNote.textContent = 'Added a new staking position.';
  }

  function duplicateRow(id) {
    const row = state.rows.find((item) => item.id === id);
    if (!row) return;
    state.rows.push({ ...row, id: uid() });
    saveState();
    renderRows();
    els.statusNote.textContent = 'Position duplicated.';
  }

  function removeRow(id) {
    state.rows = state.rows.filter((item) => item.id !== id);
    if (!state.rows.length) {
      state.rows.push(createDefaultRow());
    }
    saveState();
    renderRows();
    els.statusNote.textContent = 'Position removed.';
  }

  async function refreshPrices() {
    const ids = [...new Set(state.rows.map((row) => getAsset(row.symbol).geckoId))];
    if (!ids.length) return;

    els.statusNote.textContent = 'Refreshing live token prices...';

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(','))}&vs_currencies=usd`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();

      for (const asset of ASSETS) {
        const usd = Number(json?.[asset.geckoId]?.usd);
        if (Number.isFinite(usd)) {
          state.prices[asset.geckoId] = usd;
        }
      }

      renderRows();
      els.statusNote.textContent = 'Live token prices updated.';
      els.priceSourceNote.textContent = 'Price source: CoinGecko live price';
    } catch (error) {
      els.statusNote.textContent = `Price refresh failed: ${error.message || 'Unknown error'}`;
      els.priceSourceNote.textContent = 'Price source: Last known / unavailable';
    }
  }

  function exportCsv() {
    const headers = [
      'Asset',
      'Amount',
      'Price_USD',
      'Value_USD',
      'Rate_Type',
      'Rate_Percent',
      'Compound',
      'Daily_Rewards_Token',
      'Daily_Rewards_USD',
      'Monthly_Rewards_Token',
      'Monthly_Rewards_USD',
      'Yearly_Rewards_Token',
      'Yearly_Rewards_USD'
    ];

    const rows = state.rows.map((row) => {
      const calc = computeRow(row);
      return [
        row.symbol,
        row.amount,
        calc.price,
        calc.principalUsd,
        row.rateType,
        row.rate,
        row.compound,
        calc.dailyTokenRewards,
        calc.dailyUsd,
        calc.monthlyTokenRewards,
        calc.monthlyUsd,
        calc.yearlyTokenRewards,
        calc.yearlyUsd
      ];
    });

    const csv = [headers, ...rows]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crypto-staking-rewards-tracker.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    els.statusNote.textContent = 'CSV export downloaded.';
  }

  function resetTracker() {
    state.rows = [createDefaultRow()];
    state.prices = {};
    saveState();
    renderRows();
    els.statusNote.textContent = 'Tracker reset to default.';
    refreshPrices();
  }

  els.positionsBody.addEventListener('input', (event) => {
    const target = event.target;
    const tr = target.closest('tr[data-id]');
    if (!tr || !target.dataset.field) return;
    updateRow(tr.dataset.id, target.dataset.field, target.value);
  });

  els.positionsBody.addEventListener('change', (event) => {
    const target = event.target;
    const tr = target.closest('tr[data-id]');
    if (!tr || !target.dataset.field) return;
    updateRow(tr.dataset.id, target.dataset.field, target.value);
  });

  els.positionsBody.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const tr = btn.closest('tr[data-id]');
    if (!tr) return;

    if (btn.dataset.action === 'duplicate') {
      duplicateRow(tr.dataset.id);
    } else if (btn.dataset.action === 'remove') {
      removeRow(tr.dataset.id);
    }
  });

  els.addRowBtn.addEventListener('click', addRow);
  els.refreshPricesBtn.addEventListener('click', refreshPrices);
  els.exportCsvBtn.addEventListener('click', exportCsv);
  els.resetTrackerBtn.addEventListener('click', resetTracker);

  loadState();
  renderRows();
  refreshPrices();
});
