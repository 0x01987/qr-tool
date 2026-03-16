document.addEventListener('DOMContentLoaded', () => {
  const CHAINS = {
    ethereum: {
      label: 'Ethereum',
      chainId: 1,
      nativeSymbol: 'ETH',
      rpc: [
        'https://ethereum-rpc.publicnode.com',
        'https://cloudflare-eth.com/v1/mainnet'
      ],
      logScanBlocks: 5000,
      explorerAddress: 'https://etherscan.io/address/',
      sample: { address: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', label: 'USDC' }
    },
    base: {
      label: 'Base',
      chainId: 8453,
      nativeSymbol: 'ETH',
      rpc: ['https://base-rpc.publicnode.com'],
      logScanBlocks: 8000,
      explorerAddress: 'https://basescan.org/address/',
      sample: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', label: 'USDC' }
    },
    arbitrum: {
      label: 'Arbitrum One',
      chainId: 42161,
      nativeSymbol: 'ETH',
      rpc: ['https://arbitrum-one-rpc.publicnode.com'],
      logScanBlocks: 12000,
      explorerAddress: 'https://arbiscan.io/address/',
      sample: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', label: 'USDC' }
    },
    optimism: {
      label: 'Optimism',
      chainId: 10,
      nativeSymbol: 'ETH',
      rpc: ['https://optimism-rpc.publicnode.com'],
      logScanBlocks: 12000,
      explorerAddress: 'https://optimistic.etherscan.io/address/',
      sample: { address: '0x0b2C639c533813f4Aa9D7837CaF62653d097Ff85', label: 'USDC' }
    },
    bsc: {
      label: 'BNB Smart Chain',
      chainId: 56,
      nativeSymbol: 'BNB',
      rpc: ['https://bsc-rpc.publicnode.com'],
      logScanBlocks: 8000,
      explorerAddress: 'https://bscscan.com/address/',
      sample: { address: '0x55d398326f99059fF775485246999027B3197955', label: 'USDT' }
    },
    polygon: {
      label: 'Polygon',
      chainId: 137,
      nativeSymbol: 'POL',
      rpc: ['https://polygon-bor-rpc.publicnode.com'],
      logScanBlocks: 12000,
      explorerAddress: 'https://polygonscan.com/address/',
      sample: { address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', label: 'USDC' }
    },
    avalanche: {
      label: 'Avalanche C-Chain',
      chainId: 43114,
      nativeSymbol: 'AVAX',
      rpc: ['https://avalanche-c-chain-rpc.publicnode.com'],
      logScanBlocks: 8000,
      explorerAddress: 'https://snowtrace.io/address/',
      sample: { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', label: 'USDC' }
    }
  };

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';

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
    implementation: '0x5c60da1b'
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
    addressInput: document.getElementById('contractAddress'),
    networkSelect: document.getElementById('networkSelect'),
    networkLabel: document.getElementById('networkLabel'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    copyBtn: document.getElementById('copyBtn'),
    exportBtn: document.getElementById('exportBtn'),
    clearBtn: document.getElementById('clearBtn'),
    trimBtn: document.getElementById('trimBtn'),
    pasteBtn: document.getElementById('pasteBtn'),
    sampleBtn: document.getElementById('sampleBtn'),

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

    explorerContractLink: document.getElementById('explorerContractLink'),
    explorerImplLink: document.getElementById('explorerImplLink'),
    explorerAdminLink: document.getElementById('explorerAdminLink'),
    logDetailsBundle: document.getElementById('logDetailsBundle')
  };

  let isLoading = false;
  let lastSummary = '';
  let lastMode = 'Ready';
  let lastReport = null;

  function getActiveChain() {
    const value = ui.networkSelect?.value || 'ethereum';
    return CHAINS[value] || CHAINS.ethereum;
  }

  function syncNetworkLabel() {
    const chain = getActiveChain();
    if (ui.networkLabel) ui.networkLabel.value = chain.label;
  }

  function setStatus(text, kind = '') {
    if (!ui.statusBadge) return;
    ui.statusBadge.className = 'badge' + (kind ? ' ' + kind : '');
    ui.statusBadge.textContent = text;
  }

  function setResult(text) {
    if (ui.resultText) ui.resultText.textContent = text;
  }

  function setMode(text) {
    lastMode = text;
    if (ui.modeLabel) ui.modeLabel.textContent = text;
  }

  function setText(el, text) {
    if (el) el.textContent = text;
  }

  function nowLabel() {
    return new Date().toLocaleTimeString();
  }

  function normalizeAddress(value) {
    return String(value || '').trim();
  }

  function isValidAddress(value) {
    return /^0x[a-fA-F0-9]{40}$/.test(value);
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

  function clearOutputs() {
    [
      ui.contractSummary, ui.symbolSummary, ui.decimalsSummary,
      ui.tokenName, ui.tokenSymbol, ui.totalSupply, ui.bytecodeSize,
      ui.addressOut, ui.decimalsOut, ui.lastUpdated,
      ui.functionSupport, ui.analysisNote,
      ui.behaviorSummary, ui.behaviorDetails,
      ui.proxySummary, ui.proxyDetails,
      ui.logSummary, ui.holderSummary,
      ui.dangerSummary, ui.dangerDetails,
      ui.implementationSummary, ui.implementationDetails
    ].forEach((el) => {
      if (el) el.textContent = '—';
    });

    setText(ui.logDetailsBundle, '');
    clearLink(ui.explorerContractLink);
    clearLink(ui.explorerImplLink);
    clearLink(ui.explorerAdminLink);
    lastReport = null;
  }

  function stripHexPrefix(hex) {
    return String(hex || '').replace(/^0x/, '');
  }

  function hexToBigIntSafe(hex) {
    if (!hex || typeof hex !== 'string' || hex === '0x') return 0n;
    try { return BigInt(hex); } catch { return 0n; }
  }

  function hexToUtf8(hex) {
    const clean = stripHexPrefix(hex);
    if (!clean) return '';
    const bytes = [];
    for (let i = 0; i < clean.length; i += 2) {
      const chunk = clean.slice(i, i + 2);
      if (chunk.length === 2) bytes.push(parseInt(chunk, 16));
    }
    try {
      return new TextDecoder().decode(new Uint8Array(bytes));
    } catch {
      return '';
    }
  }

  function decodeStringFromHex(resultHex) {
    const clean = stripHexPrefix(resultHex);
    if (!clean) return '';

    try {
      if (clean.length >= 128) {
        const offset = parseInt(clean.slice(0, 64), 16);
        const lenStart = offset * 2;
        const lenHex = clean.slice(lenStart, lenStart + 64);
        const length = parseInt(lenHex, 16);
        const dataStart = lenStart + 64;
        const dataHex = clean.slice(dataStart, dataStart + length * 2);
        const decoded = hexToUtf8(dataHex).replace(/\0/g, '').trim();
        if (decoded) return decoded;
      }
      return hexToUtf8(clean).replace(/\0/g, '').trim();
    } catch {
      return '';
    }
  }

  function decodeBool(resultHex) {
    return hexToBigIntSafe(resultHex) === 1n;
  }

  function decodeAddress(resultHex) {
    const clean = stripHexPrefix(resultHex);
    if (clean.length < 40) return '';
    const addr = '0x' + clean.slice(-40);
    return isValidAddress(addr) ? addr : '';
  }

  function countBytecodeBytes(codeHex) {
    return Math.floor(stripHexPrefix(codeHex).length / 2);
  }

  function formatSupply(rawSupply, decimals) {
    if (rawSupply == null) return '—';
    if (!Number.isInteger(decimals) || decimals < 0) return rawSupply.toString();

    const divisor = 10n ** BigInt(decimals);
    const whole = rawSupply / divisor;
    const fraction = rawSupply % divisor;
    const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
    return fractionStr ? `${whole}.${fractionStr}` : `${whole}`;
  }

  function padAddressParam(address) {
    return stripHexPrefix(address).toLowerCase().padStart(64, '0');
  }

  function padUintParam(valueBigInt) {
    return valueBigInt.toString(16).padStart(64, '0');
  }

  function normalizeStorageAddress(slotValue) {
    const clean = stripHexPrefix(slotValue);
    if (!clean || /^0+$/.test(clean)) return '';
    const addr = '0x' + clean.slice(-40);
    return isValidAddress(addr) ? addr : '';
  }

  function looksLikeProxyByBytecode(codeHex) {
    const code = stripHexPrefix(codeHex).toLowerCase();
    if (!code) return false;
    return (
      code.includes('363d3d373d3d3d363d73') ||
      code.includes('5af43d82803e903d91602b57fd5bf3') ||
      code.includes('delegatecall')
    );
  }

  async function fetchWithTimeout(url, options, timeoutMs = 7000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
        cache: 'no-store'
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async function rpcCall(endpoint, method, params = []) {
    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Math.floor(Math.random() * 1e9),
        method,
        params
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    if (json.error) throw new Error(json.error.message || 'RPC error');
    return json.result;
  }

  async function rpcTryAll(method, params = []) {
    const chain = getActiveChain();
    let lastError = null;

    for (const endpoint of chain.rpc) {
      try {
        const result = await rpcCall(endpoint, method, params);
        return { ok: true, endpoint, result, chain };
      } catch (err) {
        lastError = err;
      }
    }

    return { ok: false, endpoint: '', result: null, chain, error: lastError };
  }

  async function ethCall(address, data) {
    return rpcTryAll('eth_call', [{ to: address, data }, 'latest']);
  }

  async function safeCallString(address, selector) {
    const res = await ethCall(address, selector);
    if (!res.ok || !res.result || res.result === '0x') return { ok: false, value: '' };
    const decoded = decodeStringFromHex(res.result);
    return { ok: !!decoded, value: decoded };
  }

  async function safeCallUint(address, selector) {
    const res = await ethCall(address, selector);
    if (!res.ok || !res.result || res.result === '0x') return { ok: false, value: null };
    return { ok: true, value: hexToBigIntSafe(res.result) };
  }

  async function safeCallBool(address, selector) {
    const res = await ethCall(address, selector);
    if (!res.ok || !res.result || res.result === '0x') return { ok: false, value: null };
    return { ok: true, value: decodeBool(res.result) };
  }

  async function safeCallAddress(address, selector) {
    const res = await ethCall(address, selector);
    if (!res.ok || !res.result || res.result === '0x') return { ok: false, value: '' };
    const decoded = decodeAddress(res.result);
    return { ok: !!decoded, value: decoded };
  }

  async function simulationCall(address, data) {
    const res = await ethCall(address, data);
    if (!res.ok) {
      return {
        ok: false,
        reverted: true,
        empty: false,
        bool: null,
        raw: '',
        error: res.error ? String(res.error.message || res.error) : 'Call failed'
      };
    }

    const raw = res.result || '0x';
    if (raw === '0x') {
      return { ok: true, reverted: false, empty: true, bool: null, raw };
    }

    let boolVal = null;
    const normalized = stripHexPrefix(raw);
    if (normalized.length >= 64) {
      const v = hexToBigIntSafe(raw);
      if (v === 0n || v === 1n) boolVal = v === 1n;
    }

    return { ok: true, reverted: false, empty: false, bool: boolVal, raw };
  }

  async function getLogs(address, fromBlock, toBlock, topics) {
    return rpcTryAll('eth_getLogs', [{ address, fromBlock, toBlock, topics }]);
  }

  function summarizeSimulation(label, sim) {
    if (!sim.ok && sim.reverted) return `${label}: reverted`;
    if (sim.ok && sim.empty) return `${label}: returned no data`;
    if (sim.ok && typeof sim.bool === 'boolean') return `${label}: returned ${sim.bool}`;
    if (sim.ok) return `${label}: returned data`;
    return `${label}: failed`;
  }

  function parseTransferAddressesFromLog(log) {
    const topics = Array.isArray(log.topics) ? log.topics : [];
    if (topics.length < 3) return null;
    const from = decodeAddress(topics[1]);
    const to = decodeAddress(topics[2]);
    if (!from || !to) return null;
    return { from, to };
  }

  function buildObservedHolderSummary(transferLogs) {
    const counts = new Map();

    transferLogs.forEach((log) => {
      const parsed = parseTransferAddressesFromLog(log);
      if (!parsed) return;
      if (parsed.to && parsed.to.toLowerCase() !== ZERO_ADDRESS.toLowerCase()) {
        counts.set(parsed.to.toLowerCase(), (counts.get(parsed.to.toLowerCase()) || 0) + 1);
      }
    });

    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    if (!entries.length) {
      return {
        unique: 0,
        text: 'No recent holder activity observed from scanned logs'
      };
    }

    return {
      unique: counts.size,
      text:
        `Observed ${counts.size} recipient address(es) in recent Transfer logs. Top recent recipients: ` +
        entries.map(([addr, n]) => `${addr.slice(0, 6)}…${addr.slice(-4)} (${n})`).join(', ')
    };
  }

  function scanKnownDangerSelectors(codeHex) {
    const code = stripHexPrefix(codeHex).toLowerCase();
    return KNOWN_DANGER_SELECTORS.filter(item => code.includes(item.selector.toLowerCase()));
  }

  async function analyzeImplementationContract(implementationAddress) {
    if (!implementationAddress || !isValidAddress(implementationAddress)) return { ok: false };

    const codeRes = await rpcTryAll('eth_getCode', [implementationAddress, 'latest']);
    if (!codeRes.ok || !codeRes.result || codeRes.result === '0x') return { ok: false };

    const [
      nameRes,
      symbolRes,
      decimalsRes,
      totalSupplyRes,
      ownerRes,
      pausedRes
    ] = await Promise.all([
      safeCallString(implementationAddress, SELECTORS.name),
      safeCallString(implementationAddress, SELECTORS.symbol),
      safeCallUint(implementationAddress, SELECTORS.decimals),
      safeCallUint(implementationAddress, SELECTORS.totalSupply),
      safeCallAddress(implementationAddress, SELECTORS.owner),
      safeCallBool(implementationAddress, SELECTORS.paused)
    ]);

    return {
      ok: true,
      address: implementationAddress,
      byteCount: countBytecodeBytes(codeRes.result),
      name: nameRes.ok ? nameRes.value : '',
      symbol: symbolRes.ok ? symbolRes.value : '',
      decimals: decimalsRes.ok && decimalsRes.value !== null ? Number(decimalsRes.value) : null,
      totalSupply: totalSupplyRes.ok ? totalSupplyRes.value : null,
      owner: ownerRes.ok ? ownerRes.value : '',
      pausedSupported: pausedRes.ok,
      pausedValue: pausedRes.ok ? !!pausedRes.value : false,
      dangerSelectors: scanKnownDangerSelectors(codeRes.result)
    };
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

  function loadSample() {
    const chain = getActiveChain();
    if (chain.sample?.address) {
      ui.addressInput.value = chain.sample.address;
      setStatus('Sample loaded', 'ok');
      setResult(`Loaded ${chain.label} sample: ${chain.sample.label}.`);
      setMode('Sample loaded');
    } else {
      setStatus('No sample', 'bad');
    }
  }

  async function pasteAddress() {
    try {
      const text = await navigator.clipboard.readText();
      if (typeof text === 'string' && text.trim()) {
        ui.addressInput.value = text.trim();
        setStatus('Pasted', 'ok');
        setResult('Address pasted. Click Analyze Contract.');
        setMode('Pasted');
      }
    } catch {
      setStatus('Paste failed', 'bad');
    }
  }

  function resetAll() {
    if (ui.addressInput) ui.addressInput.value = '';
    clearOutputs();
    syncNetworkLabel();
    setStatus('Ready');
    setResult('Enter a contract address and click Analyze Contract.');
    setMode('Ready');
    setText(ui.formulaText, 'Checks: bytecode + metadata + transfer behavior + proxy slots + selector scan + recent logs');
    lastSummary = '';
    lastReport = null;
  }

  async function analyzeContract() {
    if (isLoading) return;
    isLoading = true;

    const address = normalizeAddress(ui.addressInput?.value);
    const chain = getActiveChain();

    if (!isValidAddress(address)) {
      clearOutputs();
      setStatus('Invalid address', 'bad');
      setResult('Enter a valid contract address.');
      setMode('Invalid input');
      isLoading = false;
      return;
    }

    setStatus('Loading');
    setResult('Analyzing contract...');
    setMode('Loading');

    try {
      const codeRes = await rpcTryAll('eth_getCode', [address, 'latest']);
      if (!codeRes.ok) throw codeRes.error || new Error('Unable to load contract bytecode');

      const code = codeRes.result || '0x';
      const hasCode = code !== '0x';
      const byteCount = hasCode ? countBytecodeBytes(code) : 0;

      if (!hasCode) {
        clearOutputs();
        setText(ui.contractSummary, 'No bytecode');
        setText(ui.bytecodeSize, '0 bytes');
        setText(ui.addressOut, address);
        setText(ui.analysisNote, `This address does not appear to have deployed contract bytecode on ${chain.label}.`);
        setText(ui.lastUpdated, nowLabel());
        setStatus('No contract', 'bad');
        setResult(`No deployed contract bytecode was found at this address on ${chain.label}.`);
        setMode('No contract');
        isLoading = false;
        return;
      }

      const transferData = SELECTORS.transfer + padAddressParam(DEAD_ADDRESS) + padUintParam(1n);
      const approveData = SELECTORS.approve + padAddressParam(DEAD_ADDRESS) + padUintParam(0n);
      const transferFromData =
        SELECTORS.transferFrom + padAddressParam(ZERO_ADDRESS) + padAddressParam(DEAD_ADDRESS) + padUintParam(1n);

      const [
        nameRes,
        symbolRes,
        decimalsRes,
        totalSupplyRes,
        ownerRes,
        getOwnerRes,
        pausedRes,
        implSlotRes,
        adminSlotRes,
        beaconSlotRes,
        transferSim,
        approveSim,
        transferFromSim,
        recentTransferLogsRes,
        recentApprovalLogsRes
      ] = await Promise.all([
        safeCallString(address, SELECTORS.name),
        safeCallString(address, SELECTORS.symbol),
        safeCallUint(address, SELECTORS.decimals),
        safeCallUint(address, SELECTORS.totalSupply),
        safeCallAddress(address, SELECTORS.owner),
        safeCallAddress(address, SELECTORS.getOwner),
        safeCallBool(address, SELECTORS.paused),
        rpcTryAll('eth_getStorageAt', [address, EIP1967_IMPLEMENTATION_SLOT, 'latest']),
        rpcTryAll('eth_getStorageAt', [address, EIP1967_ADMIN_SLOT, 'latest']),
        rpcTryAll('eth_getStorageAt', [address, EIP1967_BEACON_SLOT, 'latest']),
        simulationCall(address, transferData),
        simulationCall(address, approveData),
        simulationCall(address, transferFromData),
        getLogs(address, `latest-${chain.logScanBlocks}`, 'latest', [TOPICS.transfer]),
        getLogs(address, `latest-${chain.logScanBlocks}`, 'latest', [TOPICS.approval])
      ]);

      let proxyImplementation = implSlotRes.ok ? normalizeStorageAddress(implSlotRes.result) : '';
      const proxyAdmin = adminSlotRes.ok ? normalizeStorageAddress(adminSlotRes.result) : '';
      const proxyBeacon = beaconSlotRes.ok ? normalizeStorageAddress(beaconSlotRes.result) : '';
      const proxyByBytecode = looksLikeProxyByBytecode(code);

      if (!proxyImplementation && proxyBeacon) {
        const beaconImplRes = await ethCall(proxyBeacon, SELECTORS.implementation);
        if (beaconImplRes.ok && beaconImplRes.result && beaconImplRes.result !== '0x') {
          const beaconImplAddr = decodeAddress(beaconImplRes.result);
          if (beaconImplAddr) proxyImplementation = beaconImplAddr;
        }
      }

      const implAnalysis = proxyImplementation
        ? await analyzeImplementationContract(proxyImplementation)
        : { ok: false };

      const decimals = decimalsRes.ok && decimalsRes.value !== null ? Number(decimalsRes.value) : null;
      const totalSupplyFormatted = totalSupplyRes.ok && totalSupplyRes.value !== null
        ? formatSupply(totalSupplyRes.value, Number.isInteger(decimals) ? decimals : 0)
        : 'Unsupported';

      const ownerAddress = ownerRes.ok ? ownerRes.value : (getOwnerRes.ok ? getOwnerRes.value : '');
      const pausedSupported = pausedRes.ok;
      const pausedValue = pausedRes.ok ? !!pausedRes.value : false;
      const erc20Signals = nameRes.ok || symbolRes.ok || decimalsRes.ok || totalSupplyRes.ok;
      const dangerMatches = scanKnownDangerSelectors(code);

      const recentTransferLogs = recentTransferLogsRes.ok && Array.isArray(recentTransferLogsRes.result)
        ? recentTransferLogsRes.result
        : [];
      const recentApprovalLogs = recentApprovalLogsRes.ok && Array.isArray(recentApprovalLogsRes.result)
        ? recentApprovalLogsRes.result
        : [];
      const holderSummary = buildObservedHolderSummary(recentTransferLogs);

      const flags = [];
      if (!erc20Signals) flags.push('Weak or missing standard ERC-20 metadata support.');
      if (proxyImplementation) flags.push(`Proxy implementation slot detected: ${proxyImplementation}`);
      if (proxyAdmin) flags.push(`Proxy admin slot detected: ${proxyAdmin}`);
      if (proxyBeacon) flags.push(`Proxy beacon slot detected: ${proxyBeacon}`);
      if (ownerAddress) flags.push(`Owner/admin function detected: ${ownerAddress}`);
      if (pausedSupported) flags.push(pausedValue ? 'paused() reports true.' : 'Pause control detected.');
      if (transferSim.reverted) flags.push('transfer(...) simulation reverted.');
      if (approveSim.reverted) flags.push('approve(...) simulation reverted.');
      if (dangerMatches.length) flags.push(`Suspicious/admin-heavy selectors detected: ${dangerMatches.map(x => x.label).join(', ')}`);
      if (!recentTransferLogs.length) flags.push('No recent Transfer logs found in scanned range.');

      const headline = flags.length ? 'Use caution' : 'Basic checks look normal';

      setText(ui.contractSummary, proxyImplementation || proxyBeacon || proxyByBytecode ? 'Proxy / contract found' : 'Contract detected');
      setText(ui.symbolSummary, symbolRes.ok ? symbolRes.value : 'Unknown');
      setText(ui.decimalsSummary, Number.isInteger(decimals) ? String(decimals) : 'Unknown');

      setText(ui.tokenName, nameRes.ok ? nameRes.value : 'Unsupported');
      setText(ui.tokenSymbol, symbolRes.ok ? symbolRes.value : 'Unsupported');
      setText(ui.totalSupply, totalSupplyFormatted);
      setText(ui.bytecodeSize, `${byteCount.toLocaleString()} bytes`);
      setText(ui.addressOut, address);
      setText(ui.decimalsOut, Number.isInteger(decimals) ? String(decimals) : 'Unsupported');
      setText(ui.lastUpdated, nowLabel());

      const supportList = [];
      if (nameRes.ok) supportList.push('name()');
      if (symbolRes.ok) supportList.push('symbol()');
      if (decimalsRes.ok) supportList.push('decimals()');
      if (totalSupplyRes.ok) supportList.push('totalSupply()');
      if (ownerRes.ok || getOwnerRes.ok) supportList.push('owner()/getOwner()');
      if (pausedRes.ok) supportList.push('paused()');
      supportList.push(summarizeSimulation('transfer()', transferSim));
      supportList.push(summarizeSimulation('approve()', approveSim));
      supportList.push(summarizeSimulation('transferFrom()', transferFromSim));
      setText(ui.functionSupport, supportList.join(', '));

      const behaviorSummary = [
        summarizeSimulation('transfer()', transferSim),
        summarizeSimulation('approve()', approveSim),
        summarizeSimulation('transferFrom()', transferFromSim)
      ].join(' | ');
      setText(ui.behaviorSummary, behaviorSummary);
      setText(
        ui.behaviorDetails,
        `transfer(): ${transferSim.reverted ? 'reverted' : transferSim.empty ? 'empty return' : 'returned data'}\n` +
        `approve(): ${approveSim.reverted ? 'reverted' : approveSim.empty ? 'empty return' : 'returned data'}\n` +
        `transferFrom(): ${transferFromSim.reverted ? 'reverted' : transferFromSim.empty ? 'empty return' : 'returned data'}`
      );

      setText(
        ui.proxySummary,
        proxyImplementation || proxyAdmin || proxyBeacon || proxyByBytecode
          ? 'Proxy-related signal detected'
          : 'No obvious proxy signal'
      );
      setText(
        ui.proxyDetails,
        `Bytecode proxy pattern: ${proxyByBytecode ? 'yes' : 'no'}\n` +
        `Implementation slot: ${proxyImplementation || 'none'}\n` +
        `Admin slot: ${proxyAdmin || 'none'}\n` +
        `Beacon slot: ${proxyBeacon || 'none'}`
      );

      setText(
        ui.logSummary,
        `Transfer logs scanned: ${recentTransferLogs.length}\nApproval logs scanned: ${recentApprovalLogs.length}\nRecent block window: ${chain.logScanBlocks}`
      );
      setText(ui.holderSummary, holderSummary.text);
      setText(ui.logDetailsBundle, `${ui.logSummary.textContent}\n\n${ui.holderSummary.textContent}`);

      setText(ui.dangerSummary, dangerMatches.length ? `${dangerMatches.length} selector match(es)` : 'No matched danger selectors');
      setText(
        ui.dangerDetails,
        dangerMatches.length
          ? dangerMatches.map(x => `${x.label} [${x.selector}]`).join('\n')
          : 'None detected from selector scan'
      );

      setText(
        ui.implementationSummary,
        implAnalysis.ok ? 'Implementation found and inspected' : 'No deep-read implementation available'
      );
      setText(
        ui.implementationDetails,
        implAnalysis.ok
          ? `Address: ${implAnalysis.address}
Bytecode size: ${implAnalysis.byteCount} bytes
Name: ${implAnalysis.name || 'unsupported'}
Symbol: ${implAnalysis.symbol || 'unsupported'}
Decimals: ${Number.isInteger(implAnalysis.decimals) ? implAnalysis.decimals : 'unsupported'}
Owner/Admin: ${implAnalysis.owner || 'none detected'}
Paused Support: ${implAnalysis.pausedSupported ? (implAnalysis.pausedValue ? 'true' : 'false') : 'unsupported'}
Danger Selectors: ${implAnalysis.dangerSelectors.length ? implAnalysis.dangerSelectors.map(x => x.label).join(', ') : 'none'}`
          : 'No implementation contract deep-read data'
      );

      setText(ui.analysisNote, `${headline}. Network: ${chain.label}. ${flags.join(' ') || 'No obvious flags from basic checks.'}`);
      setResult(
        (erc20Signals
          ? `Contract bytecode found and token-like behavior was detected on ${chain.label}. `
          : `Contract bytecode found on ${chain.label}, but standard ERC-20 signals are weak or incomplete. `) +
        `Risk screen: ${headline}.`
      );
      setStatus(flags.length ? 'Risk flagged' : 'Analyzed', flags.length ? 'bad' : 'ok');
      setMode('Analyzed');

      setLink(ui.explorerContractLink, `${chain.explorerAddress}${address}`, 'Open Contract');
      setLink(ui.explorerImplLink, proxyImplementation ? `${chain.explorerAddress}${proxyImplementation}` : '', 'Open Implementation');
      setLink(ui.explorerAdminLink, proxyAdmin ? `${chain.explorerAddress}${proxyAdmin}` : '', 'Open Admin');

      lastSummary =
`Token Contract Analyzer
Network: ${chain.label}
Chain ID: ${chain.chainId}
Endpoint: ${codeRes.endpoint}
Address: ${address}
Explorer: ${chain.explorerAddress}${address}

Bytecode Present: Yes
Bytecode Size: ${byteCount} bytes

Token Name: ${nameRes.ok ? nameRes.value : 'Unsupported'}
Token Symbol: ${symbolRes.ok ? symbolRes.value : 'Unsupported'}
Decimals: ${Number.isInteger(decimals) ? decimals : 'Unsupported'}
Total Supply: ${totalSupplyFormatted}

Owner/Admin: ${ownerAddress || 'No owner()/getOwner() response'}
Paused Support: ${pausedSupported ? (pausedValue ? 'Yes (currently true)' : 'Yes') : 'No'}

Proxy by Bytecode Pattern: ${proxyByBytecode ? 'Yes' : 'No'}
Proxy Implementation Slot: ${proxyImplementation || 'None detected'}
Proxy Admin Slot: ${proxyAdmin || 'None detected'}
Proxy Beacon Slot: ${proxyBeacon || 'None detected'}

Behavior Checks:
- ${summarizeSimulation('transfer()', transferSim)}
- ${summarizeSimulation('approve()', approveSim)}
- ${summarizeSimulation('transferFrom()', transferFromSim)}

Recent Logs:
- Transfer logs scanned: ${recentTransferLogs.length}
- Approval logs scanned: ${recentApprovalLogs.length}
- Observed holder activity: ${holderSummary.text}

Danger Selector Matches:
${dangerMatches.length ? dangerMatches.map(x => `- ${x.label}`).join('\n') : '- None detected from selector scan'}

Implementation Deep Read:
${implAnalysis.ok ? ui.implementationDetails.textContent : '- No implementation deep-read data'}

Risk Headline: ${headline}
Flags:
${flags.length ? flags.map(f => `- ${f}`).join('\n') : '- No obvious flags from basic checks'}

Updated: ${nowLabel()}`;

      lastReport = {
        generatedAt: new Date().toISOString(),
        network: {
          key: ui.networkSelect.value,
          label: chain.label,
          chainId: chain.chainId,
          nativeSymbol: chain.nativeSymbol,
          explorerAddressBase: chain.explorerAddress
        },
        address,
        endpoint: codeRes.endpoint,
        summary: {
          contractStatus: ui.contractSummary.textContent,
          tokenSymbol: ui.symbolSummary.textContent,
          decimals: ui.decimalsSummary.textContent,
          mode: ui.modeLabel.textContent,
          resultText: ui.resultText.textContent,
          riskHeadline: headline
        },
        token: {
          name: ui.tokenName.textContent,
          symbol: ui.tokenSymbol.textContent,
          totalSupply: ui.totalSupply.textContent,
          bytecodeSize: ui.bytecodeSize.textContent
        },
        details: {
          ownerAddress,
          pausedSupported,
          pausedValue,
          proxyByBytecode,
          proxyImplementation,
          proxyAdmin,
          proxyBeacon
        },
        behavior: {
          summary: ui.behaviorSummary.textContent,
          details: ui.behaviorDetails.textContent
        },
        logs: {
          transferCount: recentTransferLogs.length,
          approvalCount: recentApprovalLogs.length,
          holderSummary: ui.holderSummary.textContent
        },
        dangerSelectors: dangerMatches.map(x => ({ selector: x.selector, label: x.label })),
        implementation: implAnalysis.ok ? {
          address: implAnalysis.address,
          bytecodeSize: implAnalysis.byteCount,
          name: implAnalysis.name,
          symbol: implAnalysis.symbol,
          decimals: implAnalysis.decimals,
          owner: implAnalysis.owner,
          pausedSupported: implAnalysis.pausedSupported,
          pausedValue: implAnalysis.pausedValue,
          dangerSelectors: implAnalysis.dangerSelectors.map(x => ({ selector: x.selector, label: x.label }))
        } : null,
        flags
      };
    } catch (error) {
      clearOutputs();
      setStatus('Analyze failed', 'bad');
      setResult(`Unable to analyze contract right now. ${error && error.message ? error.message : 'Request failed.'}`);
      setMode('Error');
      lastSummary = '';
      lastReport = null;
    } finally {
      isLoading = false;
    }
  }

  ui.networkSelect?.addEventListener('change', () => {
    syncNetworkLabel();
    setStatus('Network updated', 'ok');
    setResult(`Active network set to ${getActiveChain().label}.`);
    setMode('Network changed');
  });

  ui.analyzeBtn?.addEventListener('click', analyzeContract);
  ui.sampleBtn?.addEventListener('click', loadSample);

  ui.copyBtn?.addEventListener('click', async () => {
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

  ui.exportBtn?.addEventListener('click', () => {
    if (!lastReport) {
      setStatus('Nothing to export', 'bad');
      return;
    }
    const fileName = `token-contract-report-${ui.networkSelect.value}-${normalizeAddress(ui.addressInput.value).slice(0,10)}.json`;
    downloadJson(lastReport, fileName);
    setStatus('JSON exported', 'ok');
  });

  ui.clearBtn?.addEventListener('click', resetAll);

  ui.trimBtn?.addEventListener('click', () => {
    ui.addressInput.value = normalizeAddress(ui.addressInput.value);
    setStatus('Trimmed', 'ok');
    setResult('Input trimmed.');
    setMode('Trimmed');
  });

  ui.pasteBtn?.addEventListener('click', pasteAddress);

  document.querySelectorAll('[data-copy-target]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-copy-target');
      const target = document.getElementById(id);
      if (!target || !target.textContent.trim() || target.textContent.trim() === '—') {
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

  ui.addressInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      analyzeContract();
    }
  });

  syncNetworkLabel();
  resetAll();
});
