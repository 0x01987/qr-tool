document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    btcUrl: $("btcUrl"),
    btcSize: $("btcSize"),
    btcStatus: $("btcStatus"),

    ltcUrl: $("ltcUrl"),
    ltcSize: $("ltcSize"),
    ltcStatus: $("ltcStatus"),

    dogeUrl: $("dogeUrl"),
    dogeSize: $("dogeSize"),
    dogeStatus: $("dogeStatus"),

    dashUrl: $("dashUrl"),
    dashSize: $("dashSize"),
    dashStatus: $("dashStatus"),

    trxUrl: $("trxUrl"),
    trxBytes: $("trxBytes"),
    trxEnergy: $("trxEnergy"),
    trxStatus: $("trxStatus"),

    btcRefresh: $("btcRefresh"),
    ltcRefresh: $("ltcRefresh"),
    dogeRefresh: $("dogeRefresh"),
    dashRefresh: $("dashRefresh"),
    trxRefresh: $("trxRefresh"),
    refreshAll: $("refreshAll"),
    fillDefaults: $("fillDefaults")
  };

  const DEFAULTS = {
    btcUrl: "https://mempool.space/api/v1/fees/recommended",
    btcSize: 140,
    ltcUrl: "https://api.blockcypher.com/v1/ltc/main",
    ltcSize: 250,
    dogeUrl: "https://api.blockcypher.com/v1/doge/main",
    dogeSize: 250,
    dashUrl: "https://api.blockcypher.com/v1/dash/main",
    dashSize: 250,
    trxUrl: "https://api.trongrid.io/wallet/getchainparameters",
    trxBytes: 300,
    trxEnergy: 0
  };

  const TIMEOUT_MS = 9000;

  function setStatus(el, text) {
    if (el) el.textContent = text;
  }

  function num(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function fmt(n, digits = 2) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "—";
    return x.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    });
  }

  function fmtFixed(n, digits = 8) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "—";
    return x.toFixed(digits);
  }

  function satsToBtc(sats) {
    return Number(sats) / 1e8;
  }

  function litoshiToLtc(litoshi) {
    return Number(litoshi) / 1e8;
  }

  function koinuToDoge(koinu) {
    return Number(koinu) / 1e8;
  }

  function duffsToDash(duffs) {
    return Number(duffs) / 1e8;
  }

  function sunToTrx(sun) {
    return Number(sun) / 1e6;
  }

  function safeInt(value, fallback = 0, min = 0) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, parsed);
  }

  async function abortableFetch(url, opts = {}, timeoutMs = TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, {
        ...opts,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async function jsonFetch(url, opts = {}) {
    const res = await abortableFetch(url, opts);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.json();
  }

  function calcPerKb(sizeBytes, lowRate, stdRate, fastRate) {
    return {
      low: Math.ceil((sizeBytes / 1000) * lowRate),
      std: Math.ceil((sizeBytes / 1000) * stdRate),
      fast: Math.ceil((sizeBytes / 1000) * fastRate)
    };
  }

  function resetOutput(ids) {
    ids.forEach((id) => {
      const el = $(id);
      if (el) el.textContent = "—";
    });
  }

  async function refreshBTC() {
    setStatus(els.btcStatus, "Fetching…");

    try {
      const url = els.btcUrl.value.trim();
      const size = safeInt(els.btcSize.value, DEFAULTS.btcSize, 1);
      const data = await jsonFetch(url);

      const lowRate = num(data.hourFee ?? data.minimumFee ?? data.economyFee, 1);
      const stdRate = num(data.halfHourFee ?? data.economyFee ?? data.fastestFee, lowRate);
      const fastRate = num(data.fastestFee ?? data.halfHourFee ?? data.hourFee, stdRate);

      const lowSats = Math.ceil(size * lowRate);
      const stdSats = Math.ceil(size * stdRate);
      const fastSats = Math.ceil(size * fastRate);

      $("btcLowRate").textContent = `${fmt(lowRate, 2)} sat/vB`;
      $("btcStdRate").textContent = `${fmt(stdRate, 2)} sat/vB`;
      $("btcFastRate").textContent = `${fmt(fastRate, 2)} sat/vB`;

      $("btcLowSats").textContent = fmt(lowSats, 0);
      $("btcStdSats").textContent = fmt(stdSats, 0);
      $("btcFastSats").textContent = fmt(fastSats, 0);

      $("btcLowBtc").textContent = `${fmtFixed(satsToBtc(lowSats), 8)} BTC`;
      $("btcStdBtc").textContent = `${fmtFixed(satsToBtc(stdSats), 8)} BTC`;
      $("btcFastBtc").textContent = `${fmtFixed(satsToBtc(fastSats), 8)} BTC`;

      setStatus(els.btcStatus, "Updated");
    } catch (error) {
      resetOutput([
        "btcLowRate", "btcStdRate", "btcFastRate",
        "btcLowSats", "btcStdSats", "btcFastSats",
        "btcLowBtc", "btcStdBtc", "btcFastBtc"
      ]);
      setStatus(els.btcStatus, `Failed: ${error.message}`);
    }
  }

  async function refreshLTC() {
    setStatus(els.ltcStatus, "Fetching…");

    try {
      const url = els.ltcUrl.value.trim();
      const size = safeInt(els.ltcSize.value, DEFAULTS.ltcSize, 1);
      const data = await jsonFetch(url);

      const lowRate = num(data.low_fee_per_kb, 0);
      const stdRate = num(data.medium_fee_per_kb, lowRate);
      const fastRate = num(data.high_fee_per_kb, stdRate);

      const fee = calcPerKb(size, lowRate, stdRate, fastRate);

      $("ltcLowRate").textContent = `${fmt(lowRate, 0)} litoshi/kB`;
      $("ltcStdRate").textContent = `${fmt(stdRate, 0)} litoshi/kB`;
      $("ltcFastRate").textContent = `${fmt(fastRate, 0)} litoshi/kB`;

      $("ltcLowLitoshi").textContent = fmt(fee.low, 0);
      $("ltcStdLitoshi").textContent = fmt(fee.std, 0);
      $("ltcFastLitoshi").textContent = fmt(fee.fast, 0);

      $("ltcLowLtc").textContent = `${fmtFixed(litoshiToLtc(fee.low), 8)} LTC`;
      $("ltcStdLtc").textContent = `${fmtFixed(litoshiToLtc(fee.std), 8)} LTC`;
      $("ltcFastLtc").textContent = `${fmtFixed(litoshiToLtc(fee.fast), 8)} LTC`;

      setStatus(els.ltcStatus, "Updated");
    } catch (error) {
      resetOutput([
        "ltcLowRate", "ltcStdRate", "ltcFastRate",
        "ltcLowLitoshi", "ltcStdLitoshi", "ltcFastLitoshi",
        "ltcLowLtc", "ltcStdLtc", "ltcFastLtc"
      ]);
      setStatus(els.ltcStatus, `Failed: ${error.message}`);
    }
  }

  async function refreshDOGE() {
    setStatus(els.dogeStatus, "Fetching…");

    try {
      const url = els.dogeUrl.value.trim();
      const size = safeInt(els.dogeSize.value, DEFAULTS.dogeSize, 1);
      const data = await jsonFetch(url);

      const lowRate = num(data.low_fee_per_kb, 0);
      const stdRate = num(data.medium_fee_per_kb, lowRate);
      const fastRate = num(data.high_fee_per_kb, stdRate);

      const fee = calcPerKb(size, lowRate, stdRate, fastRate);

      $("dogeLowRate").textContent = `${fmt(lowRate, 0)} koinu/kB`;
      $("dogeStdRate").textContent = `${fmt(stdRate, 0)} koinu/kB`;
      $("dogeFastRate").textContent = `${fmt(fastRate, 0)} koinu/kB`;

      $("dogeLowKoinu").textContent = fmt(fee.low, 0);
      $("dogeStdKoinu").textContent = fmt(fee.std, 0);
      $("dogeFastKoinu").textContent = fmt(fee.fast, 0);

      $("dogeLowDoge").textContent = `${fmtFixed(koinuToDoge(fee.low), 8)} DOGE`;
      $("dogeStdDoge").textContent = `${fmtFixed(koinuToDoge(fee.std), 8)} DOGE`;
      $("dogeFastDoge").textContent = `${fmtFixed(koinuToDoge(fee.fast), 8)} DOGE`;

      setStatus(els.dogeStatus, "Updated");
    } catch (error) {
      resetOutput([
        "dogeLowRate", "dogeStdRate", "dogeFastRate",
        "dogeLowKoinu", "dogeStdKoinu", "dogeFastKoinu",
        "dogeLowDoge", "dogeStdDoge", "dogeFastDoge"
      ]);
      setStatus(els.dogeStatus, `Failed: ${error.message}`);
    }
  }

  async function refreshDASH() {
    setStatus(els.dashStatus, "Fetching…");

    try {
      const url = els.dashUrl.value.trim();
      const size = safeInt(els.dashSize.value, DEFAULTS.dashSize, 1);
      const data = await jsonFetch(url);

      const lowRate = num(data.low_fee_per_kb, 0);
      const stdRate = num(data.medium_fee_per_kb, lowRate);
      const fastRate = num(data.high_fee_per_kb, stdRate);

      const fee = calcPerKb(size, lowRate, stdRate, fastRate);

      $("dashLowRate").textContent = `${fmt(lowRate, 0)} duffs/kB`;
      $("dashStdRate").textContent = `${fmt(stdRate, 0)} duffs/kB`;
      $("dashFastRate").textContent = `${fmt(fastRate, 0)} duffs/kB`;

      $("dashLowDuffs").textContent = fmt(fee.low, 0);
      $("dashStdDuffs").textContent = fmt(fee.std, 0);
      $("dashFastDuffs").textContent = fmt(fee.fast, 0);

      $("dashLowDash").textContent = `${fmtFixed(duffsToDash(fee.low), 8)} DASH`;
      $("dashStdDash").textContent = `${fmtFixed(duffsToDash(fee.std), 8)} DASH`;
      $("dashFastDash").textContent = `${fmtFixed(duffsToDash(fee.fast), 8)} DASH`;

      setStatus(els.dashStatus, "Updated");
    } catch (error) {
      resetOutput([
        "dashLowRate", "dashStdRate", "dashFastRate",
        "dashLowDuffs", "dashStdDuffs", "dashFastDuffs",
        "dashLowDash", "dashStdDash", "dashFastDash"
      ]);
      setStatus(els.dashStatus, `Failed: ${error.message}`);
    }
  }

  async function refreshTRX() {
    setStatus(els.trxStatus, "Fetching…");

    try {
      const url = els.trxUrl.value.trim();
      const bytes = safeInt(els.trxBytes.value, DEFAULTS.trxBytes, 0);
      const energy = safeInt(els.trxEnergy.value, DEFAULTS.trxEnergy, 0);

      const data = await jsonFetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: "{}"
      });

      const list = Array.isArray(data.chainParameter) ? data.chainParameter : data;
      if (!Array.isArray(list)) {
        throw new Error("Unexpected TRON response");
      }

      function getValue(...names) {
        for (const item of list) {
          if (names.includes(item.key)) {
            return Number(item.value);
          }
        }
        return null;
      }

      const bandwidthPrice = getValue("getTransactionFee") ?? 1000;
      const energyPrice = getValue("getEnergyFee") ?? 0;

      const bwSun = bytes * bandwidthPrice;
      const energySun = energy * energyPrice;
      const totalSun = bwSun + energySun;

      $("trxBwRate").textContent = `${fmt(bandwidthPrice, 0)} sun / byte`;
      $("trxEnergyRate").textContent = energyPrice
        ? `${fmt(energyPrice, 0)} sun / energy`
        : "Unavailable";

      $("trxBwSun").textContent = fmt(bwSun, 0);
      $("trxEnergySun").textContent = fmt(energySun, 0);
      $("trxTotalSun").textContent = fmt(totalSun, 0);

      $("trxBwTrx").textContent = `${fmtFixed(sunToTrx(bwSun), 6)} TRX`;
      $("trxEnergyTrx").textContent = `${fmtFixed(sunToTrx(energySun), 6)} TRX`;
      $("trxTotalTrx").textContent = `${fmtFixed(sunToTrx(totalSun), 6)} TRX`;

      setStatus(els.trxStatus, "Updated");
    } catch (error) {
      resetOutput([
        "trxBwRate", "trxEnergyRate",
        "trxBwSun", "trxEnergySun", "trxTotalSun",
        "trxBwTrx", "trxEnergyTrx", "trxTotalTrx"
      ]);
      setStatus(els.trxStatus, `Failed: ${error.message}`);
    }
  }

  async function refreshAll() {
    setStatus(els.btcStatus, "Fetching…");
    setStatus(els.ltcStatus, "Fetching…");
    setStatus(els.dogeStatus, "Fetching…");
    setStatus(els.dashStatus, "Fetching…");
    setStatus(els.trxStatus, "Fetching…");

    await Promise.allSettled([
      refreshBTC(),
      refreshLTC(),
      refreshDOGE(),
      refreshDASH(),
      refreshTRX()
    ]);
  }

  function fillDefaults() {
    Object.entries(DEFAULTS).forEach(([key, value]) => {
      const el = $(key);
      if (el) el.value = value;
    });

    setStatus(els.btcStatus, "Ready");
    setStatus(els.ltcStatus, "Ready");
    setStatus(els.dogeStatus, "Ready");
    setStatus(els.dashStatus, "Ready");
    setStatus(els.trxStatus, "Ready");
  }

  function bindAutoRefresh(inputId, handler) {
    const el = $(inputId);
    if (!el) return;

    let timer = null;
    el.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(handler, 250);
    });
  }

  if (els.btcRefresh) els.btcRefresh.addEventListener("click", refreshBTC);
  if (els.ltcRefresh) els.ltcRefresh.addEventListener("click", refreshLTC);
  if (els.dogeRefresh) els.dogeRefresh.addEventListener("click", refreshDOGE);
  if (els.dashRefresh) els.dashRefresh.addEventListener("click", refreshDASH);
  if (els.trxRefresh) els.trxRefresh.addEventListener("click", refreshTRX);
  if (els.refreshAll) els.refreshAll.addEventListener("click", refreshAll);
  if (els.fillDefaults) els.fillDefaults.addEventListener("click", fillDefaults);

  bindAutoRefresh("btcSize", refreshBTC);
  bindAutoRefresh("ltcSize", refreshLTC);
  bindAutoRefresh("dogeSize", refreshDOGE);
  bindAutoRefresh("dashSize", refreshDASH);
  bindAutoRefresh("trxBytes", refreshTRX);
  bindAutoRefresh("trxEnergy", refreshTRX);

  refreshAll();
});
