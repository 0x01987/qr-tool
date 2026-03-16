document.addEventListener('DOMContentLoaded', () => {
  const CHAINS = {
    ethereum: {
      label: 'Ethereum',
      chainId: 1,
      rpc: ['https://ethereum-rpc.publicnode.com', 'https://cloudflare-eth.com/v1/mainnet'],
      explorerAddress: 'https://etherscan.io/address/',
      logScanBlocks: 5000,
      sample: { address: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', label: 'USDC' },
      compareSample: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', label: 'USDT' }
    },
    base: {
      label: 'Base',
      chainId: 8453,
      rpc: ['https://base-rpc.publicnode.com'],
      explorerAddress: 'https://basescan.org/address/',
      logScanBlocks: 8000,
      sample: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', label: 'USDC' },
      compareSample: { address: '0xd9AAEC86B65d86f6A7B5B1b0c42FFA531710B6CA', label: 'USDbC-like stable' }
    },
    arbitrum: {
      label: 'Arbitrum One',
      chainId: 42161,
      rpc: ['https://arbitrum-one-rpc.publicnode.com'],
      explorerAddress: 'https://arbiscan.io/address/',
      logScanBlocks: 12000,
      sample: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', label: 'USDC' },
      compareSample: { address: '0xFd086bC7CD5C481DCC9C85ebe478A1C0b69FCbb9', label: 'USDT' }
    },
    optimism: {
      label: 'Optimism',
      chainId: 10,
      rpc: ['https://optimism-rpc.publicnode.com'],
      explorerAddress: 'https://optimistic.etherscan.io/address/',
      logScanBlocks: 12000,
      sample: { address: '0x0b2C639c533813f4Aa9D7837CaF62653d097Ff85', label: 'USDC' },
      compareSample: { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', label: 'USDT' }
    },
    bsc: {
      label: 'BNB Smart Chain',
      chainId: 56,
      rpc: ['https://bsc-rpc.publicnode.com'],
      explorerAddress: 'https://bscscan.com/address/',
      logScanBlocks: 8000,
      sample: { address: '0x55d398326f99059fF775485246999027B3197955', label: 'USDT' },
      compareSample: { address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', label: 'USDC' }
    },
    polygon: {
      label: 'Polygon',
      chainId: 137,
      rpc: ['https://polygon-bor-rpc.publicnode.com'],
      explorerAddress: 'https://polygonscan.com/address/',
      logScanBlocks: 12000,
      sample: { address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', label: 'USDC' },
      compareSample: { address: '0xc2132D05D31c914a87C6611C10748AaCBFfE5b58', label: 'USDT' }
    },
    avalanche: {
      label: 'Avalanche C-Chain',
      chainId: 43114,
      rpc: ['https://avalanche-c-chain-rpc.publicnode.com'],
      explorerAddress: 'https://snowtrace.io/address/',
      logScanBlocks: 8000,
      sample: { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', label: 'USDC' },
      compareSample: { address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', label: 'USDT' }
    }
  };

  const SELECTORS = {
    name: '0x06fdde03',
    symbol: '0x95d89b41',
    decimals: '0x313ce567',
    totalSupply: '0x18160ddd',
    owner: '0x8da5cb5b',
    getOwner: '0x893d20e8',
    paused: '0x5c975abb',
    balanceOf: '0x70a08231',
    allowance: '0xdd62ed3e',
    transfer: '0xa9059cbb',
    approve: '0x095ea7b3',
    transferFrom: '0x23b872dd',
    implementation: '0x5c60da1b',
    maxTxAmount: '0xec28438a',
    maxWalletSize: '0x25b34b64',
    tradingOpen: '0xc9567bf9',
    blacklist: '0xf9f92be4',
    isBlacklisted: '0xfe575a87',
    taxFee: '0x95d89b41' // placeholder kept harmless; actual scan is bytecode-based
  };

  const TOPICS = {
    transfer: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55aee523b3ef',
    approval: '0x8c5be1e5ebec7d5bd14f714f6d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925'
  };

  const EIP1967_IMPLEMENTATION_SLOT =
    '0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC';
  const EIP1967_ADMIN_SLOT =
    '0xB53127684A568B3173AE13B9F8A6016E243E63B6E8EE1178D6A717850B5D6103';
  const EIP1967_BEACON_SLOT =
    '0xA3F0AD74E5423AEBFD80D3EF4346578335A9A72AEAEE59FF6CB3582B35133D50';

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';

  const KNOWN_DANGER_SELECTORS = [
    { selector: '8456cb59', label: 'pause()' },
    { selector: '3f4ba83a', label: 'unpause()' },
    { selector: '5c975abb', label: 'paused()' },
    { selector: 'f2fde38b', label: 'transferOwnership(address)' },
    { selector: '715018a6', label: 'renounceOwnership()' },
    { selector: '8da5cb5b', label: 'owner()' },
    { selector: '4f1ef286', label: 'setFees(...)' },
    { selector: 'c1fb8f73', label: 'setTaxFeePercent(...)' },
    { selector: 'f887ea40', label: 'excludeFromFee(address)' },
    { selector: '0e94a4f1', label: 'includeInFee(address)' },
    { selector: '6e553f65', label: 'setBlacklist(...)' },
    { selector: '4bb278f3', label: 'blacklist(address)' },
    { selector: 'ec70b0a3', label: 'setTradingEnabled(...)' },
    { selector: '8a8c523c', label: 'enableTrading()' },
    { selector: '40c10f19', label: 'mint(address,uint256)' },
    { selector: '42966c68', label: 'burn(uint256)' },
    { selector: '79cc6790', label: 'setMaxTxAmount(...)' },
    { selector: '677daa57', label: 'setMaxWalletSize(...)' },
    { selector: '13af4035', label: 'setSwapEnabled(...)' },
    { selector: '1f7b4f30', label: 'setRouterAddress(...)' },
    { selector: '89afcb44', label: 'upgradeTo(address)' },
    { selector: '3659cfe6', label: 'upgradeToAndCall(address,bytes)' }
  ];

  const ui = {
    contractAddress: document.getElementById('contractAddress'),
    compareAddress: document.getElementById('compareAddress'),
    networkSelect: document.getElementById('networkSelect'),
    networkLabel: document.getElementById('networkLabel'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    copyBtn: document.getElementById('copyBtn'),
    exportBtn: document.getElementById('exportBtn'),
    clearBtn: document.getElementById('clearBtn'),
    trimBtn: document.getElementById('trimBtn'),
    pasteBtn: document.getElementById('pasteBtn'),
    sampleBtn: document.getElementById('sampleBtn'),
    sampleCompareBtn: document.getElementById('sampleCompareBtn'),

    statusBadge: document.getElementById('statusBadge'),
    resultText: document.getElementById('resultText'),
    formulaText: document.getElementById('formulaText'),

    contractSummary: document.getElementById('contractSummary'),
    symbolSummary: document.getElementById('symbolSummary'),
    decimalsSummary: document.getElementById('decimalsSummary'),
    modeLabel: document.getElementById('modeLabel'),

    tokenName: document.getElementById('tokenName'),
    tokenSymbol: document.getElementById('tokenSymbol'),
    totalSupply: document.getElementById('totalSupply'),
    bytecodeSize: document.getElementById('bytecodeSize'),

    addressOut: document.getElementById('addressOut'),
    decimalsOut: document.getElementById('decimalsOut'),
    lastUpdated: document.getElementById('lastUpdated'),
    functionSupport: document.getElementById('functionSupport'),
    analysisNote: document.getElementById('analysisNote'),

    behaviorSummary: document.getElementById('behaviorSummary'),
    behaviorDetails: document.getElementById('behaviorDetails'),
    proxySummary: document.getElementById('proxySummary'),
    proxyDetails: document.getElementById('proxyDetails'),
    logSummary: document.getElementById('logSummary'),
    holderSummary: document.getElementById('holderSummary'),
    dangerSummary: document.getElementById('dangerSummary'),
    dangerDetails: document.getElementById('dangerDetails'),
    implementationSummary: document.getElementById('implementationSummary'),
    implementationDetails: document.getElementById('implementationDetails'),

    warningScoreValue: document.getElementById('warningScoreValue'),
    warningScoreFill: document.getElementById('warningScoreFill'),
    warningScoreLegend: document.getElementById('warningScoreLegend'),

    explorerContractLink: document.getElementById('explorerContractLink'),
    explorerImplLink: document.getElementById('explorerImplLink'),
    explorerAdminLink: document.getElementById('explorerAdminLink'),

    rawRpcText: document.getElementById('rawRpcText'),
    logBundle: document.getElementById('logBundle'),
    compareSection: document.getElementById('compareSection'),
    compareBody: document.getElementById('compareBody'),
    compareTableText: document.getElementById('compareTableText')
  };

  let isLoading = false;
  let lastSummary = '';
  let lastReport = null;

  function getChain() {
    return CHAINS[ui.networkSelect.value] || CHAINS.ethereum;
  }

  function setStatus(text, kind = '') {
    ui.statusBadge.className = 'badge' + (kind ? ' ' + kind : '');
    ui.statusBadge.textContent = text;
  }

  function setMode(text) {
    ui.modeLabel.textContent = text;
  }

  function setText(el, text) {
    if (el) el.textContent = text;
  }

  function normalizeAddress(value) {
    return String(value || '').trim();
  }

  function isValidAddress(value) {
    return /^0x[a-fA-F0-9]{40}$/.test(value);
  }

  function strip0x(v) {
    return String(v || '').replace(/^0x/, '');
  }

  function nowLabel() {
    return new Date().toLocaleTimeString();
  }

  function clearLink(el) {
    if (!el) return;
    el.hidden = true;
    el.removeAttribute('href');
  }

  function setLink(el, href, label) {
    if (!el || !href) return clearLink(el);
    el.href = href;
    el.textContent = label;
    el.hidden = false;
  }

  function padAddress(address) {
    return strip0x(address).toLowerCase().padStart(64, '0');
  }

  function padUint(v) {
    return BigInt(v).toString(16).padStart(64, '0');
  }

  function hexToBigIntSafe(hex) {
    try { return BigInt(hex || '0x0'); } catch { return 0n; }
  }

  function decodeAddress(hex) {
    const clean = strip0x(hex);
    if (clean.length < 40) return '';
    const addr = '0x' + clean.slice(-40);
    return isValidAddress(addr) ? addr : '';
  }

  function decodeBool(hex) {
    return hexToBigIntSafe(hex) === 1n;
  }

  function decodeUtf8Hex(hex) {
    const clean = strip0x(hex);
    if (!clean) return '';
    const bytes = [];
    for (let i = 0; i < clean.length; i += 2) {
      const chunk = clean.slice(i, i + 2);
      if (chunk.length === 2) bytes.push(parseInt(chunk, 16));
    }
    try {
      return new TextDecoder().decode(new Uint8Array(bytes)).replace(/\0/g, '').trim();
    } catch {
      return '';
    }
  }

  function decodeStringHex(resultHex) {
    const clean = strip0x(resultHex);
    if (!clean) return '';
    try {
      if (clean.length >= 128) {
        const offset = parseInt(clean.slice(0, 64), 16);
        const lenIndex = offset * 2;
        const len = parseInt(clean.slice(lenIndex, lenIndex + 64), 16);
        const dataStart = lenIndex + 64;
        const dataHex = clean.slice(dataStart, dataStart + len * 2);
        const v = decodeUtf8Hex(dataHex);
        if (v) return v;
      }
      return decodeUtf8Hex(clean);
    } catch {
      return '';
    }
  }

  function countBytecodeBytes(codeHex) {
    return Math.floor(strip0x(codeHex).length / 2);
  }

  function formatSupply(raw, decimals) {
    if (raw == null) return '—';
    if (!Number.isInteger(decimals) || decimals < 0) return raw.toString();
    const divisor = 10n ** BigInt(decimals);
    const whole = raw / divisor;
    const frac = raw % divisor;
    const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
    return fracStr ? `${whole}.${fracStr}` : `${whole}`;
  }

  function normalizeStorageAddress(value) {
    const clean = strip0x(value);
    if (!clean || /^0+$/.test(clean)) return '';
    return decodeAddress('0x' + clean);
  }

  function looksLikeProxy(codeHex) {
    const code = strip0x(codeHex).toLowerCase();
    return code.includes('363d3d373d3d3d363d73') || code.includes('5af43d82803e903d91602b57fd5bf3');
  }

  function dangerScore(flags) {
    let score = 0;
    flags.forEach((f) => {
      if (f.level === 'high') score += 25;
      else if (f.level === 'medium') score += 12;
      else score += 4;
    });
    return Math.max(0, Math.min(100, score));
  }

  function updateScore(score) {
    setText(ui.warningScoreValue, `${score} / 100`);
    ui.warningScoreFill.style.width = `${score}%`;

    let label = 'Lower is better. This is a quick screening score, not a final safety verdict.';
    if (score >= 70) label = 'High warning score. Review carefully before trusting this contract.';
    else if (score >= 40) label = 'Moderate warning score. Multiple caution signals were found.';
    else if (score > 0) label = 'Low-to-moderate warning score. Some caution signals were found.';
    else label = 'Very low warning score from basic checks. This is still not a guarantee of safety.';

    setText(ui.warningScoreLegend, label);
  }

  async function fetchWithTimeout(url, options, timeoutMs = 7000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
    } finally {
      clearTimeout(timer);
    }
  }

  async function rpcCall(endpoint, method, params = []) {
    const res = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Math.floor(Math.random() * 1e9),
        method,
        params
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || 'RPC error');
    return json.result;
  }

  async function rpcTryAll(method, params = []) {
    const chain = getChain();
    let lastError = null;
    for (const endpoint of chain.rpc) {
      try {
        const result = await rpcCall(endpoint, method, params);
        return { ok: true, endpoint, result };
      } catch (err) {
        lastError = err;
      }
    }
    return { ok: false, endpoint: '', result: null, error: lastError };
  }

  async function ethCall(address, data) {
    return rpcTryAll('eth_call', [{ to: address, data }, 'latest']);
  }

  async function callString(address, selector) {
    const res = await ethCall(address, selector);
    if (!res.ok || !res.result || res.result === '0x') return { ok: false, value: '' };
    const value = decodeStringHex(res.result);
    return { ok: !!value, value, raw: res.result };
  }

  async function callUint(address, selector) {
    const res = await ethCall(address, selector);
    if (!res.ok || !res.result || res.result === '0x') return { ok: false, value: null, raw: res.result || '' };
    return { ok: true, value: hexToBigIntSafe(res.result), raw: res.result };
  }

  async function callBool(address, selector) {
    const res = await ethCall(address, selector);
    if (!res.ok || !res.result || res.result === '0x') return { ok: false, value: null, raw: res.result || '' };
    return { ok: true, value: decodeBool(res.result), raw: res.result };
  }

  async function callAddress(address, selector) {
    const res = await ethCall(address, selector);
    if (!res.ok || !res.result || res.result === '0x') return { ok: false, value: '', raw: res.result || '' };
    return { ok: true, value: decodeAddress(res.result), raw: res.result };
  }

  async function simulate(address, data) {
    const res = await ethCall(address, data);
    if (!res.ok) {
      return { ok: false, reverted: true, empty: false, bool: null, raw: '', error: String(res.error?.message || res.error || 'Call failed') };
    }
    const raw = res.result || '0x';
    if (raw === '0x') return { ok: true, reverted: false, empty: true, bool: null, raw };
    const v = hexToBigIntSafe(raw);
    const bool = (v === 0n || v === 1n) ? (v === 1n) : null;
    return { ok: true, reverted: false, empty: false, bool, raw };
  }

  function summarizeSim(label, sim) {
    if (!sim.ok && sim.reverted) return `${label}: reverted`;
    if (sim.ok && sim.empty) return `${label}: returned no data`;
    if (sim.ok && typeof sim.bool === 'boolean') return `${label}: returned ${sim.bool}`;
    if (sim.ok) return `${label}: returned data`;
    return `${label}: failed`;
  }

  async function getLogs(address, fromBlock, toBlock, topics) {
    return rpcTryAll('eth_getLogs', [{ address, fromBlock, toBlock, topics }]);
  }

  function parseTransferAddresses(log) {
    const topics = Array.isArray(log.topics) ? log.topics : [];
    if (topics.length < 3) return null;
    const from = decodeAddress(topics[1]);
    const to = decodeAddress(topics[2]);
    if (!from || !to) return null;
    return { from, to };
  }

  function buildHolderSummary(transferLogs) {
    const counts = new Map();
    transferLogs.forEach((log) => {
      const row = parseTransferAddresses(log);
      if (!row || row.to.toLowerCase() === ZERO_ADDRESS.toLowerCase()) return;
      counts.set(row.to.toLowerCase(), (counts.get(row.to.toLowerCase()) || 0) + 1);
    });
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!top.length) return 'No recent holder activity observed from scanned logs';
    return `Observed ${counts.size} recipient address(es). Top recent recipients: ${top.map(([addr, n]) => `${addr.slice(0,6)}…${addr.slice(-4)} (${n})`).join(', ')}`;
  }

  function scanDangerSelectors(codeHex) {
    const code = strip0x(codeHex).toLowerCase();
    return KNOWN_DANGER_SELECTORS.filter((item) => code.includes(item.selector.toLowerCase()));
  }

  async function analyzeImplementation(address) {
    if (!address || !isValidAddress(address)) return { ok: false };
    const codeRes = await rpcTryAll('eth_getCode', [address, 'latest']);
    if (!codeRes.ok || !codeRes.result || codeRes.result === '0x') return { ok: false };

    const [nameRes, symbolRes, decimalsRes, ownerRes, pausedRes] = await Promise.all([
      callString(address, SELECTORS.name),
      callString(address, SELECTORS.symbol),
      callUint(address, SELECTORS.decimals),
      callAddress(address, SELECTORS.owner),
      callBool(address, SELECTORS.paused)
    ]);

    return {
      ok: true,
      address,
      bytecodeSize: countBytecodeBytes(codeRes.result),
      name: nameRes.ok ? nameRes.value : '',
      symbol: symbolRes.ok ? symbolRes.value : '',
      decimals: decimalsRes.ok && decimalsRes.value != null ? Number(decimalsRes.value) : null,
      owner: ownerRes.ok ? ownerRes.value : '',
      pausedSupported: pausedRes.ok,
      pausedValue: pausedRes.ok ? !!pausedRes.value : false,
      dangerSelectors: scanDangerSelectors(codeRes.result)
    };
  }

  async function analyzeSingle(address) {
    const chain = getChain();
    const codeRes = await rpcTryAll('eth_getCode', [address, 'latest']);
    if (!codeRes.ok) throw codeRes.error || new Error('Unable to load contract bytecode');

    const code = codeRes.result || '0x';
    const hasCode = code !== '0x';
    if (!hasCode) {
      return {
        address,
        chain: chain.label,
        endpoint: codeRes.endpoint,
        hasCode: false,
        bytecodeSize: 0,
        flags: [{ level: 'high', text: 'No deployed bytecode found at this address.' }]
      };
    }

    const bytecodeSize = countBytecodeBytes(code);
    const proxyByBytecode = looksLikeProxy(code);
    const dangerMatches = scanDangerSelectors(code);

    const transferData = SELECTORS.transfer + padAddress(DEAD_ADDRESS) + padUint(1n);
    const approveData = SELECTORS.approve + padAddress(DEAD_ADDRESS) + padUint(0n);
    const transferFromData = SELECTORS.transferFrom + padAddress(ZERO_ADDRESS) + padAddress(DEAD_ADDRESS) + padUint(1n);

    const [
      nameRes,
      symbolRes,
      decimalsRes,
      totalSupplyRes,
      ownerRes,
      getOwnerRes,
      pausedRes,
      balanceOfRes,
      allowanceRes,
      implSlotRes,
      adminSlotRes,
      beaconSlotRes,
      transferSim,
      approveSim,
      transferFromSim,
      recentTransferLogsRes,
      recentApprovalLogsRes
    ] = await Promise.all([
      callString(address, SELECTORS.name),
      callString(address, SELECTORS.symbol),
      callUint(address, SELECTORS.decimals),
      callUint(address, SELECTORS.totalSupply),
      callAddress(address, SELECTORS.owner),
      callAddress(address, SELECTORS.getOwner),
      callBool(address, SELECTORS.paused),
      callUint(address, SELECTORS.balanceOf + padAddress(ZERO_ADDRESS)),
      callUint(address, SELECTORS.allowance + padAddress(ZERO_ADDRESS) + padAddress(DEAD_ADDRESS)),
      rpcTryAll('eth_getStorageAt', [address, EIP1967_IMPLEMENTATION_SLOT, 'latest']),
      rpcTryAll('eth_getStorageAt', [address, EIP1967_ADMIN_SLOT, 'latest']),
      rpcTryAll('eth_getStorageAt', [address, EIP1967_BEACON_SLOT, 'latest']),
      simulate(address, transferData),
      simulate(address, approveData),
      simulate(address, transferFromData),
      getLogs(address, `latest-${chain.logScanBlocks}`, 'latest', [TOPICS.transfer]),
      getLogs(address, `latest-${chain.logScanBlocks}`, 'latest', [TOPICS.approval])
    ]);

    let proxyImplementation = implSlotRes.ok ? normalizeStorageAddress(implSlotRes.result) : '';
    const proxyAdmin = adminSlotRes.ok ? normalizeStorageAddress(adminSlotRes.result) : '';
    const proxyBeacon = beaconSlotRes.ok ? normalizeStorageAddress(beaconSlotRes.result) : '';

    if (!proxyImplementation && proxyBeacon) {
      const beaconImplRes = await ethCall(proxyBeacon, SELECTORS.implementation);
      if (beaconImplRes.ok && beaconImplRes.result && beaconImplRes.result !== '0x') {
        const beaconImpl = decodeAddress(beaconImplRes.result);
        if (beaconImpl) proxyImplementation = beaconImpl;
      }
    }

    const implementationAnalysis = proxyImplementation
      ? await analyzeImplementation(proxyImplementation)
      : { ok: false };

    const decimals = decimalsRes.ok && decimalsRes.value != null ? Number(decimalsRes.value) : null;
    const totalSupply = totalSupplyRes.ok ? formatSupply(totalSupplyRes.value, Number.isInteger(decimals) ? decimals : 0) : 'Unsupported';
    const owner = ownerRes.ok ? ownerRes.value : (getOwnerRes.ok ? getOwnerRes.value : '');
    const pausedSupported = pausedRes.ok;
    const pausedValue = pausedRes.ok ? !!pausedRes.value : false;

    const recentTransferLogs = recentTransferLogsRes.ok && Array.isArray(recentTransferLogsRes.result) ? recentTransferLogsRes.result : [];
    const recentApprovalLogs = recentApprovalLogsRes.ok && Array.isArray(recentApprovalLogsRes.result) ? recentApprovalLogsRes.result : [];
    const holderSummary = buildHolderSummary(recentTransferLogs);

    const erc20Signals = nameRes.ok || symbolRes.ok || decimalsRes.ok || totalSupplyRes.ok;

    const functionCoverage = [];
    if (nameRes.ok) functionCoverage.push('name()');
    if (symbolRes.ok) functionCoverage.push('symbol()');
    if (decimalsRes.ok) functionCoverage.push('decimals()');
    if (totalSupplyRes.ok) functionCoverage.push('totalSupply()');
    if (ownerRes.ok || getOwnerRes.ok) functionCoverage.push('owner()/getOwner()');
    if (pausedRes.ok) functionCoverage.push('paused()');
    if (balanceOfRes.ok) functionCoverage.push('balanceOf()');
    if (allowanceRes.ok) functionCoverage.push('allowance()');
    functionCoverage.push(summarizeSim('transfer()', transferSim));
    functionCoverage.push(summarizeSim('approve()', approveSim));
    functionCoverage.push(summarizeSim('transferFrom()', transferFromSim));

    const flags = [];
    if (!erc20Signals) flags.push({ level: 'medium', text: 'Weak or missing standard ERC-20 metadata support.' });
    if (bytecodeSize < 500) flags.push({ level: 'medium', text: 'Bytecode is unusually small.' });
    if (proxyImplementation) flags.push({ level: 'medium', text: `Proxy implementation slot detected: ${proxyImplementation}` });
    if (proxyAdmin) flags.push({ level: 'medium', text: `Proxy admin slot detected: ${proxyAdmin}` });
    if (proxyBeacon) flags.push({ level: 'medium', text: `Proxy beacon slot detected: ${proxyBeacon}` });
    if (owner) flags.push({ level: 'medium', text: `Owner/admin function detected: ${owner}` });
    if (pausedSupported) flags.push({ level: pausedValue ? 'high' : 'low', text: pausedValue ? 'paused() reports true.' : 'Pause control detected.' });
    if (transferSim.reverted) flags.push({ level: 'high', text: 'transfer(...) simulation reverted.' });
    if (approveSim.reverted) flags.push({ level: 'high', text: 'approve(...) simulation reverted.' });
    if (transferFromSim.reverted) flags.push({ level: 'medium', text: 'transferFrom(...) simulation reverted.' });
    if (!recentTransferLogs.length) flags.push({ level: 'medium', text: 'No recent Transfer logs found in scanned range.' });
    if (dangerMatches.length) flags.push({ level: 'medium', text: `Danger selector matches: ${dangerMatches.map(x => x.label).join(', ')}` });
    if (implementationAnalysis.ok && implementationAnalysis.owner) {
      flags.push({ level: 'medium', text: `Implementation owner/admin detected: ${implementationAnalysis.owner}` });
    }

    const warningScore = dangerScore(flags);

    return {
      address,
      chain: chain.label,
      chainId: chain.chainId,
      endpoint: codeRes.endpoint,
      hasCode: true,
      bytecodeSize,
      proxyByBytecode,
      proxyImplementation,
      proxyAdmin,
      proxyBeacon,
      implementationAnalysis,
      metadata: {
        name: nameRes.ok ? nameRes.value : 'Unsupported',
        symbol: symbolRes.ok ? symbolRes.value : 'Unsupported',
        decimals: Number.isInteger(decimals) ? decimals : 'Unsupported',
        totalSupply
      },
      owner,
      pausedSupported,
      pausedValue,
      functionCoverage,
      transferSim,
      approveSim,
      transferFromSim,
      logs: {
        transferCount: recentTransferLogs.length,
        approvalCount: recentApprovalLogs.length,
        holderSummary
      },
      dangerMatches,
      flags,
      warningScore,
      rawRpc: {
        code: codeRes,
        name: nameRes,
        symbol: symbolRes,
        decimals: decimalsRes,
        totalSupply: totalSupplyRes,
        owner: ownerRes,
        getOwner: getOwnerRes,
        paused: pausedRes,
        balanceOf: balanceOfRes,
        allowance: allowanceRes,
        implementationSlot: implSlotRes,
        adminSlot: adminSlotRes,
        beaconSlot: beaconSlotRes,
        transferSim,
        approveSim,
        transferFromSim,
        recentTransferLogs: recentTransferLogsRes,
        recentApprovalLogs: recentApprovalLogsRes
      }
    };
  }

  function renderPrimary(result) {
    const chain = getChain();

    setText(ui.contractSummary, result.hasCode ? (result.proxyImplementation || result.proxyAdmin || result.proxyBeacon || result.proxyByBytecode ? 'Proxy / contract found' : 'Contract detected') : 'No bytecode');
    setText(ui.symbolSummary, result.metadata?.symbol || 'Unknown');
    setText(ui.decimalsSummary, String(result.metadata?.decimals ?? 'Unknown'));

    setText(ui.tokenName, result.metadata?.name || 'Unsupported');
    setText(ui.tokenSymbol, result.metadata?.symbol || 'Unsupported');
    setText(ui.totalSupply, result.metadata?.totalSupply || 'Unsupported');
    setText(ui.bytecodeSize, `${result.bytecodeSize.toLocaleString()} bytes`);

    setText(ui.addressOut, result.address);
    setText(ui.decimalsOut, String(result.metadata?.decimals ?? 'Unsupported'));
    setText(ui.lastUpdated, nowLabel());
    setText(ui.functionSupport, result.functionCoverage.join(', '));

    setText(
      ui.behaviorSummary,
      [
        summarizeSim('transfer()', result.transferSim),
        summarizeSim('approve()', result.approveSim),
        summarizeSim('transferFrom()', result.transferFromSim)
      ].join(' | ')
    );
    setText(
      ui.behaviorDetails,
      `transfer(): ${result.transferSim.reverted ? 'reverted' : result.transferSim.empty ? 'empty return' : 'returned data'}\n` +
      `approve(): ${result.approveSim.reverted ? 'reverted' : result.approveSim.empty ? 'empty return' : 'returned data'}\n` +
      `transferFrom(): ${result.transferFromSim.reverted ? 'reverted' : result.transferFromSim.empty ? 'empty return' : 'returned data'}`
    );

    setText(
      ui.proxySummary,
      result.proxyImplementation || result.proxyAdmin || result.proxyBeacon || result.proxyByBytecode
        ? 'Proxy-related signal detected'
        : 'No obvious proxy signal'
    );
    setText(
      ui.proxyDetails,
      `Bytecode proxy pattern: ${result.proxyByBytecode ? 'yes' : 'no'}\n` +
      `Implementation slot: ${result.proxyImplementation || 'none'}\n` +
      `Admin slot: ${result.proxyAdmin || 'none'}\n` +
      `Beacon slot: ${result.proxyBeacon || 'none'}`
    );

    setText(
      ui.logSummary,
      `Transfer logs scanned: ${result.logs.transferCount}\nApproval logs scanned: ${result.logs.approvalCount}\nRecent block window: ${chain.logScanBlocks}`
    );
    setText(ui.holderSummary, result.logs.holderSummary);
    setText(ui.logBundle, `${ui.logSummary.textContent}\n\n${ui.holderSummary.textContent}`);

    setText(
      ui.dangerSummary,
      result.dangerMatches.length ? `${result.dangerMatches.length} selector match(es)` : 'No matched danger selectors'
    );
    setText(
      ui.dangerDetails,
      result.dangerMatches.length
        ? result.dangerMatches.map(x => `${x.label} [${x.selector}]`).join('\n')
        : 'None detected from selector scan'
    );

    setText(
      ui.implementationSummary,
      result.implementationAnalysis.ok ? 'Implementation found and inspected' : 'No deep-read implementation available'
    );
    setText(
      ui.implementationDetails,
      result.implementationAnalysis.ok
        ? `Address: ${result.implementationAnalysis.address}
Bytecode size: ${result.implementationAnalysis.bytecodeSize} bytes
Name: ${result.implementationAnalysis.name || 'unsupported'}
Symbol: ${result.implementationAnalysis.symbol || 'unsupported'}
Decimals: ${result.implementationAnalysis.decimals ?? 'unsupported'}
Owner/Admin: ${result.implementationAnalysis.owner || 'none detected'}
Paused Support: ${result.implementationAnalysis.pausedSupported ? (result.implementationAnalysis.pausedValue ? 'true' : 'false') : 'unsupported'}
Danger Selectors: ${result.implementationAnalysis.dangerSelectors.length ? result.implementationAnalysis.dangerSelectors.map(x => x.label).join(', ') : 'none'}`
        : 'No implementation contract deep-read data'
    );

    setText(
      ui.analysisNote,
      result.flags.length
        ? result.flags.map(f => `[${f.level.toUpperCase()}] ${f.text}`).join(' ')
        : 'No obvious flags from basic checks.'
    );

    setText(
      ui.resultText,
      `${result.hasCode ? 'Contract bytecode found.' : 'No contract bytecode found.'} Warning score: ${result.warningScore}/100.`
    );

    updateScore(result.warningScore);

    setText(ui.rawRpcText, JSON.stringify(result.rawRpc, null, 2));

    setLink(ui.explorerContractLink, `${chain.explorerAddress}${result.address}`, 'Open Contract');
    setLink(ui.explorerImplLink, result.proxyImplementation ? `${chain.explorerAddress}${result.proxyImplementation}` : '', 'Open Implementation');
    setLink(ui.explorerAdminLink, result.proxyAdmin ? `${chain.explorerAddress}${result.proxyAdmin}` : '', 'Open Admin');
  }

  function renderCompare(primary, compare) {
    if (!compare) {
      ui.compareSection.hidden = true;
      setText(ui.compareBody, '');
      setText(ui.compareTableText, '');
      return;
    }

    ui.compareSection.hidden = false;

    const rows = [
      ['Address', primary.address, compare.address],
      ['Name', primary.metadata.name, compare.metadata.name],
      ['Symbol', primary.metadata.symbol, compare.metadata.symbol],
      ['Decimals', String(primary.metadata.decimals), String(compare.metadata.decimals)],
      ['Total Supply', primary.metadata.totalSupply, compare.metadata.totalSupply],
      ['Bytecode Size', `${primary.bytecodeSize} bytes`, `${compare.bytecodeSize} bytes`],
      ['Warning Score', `${primary.warningScore}/100`, `${compare.warningScore}/100`],
      ['Owner/Admin', primary.owner || 'none', compare.owner || 'none'],
      ['Proxy Impl', primary.proxyImplementation || 'none', compare.proxyImplementation || 'none'],
      ['Transfer Logs', String(primary.logs.transferCount), String(compare.logs.transferCount)],
      ['Danger Selectors', primary.dangerMatches.length ? primary.dangerMatches.map(x => x.label).join(', ') : 'none', compare.dangerMatches.length ? compare.dangerMatches.map(x => x.label).join(', ') : 'none']
    ];

    ui.compareBody.innerHTML = rows.map(([label, a, b]) => `
      <tr>
        <td>${escapeHtml(label)}</td>
        <td>${escapeHtml(a)}</td>
        <td>${escapeHtml(b)}</td>
      </tr>
    `).join('');

    setText(
      ui.compareTableText,
      rows.map(([label, a, b]) => `${label}\nPrimary: ${a}\nCompare: ${b}`).join('\n\n')
    );
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  async function copyText(text) {
    if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
      return window.InstantQR.copyText(text);
    }
    return navigator.clipboard.writeText(text);
  }

  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function runAnalysis() {
    if (isLoading) return;
    isLoading = true;

    const address = normalizeAddress(ui.contractAddress.value);
    const compareAddress = normalizeAddress(ui.compareAddress.value);

    if (!isValidAddress(address)) {
      setStatus('Invalid address', 'bad');
      setText(ui.resultText, 'Enter a valid primary contract address.');
      setMode('Invalid input');
      isLoading = false;
      return;
    }

    setStatus('Loading');
    setMode('Loading');
    setText(ui.resultText, 'Analyzing contract...');
    clearLink(ui.explorerContractLink);
    clearLink(ui.explorerImplLink);
    clearLink(ui.explorerAdminLink);

    try {
      const primary = await analyzeSingle(address);
      renderPrimary(primary);

      let compare = null;
      if (compareAddress && isValidAddress(compareAddress)) {
        compare = await analyzeSingle(compareAddress);
      }
      renderCompare(primary, compare);

      lastSummary =
`Token Contract Analyzer
Network: ${getChain().label}
Primary Address: ${primary.address}
Primary Name: ${primary.metadata.name}
Primary Symbol: ${primary.metadata.symbol}
Primary Warning Score: ${primary.warningScore}/100

${compare ? `Compare Address: ${compare.address}
Compare Name: ${compare.metadata.name}
Compare Symbol: ${compare.metadata.symbol}
Compare Warning Score: ${compare.warningScore}/100` : 'No compare contract used.'}

Risk Notes:
${primary.flags.length ? primary.flags.map(f => `- [${f.level.toUpperCase()}] ${f.text}`).join('\n') : '- No obvious flags from basic checks.'}
`;

      lastReport = {
        generatedAt: new Date().toISOString(),
        network: getChain(),
        primary,
        compare
      };

      setStatus(primary.warningScore >= 40 ? 'Risk flagged' : 'Analyzed', primary.warningScore >= 40 ? 'bad' : 'ok');
      setMode(compare ? 'Compared' : 'Analyzed');
    } catch (err) {
      setStatus('Analyze failed', 'bad');
      setMode('Error');
      setText(ui.resultText, `Unable to analyze contract right now. ${err && err.message ? err.message : 'Request failed.'}`);
    } finally {
      isLoading = false;
    }
  }

  async function pastePrimary() {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        ui.contractAddress.value = text.trim();
        setStatus('Pasted', 'ok');
      }
    } catch {
      setStatus('Paste failed', 'bad');
    }
  }

  function loadSample() {
    const chain = getChain();
    if (chain.sample) {
      ui.contractAddress.value = chain.sample.address;
      setStatus('Sample loaded', 'ok');
      setMode('Sample loaded');
    }
  }

  function loadCompareSample() {
    const chain = getChain();
    if (chain.compareSample) {
      ui.compareAddress.value = chain.compareSample.address;
      setStatus('Compare sample loaded', 'ok');
      setMode('Compare sample loaded');
    }
  }

  function resetAll() {
    ui.contractAddress.value = '';
    ui.compareAddress.value = '';
    ui.networkLabel.value = getChain().label;
    clearLink(ui.explorerContractLink);
    clearLink(ui.explorerImplLink);
    clearLink(ui.explorerAdminLink);
    ui.compareSection.hidden = true;
    ui.compareBody.innerHTML = '<tr><td>Waiting</td><td>—</td><td>—</td></tr>';
    clearOutputsVisual();
    setStatus('Ready');
    setMode('Ready');
    setText(ui.resultText, 'Enter a contract address and click Analyze Contract.');
    setText(ui.formulaText, 'Checks: bytecode + metadata + transfer behavior + proxy slots + selector scan + recent logs + compare mode');
    lastSummary = '';
    lastReport = null;
  }

  function clearOutputsVisual() {
    [
      ui.contractSummary, ui.symbolSummary, ui.decimalsSummary,
      ui.tokenName, ui.tokenSymbol, ui.totalSupply, ui.bytecodeSize,
      ui.addressOut, ui.decimalsOut, ui.lastUpdated, ui.functionSupport, ui.analysisNote,
      ui.behaviorSummary, ui.behaviorDetails, ui.proxySummary, ui.proxyDetails,
      ui.logSummary, ui.holderSummary, ui.dangerSummary, ui.dangerDetails,
      ui.implementationSummary, ui.implementationDetails, ui.rawRpcText,
      ui.logBundle, ui.compareTableText
    ].forEach((el) => {
      if (el) el.textContent = '—';
    });
    updateScore(0);
  }

  ui.networkSelect.addEventListener('change', () => {
    ui.networkLabel.value = getChain().label;
    setStatus('Network updated', 'ok');
    setMode('Network changed');
  });

  ui.analyzeBtn.addEventListener('click', runAnalysis);
  ui.copyBtn.addEventListener('click', async () => {
    if (!lastSummary) {
      setStatus('Nothing to copy', 'bad');
      return;
    }
    try {
      await copyText(lastSummary);
      setStatus('Copied', 'ok');
    } catch {
      setStatus('Copy failed', 'bad');
    }
  });

  ui.exportBtn.addEventListener('click', () => {
    if (!lastReport) {
      setStatus('Nothing to export', 'bad');
      return;
    }
    const name = `token-contract-report-${ui.networkSelect.value}-${normalizeAddress(ui.contractAddress.value).slice(0,10)}.json`;
    downloadJson(lastReport, name);
    setStatus('JSON exported', 'ok');
  });

  ui.clearBtn.addEventListener('click', resetAll);
  ui.trimBtn.addEventListener('click', () => {
    ui.contractAddress.value = normalizeAddress(ui.contractAddress.value);
    ui.compareAddress.value = normalizeAddress(ui.compareAddress.value);
    setStatus('Trimmed', 'ok');
  });
  ui.pasteBtn.addEventListener('click', pastePrimary);
  ui.sampleBtn.addEventListener('click', loadSample);
  ui.sampleCompareBtn.addEventListener('click', loadCompareSample);

  document.querySelectorAll('[data-copy-target]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-copy-target');
      const target = document.getElementById(id);
      if (!target || !target.textContent || target.textContent.trim() === '—') {
        setStatus('Nothing to copy', 'bad');
        return;
      }
      try {
        await copyText(target.textContent);
        setStatus('Section copied', 'ok');
      } catch {
        setStatus('Copy failed', 'bad');
      }
    });
  });

  ui.contractAddress.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runAnalysis();
    }
  });

  ui.compareAddress.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runAnalysis();
    }
  });

  resetAll();
});
