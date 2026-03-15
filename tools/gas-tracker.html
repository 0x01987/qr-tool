document.addEventListener('DOMContentLoaded', () => {
  const RPC_ENDPOINTS = [
    'https://ethereum-rpc.publicnode.com'
  ];

  const gasLimitEl = document.getElementById('gasLimit');
  const refreshModeEl = document.getElementById('refreshMode');

  const refreshBtn = document.getElementById('refreshBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');

  const statusBadge = document.getElementById('statusBadge');
  const resultTextEl = document.getElementById('resultText');
  const formulaTextEl = document.getElementById('formulaText');

  const baseFeeSummaryEl = document.getElementById('baseFeeSummary');
  const priorityFeeSummaryEl = document.getElementById('priorityFeeSummary');
  const fastFeeSummaryEl = document.getElementById('fastFeeSummary');
  const modeLabelEl = document.getElementById('modeLabel');

  const gasPriceEl = document.getElementById('gasPrice');
  const priorityFeeEl = document.getElementById('priorityFee');
  const latestBlockEl = document.getElementById('latestBlock');
  const lastUpdatedEl = document.getElementById('lastUpdated');

  const slowMaxFeeEl = document.getElementById('slowMaxFee');
  const normalMaxFeeEl = document.getElementById('normalMaxFee');
  const fastMaxFeeEl = document.getElementById('fastMaxFee');

  const slowCostEl = document.getElementById('slowCost');
  const normalCostEl = document.getElementById('normalCost');
  const fastCostEl = document.getElementById('fastCost');

  let autoTimer = null;
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

  function updateMode(mode) {
    lastMode = mode;
    if (modeLabelEl) modeLabelEl.textContent = mode;
  }

  function parseGasLimit() {
    const value = parseInt(gasLimitEl.value, 10);
    if (!Number.isFinite(value) || value <= 0) return 21000;
    return value;
  }

  function hexToBigIntSafe(hex) {
    if (!hex) return 0n;
    try {
      return BigInt(hex);
    } catch (_) {
      return 0n;
    }
  }

  function weiToGwei(weiBigInt) {
    return Number(weiBigInt) / 1e9;
  }

  function weiToEth(weiBigInt) {
    return Number(weiBigInt) / 1e18;
  }

  function formatGwei(v) {
    if (!Number.isFinite(v)) return '—';
    return `${v.toFixed(2)} gwei`;
  }

  function formatEth(v) {
    if (!Number.isFinite(v)) return '—';
    return `${v.toFixed(8)} ETH`;
  }

  function formatBlock(hex) {
    const n = Number(hexToBigIntSafe(hex));
    return Number.isFinite(n) && n > 0 ? String(n) : '—';
  }

  async function rpcCall(url, method, params = []) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      }),
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    if (json.error) {
      throw new Error(json.error.message || 'RPC error');
    }
    return json.result;
  }

  async function rpcBundle(url) {
    const [gasPriceHex, priorityHex, blockHex, feeHistory] = await Promise.all([
      rpcCall(url, 'eth_gasPrice'),
      rpcCall(url, 'eth_maxPriorityFeePerGas'),
      rpcCall(url, 'eth_blockNumber'),
      rpcCall(url, 'eth_feeHistory', ['0x5', 'latest', [10, 25, 50]])
    ]);

    return { gasPriceHex, priorityHex, blockHex, feeHistory };
  }

  async function fetchWithFallback() {
    let lastError = null;

    for (const url of RPC_ENDPOINTS) {
      try {
        const data = await rpcBundle(url);
        return { url, data };
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Unable to load gas data');
  }

  function getBaseFeeFromHistory(feeHistory) {
    if (!feeHistory || !Array.isArray(feeHistory.baseFeePerGas) || !feeHistory.baseFeePerGas.length) {
      return 0n;
    }
    const values = feeHistory.baseFeePerGas.map(hexToBigIntSafe).filter(v => v > 0n);
    if (!values.length) return 0n;
    return values[values.length - 1];
  }

  function estimatePriorityFromHistory(feeHistory, fallbackPriority) {
    if (!feeHistory || !Array.isArray(feeHistory.reward) || !feeHistory.reward.length) {
      return fallbackPriority;
    }

    const mids = [];
    feeHistory.reward.forEach((row) => {
      if (Array.isArray(row) && row.length >= 2) {
        const mid = hexToBigIntSafe(row[1]);
        if (mid > 0n) mids.push(mid);
      }
    });

    if (!mids.length) return fallbackPriority;

    const total = mids.reduce((acc, v) => acc + v, 0n);
    return total / BigInt(mids.length);
  }

  function max(a, b) {
    return a > b ? a : b;
  }

  function clearOutputs() {
    [
      baseFeeSummaryEl, priorityFeeSummaryEl, fastFeeSummaryEl,
      gasPriceEl, priorityFeeEl, latestBlockEl, lastUpdatedEl,
      slowMaxFeeEl, normalMaxFeeEl, fastMaxFeeEl,
      slowCostEl, normalCostEl, fastCostEl
    ].forEach((el) => {
      if (el) el.textContent = '—';
    });
  }

  function nowTimeLabel() {
    return new Date().toLocaleTimeString();
  }

  function buildFeeTiers(baseFeeWei, priorityWei, gasLimit) {
    const safePriority = priorityWei > 0n ? priorityWei : 1000000000n;

    const slowPriority = max(safePriority / 2n, 500000000n);
    const normalPriority = safePriority;
    const fastPriority = max((safePriority * 3n) / 2n, safePriority + 500000000n);

    const slowMax = (baseFeeWei * 2n) + slowPriority;
    const normalMax = (baseFeeWei * 2n) + normalPriority;
    const fastMax = (baseFeeWei * 2n) + fastPriority;

    const gasLimitBig = BigInt(gasLimit);

    return {
      slow: {
        maxFeeWei: slowMax,
        costWei: slowMax * gasLimitBig
      },
      normal: {
        maxFeeWei: normalMax,
        costWei: normalMax * gasLimitBig
      },
      fast: {
        maxFeeWei: fastMax,
        costWei: fastMax * gasLimitBig
      }
    };
  }

  async function loadGas() {
    const gasLimit = parseGasLimit();

    setStatus('Loading');
    setResult('Loading live gas data...');
    updateMode('Loading');

    try {
      const { url, data } = await fetchWithFallback();

      const gasPriceWei = hexToBigIntSafe(data.gasPriceHex);
      const priorityWeiRpc = hexToBigIntSafe(data.priorityHex);
      const baseFeeWei = getBaseFeeFromHistory(data.feeHistory);
      const priorityWei = estimatePriorityFromHistory(data.feeHistory, priorityWeiRpc);

      const tiers = buildFeeTiers(baseFeeWei, priorityWei, gasLimit);

      const baseFeeGwei = weiToGwei(baseFeeWei);
      const priorityGwei = weiToGwei(priorityWei);
      const gasPriceGwei = weiToGwei(gasPriceWei);

      if (baseFeeSummaryEl) baseFeeSummaryEl.textContent = formatGwei(baseFeeGwei);
      if (priorityFeeSummaryEl) priorityFeeSummaryEl.textContent = formatGwei(priorityGwei);
      if (fastFeeSummaryEl) fastFeeSummaryEl.textContent = formatGwei(weiToGwei(tiers.fast.maxFeeWei));

      if (gasPriceEl) gasPriceEl.textContent = formatGwei(gasPriceGwei);
      if (priorityFeeEl) priorityFeeEl.textContent = formatGwei(priorityGwei);
      if (latestBlockEl) latestBlockEl.textContent = formatBlock(data.blockHex);
      if (lastUpdatedEl) lastUpdatedEl.textContent = nowTimeLabel();

      if (slowMaxFeeEl) slowMaxFeeEl.textContent = formatGwei(weiToGwei(tiers.slow.maxFeeWei));
      if (normalMaxFeeEl) normalMaxFeeEl.textContent = formatGwei(weiToGwei(tiers.normal.maxFeeWei));
      if (fastMaxFeeEl) fastMaxFeeEl.textContent = formatGwei(weiToGwei(tiers.fast.maxFeeWei));

      if (slowCostEl) slowCostEl.textContent = formatEth(weiToEth(tiers.slow.costWei));
      if (normalCostEl) normalCostEl.textContent = formatEth(weiToEth(tiers.normal.costWei));
      if (fastCostEl) fastCostEl.textContent = formatEth(weiToEth(tiers.fast.costWei));

      setResult(`Loaded live gas data successfully for a gas limit of ${gasLimit.toLocaleString()}.`);
      setStatus('Loaded', 'ok');
      updateMode('Loaded');
      if (formulaTextEl) formulaTextEl.textContent = 'Formula: estimated ETH cost = max fee per gas × gas limit';

      lastSummary =
`Gas Tracker
Network: Ethereum Mainnet
RPC: ${url}
Gas Limit: ${gasLimit}
Base Fee: ${formatGwei(baseFeeGwei)}
Priority Fee: ${formatGwei(priorityGwei)}
Gas Price: ${formatGwei(gasPriceGwei)}
Latest Block: ${formatBlock(data.blockHex)}

Slow Max Fee: ${formatGwei(weiToGwei(tiers.slow.maxFeeWei))}
Slow Estimated Cost: ${formatEth(weiToEth(tiers.slow.costWei))}

Normal Max Fee: ${formatGwei(weiToGwei(tiers.normal.maxFeeWei))}
Normal Estimated Cost: ${formatEth(weiToEth(tiers.normal.costWei))}

Fast Max Fee: ${formatGwei(weiToGwei(tiers.fast.maxFeeWei))}
Fast Estimated Cost: ${formatEth(weiToEth(tiers.fast.costWei))}

Updated: ${nowTimeLabel()}`;
    } catch (err) {
      clearOutputs();
      setResult(`Unable to load live gas data right now. ${err && err.message ? err.message : 'Request failed.'}`);
      setStatus('Load failed', 'bad');
      updateMode('Error');
      if (formulaTextEl) formulaTextEl.textContent = 'Formula: estimated ETH cost = max fee per gas × gas limit';
      lastSummary = '';
    }
  }

  function resetAll() {
    gasLimitEl.value = '21000';
    refreshModeEl.value = 'manual';
    clearOutputs();
    setResult('Click Refresh Gas to load live fee suggestions.');
    setStatus('Ready');
    updateMode('Ready');
    if (formulaTextEl) formulaTextEl.textContent = 'Formula: estimated ETH cost = max fee per gas × gas limit';
    lastSummary = '';
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function applyRefreshMode() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }

    if (refreshModeEl.value === 'auto') {
      autoTimer = setInterval(() => {
        loadGas();
      }, 15000);
    }
  }

  refreshBtn?.addEventListener('click', loadGas);

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
      setTimeout(() => setStatus(lastMode === 'Ready' ? 'Ready' : 'Loaded', lastMode === 'Ready' ? '' : 'ok'), 1200);
    } catch (_) {
      setStatus('Copy failed', 'bad');
    }
  });

  clearBtn?.addEventListener('click', resetAll);

  refreshModeEl?.addEventListener('change', () => {
    applyRefreshMode();
    if (refreshModeEl.value === 'auto') {
      loadGas();
    }
  });

  gasLimitEl?.addEventListener('change', () => {
    if (lastMode === 'Loaded') loadGas();
  });

  document.querySelectorAll('.quick button[data-gaslimit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      gasLimitEl.value = btn.dataset.gaslimit || '21000';
      setStatus('Preset loaded', 'ok');
      setResult('Gas limit preset loaded. Click Refresh Gas.');
      updateMode('Preset');
    });
  });

  resetAll();
});
::contentReference[oaicite:1]{index=1}
