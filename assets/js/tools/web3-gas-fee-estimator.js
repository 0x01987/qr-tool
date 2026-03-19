document.addEventListener('DOMContentLoaded', () => {
  const NETWORKS = [
    { key: 'eth',    name: 'Ethereum',                  chainId: 1,      symbol: 'ETH',  rpc: 'https://ethereum.publicnode.com' },
    { key: 'bsc',    name: 'BNB Smart Chain',           chainId: 56,     symbol: 'BNB',  rpc: 'https://bsc-dataseed.binance.org' },
    { key: 'arb',    name: 'Arbitrum One',              chainId: 42161,  symbol: 'ETH',  rpc: 'https://arb1.arbitrum.io/rpc' },
    { key: 'op',     name: 'Optimism',                  chainId: 10,     symbol: 'ETH',  rpc: 'https://mainnet.optimism.io' },
    { key: 'base',   name: 'Base',                      chainId: 8453,   symbol: 'ETH',  rpc: 'https://mainnet.base.org' },
    { key: 'poly',   name: 'Polygon PoS',               chainId: 137,    symbol: 'POL',  rpc: 'https://polygon-bor.publicnode.com' },
    { key: 'avax',   name: 'Avalanche C-Chain',         chainId: 43114,  symbol: 'AVAX', rpc: 'https://api.avax.network/ext/bc/C/rpc' },
    { key: 'gnosis', name: 'Gnosis',                    chainId: 100,    symbol: 'xDAI', rpc: 'https://rpc.gnosischain.com' },
    { key: 'celo',   name: 'Celo',                      chainId: 42220,  symbol: 'CELO', rpc: 'https://forno.celo.org' },
    { key: 'zksync', name: 'zkSync Era',                chainId: 324,    symbol: 'ETH',  rpc: 'https://mainnet.era.zksync.io' },
    { key: 'linea',  name: 'Linea',                     chainId: 59144,  symbol: 'ETH',  rpc: 'https://rpc.linea.build' },
    { key: 'scroll', name: 'Scroll',                    chainId: 534352, symbol: 'ETH',  rpc: 'https://rpc.scroll.io' },
    { key: 'kcc',    name: 'KCC (KuCoin Community Chain)', chainId: 321, symbol: 'KCS', rpc: 'https://rpc-mainnet.kcc.network' }
  ];

  const els = {
    year: document.getElementById('year'),
    network: document.getElementById('network'),
    gasUnits: document.getElementById('gasUnits'),
    rpcUrl: document.getElementById('rpcUrl'),
    refreshBtn: document.getElementById('refreshBtn'),
    testBtn: document.getElementById('testBtn'),
    autoRefresh: document.getElementById('autoRefresh'),
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    lastUpdated: document.getElementById('lastUpdated'),

    slowMax: document.getElementById('slowMax'),
    slowTip: document.getElementById('slowTip'),
    slowTotal: document.getElementById('slowTotal'),
    slowNative: document.getElementById('slowNative'),

    stdMax: document.getElementById('stdMax'),
    stdTip: document.getElementById('stdTip'),
    stdTotal: document.getElementById('stdTotal'),
    stdNative: document.getElementById('stdNative'),

    fastMax: document.getElementById('fastMax'),
    fastTip: document.getElementById('fastTip'),
    fastTotal: document.getElementById('fastTotal'),
    fastNative: document.getElementById('fastNative')
  };

  if (els.year) {
    els.year.textContent = new Date().getFullYear();
  }

  const RPC_TIMEOUT_MS = 5000;
  const AUTO_REFRESH_MS = 15000;
  const CACHE_TTL_MS = 15000;

  let timer = null;
  let rpcId = 1;
  let inflight = null;
  let gasDebounce = null;

  function setStatus(kind, text) {
    const colors = {
      ok: 'var(--ok)',
      warn: 'var(--warn)',
      bad: 'var(--danger)',
      idle: 'var(--warn)'
    };

    if (els.statusDot) {
      els.statusDot.style.background = colors[kind] || colors.idle;
    }
    if (els.statusText) {
      els.statusText.textContent = text;
    }
  }

  function gweiFromWei(weiBigInt) {
    const gwei = Number(weiBigInt) / 1e9;
    if (!Number.isFinite(gwei)) return '—';
    return `${gwei.toFixed(2)} gwei`;
  }

  function formatNative(weiBigInt, symbol) {
    const val = Number(weiBigInt) / 1e18;
    if (!Number.isFinite(val)) return '—';
    const out = val >= 1 ? val.toFixed(6) : val.toPrecision(6);
    return `${out} ${symbol}`;
  }

  function formatTotalFeePerGas(weiBigInt) {
    return gweiFromWei(weiBigInt);
  }

  function abortableFetch(url, opts = {}, timeoutMs = RPC_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, { ...opts, signal: controller.signal })
      .finally(() => clearTimeout(timeout));
  }

  async function rpcCall(url, method, params) {
    const body = {
      jsonrpc: '2.0',
      id: rpcId++,
      method,
      params
    };

    const response = await abortableFetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }, RPC_TIMEOUT_MS);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'RPC error');
    }

    return data.result;
  }

  function median(arr) {
    const sorted = [...arr].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2n;
  }

  async function estimateFees(rpcUrl) {
    const blockCount = '0x14';
    const newestBlock = 'latest';
    const percentiles = [10, 50, 90];

    try {
      const feeHistory = await rpcCall(rpcUrl, 'eth_feeHistory', [blockCount, newestBlock, percentiles]);

      const baseFees = feeHistory.baseFeePerGas.map((x) => BigInt(x));
      const nextBaseFee = baseFees[baseFees.length - 1];

      const rewards = (feeHistory.reward || []).map((row) => row.map((x) => BigInt(x)));
      if (!rewards.length) {
        throw new Error('feeHistory missing reward data');
      }

      const p10 = rewards.map((r) => r[0]);
      const p50 = rewards.map((r) => r[1]);
      const p90 = rewards.map((r) => r[2]);

      const tipSlow = median(p10);
      const tipStd = median(p50);
      const tipFast = median(p90);

      const maxSlow = nextBaseFee * 2n + tipSlow;
      const maxStd = nextBaseFee * 2n + tipStd;
      const maxFast = nextBaseFee * 2n + tipFast;

      return {
        mode: 'eip1559',
        tiers: {
          slow: { maxFee: maxSlow, tip: tipSlow },
          std: { maxFee: maxStd, tip: tipStd },
          fast: { maxFee: maxFast, tip: tipFast }
        }
      };
    } catch (_) {
      const gasPriceHex = await rpcCall(rpcUrl, 'eth_gasPrice', []);
      const gasPrice = BigInt(gasPriceHex);

      const slow = gasPrice;
      const std = (gasPrice * 12n) / 10n;
      const fast = (gasPrice * 15n) / 10n;

      return {
        mode: 'legacy',
        tiers: {
          slow: { maxFee: slow, tip: 0n },
          std: { maxFee: std, tip: 0n },
          fast: { maxFee: fast, tip: 0n }
        }
      };
    }
  }

  function getSelectedNetwork() {
    return NETWORKS.find((n) => n.key === els.network.value) || NETWORKS[0];
  }

  function updateUI(fees) {
    const gasUnits = Math.max(1, parseInt(els.gasUnits.value || '21000', 10));
    const gas = BigInt(gasUnits);
    const net = getSelectedNetwork();
    const symbol = net.symbol;

    function setTier(prefix, tier) {
      const totalWei = gas * tier.maxFee;

      if (els[prefix + 'Max']) {
        els[prefix + 'Max'].textContent = gweiFromWei(tier.maxFee);
      }
      if (els[prefix + 'Tip']) {
        els[prefix + 'Tip'].textContent = tier.tip > 0n ? gweiFromWei(tier.tip) : '—';
      }
      if (els[prefix + 'Total']) {
        els[prefix + 'Total'].textContent = formatTotalFeePerGas(tier.maxFee);
      }
      if (els[prefix + 'Native']) {
        els[prefix + 'Native'].textContent = formatNative(totalWei, symbol);
      }
    }

    setTier('slow', fees.tiers.slow);
    setTier('std', fees.tiers.std);
    setTier('fast', fees.tiers.fast);

    if (els.lastUpdated) {
      els.lastUpdated.textContent = `Last updated: ${new Date().toLocaleString()}`;
    }
  }

  async function testRpc() {
    setStatus('warn', 'Testing RPC…');

    try {
      const url = (els.rpcUrl.value || '').trim();
      if (!url) throw new Error('Enter an RPC URL');

      const chainIdHex = await rpcCall(url, 'eth_chainId', []);
      const chainId = parseInt(chainIdHex, 16);
      setStatus('ok', `RPC OK (chainId ${chainId})`);
    } catch (error) {
      setStatus('bad', `RPC error: ${error.message}`);
    }
  }

  function cacheKey() {
    const url = (els.rpcUrl.value || '').trim();
    const gas = (els.gasUnits.value || '').trim();
    return `gasfee:${els.network.value}:${gas}:${url}`;
  }

  function cacheGet() {
    try {
      const raw = sessionStorage.getItem(cacheKey());
      if (!raw) return null;

      const obj = JSON.parse(raw);
      if (!obj || !obj.t || !obj.v) return null;
      if (Date.now() - obj.t > CACHE_TTL_MS) return null;

      return obj.v;
    } catch (_) {
      return null;
    }
  }

  function cacheSet(value) {
    try {
      sessionStorage.setItem(cacheKey(), JSON.stringify({
        t: Date.now(),
        v: value
      }));
    } catch (_) {}
  }

  async function refresh() {
    const url = (els.rpcUrl.value || '').trim();
    if (!url) {
      setStatus('bad', 'Enter an RPC URL');
      return;
    }

    if (inflight) return inflight;

    const cached = cacheGet();
    if (cached) {
      updateUI(cached);
      const net = getSelectedNetwork();
      setStatus('ok', `${net.name}: cached`);
      return;
    }

    setStatus('warn', 'Fetching gas data…');

    inflight = (async () => {
      try {
        const fees = await estimateFees(url);
        updateUI(fees);
        cacheSet(fees);

        const net = getSelectedNetwork();
        setStatus('ok', `${net.name}: updated`);
      } catch (error) {
        setStatus('bad', `Failed: ${error.message}`);
      } finally {
        inflight = null;
      }
    })();

    return inflight;
  }

  function populateNetworks() {
    els.network.innerHTML = NETWORKS.map((network) => (
      `<option value="${network.key}">${network.name}</option>`
    )).join('');

    els.network.value = 'eth';

    const current = getSelectedNetwork();
    if (current) {
      els.rpcUrl.value = current.rpc;
    }
  }

  function setAutoRefresh(enabled) {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    if (enabled) {
      timer = setInterval(() => {
        refresh();
      }, AUTO_REFRESH_MS);
    }
  }

  els.network?.addEventListener('change', () => {
    const net = getSelectedNetwork();
    els.rpcUrl.value = net ? net.rpc : '';
    refresh();
  });

  els.gasUnits?.addEventListener('input', () => {
    if (gasDebounce) clearTimeout(gasDebounce);
    gasDebounce = setTimeout(() => refresh(), 350);
  });

  els.refreshBtn?.addEventListener('click', refresh);
  els.testBtn?.addEventListener('click', testRpc);
  els.autoRefresh?.addEventListener('change', (e) => {
    setAutoRefresh(e.target.checked);
  });

  populateNetworks();
  setStatus('idle', 'Ready');
  refresh();
});
