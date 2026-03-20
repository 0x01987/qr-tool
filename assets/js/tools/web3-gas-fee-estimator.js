document.addEventListener('DOMContentLoaded', () => {
  const NETWORKS = [
    { key: 'eth', name: 'Ethereum', chainId: 1, symbol: 'ETH', rpc: 'https://ethereum.publicnode.com', priceKey: 'ethereum' },
    { key: 'bsc', name: 'BNB Smart Chain', chainId: 56, symbol: 'BNB', rpc: 'https://bsc-dataseed.binance.org', priceKey: 'binancecoin' },
    { key: 'arb', name: 'Arbitrum One', chainId: 42161, symbol: 'ETH', rpc: 'https://arb1.arbitrum.io/rpc', priceKey: 'ethereum' },
    { key: 'op', name: 'Optimism', chainId: 10, symbol: 'ETH', rpc: 'https://mainnet.optimism.io', priceKey: 'ethereum' },
    { key: 'base', name: 'Base', chainId: 8453, symbol: 'ETH', rpc: 'https://mainnet.base.org', priceKey: 'ethereum' },
    { key: 'poly', name: 'Polygon PoS', chainId: 137, symbol: 'POL', rpc: 'https://polygon-bor.publicnode.com', priceKey: 'matic-network' },
    { key: 'avax', name: 'Avalanche C-Chain', chainId: 43114, symbol: 'AVAX', rpc: 'https://api.avax.network/ext/bc/C/rpc', priceKey: 'avalanche-2' },
    { key: 'gnosis', name: 'Gnosis', chainId: 100, symbol: 'xDAI', rpc: 'https://rpc.gnosischain.com', priceKey: 'xdai' },
    { key: 'celo', name: 'Celo', chainId: 42220, symbol: 'CELO', rpc: 'https://forno.celo.org', priceKey: 'celo' },
    { key: 'zksync', name: 'zkSync Era', chainId: 324, symbol: 'ETH', rpc: 'https://mainnet.era.zksync.io', priceKey: 'ethereum' },
    { key: 'linea', name: 'Linea', chainId: 59144, symbol: 'ETH', rpc: 'https://rpc.linea.build', priceKey: 'ethereum' },
    { key: 'scroll', name: 'Scroll', chainId: 534352, symbol: 'ETH', rpc: 'https://rpc.scroll.io', priceKey: 'ethereum' },
    { key: 'kcc', name: 'KCC', chainId: 321, symbol: 'KCS', rpc: 'https://rpc-mainnet.kcc.network', priceKey: 'kucoin-shares' }
  ];

  const TX_PRESETS = {
    transfer: {
      label: 'Transfer',
      gasUnits: 21000,
      help: 'Preset gas estimate for a simple native token transfer.'
    },
    erc20: {
      label: 'ERC-20 Transfer',
      gasUnits: 65000,
      help: 'Typical range for a token transfer on many EVM chains.'
    },
    swap: {
      label: 'Swap',
      gasUnits: 150000,
      help: 'Common estimate for DEX swaps. Actual usage varies by router and route.'
    },
    'nft-mint': {
      label: 'NFT Mint',
      gasUnits: 220000,
      help: 'Typical NFT mint estimate. Some collections and contracts use much more.'
    },
    'contract-call': {
      label: 'Contract Call',
      gasUnits: 250000,
      help: 'Generic contract interaction estimate for more complex calls.'
    },
    bridge: {
      label: 'Bridge',
      gasUnits: 300000,
      help: 'Bridge transactions often require more gas depending on protocol.'
    },
    custom: {
      label: 'Custom gas units',
      gasUnits: null,
      help: 'Enter your own gas units for a more specific estimate.'
    }
  };

  const RPC_TIMEOUT_MS = 5000;
  const PRICE_TIMEOUT_MS = 4000;
  const AUTO_REFRESH_MS = 15000;
  const CACHE_TTL_MS = 15000;
  const PRICE_CACHE_TTL_MS = 60000;

  const els = {
    year: document.getElementById('year'),
    network: document.getElementById('network'),
    txType: document.getElementById('txType'),
    txTypeHelp: document.getElementById('txTypeHelp'),
    gasUnits: document.getElementById('gasUnits'),
    gasUnitsHelp: document.getElementById('gasUnitsHelp'),
    rpcUrl: document.getElementById('rpcUrl'),

    refreshBtn: document.getElementById('refreshBtn'),
    testBtn: document.getElementById('testBtn'),
    copyBtn: document.getElementById('copyBtn'),

    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    statusMessage: document.getElementById('statusMessage'),
    lastUpdated: document.getElementById('lastUpdated'),

    slowMax: document.getElementById('slowMax'),
    slowTip: document.getElementById('slowTip'),
    slowTotal: document.getElementById('slowTotal'),
    slowNative: document.getElementById('slowNative'),
    slowUsd: document.getElementById('slowUsd'),

    stdMax: document.getElementById('stdMax'),
    stdTip: document.getElementById('stdTip'),
    stdTotal: document.getElementById('stdTotal'),
    stdNative: document.getElementById('stdNative'),
    stdUsd: document.getElementById('stdUsd'),

    fastMax: document.getElementById('fastMax'),
    fastTip: document.getElementById('fastTip'),
    fastTotal: document.getElementById('fastTotal'),
    fastNative: document.getElementById('fastNative'),
    fastUsd: document.getElementById('fastUsd'),

    modeText: document.getElementById('modeText'),
    chainText: document.getElementById('chainText'),
    txTypeText: document.getElementById('txTypeText'),
    gasUnitsText: document.getElementById('gasUnitsText'),
    symbolText: document.getElementById('symbolText'),
    priceSourceText: document.getElementById('priceSourceText')
  };

  if (els.year) els.year.textContent = new Date().getFullYear();

  let rpcId = 1;
  let refreshTimer = null;
  let inflight = false;

  function getSelectedNetwork() {
    return NETWORKS.find((n) => n.key === els.network.value) || NETWORKS[0];
  }

  function getSelectedPreset() {
    return TX_PRESETS[els.txType.value] || TX_PRESETS.transfer;
  }

  function setStatus(kind, shortText, longText) {
    const colorMap = {
      ok: '#22c55e',
      warn: '#facc15',
      bad: '#ef4444',
      idle: '#94a3b8'
    };

    if (els.statusDot) els.statusDot.style.background = colorMap[kind] || colorMap.idle;
    if (els.statusText) els.statusText.textContent = shortText || 'Ready';
    if (els.statusMessage) els.statusMessage.textContent = longText || 'Ready to fetch gas data.';
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatDateTime(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }

  function abortableFetch(url, options = {}, timeoutMs = RPC_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, {
      ...options,
      signal: controller.signal
    }).finally(() => clearTimeout(timer));
  }

  async function rpcCall(url, method, params) {
    const body = {
      jsonrpc: '2.0',
      id: rpcId++,
      method,
      params
    };

    const res = await abortableFetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }, RPC_TIMEOUT_MS);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (json.error) throw new Error(json.error.message || 'RPC error');

    return json.result;
  }

  function hexToBigInt(hexValue) {
    if (typeof hexValue !== 'string' || !hexValue.startsWith('0x')) {
      throw new Error('Invalid hex value');
    }
    return BigInt(hexValue);
  }

  function medianBigInt(values) {
    if (!Array.isArray(values) || values.length === 0) return 0n;
    const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2n;
  }

  function formatGwei(valueWei) {
    const num = Number(valueWei) / 1e9;
    if (!Number.isFinite(num)) return '—';
    return `${num.toFixed(2)} gwei`;
  }

  function weiToNativeNumber(weiBigInt) {
    const num = Number(weiBigInt) / 1e18;
    return Number.isFinite(num) ? num : null;
  }

  function formatNative(weiBigInt, symbol) {
    const num = weiToNativeNumber(weiBigInt);
    if (num === null) return `— ${symbol}`;
    const formatted = num >= 1 ? num.toFixed(6) : num.toPrecision(6);
    return `${formatted} ${symbol}`;
  }

  function formatUsd(value) {
    if (!Number.isFinite(value)) return '—';
    if (value >= 1000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (value >= 1) return `$${value.toFixed(2)}`;
    if (value >= 0.01) return `$${value.toFixed(4)}`;
    return `$${value.toFixed(6)}`;
  }

  function getGasUnits() {
    const n = parseInt(els.gasUnits.value || '21000', 10);
    if (!Number.isFinite(n) || n < 1) return 21000;
    return n;
  }

  function syncTxPresetUI({ preserveCustom = true } = {}) {
    const preset = getSelectedPreset();

    if (els.txTypeText) els.txTypeText.textContent = preset.label;
    if (els.txTypeHelp) els.txTypeHelp.textContent = preset.help || '';

    if (preset.gasUnits !== null) {
      els.gasUnits.value = String(preset.gasUnits);
      els.gasUnits.readOnly = true;
      els.gasUnitsHelp.textContent = `Preset loaded: ${preset.gasUnits.toLocaleString()} gas units for ${preset.label.toLowerCase()}.`;
    } else {
      els.gasUnits.readOnly = false;
      if (!preserveCustom && !els.gasUnits.value.trim()) {
        els.gasUnits.value = '21000';
      }
      els.gasUnitsHelp.textContent = 'Custom mode enabled. Enter your own gas units for a more specific estimate.';
    }
  }

  function updateSettingsMeta() {
    const net = getSelectedNetwork();
    const preset = getSelectedPreset();

    if (els.txTypeText) els.txTypeText.textContent = preset.label;
    if (els.gasUnitsText) els.gasUnitsText.textContent = getGasUnits().toLocaleString();
    if (els.symbolText) els.symbolText.textContent = net.symbol;
    if (els.chainText) els.chainText.textContent = `${net.name} (${net.chainId})`;
  }

  function cacheKey() {
    const net = getSelectedNetwork();
    const rpc = (els.rpcUrl.value || '').trim();
    const gasUnits = getGasUnits();
    const txType = els.txType.value || 'transfer';
    return `instantqr:gas:${net.key}:${txType}:${gasUnits}:${rpc}`;
  }

  function cacheGet() {
    try {
      const raw = sessionStorage.getItem(cacheKey());
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj.t !== 'number' || !obj.v) return null;
      if ((Date.now() - obj.t) > CACHE_TTL_MS) return null;
      return obj.v;
    } catch {
      return null;
    }
  }

  function cacheSet(value) {
    try {
      sessionStorage.setItem(cacheKey(), JSON.stringify({ t: Date.now(), v: value }));
    } catch {}
  }

  function priceCacheKey(networkKey) {
    return `instantqr:gas-price:${networkKey}`;
  }

  function priceCacheGet(networkKey) {
    try {
      const raw = sessionStorage.getItem(priceCacheKey(networkKey));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj.t !== 'number' || !obj.v) return null;
      if ((Date.now() - obj.t) > PRICE_CACHE_TTL_MS) return null;
      return obj.v;
    } catch {
      return null;
    }
  }

  function priceCacheSet(networkKey, value) {
    try {
      sessionStorage.setItem(priceCacheKey(networkKey), JSON.stringify({ t: Date.now(), v: value }));
    } catch {}
  }

  async function fetchJsonWithTimeout(url, timeoutMs = PRICE_TIMEOUT_MS) {
    const res = await abortableFetch(url, { method: 'GET' }, timeoutMs);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function getUsdPriceForNetwork(network) {
    const cached = priceCacheGet(network.key);
    if (cached) return cached;

    const fallbacks = [
      async () => {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(network.priceKey)}&vs_currencies=usd`;
        const json = await fetchJsonWithTimeout(url);
        const price = json?.[network.priceKey]?.usd;
        if (!Number.isFinite(price)) throw new Error('CoinGecko price unavailable');
        return { usd: price, source: 'CoinGecko' };
      },
      async () => {
        const symbolMap = {
          ETH: 'ETHUSDT',
          BNB: 'BNBUSDT',
          POL: 'POLUSDT',
          AVAX: 'AVAXUSDT',
          xDAI: 'DAIUSDT',
          CELO: 'CELOUSDT',
          KCS: 'KCSUSDT'
        };
        const pair = symbolMap[network.symbol];
        if (!pair) throw new Error('No Binance symbol mapping');
        const url = `https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(pair)}`;
        const json = await fetchJsonWithTimeout(url);
        const price = Number(json?.price);
        if (!Number.isFinite(price)) throw new Error('Binance price unavailable');
        return { usd: price, source: 'Binance' };
      }
    ];

    let lastErr = null;
    for (const fn of fallbacks) {
      try {
        const out = await fn();
        priceCacheSet(network.key, out);
        return out;
      } catch (err) {
        lastErr = err;
      }
    }

    return { usd: null, source: lastErr ? 'Unavailable' : 'Unknown' };
  }

  async function estimateFeesEip1559(rpcUrl) {
    const feeHistory = await rpcCall(rpcUrl, 'eth_feeHistory', ['0x14', 'latest', [10, 50, 90]]);

    if (!feeHistory || !Array.isArray(feeHistory.baseFeePerGas) || !Array.isArray(feeHistory.reward)) {
      throw new Error('feeHistory not supported');
    }

    const baseFees = feeHistory.baseFeePerGas.map(hexToBigInt);
    const rewards = feeHistory.reward.map((row) => row.map(hexToBigInt));

    if (!baseFees.length || !rewards.length) throw new Error('feeHistory returned no data');

    const nextBaseFee = baseFees[baseFees.length - 1];
    const p10 = rewards.map((r) => r[0] || 0n);
    const p50 = rewards.map((r) => r[1] || 0n);
    const p90 = rewards.map((r) => r[2] || 0n);

    const tipSlow = medianBigInt(p10);
    const tipStd = medianBigInt(p50);
    const tipFast = medianBigInt(p90);

    return {
      mode: 'EIP-1559',
      tiers: {
        slow: { maxFee: nextBaseFee * 2n + tipSlow, tip: tipSlow },
        std: { maxFee: nextBaseFee * 2n + tipStd, tip: tipStd },
        fast: { maxFee: nextBaseFee * 2n + tipFast, tip: tipFast }
      }
    };
  }

  async function estimateFeesLegacy(rpcUrl) {
    const gasPriceHex = await rpcCall(rpcUrl, 'eth_gasPrice', []);
    const gasPrice = hexToBigInt(gasPriceHex);

    return {
      mode: 'Legacy fallback',
      tiers: {
        slow: { maxFee: gasPrice, tip: 0n },
        std: { maxFee: (gasPrice * 12n) / 10n, tip: 0n },
        fast: { maxFee: (gasPrice * 15n) / 10n, tip: 0n }
      }
    };
  }

  async function estimateFees(rpcUrl) {
    try {
      return await estimateFeesEip1559(rpcUrl);
    } catch {
      return await estimateFeesLegacy(rpcUrl);
    }
  }

  function setTier(prefix, tier, symbol, usdPrice) {
    const gasUnits = BigInt(getGasUnits());
    const totalWei = gasUnits * tier.maxFee;
    const nativeValue = weiToNativeNumber(totalWei);

    if (els[prefix + 'Max']) els[prefix + 'Max'].textContent = `Max: ${formatGwei(tier.maxFee)}`;
    if (els[prefix + 'Tip']) els[prefix + 'Tip'].textContent = `Tip: ${tier.tip > 0n ? formatGwei(tier.tip) : '—'}`;
    if (els[prefix + 'Total']) els[prefix + 'Total'].textContent = `Gas: ${formatGwei(tier.maxFee)}`;
    if (els[prefix + 'Native']) els[prefix + 'Native'].textContent = formatNative(totalWei, symbol);

    if (els[prefix + 'Usd']) {
      if (Number.isFinite(usdPrice) && nativeValue !== null) {
        els[prefix + 'Usd'].textContent = `${formatUsd(nativeValue * usdPrice)} estimated`;
      } else {
        els[prefix + 'Usd'].textContent = 'USD estimate unavailable';
      }
    }
  }

  function updateUI(feeData, priceInfo) {
    const net = getSelectedNetwork();
    const usdPrice = Number.isFinite(priceInfo?.usd) ? priceInfo.usd : null;

    setTier('slow', feeData.tiers.slow, net.symbol, usdPrice);
    setTier('std', feeData.tiers.std, net.symbol, usdPrice);
    setTier('fast', feeData.tiers.fast, net.symbol, usdPrice);

    if (els.modeText) els.modeText.textContent = feeData.mode;
    if (els.lastUpdated) els.lastUpdated.textContent = `Last updated: ${formatDateTime(new Date())}`;
    if (els.priceSourceText) els.priceSourceText.textContent = priceInfo?.source || 'Unavailable';

    updateSettingsMeta();
  }

  async function testRpc() {
    const rpcUrl = (els.rpcUrl.value || '').trim();
    if (!rpcUrl) {
      setStatus('bad', 'RPC missing', 'Please enter an RPC URL.');
      return;
    }

    setStatus('warn', 'Testing RPC', 'Testing the selected RPC endpoint…');

    try {
      const chainHex = await rpcCall(rpcUrl, 'eth_chainId', []);
      const chainId = parseInt(chainHex, 16);
      setStatus('ok', 'RPC OK', `RPC responded successfully. Chain ID: ${chainId}.`);
    } catch (error) {
      setStatus('bad', 'RPC failed', `RPC test failed: ${error.message}`);
    }
  }

  function buildSummaryText() {
    const net = getSelectedNetwork();
    const preset = getSelectedPreset();

    return [
      'InstantQR EVM Gas Fee Estimator',
      `Network: ${net.name}`,
      `Transaction type: ${preset.label}`,
      `Gas units: ${getGasUnits().toLocaleString()}`,
      `Mode: ${els.modeText ? els.modeText.textContent : '—'}`,
      `USD source: ${els.priceSourceText ? els.priceSourceText.textContent : '—'}`,
      `Slow: ${els.slowNative ? els.slowNative.textContent : '—'} | ${els.slowUsd ? els.slowUsd.textContent : '—'} | ${els.slowMax ? els.slowMax.textContent : '—'} | ${els.slowTip ? els.slowTip.textContent : '—'} | ${els.slowTotal ? els.slowTotal.textContent : '—'}`,
      `Standard: ${els.stdNative ? els.stdNative.textContent : '—'} | ${els.stdUsd ? els.stdUsd.textContent : '—'} | ${els.stdMax ? els.stdMax.textContent : '—'} | ${els.stdTip ? els.stdTip.textContent : '—'} | ${els.stdTotal ? els.stdTotal.textContent : '—'}`,
      `Fast: ${els.fastNative ? els.fastNative.textContent : '—'} | ${els.fastUsd ? els.fastUsd.textContent : '—'} | ${els.fastMax ? els.fastMax.textContent : '—'} | ${els.fastTip ? els.fastTip.textContent : '—'} | ${els.fastTotal ? els.fastTotal.textContent : '—'}`
    ].join('\n');
  }

  async function copySummary() {
    const text = buildSummaryText();
    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setStatus('ok', 'Copied', 'Gas summary copied to clipboard.');
    } catch {
      setStatus('bad', 'Copy failed', 'Unable to copy the summary.');
    }
  }

  async function refresh(useCache = true) {
    if (inflight) return;

    const rpcUrl = (els.rpcUrl.value || '').trim();
    if (!rpcUrl) {
      setStatus('bad', 'RPC missing', 'Please enter an RPC URL.');
      return;
    }

    const net = getSelectedNetwork();
    updateSettingsMeta();

    if (useCache) {
      const cached = cacheGet();
      if (cached) {
        const priceInfo = await getUsdPriceForNetwork(net);
        updateUI(cached, priceInfo);
        setStatus('ok', 'Cached', `${net.name} gas data loaded from short-term cache.`);
        return;
      }
    }

    inflight = true;
    setStatus('warn', 'Refreshing', `Fetching gas data for ${net.name}…`);

    try {
      const [feeData, priceInfo] = await Promise.all([
        estimateFees(rpcUrl),
        getUsdPriceForNetwork(net)
      ]);

      updateUI(feeData, priceInfo);
      cacheSet(feeData);
      setStatus('ok', 'Updated', `${net.name} gas estimates updated successfully using ${feeData.mode}.`);
    } catch (error) {
      setStatus('bad', 'Failed', `Unable to fetch gas data: ${error.message}`);
    } finally {
      inflight = false;
    }
  }

  function populateNetworks() {
    els.network.innerHTML = NETWORKS.map((network) => (
      `<option value="${network.key}">${network.name}</option>`
    )).join('');

    els.network.value = 'eth';
    els.txType.value = 'transfer';

    const selected = getSelectedNetwork();
    els.rpcUrl.value = selected.rpc;

    syncTxPresetUI({ preserveCustom: false });
    updateSettingsMeta();
  }

  function setupAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => refresh(false), AUTO_REFRESH_MS);
  }

  els.network?.addEventListener('change', () => {
    const selected = getSelectedNetwork();
    els.rpcUrl.value = selected.rpc;
    updateSettingsMeta();
    refresh(false);
  });

  els.txType?.addEventListener('change', () => {
    syncTxPresetUI();
    updateSettingsMeta();
    refresh(false);
  });

  els.gasUnits?.addEventListener('input', () => {
    if (els.txType.value !== 'custom') return;
    updateSettingsMeta();
    window.clearTimeout(els.gasUnits._debounce);
    els.gasUnits._debounce = window.setTimeout(() => refresh(false), 300);
  });

  els.rpcUrl?.addEventListener('change', () => refresh(false));
  els.refreshBtn?.addEventListener('click', () => refresh(false));
  els.testBtn?.addEventListener('click', testRpc);
  els.copyBtn?.addEventListener('click', copySummary);

  populateNetworks();
  setStatus('idle', 'Ready', 'Ready to fetch gas data.');
  setupAutoRefresh();
  refresh(true);
});
