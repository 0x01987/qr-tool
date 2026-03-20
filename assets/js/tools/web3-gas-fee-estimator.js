document.addEventListener('DOMContentLoaded', () => {
  const NETWORKS = [
    {
      key: 'eth',
      name: 'Ethereum',
      symbol: 'ETH',
      rpc: 'https://ethereum.publicnode.com',
      coingeckoId: 'ethereum'
    },
    {
      key: 'bsc',
      name: 'BNB Smart Chain',
      symbol: 'BNB',
      rpc: 'https://bsc-dataseed.binance.org',
      coingeckoId: 'binancecoin'
    },
    {
      key: 'arb',
      name: 'Arbitrum One',
      symbol: 'ETH',
      rpc: 'https://arb1.arbitrum.io/rpc',
      coingeckoId: 'ethereum'
    },
    {
      key: 'op',
      name: 'Optimism',
      symbol: 'ETH',
      rpc: 'https://mainnet.optimism.io',
      coingeckoId: 'ethereum'
    },
    {
      key: 'base',
      name: 'Base',
      symbol: 'ETH',
      rpc: 'https://mainnet.base.org',
      coingeckoId: 'ethereum'
    },
    {
      key: 'poly',
      name: 'Polygon',
      symbol: 'POL',
      rpc: 'https://polygon-bor.publicnode.com',
      coingeckoId: 'matic-network'
    },
    {
      key: 'avax',
      name: 'Avalanche C-Chain',
      symbol: 'AVAX',
      rpc: 'https://api.avax.network/ext/bc/C/rpc',
      coingeckoId: 'avalanche-2'
    },
    {
      key: 'gnosis',
      name: 'Gnosis',
      symbol: 'xDAI',
      rpc: 'https://rpc.gnosischain.com',
      coingeckoId: 'xdai'
    },
    {
      key: 'celo',
      name: 'Celo',
      symbol: 'CELO',
      rpc: 'https://forno.celo.org',
      coingeckoId: 'celo'
    },
    {
      key: 'linea',
      name: 'Linea',
      symbol: 'ETH',
      rpc: 'https://rpc.linea.build',
      coingeckoId: 'ethereum'
    },
    {
      key: 'scroll',
      name: 'Scroll',
      symbol: 'ETH',
      rpc: 'https://rpc.scroll.io',
      coingeckoId: 'ethereum'
    },
    {
      key: 'zksync',
      name: 'zkSync Era',
      symbol: 'ETH',
      rpc: 'https://mainnet.era.zksync.io',
      coingeckoId: 'ethereum'
    },
    {
      key: 'kcc',
      name: 'KCC',
      symbol: 'KCS',
      rpc: 'https://rpc-mainnet.kcc.network',
      coingeckoId: 'kucoin-shares'
    }
  ];

  const TX_PRESETS = {
    transfer: { label: 'Transfer', gas: 21000, help: 'Preset gas estimate for a simple native token transfer.' },
    erc20: { label: 'ERC-20 Transfer', gas: 65000, help: 'Typical estimate for sending ERC-20 tokens.' },
    swap: { label: 'Swap', gas: 180000, help: 'Typical estimate for a DEX token swap.' },
    'nft-mint': { label: 'NFT Mint', gas: 250000, help: 'Typical estimate for a basic NFT mint.' },
    'contract-call': { label: 'Contract Call', gas: 140000, help: 'Generic smart contract call estimate.' },
    bridge: { label: 'Bridge', gas: 220000, help: 'Typical estimate for bridging assets.' },
    custom: { label: 'Custom gas units', gas: 21000, help: 'Use your own exact gas estimate.' }
  };

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

    chainText: document.getElementById('chainText'),
    modeText: document.getElementById('modeText'),
    txTypeText: document.getElementById('txTypeText'),
    gasUnitsText: document.getElementById('gasUnitsText'),
    symbolText: document.getElementById('symbolText'),
    priceSourceText: document.getElementById('priceSourceText'),

    slowTotal: document.getElementById('slowTotal'),
    slowMax: document.getElementById('slowMax'),
    slowTip: document.getElementById('slowTip'),
    slowNative: document.getElementById('slowNative'),
    slowUsd: document.getElementById('slowUsd'),

    stdTotal: document.getElementById('stdTotal'),
    stdMax: document.getElementById('stdMax'),
    stdTip: document.getElementById('stdTip'),
    stdNative: document.getElementById('stdNative'),
    stdUsd: document.getElementById('stdUsd'),

    fastTotal: document.getElementById('fastTotal'),
    fastMax: document.getElementById('fastMax'),
    fastTip: document.getElementById('fastTip'),
    fastNative: document.getElementById('fastNative'),
    fastUsd: document.getElementById('fastUsd')
  };

  if (!els.network) return;

  if (els.year) {
    els.year.textContent = String(new Date().getFullYear());
  }

  let rpcCounter = 1;
  let lastSummaryText = '';
  let lastPriceInfo = { usd: null, source: 'Unavailable' };

  function setStatus(kind, text, message) {
    const map = {
      ready: 'var(--muted)',
      ok: 'var(--good)',
      warn: 'var(--warn)',
      bad: 'var(--bad)'
    };

    if (els.statusDot) els.statusDot.style.background = map[kind] || map.ready;
    if (els.statusText) els.statusText.textContent = text || 'Ready';
    if (els.statusMessage) els.statusMessage.textContent = message || text || 'Ready';
  }

  function getSelectedNetwork() {
    return NETWORKS.find((n) => n.key === els.network.value) || NETWORKS[0];
  }

  function formatInt(value) {
    return Number(value).toLocaleString();
  }

  function formatGweiFromWei(weiBigInt) {
    const gwei = Number(weiBigInt) / 1e9;
    if (!Number.isFinite(gwei)) return '—';
    return `${gwei.toFixed(2)} gwei`;
  }

  function formatNativeFromWei(weiBigInt, symbol) {
    const native = Number(weiBigInt) / 1e18;
    if (!Number.isFinite(native)) return '—';
    const text = native >= 1 ? native.toFixed(6) : native.toPrecision(6);
    return `${text} ${symbol}`;
  }

  function formatUsd(weiBigInt, usdPerToken) {
    if (!usdPerToken || !Number.isFinite(usdPerToken)) return 'USD estimate unavailable';
    const native = Number(weiBigInt) / 1e18;
    const usd = native * usdPerToken;
    if (!Number.isFinite(usd)) return 'USD estimate unavailable';
    return `≈ $${usd < 1 ? usd.toFixed(4) : usd.toFixed(2)} USD`;
  }

  function makeJsonRpcBody(method, params) {
    return {
      jsonrpc: '2.0',
      id: rpcCounter++,
      method,
      params
    };
  }

  async function rpcCall(url, method, params) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(makeJsonRpcBody(method, params)),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();

      if (json.error) {
        throw new Error(json.error.message || 'RPC error');
      }

      return json.result;
    } finally {
      clearTimeout(timeout);
    }
  }

  function medianBigInt(values) {
    const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const mid = Math.floor(sorted.length / 2);
    if (!sorted.length) return 0n;
    if (sorted.length % 2 === 1) return sorted[mid];
    return (sorted[mid - 1] + sorted[mid]) / 2n;
  }

  async function estimateFees(rpcUrl) {
    try {
      const feeHistory = await rpcCall(rpcUrl, 'eth_feeHistory', ['0x14', 'latest', [10, 50, 90]]);
      const baseFees = Array.isArray(feeHistory.baseFeePerGas)
        ? feeHistory.baseFeePerGas.map((x) => BigInt(x))
        : [];

      const rewardRows = Array.isArray(feeHistory.reward)
        ? feeHistory.reward.map((row) => row.map((x) => BigInt(x)))
        : [];

      if (!baseFees.length || !rewardRows.length) {
        throw new Error('Fee history incomplete');
      }

      const nextBaseFee = baseFees[baseFees.length - 1];

      const p10 = rewardRows.map((row) => row[0] || 0n);
      const p50 = rewardRows.map((row) => row[1] || 0n);
      const p90 = rewardRows.map((row) => row[2] || 0n);

      const slowTip = medianBigInt(p10);
      const stdTip = medianBigInt(p50);
      const fastTip = medianBigInt(p90);

      return {
        mode: 'EIP-1559',
        tiers: {
          slow: { maxFee: nextBaseFee * 2n + slowTip, tip: slowTip },
          std: { maxFee: nextBaseFee * 2n + stdTip, tip: stdTip },
          fast: { maxFee: nextBaseFee * 2n + fastTip, tip: fastTip }
        }
      };
    } catch (_error) {
      const gasPriceHex = await rpcCall(rpcUrl, 'eth_gasPrice', []);
      const gasPrice = BigInt(gasPriceHex);

      return {
        mode: 'Legacy fallback',
        tiers: {
          slow: { maxFee: gasPrice, tip: 0n },
          std: { maxFee: (gasPrice * 12n) / 10n, tip: 0n },
          fast: { maxFee: (gasPrice * 15n) / 10n, tip: 0n }
        }
      };
    }
  }

  async function fetchTokenPrice(network) {
    const id = network.coingeckoId;
    if (!id) return { usd: null, source: 'Unavailable' };

    const sources = [
      {
        name: 'CoinGecko simple price',
        url: `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`,
        parse: async (response) => {
          const json = await response.json();
          return Number(json?.[id]?.usd) || null;
        }
      },
      {
        name: 'CoinGecko market data',
        url: `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}`,
        parse: async (response) => {
          const json = await response.json();
          return Number(json?.market_data?.current_price?.usd) || null;
        }
      }
    ];

    for (const source of sources) {
      try {
        const response = await fetch(source.url, { cache: 'no-store' });
        if (!response.ok) continue;
        const usd = await source.parse(response);
        if (usd && Number.isFinite(usd)) {
          return { usd, source: source.name };
        }
      } catch (_error) {}
    }

    return { usd: null, source: 'Unavailable' };
  }

  function applyTier(prefix, tier, symbol, usdPerToken) {
    const gasUnits = Math.max(1, parseInt(els.gasUnits.value || '21000', 10));
    const totalWei = BigInt(gasUnits) * tier.maxFee;
    const oneLine = `${formatGweiFromWei(tier.maxFee)} max • ${tier.tip > 0n ? formatGweiFromWei(tier.tip) : 'legacy'} tip`;

    els[`${prefix}Total`].textContent = oneLine;
    els[`${prefix}Max`].textContent = formatGweiFromWei(tier.maxFee);
    els[`${prefix}Tip`].textContent = tier.tip > 0n ? formatGweiFromWei(tier.tip) : 'Legacy gas price';
    els[`${prefix}Native`].textContent = formatNativeFromWei(totalWei, symbol);
    els[`${prefix}Usd`].textContent = formatUsd(totalWei, usdPerToken);
  }

  function updateMeta(network, fees, priceInfo) {
    els.chainText.textContent = network.name;
    els.modeText.textContent = fees.mode;
    els.txTypeText.textContent = TX_PRESETS[els.txType.value]?.label || 'Custom';
    els.gasUnitsText.textContent = formatInt(Math.max(1, parseInt(els.gasUnits.value || '21000', 10)));
    els.symbolText.textContent = network.symbol;
    els.priceSourceText.textContent = priceInfo.source || 'Unavailable';
  }

  function updateLastUpdated() {
    const ts = new Date().toLocaleString();
    els.lastUpdated.textContent = `Last updated: ${ts}`;
  }

  function buildSummary(network, fees, priceInfo) {
    const gasUnits = Math.max(1, parseInt(els.gasUnits.value || '21000', 10));
    const stdWei = BigInt(gasUnits) * fees.tiers.std.maxFee;

    return [
      `Network: ${network.name}`,
      `Mode: ${fees.mode}`,
      `Transaction type: ${TX_PRESETS[els.txType.value]?.label || 'Custom'}`,
      `Gas units: ${formatInt(gasUnits)}`,
      `Standard fee line: ${formatGweiFromWei(fees.tiers.std.maxFee)} max / ${fees.tiers.std.tip > 0n ? formatGweiFromWei(fees.tiers.std.tip) : 'legacy'} tip`,
      `Estimated cost: ${formatNativeFromWei(stdWei, network.symbol)}`,
      `${formatUsd(stdWei, priceInfo.usd)}`,
      `Price source: ${priceInfo.source || 'Unavailable'}`
    ].join('\n');
  }

  function updatePreset() {
    const preset = TX_PRESETS[els.txType.value] || TX_PRESETS.custom;
    els.txTypeHelp.textContent = preset.help;
    els.txTypeText.textContent = preset.label;

    if (els.txType.value !== 'custom') {
      els.gasUnits.value = String(preset.gas);
    }

    els.gasUnitsHelp.textContent = `Preset loaded: ${formatInt(parseInt(els.gasUnits.value || String(preset.gas), 10))} gas units for ${preset.label.toLowerCase()}.`;
    els.gasUnitsText.textContent = formatInt(Math.max(1, parseInt(els.gasUnits.value || '21000', 10)));
  }

  function populateNetworks() {
    els.network.innerHTML = NETWORKS.map((network) => {
      return `<option value="${network.key}">${network.name}</option>`;
    }).join('');

    els.network.value = 'eth';
    const current = getSelectedNetwork();
    els.rpcUrl.value = current.rpc;
    els.chainText.textContent = current.name;
    els.symbolText.textContent = current.symbol;
  }

  async function refreshEstimates() {
    const network = getSelectedNetwork();
    const rpcUrl = (els.rpcUrl.value || '').trim();

    if (!rpcUrl) {
      setStatus('bad', 'RPC required', 'Enter an RPC URL first.');
      return;
    }

    setStatus('warn', 'Fetching', `Fetching gas data for ${network.name}...`);

    try {
      const [fees, priceInfo] = await Promise.all([
        estimateFees(rpcUrl),
        fetchTokenPrice(network)
      ]);

      lastPriceInfo = priceInfo;

      applyTier('slow', fees.tiers.slow, network.symbol, priceInfo.usd);
      applyTier('std', fees.tiers.std, network.symbol, priceInfo.usd);
      applyTier('fast', fees.tiers.fast, network.symbol, priceInfo.usd);

      updateMeta(network, fees, priceInfo);
      updateLastUpdated();

      lastSummaryText = buildSummary(network, fees, priceInfo);

      setStatus('ok', 'Updated', `${network.name} gas estimates updated successfully.`);
    } catch (error) {
      setStatus('bad', 'Failed', error?.message || 'Unable to fetch gas data.');
    }
  }

  async function testRpc() {
    const rpcUrl = (els.rpcUrl.value || '').trim();

    if (!rpcUrl) {
      setStatus('bad', 'RPC required', 'Enter an RPC URL to test.');
      return;
    }

    setStatus('warn', 'Testing', 'Testing RPC endpoint...');

    try {
      const chainIdHex = await rpcCall(rpcUrl, 'eth_chainId', []);
      const chainId = parseInt(chainIdHex, 16);
      setStatus('ok', 'RPC OK', `RPC responded successfully. chainId: ${chainId}`);
    } catch (error) {
      setStatus('bad', 'RPC error', error?.message || 'RPC test failed.');
    }
  }

  async function copySummary() {
    if (!lastSummaryText) {
      setStatus('warn', 'Nothing to copy', 'Refresh estimates first, then copy the summary.');
      return;
    }

    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(lastSummaryText);
      } else {
        await navigator.clipboard.writeText(lastSummaryText);
      }
      setStatus('ok', 'Copied', 'Gas fee summary copied to clipboard.');
    } catch (_error) {
      setStatus('bad', 'Copy failed', 'Could not copy the gas fee summary.');
    }
  }

  els.network.addEventListener('change', () => {
    const network = getSelectedNetwork();
    els.rpcUrl.value = network.rpc;
    els.chainText.textContent = network.name;
    els.symbolText.textContent = network.symbol;
    refreshEstimates();
  });

  els.txType.addEventListener('change', () => {
    updatePreset();
    refreshEstimates();
  });

  els.gasUnits.addEventListener('input', () => {
    const value = Math.max(1, parseInt(els.gasUnits.value || '21000', 10));
    els.gasUnitsText.textContent = formatInt(value);
    els.gasUnitsHelp.textContent = `Using ${formatInt(value)} gas units for this estimate.`;
  });

  els.refreshBtn.addEventListener('click', refreshEstimates);
  els.testBtn.addEventListener('click', testRpc);
  els.copyBtn.addEventListener('click', copySummary);

  populateNetworks();
  updatePreset();
  setStatus('ready', 'Ready', 'Ready to fetch gas data.');
  refreshEstimates();
});
