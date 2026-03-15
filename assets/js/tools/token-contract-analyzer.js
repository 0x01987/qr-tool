document.addEventListener('DOMContentLoaded', () => {
  const RPC_ENDPOINTS = [
    'https://ethereum-rpc.publicnode.com',
    'https://cloudflare-eth.com/v1/mainnet'
  ];

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
    analyzeBtn: document.getElementById('analyzeBtn'),
    copyBtn: document.getElementById('copyBtn'),
    clearBtn: document.getElementById('clearBtn'),
    trimBtn: document.getElementById('trimBtn'),
    pasteBtn: document.getElementById('pasteBtn'),

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
    analysisNote: document.getElementById('analysisNote')
  };

  let isLoading = false;
  let lastSummary = '';
  let lastMode = 'Ready';

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

  function nowLabel() {
    return new Date().toLocaleTimeString();
  }

  function normalizeAddress(value) {
    return String(value || '').trim();
  }

  function isValidAddress(value) {
    return /^0x[a-fA-F0-9]{40}$/.test(value);
  }

  function setMetricTone(el, tone) {
    if (!el) return;
    el.classList.remove('goodVal', 'badVal', 'neutralVal');
    if (tone === 'good') el.classList.add('goodVal');
    else if (tone === 'bad') el.classList.add('badVal');
    else el.classList.add('neutralVal');
  }

  function clearOutputs() {
    [
      ui.contractSummary, ui.symbolSummary, ui.decimalsSummary,
      ui.tokenName, ui.tokenSymbol, ui.totalSupply, ui.bytecodeSize,
      ui.addressOut, ui.decimalsOut, ui.lastUpdated,
      ui.functionSupport, ui.analysisNote
    ].forEach((el) => {
      if (!el) return;
      el.textContent = '—';
      el.classList.remove('goodVal', 'badVal', 'neutralVal');
      if (el.classList.contains('metricVal')) el.classList.add('neutralVal');
    });
  }

  function stripHexPrefix(hex) {
    return String(hex || '').replace(/^0x/, '');
  }

  function hexToBigIntSafe(hex) {
    if (!hex || typeof hex !== 'string' || hex === '0x') return 0n;
    try {
      return BigInt(hex);
    } catch {
      return 0n;
    }
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
        if (!Number.isNaN(offset)) {
          const lenStart = offset * 2;
          const lenHex = clean.slice(lenStart, lenStart + 64);
          const length = parseInt(lenHex, 16);
          if (!Number.isNaN(length)) {
            const dataStart = lenStart + 64;
            const dataHex = clean.slice(dataStart, dataStart + length * 2);
            const decoded = hexToUtf8(dataHex).replace(/\0/g, '').trim();
            if (decoded) return decoded;
          }
        }
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
    if (rawSupply === null || rawSupply === undefined) return '—';
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
      code.includes('f4') ||
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
    let lastError = null;
    for (const endpoint of RPC_ENDPOINTS) {
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

  async function safeBalanceOf(address) {
    const data = SELECTORS.balanceOf + padAddressParam(ZERO_ADDRESS);
    const res = await ethCall(address, data);
    if (!res.ok || !res.result || res.result === '0x') return { ok: false, value: null };
    return { ok: true, value: hexToBigIntSafe(res.result) };
  }

  async function safeAllowance(address) {
    const data = SELECTORS.allowance + padAddressParam(ZERO_ADDRESS) + padAddressParam(DEAD_ADDRESS);
    const res = await ethCall(address, data);
    if (!res.ok || !res.result || res.result === '0x') return { ok: false, value: null };
    return { ok: true, value: hexToBigIntSafe(res.result) };
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
    return rpcTryAll('eth_getLogs', [{
      address,
      fromBlock,
      toBlock,
      topics
    }]);
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
      if (parsed.to && parsed.to !== ZERO_ADDRESS) {
        counts.set(parsed.to.toLowerCase(), (counts.get(parsed.to.toLowerCase()) || 0) + 1);
      }
    });

    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!entries.length) {
      return {
        unique: 0,
        top: [],
        text: 'No recent holder activity observed from scanned logs.'
      };
    }

    return {
      unique: counts.size,
      top: entries,
      text: `Observed ${counts.size} recipient address(es) in recent Transfer logs. Top recent recipients: ` +
        entries.map(([addr, n]) => `${addr.slice(0, 6)}…${addr.slice(-4)} (${n})`).join(', ')
    };
  }

  function scanKnownDangerSelectors(codeHex) {
    const code = stripHexPrefix(codeHex).toLowerCase();
    return KNOWN_DANGER_SELECTORS.filter(item => code.includes(item.selector.toLowerCase()));
  }

  async function analyzeImplementationContract(implementationAddress) {
    if (!implementationAddress || !isValidAddress(implementationAddress)) {
      return { ok: false };
    }

    const codeRes = await rpcTryAll('eth_getCode', [implementationAddress, 'latest']);
    if (!codeRes.ok || !codeRes.result || codeRes.result === '0x') {
      return { ok: false };
    }

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

  function buildRiskFlags(state) {
    const flags = [];

    if (!state.hasCode) {
      flags.push({ level: 'high', text: 'No deployed bytecode found at this address.' });
      return flags;
    }

    if (state.byteCount < 500) {
      flags.push({ level: 'medium', text: 'Bytecode is unusually small.' });
    }

    if (!state.erc20Signals) {
      flags.push({ level: 'medium', text: 'Weak or missing standard ERC-20 metadata support.' });
    }

    if (state.proxyImplementation) {
      flags.push({ level: 'medium', text: `Proxy implementation slot detected: ${state.proxyImplementation}` });
    }

    if (state.proxyAdmin) {
      flags.push({ level: 'medium', text: `Proxy admin slot detected: ${state.proxyAdmin}` });
    }

    if (state.proxyBeacon) {
      flags.push({ level: 'medium', text: `Proxy beacon slot detected: ${state.proxyBeacon}` });
    }

    if (state.ownerAddress) {
      flags.push({ level: 'medium', text: `Owner/admin function detected: ${state.ownerAddress}` });
    }

    if (state.ownerAddress && state.ownerAddress.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
      flags.push({ level: 'low', text: 'owner() appears to return the zero address.' });
    }

    if (state.pausedSupported) {
      flags.push({
        level: state.pausedValue ? 'high' : 'low',
        text: state.pausedValue ? 'paused() reports true.' : 'Pause control detected.'
      });
    }

    if (state.transferSim.reverted) {
      flags.push({ level: 'high', text: 'transfer(...) simulation reverted.' });
    } else if (state.transferSim.empty) {
      flags.push({ level: 'medium', text: 'transfer(...) returned no data.' });
    }

    if (state.approveSim.reverted) {
      flags.push({ level: 'high', text: 'approve(...) simulation reverted.' });
    } else if (state.approveSim.empty) {
      flags.push({ level: 'medium', text: 'approve(...) returned no data.' });
    }

    if (state.transferFromSim.reverted) {
      flags.push({ level: 'medium', text: 'transferFrom(...) simulation reverted.' });
    }

    if (!state.recentTransferCount) {
      flags.push({ level: 'medium', text: 'No recent Transfer logs found in scanned range.' });
    }

    if (state.dangerMatches.length) {
      flags.push({
        level: 'medium',
        text: `Suspicious/admin-heavy selectors detected: ${state.dangerMatches.map(x => x.label).join(', ')}`
      });
    }

    if (state.implAnalysis.ok && state.implAnalysis.owner) {
      flags.push({ level: 'medium', text: `Implementation contract has owner/admin: ${state.implAnalysis.owner}` });
    }

    if (state.implAnalysis.ok && state.implAnalysis.pausedSupported) {
      flags.push({
        level: state.implAnalysis.pausedValue ? 'high' : 'low',
        text: state.implAnalysis.pausedValue
          ? 'Implementation paused() reports true.'
          : 'Implementation supports pause control.'
      });
    }

    if (
      state.nameOk && state.symbolOk && state.decimalsOk && state.totalSupplyOk &&
      !state.transferSim.reverted && !state.approveSim.reverted
    ) {
      flags.push({ level: 'low', text: 'Core metadata and basic behavior checks look normal.' });
    }

    return flags;
  }

  function riskHeadline(flags) {
    const high = flags.filter(f => f.level === 'high').length;
    const medium = flags.filter(f => f.level === 'medium').length;
    if (high > 0) return 'Higher caution';
    if (medium > 1) return 'Use caution';
    if (medium === 1) return 'Moderate caution';
    return 'Basic checks look normal';
  }

  async function analyzeContract() {
    if (isLoading) return;
    isLoading = true;

    const address = normalizeAddress(ui.addressInput?.value);

    if (!isValidAddress(address)) {
      clearOutputs();
      setStatus('Invalid address', 'bad');
      setResult('Enter a valid Ethereum contract address.');
      setMode('Invalid input');
      lastSummary = '';
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
        if (ui.contractSummary) ui.contractSummary.textContent = 'No bytecode';
        setMetricTone(ui.contractSummary, 'bad');
        if (ui.bytecodeSize) ui.bytecodeSize.textContent = '0 bytes';
        if (ui.addressOut) ui.addressOut.textContent = address;
        if (ui.analysisNote) ui.analysisNote.textContent = 'This address does not appear to have deployed contract bytecode on Ethereum mainnet.';
        if (ui.lastUpdated) ui.lastUpdated.textContent = nowLabel();
        setStatus('No contract', 'bad');
        setResult('No deployed contract bytecode was found at this address.');
        setMode('No contract');
        lastSummary = '';
        isLoading = false;
        return;
      }

      const transferData =
        SELECTORS.transfer +
        padAddressParam(DEAD_ADDRESS) +
        padUintParam(1n);

      const approveData =
        SELECTORS.approve +
        padAddressParam(DEAD_ADDRESS) +
        padUintParam(0n);

      const transferFromData =
        SELECTORS.transferFrom +
        padAddressParam(ZERO_ADDRESS) +
        padAddressParam(DEAD_ADDRESS) +
        padUintParam(1n);

      const [
        nameRes,
        symbolRes,
        decimalsRes,
        totalSupplyRes,
        ownerRes,
        getOwnerRes,
        pausedRes,
        balanceRes,
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
        safeCallString(address, SELECTORS.name),
        safeCallString(address, SELECTORS.symbol),
        safeCallUint(address, SELECTORS.decimals),
        safeCallUint(address, SELECTORS.totalSupply),
        safeCallAddress(address, SELECTORS.owner),
        safeCallAddress(address, SELECTORS.getOwner),
        safeCallBool(address, SELECTORS.paused),
        safeBalanceOf(address),
        safeAllowance(address),
        rpcTryAll('eth_getStorageAt', [address, EIP1967_IMPLEMENTATION_SLOT, 'latest']),
        rpcTryAll('eth_getStorageAt', [address, EIP1967_ADMIN_SLOT, 'latest']),
        rpcTryAll('eth_getStorageAt', [address, EIP1967_BEACON_SLOT, 'latest']),
        simulationCall(address, transferData),
        simulationCall(address, approveData),
        simulationCall(address, transferFromData),
        getLogs(address, 'latest-5000', 'latest', [TOPICS.transfer]),
        getLogs(address, 'latest-5000', 'latest', [TOPICS.approval])
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

      const supportedFunctions = [];
      if (nameRes.ok) supportedFunctions.push('name()');
      if (symbolRes.ok) supportedFunctions.push('symbol()');
      if (decimalsRes.ok) supportedFunctions.push('decimals()');
      if (totalSupplyRes.ok) supportedFunctions.push('totalSupply()');
      if (ownerRes.ok || getOwnerRes.ok) supportedFunctions.push('owner()/getOwner()');
      if (pausedRes.ok) supportedFunctions.push('paused()');
      if (balanceRes.ok) supportedFunctions.push('balanceOf()');
      if (allowanceRes.ok) supportedFunctions.push('allowance()');

      supportedFunctions.push(summarizeSimulation('transfer()', transferSim));
      supportedFunctions.push(summarizeSimulation('approve()', approveSim));
      supportedFunctions.push(summarizeSimulation('transferFrom()', transferFromSim));

      const erc20Signals = nameRes.ok || symbolRes.ok || decimalsRes.ok || totalSupplyRes.ok;
      const dangerMatches = scanKnownDangerSelectors(code);
      const recentTransferLogs = recentTransferLogsRes.ok && Array.isArray(recentTransferLogsRes.result)
        ? recentTransferLogsRes.result
        : [];
      const recentApprovalLogs = recentApprovalLogsRes.ok && Array.isArray(recentApprovalLogsRes.result)
        ? recentApprovalLogsRes.result
        : [];
      const holderSummary = buildObservedHolderSummary(recentTransferLogs);

      const flags = buildRiskFlags({
        hasCode,
        byteCount,
        erc20Signals,
        proxyImplementation,
        proxyAdmin,
        proxyBeacon,
        ownerAddress,
        pausedSupported,
        pausedValue,
        nameOk: nameRes.ok,
        symbolOk: symbolRes.ok,
        decimalsOk: decimalsRes.ok,
        totalSupplyOk: totalSupplyRes.ok,
        transferSim,
        approveSim,
        transferFromSim,
        recentTransferCount: recentTransferLogs.length,
        dangerMatches,
        implAnalysis
      });

      const headline = riskHeadline(flags);

      if (ui.contractSummary) {
        ui.contractSummary.textContent =
          proxyImplementation || proxyBeacon || proxyByBytecode
            ? 'Proxy / contract found'
            : 'Contract detected';
      }
      setMetricTone(
        ui.contractSummary,
        proxyImplementation || proxyBeacon || proxyByBytecode ? 'bad' : (erc20Signals ? 'good' : 'neutral')
      );

      if (ui.symbolSummary) ui.symbolSummary.textContent = symbolRes.ok ? symbolRes.value : 'Unknown';
      if (ui.decimalsSummary) ui.decimalsSummary.textContent = Number.isInteger(decimals) ? String(decimals) : 'Unknown';

      if (ui.tokenName) ui.tokenName.textContent = nameRes.ok ? nameRes.value : 'Unsupported';
      if (ui.tokenSymbol) ui.tokenSymbol.textContent = symbolRes.ok ? symbolRes.value : 'Unsupported';
      if (ui.totalSupply) ui.totalSupply.textContent = totalSupplyFormatted;
      if (ui.bytecodeSize) ui.bytecodeSize.textContent = `${byteCount.toLocaleString()} bytes`;

      if (ui.addressOut) ui.addressOut.textContent = address;
      if (ui.decimalsOut) ui.decimalsOut.textContent = Number.isInteger(decimals) ? String(decimals) : 'Unsupported';
      if (ui.lastUpdated) ui.lastUpdated.textContent = nowLabel();

      if (ui.functionSupport) {
        ui.functionSupport.textContent = supportedFunctions.join(', ');
      }

      if (ui.analysisNote) {
        const notes = [];
        notes.push(`${headline}.`);
        if (proxyImplementation) notes.push(`Implementation: ${proxyImplementation}.`);
        if (proxyAdmin) notes.push(`Admin slot: ${proxyAdmin}.`);
        if (proxyBeacon) notes.push(`Beacon slot: ${proxyBeacon}.`);
        if (ownerAddress) notes.push(`Owner/admin function: ${ownerAddress}.`);
        if (pausedSupported) notes.push(pausedValue ? 'paused() reports true.' : 'paused() supported.');
        if (dangerMatches.length) notes.push(`Selector scan found: ${dangerMatches.map(x => x.label).join(', ')}.`);
        if (recentTransferLogs.length || recentApprovalLogs.length) {
          notes.push(`Recent logs: ${recentTransferLogs.length} Transfer, ${recentApprovalLogs.length} Approval.`);
        }
        if (holderSummary.unique) notes.push(holderSummary.text + '.');
        if (implAnalysis.ok) {
          notes.push(`Deep-read implementation bytecode: ${implAnalysis.byteCount} bytes.`);
        }
        ui.analysisNote.textContent = notes.join(' ');
      }

      const mainResult = [];
      mainResult.push(
        erc20Signals
          ? 'Contract bytecode found and token-like behavior was detected.'
          : 'Contract bytecode found, but standard ERC-20 signals are weak or incomplete.'
      );
      mainResult.push(`Risk screen: ${headline}.`);
      setResult(mainResult.join(' '));

      const hasHigh = flags.some(f => f.level === 'high');
      setStatus(hasHigh ? 'Risk flagged' : 'Analyzed', hasHigh ? 'bad' : 'ok');
      setMode('Analyzed');

      if (ui.formulaText) {
        ui.formulaText.textContent =
          'Checks: bytecode + metadata + transfer simulation + proxy slots + selector scan + recent logs';
      }

      lastSummary =
`Token Contract Analyzer
Network: Ethereum Mainnet
Endpoint: ${codeRes.endpoint}
Address: ${address}
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

Implementation Deep Read: ${implAnalysis.ok ? 'Yes' : 'No'}
Implementation Owner/Admin: ${implAnalysis.ok ? (implAnalysis.owner || 'None detected') : 'N/A'}
Implementation Paused: ${implAnalysis.ok ? (implAnalysis.pausedSupported ? String(implAnalysis.pausedValue) : 'Unsupported') : 'N/A'}

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

Risk Headline: ${headline}
Flags:
${flags.length ? flags.map(f => `- [${f.level.toUpperCase()}] ${f.text}`).join('\n') : '- No obvious flags from basic checks'}

Updated: ${nowLabel()}`;
    } catch (error) {
      clearOutputs();
      setStatus('Analyze failed', 'bad');
      setResult(`Unable to analyze contract right now. ${error && error.message ? error.message : 'Request failed.'}`);
      setMode('Error');
      if (ui.formulaText) {
        ui.formulaText.textContent =
          'Checks: bytecode + ERC-20 methods + proxy slots + admin/pause controls + basic risk flags';
      }
      lastSummary = '';
    } finally {
      isLoading = false;
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
    setStatus('Ready');
    setResult('Enter a contract address and click Analyze Contract.');
    setMode('Ready');
    if (ui.formulaText) {
      ui.formulaText.textContent =
        'Checks: bytecode present + ERC-20 metadata calls + common function support';
    }
    lastSummary = '';
  }

  ui.analyzeBtn?.addEventListener('click', analyzeContract);

  ui.copyBtn?.addEventListener('click', async () => {
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
        if (lastMode === 'Analyzed') setStatus('Analyzed', 'ok');
        else setStatus('Ready');
      }, 1200);
    } catch {
      setStatus('Copy failed', 'bad');
    }
  });

  ui.clearBtn?.addEventListener('click', resetAll);

  ui.trimBtn?.addEventListener('click', () => {
    ui.addressInput.value = normalizeAddress(ui.addressInput.value);
    setStatus('Trimmed', 'ok');
    setResult('Input trimmed.');
    setMode('Trimmed');
  });

  ui.pasteBtn?.addEventListener('click', pasteAddress);

  ui.addressInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      analyzeContract();
    }
  });

  resetAll();
});
