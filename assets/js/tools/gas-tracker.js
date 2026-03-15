document.addEventListener('DOMContentLoaded', () => {
  const RPC_ENDPOINTS = [
    'https://ethereum-rpc.publicnode.com',
    'https://cloudflare-eth.com/v1/mainnet'
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
  let isLoading = false;
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
    if (!hex || typeof hex !== 'string') return 0n;
    try {
      return BigInt(hex);
    } catch {
      return 0n;
    }
  }

  function gweiFromWeiBigInt(wei) {
    return Number(wei) / 1e9;
  }

  function ethFromWeiBigInt(wei) {
    return Number(wei) / 1e18;
  }

  function formatGwei(value) {
    if (!Number.isFinite(value)) return '—';
    return `${value.toFixed(2)} gwei`;
  }

  function formatEth(value) {
    if (!Number.isFinite(value)) return '—';
    return `${value.toFixed(8)} ETH`;
  }

  function formatBlock(valueHex) {
    const value = Number(hexToBigIntSafe(valueHex));
    return Number.isFinite(value) && value > 0 ? String(value) : '—';
  }

  function nowLabel() {
    return new Date().toLocaleTimeString();
  }

  async function fetchWithTimeout(url, options, timeoutMs = 7000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        cache: 'no-store'
      });
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  async function rpcCall(endpoint, method, params = []) {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Math.floor(Math.random() * 1e9),
          method,
          params
        })
      },
      7000
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    if (json.error) {
      throw new Error(json.error.message || 'RPC error');
    }
    return json.result;
  }

  async function fetchBundle(endpoint) {
    const [gasPriceHex, priorityHex, blockHex, feeHistory] = await Promise.all([
      rpcCall(endpoint, 'eth_gasPrice'),
      rpcCall(endpoint, 'eth_maxPriorityFeePerGas'),
      rpcCall(endpoint, 'eth_blockNumber'),
      rpcCall(endpoint, 'eth_feeHistory', ['0x6', 'latest', [10, 25, 50]])
    ]);

    return { endpoint, gasPriceHex, priorityHex, blockHex, feeHistory };
  }

  async function fetchFirstWorkingBundle() {
    let lastError = null;

    for (const endpoint of RPC_ENDPOINTS) {
      try {
        return await fetchBundle(endpoint);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('All RPC endpoints failed');
  }

  function getBaseFeeWei(feeHistory) {
    if (!feeHistory || !Array.isArray(feeHistory.baseFeePerGas)) return 0n;
    const items = feeHistory.baseFeePerGas.map(hexToBigIntSafe).filter(v => v > 0n);
    if (!items.length) return 0n;
    return items[items.length - 1];
  }

  function getPriorityFeeWei(feeHistory, rpcPriorityWei) {
    if (!feeHistory || !Array.isArray(feeHistory.reward) || !feeHistory.reward.length) {
      return rpcPriorityWei > 0n ? rpcPriorityWei : 1000000000n;
    }

    const values = [];
    feeHistory.reward.forEach((row) => {
      if (Array.isArray(row) && row.length >= 2) {
        const middle = hexToBigIntSafe(row[1]);
        if (middle > 0n) values.push(middle);
      }
    });

    if (!values.length) {
      return rpcPriorityWei > 0n ? rpcPriorityWei : 1000000000n;
    }

    const total = values.reduce((sum, value) => sum + value, 0n);
    return total / BigInt(values.length);
  }

  function maxBigInt(a, b) {
    return a > b ? a : b;
  }

  function buildTierFees(baseFeeWei, priorityFeeWei, gasLimit) {
    const safePriority = priorityFeeWei > 0n ? priorityFeeWei : 1000000000n;

    const slowPriority = maxBigInt(safePriority / 2n, 500000000n);
    const normalPriority = safePriority;
    const fastPriority = maxBigInt((safePriority * 3n) / 2n, safePriority + 500000000n);

    const slowMaxFee = (baseFeeWei * 2n) + slowPriority;
    const normalMaxFee = (baseFeeWei * 2n) + normalPriority;
    const fastMaxFee = (baseFeeWei * 2n) + fastPriority;

    const gas = BigInt(gasLimit);

    return {
      slow: {
        maxFeeWei: slowMaxFee,
        costWei: slowMaxFee * gas
      },
      normal: {
        maxFeeWei: normalMaxFee,
        costWei: normalMaxFee * gas
      },
      fast: {
        maxFeeWei: fastMaxFee,
        costWei: fastMaxFee * gas
      }
    };
  }

  function clearOutputs() {
    [
      baseFeeSummaryEl,
      priorityFeeSummaryEl,
      fastFeeSummaryEl,
      gasPriceEl,
      priorityFeeEl,
      latestBlockEl,
      lastUpdatedEl,
      slowMaxFeeEl,
      normalMaxFeeEl,
      fastMaxFeeEl,
      slowCostEl,
      normalCostEl,
      fastCostEl
    ].forEach((el) => {
      if (el) el.textContent = '—';
    });
  }

  async function loadGas() {
    if (isLoading) return;
    isLoading = true;

    const gasLimit = parseGasLimit();
    setStatus('Loading');
    setResult('Loading live gas data...');
    updateMode('Loading');

    try {
      const data = await fetchFirstWorkingBundle();

      const gasPriceWei = hexToBigIntSafe(data.gasPriceHex);
      const baseFeeWei = getBaseFeeWei(data.feeHistory);
      const priorityFeeWei = getPriorityFeeWei(data.feeHistory, hexToBigIntSafe(data.priorityHex));
      const tiers = buildTierFees(baseFeeWei, priorityFeeWei, gasLimit);

      const gasPriceGwei = gweiFromWeiBigInt(gasPriceWei);
      const baseFeeGwei = gweiFromWeiBigInt(baseFeeWei);
      const priorityFeeGwei = gweiFromWeiBigInt(priorityFeeWei);

      if (baseFeeSummaryEl) baseFeeSummaryEl.textContent = formatGwei(baseFeeGwei);
      if (priorityFeeSummaryEl) priorityFeeSummaryEl.textContent = formatGwei(priorityFeeGwei);
      if (fastFeeSummaryEl) fastFeeSummaryEl.textContent = formatGwei(gweiFromWeiBigInt(tiers.fast.maxFeeWei));

      if (gasPriceEl) gasPriceEl.textContent = formatGwei(gasPriceGwei);
      if (priorityFeeEl) priorityFeeEl.textContent = formatGwei(priorityFeeGwei);
      if (latestBlockEl) latestBlockEl.textContent = formatBlock(data.blockHex);
      if (lastUpdatedEl) lastUpdatedEl.textContent = nowLabel();

      if (slowMaxFeeEl) slowMaxFeeEl.textContent = formatGwei(gweiFromWeiBigInt(tiers.slow.maxFeeWei));
      if (normalMaxFeeEl) normalMaxFeeEl.textContent = formatGwei(gweiFromWeiBigInt(tiers.normal.maxFeeWei));
      if (fastMaxFeeEl) fastMaxFeeEl.textContent = formatGwei(gweiFromWeiBigInt(tiers.fast.maxFeeWei));

      if (slowCostEl) slowCostEl.textContent = formatEth(ethFromWeiBigInt(tiers.slow.costWei));
      if (normalCostEl) normalCostEl.textContent = formatEth(ethFromWeiBigInt(tiers.normal.costWei));
      if (fastCostEl) fastCostEl.textContent = formatEth(ethFromWeiBigInt(tiers.fast.costWei));

      setStatus('Loaded', 'ok');
      setResult(`Loaded live gas data successfully for gas limit ${gasLimit.toLocaleString()}.`);
      updateMode('Loaded');
      if (formulaTextEl) {
        formulaTextEl.textContent = 'Formula: estimated ETH cost = max fee per gas × gas limit';
      }

      lastSummary =
`Gas Tracker
Network: Ethereum Mainnet
Endpoint: ${data.endpoint}
Gas Limit: ${gasLimit}
Base Fee: ${formatGwei(baseFeeGwei)}
Priority Fee: ${formatGwei(priorityFeeGwei)}
Gas Price: ${formatGwei(gasPriceGwei)}
Latest Block: ${formatBlock(data.blockHex)}

Slow Max Fee: ${formatGwei(gweiFromWeiBigInt(tiers.slow.maxFeeWei))}
Slow Estimated Cost: ${formatEth(ethFromWeiBigInt(tiers.slow.costWei))}

Normal Max Fee: ${formatGwei(gweiFromWeiBigInt(tiers.normal.maxFeeWei))}
Normal Estimated Cost: ${formatEth(ethFromWeiBigInt(tiers.normal.costWei))}

Fast Max Fee: ${formatGwei(gweiFromWeiBigInt(tiers.fast.maxFeeWei))}
Fast Estimated Cost: ${formatEth(ethFromWeiBigInt(tiers.fast.costWei))}

Updated: ${nowLabel()}`;
    } catch (error) {
      clearOutputs();
      setStatus('Load failed', 'bad');
      setResult(`Unable to load live gas data right now. ${error && error.message ? error.message : 'Request failed.'}`);
      updateMode('Error');
      if (formulaTextEl) {
        formulaTextEl.textContent = 'Formula: estimated ETH cost = max fee per gas × gas limit';
      }
      lastSummary = '';
    } finally {
      isLoading = false;
    }
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function applyRefreshMode() {
    stopAuto();

    if (refreshModeEl.value === 'auto') {
      autoTimer = setInterval(() => {
        loadGas();
      }, 15000);
    }
  }

  function resetAll() {
    stopAuto();
    gasLimitEl.value = '21000';
    refreshModeEl.value = 'manual';
    clearOutputs();
    setStatus('Ready');
    setResult('Click Refresh Gas to load live fee suggestions.');
    updateMode('Ready');
    if (formulaTextEl) {
      formulaTextEl.textContent = 'Formula: estimated ETH cost = max fee per gas × gas limit';
    }
    lastSummary = '';
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
      setTimeout(() => {
        setStatus(lastMode === 'Loaded' ? 'Loaded' : 'Ready', lastMode === 'Loaded' ? 'ok' : '');
      }, 1200);
    } catch {
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
    if (lastMode === 'Loaded') {
      loadGas();
    }
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
