document.addEventListener('DOMContentLoaded', () => {
  const RPC_ENDPOINTS = [
    'https://ethereum-rpc.publicnode.com',
    'https://cloudflare-eth.com/v1/mainnet'
  ];

  const txHashEl = document.getElementById('txHash');

  const checkBtn = document.getElementById('checkBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');
  const trimBtn = document.getElementById('trimBtn');
  const pasteBtn = document.getElementById('pasteBtn');

  const statusBadge = document.getElementById('statusBadge');
  const resultTextEl = document.getElementById('resultText');
  const formulaTextEl = document.getElementById('formulaText');

  const statusSummaryEl = document.getElementById('statusSummary');
  const confirmationsSummaryEl = document.getElementById('confirmationsSummary');
  const feeSummaryEl = document.getElementById('feeSummary');
  const modeLabelEl = document.getElementById('modeLabel');

  const blockNumberEl = document.getElementById('blockNumber');
  const currentBlockEl = document.getElementById('currentBlock');
  const gasUsedEl = document.getElementById('gasUsed');
  const effectiveGasPriceEl = document.getElementById('effectiveGasPrice');

  const fromAddressEl = document.getElementById('fromAddress');
  const toAddressEl = document.getElementById('toAddress');
  const txValueEl = document.getElementById('txValue');

  const hashOutEl = document.getElementById('hashOut');
  const nonceOutEl = document.getElementById('nonceOut');
  const lastUpdatedEl = document.getElementById('lastUpdated');

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

  function normalizeHash(value) {
    return String(value || '').trim();
  }

  function isValidTxHash(value) {
    return /^0x([A-Fa-f0-9]{64})$/.test(value);
  }

  function hexToBigIntSafe(hex) {
    if (!hex || typeof hex !== 'string') return 0n;
    try {
      return BigInt(hex);
    } catch {
      return 0n;
    }
  }

  function hexToNumberSafe(hex) {
    const n = Number(hexToBigIntSafe(hex));
    return Number.isFinite(n) ? n : 0;
  }

  function weiToEthString(weiBigInt) {
    const whole = weiBigInt / 1000000000000000000n;
    const fraction = weiBigInt % 1000000000000000000n;
    const fractionStr = fraction.toString().padStart(18, '0').replace(/0+$/, '');
    return fractionStr ? `${whole}.${fractionStr}` : `${whole}`;
  }

  function weiToGweiNumber(weiBigInt) {
    return Number(weiBigInt) / 1e9;
  }

  function formatEthFromWei(weiBigInt) {
    return `${weiToEthString(weiBigInt)} ETH`;
  }

  function formatGweiFromWei(weiBigInt) {
    const value = weiToGweiNumber(weiBigInt);
    return Number.isFinite(value) ? `${value.toFixed(2)} gwei` : '—';
  }

  function shortText(value) {
    if (!value) return '—';
    return value;
  }

  function timeLabel() {
    return new Date().toLocaleTimeString();
  }

  async function fetchWithTimeout(url, options, timeoutMs = 8000) {
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
      8000
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

  async function fetchBundle(endpoint, hash) {
    const [tx, receipt, currentBlockHex] = await Promise.all([
      rpcCall(endpoint, 'eth_getTransactionByHash', [hash]),
      rpcCall(endpoint, 'eth_getTransactionReceipt', [hash]),
      rpcCall(endpoint, 'eth_blockNumber')
    ]);

    return { endpoint, tx, receipt, currentBlockHex };
  }

  async function fetchFirstWorkingBundle(hash) {
    let lastError = null;

    for (const endpoint of RPC_ENDPOINTS) {
      try {
        return await fetchBundle(endpoint, hash);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('All RPC endpoints failed');
  }

  function clearOutputs() {
    [
      statusSummaryEl, confirmationsSummaryEl, feeSummaryEl,
      blockNumberEl, currentBlockEl, gasUsedEl, effectiveGasPriceEl,
      fromAddressEl, toAddressEl, txValueEl,
      hashOutEl, nonceOutEl, lastUpdatedEl
    ].forEach((el) => {
      if (el) el.textContent = '—';
      if (el) el.classList.remove('goodVal', 'badVal', 'neutralVal');
      if (el && el.classList.contains('metricVal')) el.classList.add('neutralVal');
    });
  }

  function setMetricTone(el, tone) {
    if (!el) return;
    el.classList.remove('goodVal', 'badVal', 'neutralVal');
    if (tone === 'good') el.classList.add('goodVal');
    else if (tone === 'bad') el.classList.add('badVal');
    else el.classList.add('neutralVal');
  }

  async function checkTransaction() {
    if (isLoading) return;
    isLoading = true;

    const hash = normalizeHash(txHashEl.value);

    if (!isValidTxHash(hash)) {
      clearOutputs();
      setStatus('Invalid hash', 'bad');
      setResult('Enter a valid Ethereum transaction hash.');
      updateMode('Invalid input');
      lastSummary = '';
      isLoading = false;
      return;
    }

    setStatus('Loading');
    setResult('Checking transaction status...');
    updateMode('Loading');

    try {
      const { endpoint, tx, receipt, currentBlockHex } = await fetchFirstWorkingBundle(hash);
      const currentBlock = hexToNumberSafe(currentBlockHex);

      if (!tx) {
        clearOutputs();
        if (statusSummaryEl) statusSummaryEl.textContent = 'Not found';
        setMetricTone(statusSummaryEl, 'bad');
        setStatus('Not found', 'bad');
        setResult('Transaction was not found on the checked Ethereum endpoints.');
        updateMode('Not found');
        lastSummary = '';
        isLoading = false;
        return;
      }

      const txBlock = tx.blockNumber ? hexToNumberSafe(tx.blockNumber) : 0;
      const confirmations = txBlock > 0 && currentBlock >= txBlock ? (currentBlock - txBlock + 1) : 0;

      let statusText = 'Pending';
      let statusTone = '';
      let feePaidWei = 0n;
      let gasUsed = 0;
      let effectiveGasPriceWei = 0n;

      if (receipt) {
        const receiptStatus = hexToNumberSafe(receipt.status);
        gasUsed = hexToNumberSafe(receipt.gasUsed);
        effectiveGasPriceWei = hexToBigIntSafe(receipt.effectiveGasPrice);

        if (gasUsed > 0 && effectiveGasPriceWei > 0n) {
          feePaidWei = BigInt(gasUsed) * effectiveGasPriceWei;
        }

        if (receiptStatus === 1) {
          statusText = 'Confirmed';
          statusTone = 'good';
        } else if (receiptStatus === 0) {
          statusText = 'Failed';
          statusTone = 'bad';
        }
      }

      if (statusSummaryEl) statusSummaryEl.textContent = statusText;
      setMetricTone(statusSummaryEl, statusTone || 'neutral');

      if (confirmationsSummaryEl) confirmationsSummaryEl.textContent = confirmations ? String(confirmations) : (receipt ? '0' : 'Pending');
      if (feeSummaryEl) feeSummaryEl.textContent = feePaidWei > 0n ? formatEthFromWei(feePaidWei) : (receipt ? '0 ETH' : 'Pending');

      if (blockNumberEl) blockNumberEl.textContent = txBlock ? String(txBlock) : 'Pending';
      if (currentBlockEl) currentBlockEl.textContent = currentBlock ? String(currentBlock) : '—';
      if (gasUsedEl) gasUsedEl.textContent = gasUsed ? gasUsed.toLocaleString() : (receipt ? '0' : 'Pending');
      if (effectiveGasPriceEl) effectiveGasPriceEl.textContent = effectiveGasPriceWei > 0n ? formatGweiFromWei(effectiveGasPriceWei) : (receipt ? '0 gwei' : 'Pending');

      if (fromAddressEl) fromAddressEl.textContent = shortText(tx.from);
      if (toAddressEl) toAddressEl.textContent = tx.to ? tx.to : 'Contract creation / unavailable';
      if (txValueEl) txValueEl.textContent = formatEthFromWei(hexToBigIntSafe(tx.value));

      if (hashOutEl) hashOutEl.textContent = tx.hash || hash;
      if (nonceOutEl) nonceOutEl.textContent = String(hexToNumberSafe(tx.nonce));
      if (lastUpdatedEl) lastUpdatedEl.textContent = timeLabel();

      if (statusText === 'Confirmed') {
        setStatus('Confirmed', 'ok');
        setResult(`Transaction confirmed with ${confirmations} confirmation${confirmations === 1 ? '' : 's'}.`);
      } else if (statusText === 'Failed') {
        setStatus('Failed', 'bad');
        setResult('Transaction was included on-chain but failed.');
      } else {
        setStatus('Pending');
        setResult('Transaction exists but is still pending or waiting for a receipt.');
      }

      if (formulaTextEl) {
        formulaTextEl.textContent = 'Formula: fee paid = gas used × effective gas price';
      }

      updateMode(statusText);

      lastSummary =
`Transaction Status Checker
Network: Ethereum Mainnet
Endpoint: ${endpoint}
Status: ${statusText}
Hash: ${tx.hash || hash}
Block Number: ${txBlock || 'Pending'}
Current Block: ${currentBlock || '—'}
Confirmations: ${receipt ? confirmations : 'Pending'}
From: ${tx.from || '—'}
To: ${tx.to || 'Contract creation / unavailable'}
Value: ${formatEthFromWei(hexToBigIntSafe(tx.value))}
Nonce: ${hexToNumberSafe(tx.nonce)}
Gas Used: ${receipt ? gasUsed : 'Pending'}
Effective Gas Price: ${receipt ? formatGweiFromWei(effectiveGasPriceWei) : 'Pending'}
Fee Paid: ${receipt ? formatEthFromWei(feePaidWei) : 'Pending'}
Updated: ${timeLabel()}`;
    } catch (error) {
      clearOutputs();
      setStatus('Lookup failed', 'bad');
      setResult(`Unable to check transaction right now. ${error && error.message ? error.message : 'Request failed.'}`);
      updateMode('Error');
      if (formulaTextEl) {
        formulaTextEl.textContent = 'Formula: fee paid = gas used × effective gas price';
      }
      lastSummary = '';
    } finally {
      isLoading = false;
    }
  }

  async function pasteHash() {
    try {
      const text = await navigator.clipboard.readText();
      if (typeof text === 'string' && text.trim()) {
        txHashEl.value = text.trim();
        setStatus('Pasted', 'ok');
        setResult('Hash pasted. Click Check Status.');
        updateMode('Pasted');
      }
    } catch {
      setStatus('Paste failed', 'bad');
    }
  }

  function resetAll() {
    txHashEl.value = '';
    clearOutputs();
    setStatus('Ready');
    setResult('Enter a transaction hash and click Check Status.');
    updateMode('Ready');
    if (formulaTextEl) {
      formulaTextEl.textContent = 'Formula: fee paid = gas used × effective gas price';
    }
    lastSummary = '';
  }

  checkBtn?.addEventListener('click', checkTransaction);

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
        if (lastMode === 'Confirmed') setStatus('Confirmed', 'ok');
        else if (lastMode === 'Failed') setStatus('Failed', 'bad');
        else if (lastMode === 'Pending') setStatus('Pending');
        else setStatus('Ready');
      }, 1200);
    } catch {
      setStatus('Copy failed', 'bad');
    }
  });

  clearBtn?.addEventListener('click', resetAll);

  trimBtn?.addEventListener('click', () => {
    txHashEl.value = normalizeHash(txHashEl.value);
    setStatus('Trimmed', 'ok');
    setResult('Input trimmed.');
    updateMode('Trimmed');
  });

  pasteBtn?.addEventListener('click', pasteHash);

  txHashEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      checkTransaction();
    }
  });

  resetAll();
});
