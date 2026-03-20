document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const NETWORKS = {
    btc: {
      key: "btc",
      name: "Bitcoin",
      symbol: "BTC",
      mode: "sat/vB",
      endpoint: "https://mempool.space/api/v1/fees/recommended",
      defaultSize: 140,
      defaultEnergy: 0,
      presets: [
        { label: "Simple Transfer", size: 140, energy: 0 },
        { label: "SegWit Transfer", size: 110, energy: 0 },
        { label: "Larger Transaction", size: 220, energy: 0 }
      ],
      priceIds: ["bitcoin"]
    },
    ltc: {
      key: "ltc",
      name: "Litecoin",
      symbol: "LTC",
      mode: "per-kB",
      endpoint: "https://api.blockcypher.com/v1/ltc/main",
      defaultSize: 250,
      defaultEnergy: 0,
      presets: [
        { label: "Simple Transfer", size: 250, energy: 0 },
        { label: "Compact Transfer", size: 180, energy: 0 },
        { label: "Larger Transaction", size: 400, energy: 0 }
      ],
      priceIds: ["litecoin"]
    },
    doge: {
      key: "doge",
      name: "Dogecoin",
      symbol: "DOGE",
      mode: "per-kB",
      endpoint: "https://api.blockcypher.com/v1/doge/main",
      defaultSize: 250,
      defaultEnergy: 0,
      presets: [
        { label: "Simple Transfer", size: 250, energy: 0 },
        { label: "Compact Transfer", size: 180, energy: 0 },
        { label: "Larger Transaction", size: 400, energy: 0 }
      ],
      priceIds: ["dogecoin"]
    },
    dash: {
      key: "dash",
      name: "Dash",
      symbol: "DASH",
      mode: "per-kB",
      endpoint: "https://api.blockcypher.com/v1/dash/main",
      defaultSize: 250,
      defaultEnergy: 0,
      presets: [
        { label: "Simple Transfer", size: 250, energy: 0 },
        { label: "Compact Transfer", size: 180, energy: 0 },
        { label: "Larger Transaction", size: 400, energy: 0 }
      ],
      priceIds: ["dash"]
    },
    trx: {
      key: "trx",
      name: "TRON",
      symbol: "TRX",
      mode: "Bandwidth + Energy",
      endpoint: "https://api.trongrid.io/wallet/getchainparameters",
      defaultSize: 300,
      defaultEnergy: 0,
      presets: [
        { label: "Simple Transfer", size: 300, energy: 0 },
        { label: "TRC20 Transfer", size: 350, energy: 65000 },
        { label: "Smart Contract Call", size: 400, energy: 120000 }
      ],
      priceIds: ["tron"]
    }
  };

  const els = {
    network: $("network"),
    feePreset: $("feePreset"),
    txSize: $("txSize"),
    energyUnits: $("energyUnits"),
    endpointUrl: $("endpointUrl"),

    refreshBtn: $("refreshBtn"),
    testBtn: $("testBtn"),
    copyBtn: $("copyBtn"),

    statusMessage: $("statusMessage"),
    lastUpdated: $("lastUpdated"),
    statusText: $("statusText"),
    statusDot: $("statusDot"),

    modeText: $("modeText"),
    chainText: $("chainText"),
    gasUnitsText: $("gasUnitsText"),
    symbolText: $("symbolText"),
    priceSourceText: $("priceSourceText"),

    slowNative: $("slowNative"),
    slowUsd: $("slowUsd"),
    slowMax: $("slowMax"),
    slowTip: $("slowTip"),
    slowTotal: $("slowTotal"),

    stdNative: $("stdNative"),
    stdUsd: $("stdUsd"),
    stdMax: $("stdMax"),
    stdTip: $("stdTip"),
    stdTotal: $("stdTotal"),

    fastNative: $("fastNative"),
    fastUsd: $("fastUsd"),
    fastMax: $("fastMax"),
    fastTip: $("fastTip"),
    fastTotal: $("fastTotal"),

    sizeHelp: $("sizeHelp"),
    energyHelp: $("energyHelp")
  };

  const TIMEOUT_MS = 10000;
  let lastSummary = "";

  function setYear() {
    const yearEl = $("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  function setStatus(text, kind = "idle") {
    if (els.statusMessage) els.statusMessage.textContent = text;
    if (els.statusText) els.statusText.textContent = kind === "loading" ? "Loading" : kind === "success" ? "Updated" : kind === "error" ? "Error" : "Ready";

    if (els.statusDot) {
      if (kind === "loading") els.statusDot.style.background = "#f59e0b";
      else if (kind === "success") els.statusDot.style.background = "#22c55e";
      else if (kind === "error") els.statusDot.style.background = "#ef4444";
      else els.statusDot.style.background = "var(--muted)";
    }
  }

  function stampUpdated() {
    const now = new Date();
    els.lastUpdated.textContent = `Last updated: ${now.toLocaleString()}`;
  }

  function safeInt(value, fallback = 0, min = 0) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, n);
  }

  function fmtNumber(value, digits = 2) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    });
  }

  function fmtFixed(value, digits = 8) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return n.toFixed(digits);
  }

  function fmtUsd(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 6
    }).format(n);
  }

  function setMeta(network) {
    els.modeText.textContent = network.mode;
    els.chainText.textContent = network.name;
    els.symbolText.textContent = network.symbol;
  }

  function setHelpers(network) {
    if (network.key === "btc") {
      els.sizeHelp.textContent = "For Bitcoin this is transaction size in virtual bytes.";
      els.energyHelp.textContent = "Energy is not used for Bitcoin.";
      els.energyUnits.disabled = true;
    } else if (network.key === "trx") {
      els.sizeHelp.textContent = "For TRON this input represents bandwidth bytes.";
      els.energyHelp.textContent = "Used for TRON smart contract energy estimation.";
      els.energyUnits.disabled = false;
    } else {
      els.sizeHelp.textContent = "For this network the estimate uses transaction size in bytes.";
      els.energyHelp.textContent = "Energy is not used for this network.";
      els.energyUnits.disabled = true;
    }
  }

  function populateNetworks() {
    els.network.innerHTML = "";
    Object.values(NETWORKS).forEach((network) => {
      const option = document.createElement("option");
      option.value = network.key;
      option.textContent = `${network.name} (${network.symbol})`;
      els.network.appendChild(option);
    });
  }

  function populatePresets(networkKey) {
    const network = NETWORKS[networkKey];
    els.feePreset.innerHTML = "";
    network.presets.forEach((preset, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = preset.label;
      els.feePreset.appendChild(option);
    });
  }

  function applyNetworkDefaults(networkKey) {
    const network = NETWORKS[networkKey];
    populatePresets(networkKey);

    els.endpointUrl.value = network.endpoint;
    els.txSize.value = network.defaultSize;
    els.energyUnits.value = network.defaultEnergy;

    setMeta(network);
    setHelpers(network);
    applyPreset();
  }

  function applyPreset() {
    const network = NETWORKS[els.network.value];
    const presetIndex = safeInt(els.feePreset.value, 0, 0);
    const preset = network.presets[presetIndex] || network.presets[0];

    els.txSize.value = preset.size;
    els.energyUnits.value = preset.energy;
    updateUnitsMeta();
  }

  function updateUnitsMeta() {
    const network = NETWORKS[els.network.value];
    const txSize = safeInt(els.txSize.value, network.defaultSize, 0);
    const energy = safeInt(els.energyUnits.value, network.defaultEnergy, 0);

    if (network.key === "trx") {
      els.gasUnitsText.textContent = `${fmtNumber(txSize, 0)} BW • ${fmtNumber(energy, 0)} Energy`;
    } else if (network.key === "btc") {
      els.gasUnitsText.textContent = `${fmtNumber(txSize, 0)} vB`;
    } else {
      els.gasUnitsText.textContent = `${fmtNumber(txSize, 0)} bytes`;
    }
  }

  async function abortableFetch(url, options = {}, timeoutMs = TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchJson(url, options = {}) {
    const res = await abortableFetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  async function fetchUsdPrice(network) {
    const ids = network.priceIds.join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd`;
    try {
      const data = await fetchJson(url, { headers: { "accept": "application/json" } });
      for (const id of network.priceIds) {
        if (data[id] && typeof data[id].usd === "number") {
          return { usd: data[id].usd, source: "CoinGecko" };
        }
      }
    } catch (err) {}
    return { usd: null, source: "Unavailable" };
  }

  function satsToBtc(v) { return Number(v) / 1e8; }
  function litoshiToLtc(v) { return Number(v) / 1e8; }
  function koinuToDoge(v) { return Number(v) / 1e8; }
  function duffsToDash(v) { return Number(v) / 1e8; }
  function sunToTrx(v) { return Number(v) / 1e6; }

  function clearResults() {
    [
      "slowNative","slowUsd","slowMax","slowTip","slowTotal",
      "stdNative","stdUsd","stdMax","stdTip","stdTotal",
      "fastNative","fastUsd","fastMax","fastTip","fastTotal"
    ].forEach((id) => {
      if ($(id)) $(id).textContent = "—";
    });
  }

  function setTier(prefix, nativeText, usdText, rateText, unitsText, totalText) {
    $(`${prefix}Native`).textContent = nativeText;
    $(`${prefix}Usd`).textContent = usdText;
    $(`${prefix}Max`).textContent = rateText;
    $(`${prefix}Tip`).textContent = unitsText;
    $(`${prefix}Total`).textContent = totalText;
  }

  function perKbCalc(sizeBytes, lowRate, stdRate, fastRate) {
    return {
      low: Math.ceil((sizeBytes / 1000) * lowRate),
      std: Math.ceil((sizeBytes / 1000) * stdRate),
      fast: Math.ceil((sizeBytes / 1000) * fastRate)
    };
  }

  async function estimateBTC(network, usdPrice) {
    const url = els.endpointUrl.value.trim();
    const size = safeInt(els.txSize.value, network.defaultSize, 1);
    const data = await fetchJson(url);

    const lowRate = Number(data.hourFee ?? data.minimumFee ?? data.economyFee ?? 1);
    const stdRate = Number(data.halfHourFee ?? data.economyFee ?? data.fastestFee ?? lowRate);
    const fastRate = Number(data.fastestFee ?? data.halfHourFee ?? data.hourFee ?? stdRate);

    const lowSats = Math.ceil(size * lowRate);
    const stdSats = Math.ceil(size * stdRate);
    const fastSats = Math.ceil(size * fastRate);

    const lowNative = satsToBtc(lowSats);
    const stdNative = satsToBtc(stdSats);
    const fastNative = satsToBtc(fastSats);

    setTier(
      "slow",
      `${fmtFixed(lowNative, 8)} BTC`,
      usdPrice ? `≈ ${fmtUsd(lowNative * usdPrice)}` : "USD unavailable",
      `Rate: ${fmtNumber(lowRate, 2)} sat/vB`,
      `Units: ${fmtNumber(size, 0)} vB`,
      `Total: ${fmtNumber(lowSats, 0)} sats`
    );

    setTier(
      "std",
      `${fmtFixed(stdNative, 8)} BTC`,
      usdPrice ? `≈ ${fmtUsd(stdNative * usdPrice)}` : "USD unavailable",
      `Rate: ${fmtNumber(stdRate, 2)} sat/vB`,
      `Units: ${fmtNumber(size, 0)} vB`,
      `Total: ${fmtNumber(stdSats, 0)} sats`
    );

    setTier(
      "fast",
      `${fmtFixed(fastNative, 8)} BTC`,
      usdPrice ? `≈ ${fmtUsd(fastNative * usdPrice)}` : "USD unavailable",
      `Rate: ${fmtNumber(fastRate, 2)} sat/vB`,
      `Units: ${fmtNumber(size, 0)} vB`,
      `Total: ${fmtNumber(fastSats, 0)} sats`
    );

    lastSummary =
      `Multi-Chain Fee Estimate\n` +
      `Network: ${network.name}\n` +
      `Mode: ${network.mode}\n` +
      `Low: ${fmtFixed(lowNative, 8)} BTC\n` +
      `Standard: ${fmtFixed(stdNative, 8)} BTC\n` +
      `Fast: ${fmtFixed(fastNative, 8)} BTC`;
  }

  async function estimatePerKb(network, usdPrice) {
    const url = els.endpointUrl.value.trim();
    const size = safeInt(els.txSize.value, network.defaultSize, 1);
    const data = await fetchJson(url);

    const lowRate = Number(data.low_fee_per_kb ?? 0);
    const stdRate = Number(data.medium_fee_per_kb ?? lowRate);
    const fastRate = Number(data.high_fee_per_kb ?? stdRate);

    const totals = perKbCalc(size, lowRate, stdRate, fastRate);

    let convertFn = (v) => v;
    let subunit = "units";
    if (network.key === "ltc") {
      convertFn = litoshiToLtc;
      subunit = "litoshi";
    } else if (network.key === "doge") {
      convertFn = koinuToDoge;
      subunit = "koinu";
    } else if (network.key === "dash") {
      convertFn = duffsToDash;
      subunit = "duffs";
    }

    const lowNative = convertFn(totals.low);
    const stdNative = convertFn(totals.std);
    const fastNative = convertFn(totals.fast);

    setTier(
      "slow",
      `${fmtFixed(lowNative, 8)} ${network.symbol}`,
      usdPrice ? `≈ ${fmtUsd(lowNative * usdPrice)}` : "USD unavailable",
      `Rate: ${fmtNumber(lowRate, 0)} ${subunit}/kB`,
      `Units: ${fmtNumber(size, 0)} bytes`,
      `Total: ${fmtNumber(totals.low, 0)} ${subunit}`
    );

    setTier(
      "std",
      `${fmtFixed(stdNative, 8)} ${network.symbol}`,
      usdPrice ? `≈ ${fmtUsd(stdNative * usdPrice)}` : "USD unavailable",
      `Rate: ${fmtNumber(stdRate, 0)} ${subunit}/kB`,
      `Units: ${fmtNumber(size, 0)} bytes`,
      `Total: ${fmtNumber(totals.std, 0)} ${subunit}`
    );

    setTier(
      "fast",
      `${fmtFixed(fastNative, 8)} ${network.symbol}`,
      usdPrice ? `≈ ${fmtUsd(fastNative * usdPrice)}` : "USD unavailable",
      `Rate: ${fmtNumber(fastRate, 0)} ${subunit}/kB`,
      `Units: ${fmtNumber(size, 0)} bytes`,
      `Total: ${fmtNumber(totals.fast, 0)} ${subunit}`
    );

    lastSummary =
      `Multi-Chain Fee Estimate\n` +
      `Network: ${network.name}\n` +
      `Mode: ${network.mode}\n` +
      `Low: ${fmtFixed(lowNative, 8)} ${network.symbol}\n` +
      `Standard: ${fmtFixed(stdNative, 8)} ${network.symbol}\n` +
      `Fast: ${fmtFixed(fastNative, 8)} ${network.symbol}`;
  }

  async function estimateTRX(network, usdPrice) {
    const url = els.endpointUrl.value.trim();
    const bytes = safeInt(els.txSize.value, network.defaultSize, 0);
    const energy = safeInt(els.energyUnits.value, network.defaultEnergy, 0);

    const data = await fetchJson(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    });

    const list = Array.isArray(data.chainParameter) ? data.chainParameter : data;
    if (!Array.isArray(list)) throw new Error("Unexpected TRON response");

    const getValue = (...names) => {
      for (const item of list) {
        if (item && names.includes(item.key)) return Number(item.value);
      }
      return null;
    };

    const bandwidthPrice = getValue("getTransactionFee") ?? 1000;
    const energyPrice = getValue("getEnergyFee") ?? 0;

    const lowSun = (bytes * bandwidthPrice) + (energy * energyPrice * 0.85);
    const stdSun = (bytes * bandwidthPrice) + (energy * energyPrice);
    const fastSun = (bytes * bandwidthPrice) + (energy * energyPrice * 1.15);

    const lowNative = sunToTrx(Math.ceil(lowSun));
    const stdNative = sunToTrx(Math.ceil(stdSun));
    const fastNative = sunToTrx(Math.ceil(fastSun));

    setTier(
      "slow",
      `${fmtFixed(lowNative, 6)} TRX`,
      usdPrice ? `≈ ${fmtUsd(lowNative * usdPrice)}` : "USD unavailable",
      `Rate: ${fmtNumber(bandwidthPrice, 0)} sun/BW • ${fmtNumber(energyPrice, 0)} sun/E`,
      `Units: ${fmtNumber(bytes, 0)} BW • ${fmtNumber(energy, 0)} E`,
      `Total: ${fmtNumber(Math.ceil(lowSun), 0)} sun`
    );

    setTier(
      "std",
      `${fmtFixed(stdNative, 6)} TRX`,
      usdPrice ? `≈ ${fmtUsd(stdNative * usdPrice)}` : "USD unavailable",
      `Rate: ${fmtNumber(bandwidthPrice, 0)} sun/BW • ${fmtNumber(energyPrice, 0)} sun/E`,
      `Units: ${fmtNumber(bytes, 0)} BW • ${fmtNumber(energy, 0)} E`,
      `Total: ${fmtNumber(Math.ceil(stdSun), 0)} sun`
    );

    setTier(
      "fast",
      `${fmtFixed(fastNative, 6)} TRX`,
      usdPrice ? `≈ ${fmtUsd(fastNative * usdPrice)}` : "USD unavailable",
      `Rate: ${fmtNumber(bandwidthPrice, 0)} sun/BW • ${fmtNumber(energyPrice, 0)} sun/E`,
      `Units: ${fmtNumber(bytes, 0)} BW • ${fmtNumber(energy, 0)} E`,
      `Total: ${fmtNumber(Math.ceil(fastSun), 0)} sun`
    );

    lastSummary =
      `Multi-Chain Fee Estimate\n` +
      `Network: ${network.name}\n` +
      `Mode: ${network.mode}\n` +
      `Low: ${fmtFixed(lowNative, 6)} TRX\n` +
      `Standard: ${fmtFixed(stdNative, 6)} TRX\n` +
      `Fast: ${fmtFixed(fastNative, 6)} TRX`;
  }

  async function runEstimator() {
    const network = NETWORKS[els.network.value];
    if (!network) return;

    updateUnitsMeta();
    setMeta(network);
    setHelpers(network);
    setStatus(`Fetching ${network.name} fee data...`, "loading");
    els.priceSourceText.textContent = "Loading...";

    try {
      const price = await fetchUsdPrice(network);
      els.priceSourceText.textContent = price.source;

      if (network.key === "btc") {
        await estimateBTC(network, price.usd);
      } else if (network.key === "trx") {
        await estimateTRX(network, price.usd);
      } else {
        await estimatePerKb(network, price.usd);
      }

      stampUpdated();
      setStatus(`${network.name} fee data updated successfully.`, "success");
    } catch (error) {
      clearResults();
      els.priceSourceText.textContent = "Unavailable";
      setStatus(`Unable to load fee data: ${error.message}`, "error");
    }
  }

  async function testEndpoint() {
    const network = NETWORKS[els.network.value];
    const url = els.endpointUrl.value.trim();
    setStatus(`Testing ${network.name} endpoint...`, "loading");

    try {
      if (network.key === "trx") {
        await fetchJson(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}"
        });
      } else {
        await fetchJson(url);
      }
      setStatus(`Endpoint test passed for ${network.name}.`, "success");
      stampUpdated();
    } catch (error) {
      setStatus(`Endpoint test failed: ${error.message}`, "error");
    }
  }

  async function copySummary() {
    try {
      if (!lastSummary) {
        await runEstimator();
      }
      await navigator.clipboard.writeText(lastSummary || "No fee estimate available.");
      setStatus("Summary copied to clipboard.", "success");
    } catch (error) {
      setStatus("Could not copy summary.", "error");
    }
  }

  function bindEvents() {
    els.network.addEventListener("change", () => {
      applyNetworkDefaults(els.network.value);
      runEstimator();
    });

    els.feePreset.addEventListener("change", () => {
      applyPreset();
      runEstimator();
    });

    ["txSize", "energyUnits"].forEach((id) => {
      let timer = null;
      const el = $(id);
      el.addEventListener("input", () => {
        updateUnitsMeta();
        clearTimeout(timer);
        timer = setTimeout(runEstimator, 250);
      });
    });

    els.refreshBtn.addEventListener("click", runEstimator);
    els.testBtn.addEventListener("click", testEndpoint);
    els.copyBtn.addEventListener("click", copySummary);
  }

  function init() {
    setYear();
    populateNetworks();
    els.network.value = "btc";
    applyNetworkDefaults("btc");
    bindEvents();
    runEstimator();
  }

  init();
});
