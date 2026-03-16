document.addEventListener('DOMContentLoaded', () => {
  const ui = {
    dl: document.getElementById('dl'),
    dlLive: document.getElementById('dlLive'),
    ping: document.getElementById('ping'),
    status: document.getElementById('status'),
    start: document.getElementById('startBtn'),
    stop: document.getElementById('stopBtn'),
    reset: document.getElementById('resetBtn'),
    arc: document.getElementById('gArc'),
    needle: document.getElementById('needle'),
    serverHint: document.getElementById('serverHint')
  };

  if (!ui.start || !ui.stop || !ui.reset || !ui.dl || !ui.ping || !ui.status || !ui.arc || !ui.needle) {
    return;
  }

  const CONFIG = {
    pingUrl: 'https://speed.cloudflare.com/__down?bytes=10000',
    downloadUrl: 'https://speed.cloudflare.com/__down?bytes=25000000',
    serverLabel: 'Cloudflare',
    maxGaugeMbps: 500
  };

  let stopFlag = false;
  let liveMbps = 0;
  let animFrame = null;
  let activeController = null;

  function setStatus(html) {
    ui.status.innerHTML = html;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function speedColor(mbps) {
    if (mbps < 25) return '#22d3ee';
    if (mbps < 75) return '#3b82f6';
    if (mbps < 150) return '#8b5cf6';
    if (mbps < 300) return '#ec4899';
    return '#22c55e';
  }

  function updateGauge(mbps) {
    const max = CONFIG.maxGaugeMbps;
    const safe = clamp(Number.isFinite(mbps) ? mbps : 0, 0, max);
    const pct = safe / max;
    const arcLen = 471;

    ui.arc.style.strokeDasharray = String(arcLen);
    ui.arc.style.strokeDashoffset = String(arcLen - (arcLen * pct));

    const deg = -108 + (216 * pct);
    ui.needle.style.transform = `rotate(${deg}deg)`;
    ui.dlLive.style.color = speedColor(safe);
  }

  function animateGaugeTo(target) {
    cancelAnimationFrame(animFrame);

    const from = liveMbps;
    const to = Number.isFinite(target) ? target : 0;
    const start = performance.now();

    function step(ts) {
      const t = Math.min(1, (ts - start) / 220);
      const eased = 1 - Math.pow(1 - t, 3);
      liveMbps = from + (to - from) * eased;
      ui.dlLive.textContent = Number.isFinite(liveMbps) ? liveMbps.toFixed(1) : '—';
      updateGauge(liveMbps);

      if (t < 1) {
        animFrame = requestAnimationFrame(step);
      } else {
        liveMbps = to;
      }
    }

    animFrame = requestAnimationFrame(step);
  }

  function resetVisuals() {
    liveMbps = 0;
    cancelAnimationFrame(animFrame);
    ui.dl.textContent = '—';
    ui.dlLive.textContent = '—';
    ui.ping.textContent = '—';
    updateGauge(0);
  }

  function enableIdleButtons() {
    ui.start.disabled = false;
    ui.stop.disabled = true;
  }

  function enableRunningButtons() {
    ui.start.disabled = true;
    ui.stop.disabled = false;
  }

  function abortActive() {
    if (activeController) {
      try {
        activeController.abort();
      } catch {}
      activeController = null;
    }
  }

  async function fetchWithAbort(url) {
    abortActive();
    activeController = new AbortController();

    const res = await fetch(url, {
      cache: 'no-store',
      signal: activeController.signal
    });

    activeController = null;
    return res;
  }

  async function pingTest() {
    const url = `${CONFIG.pingUrl}&rand=${Math.random()}`;
    const t0 = performance.now();
    await fetchWithAbort(url);
    const t1 = performance.now();
    return Math.round(t1 - t0);
  }

  async function downloadTest() {
    const url = `${CONFIG.downloadUrl}&rand=${Math.random()}`;
    abortActive();
    activeController = new AbortController();

    const start = performance.now();
    const res = await fetch(url, {
      cache: 'no-store',
      signal: activeController.signal
    });

    if (!res.body) {
      activeController = null;
      throw new Error('Streaming not supported');
    }

    const reader = res.body.getReader();
    let received = 0;
    let lastUiUpdate = start;

    try {
      while (!stopFlag) {
        const { done, value } = await reader.read();
        if (done) break;

        received += value.length;

        const now = performance.now();
        if (now - lastUiUpdate > 120) {
          const secs = (now - start) / 1000;
          const mbps = secs > 0 ? (received * 8) / secs / 1e6 : 0;
          animateGaugeTo(mbps);
          lastUiUpdate = now;
        }
      }
    } finally {
      try { reader.releaseLock(); } catch {}
      activeController = null;
    }

    const end = performance.now();
    const secs = (end - start) / 1000;
    if (secs <= 0 || received <= 0) return NaN;
    return (received * 8) / secs / 1e6;
  }

  function resetUI() {
    stopFlag = false;
    abortActive();
    resetVisuals();
    setStatus('<strong>Ready.</strong><br>Press <b>Start Speed Test</b>.');
    enableIdleButtons();

    if (ui.serverHint) {
      ui.serverHint.textContent = `Server: ${CONFIG.serverLabel}`;
    }
  }

  async function run() {
    stopFlag = false;
    resetVisuals();
    enableRunningButtons();

    try {
      setStatus('<strong>Measuring ping…</strong><br>Timing a small request.');
      const ping = await pingTest();
      if (stopFlag) return;
      ui.ping.textContent = String(ping);

      setStatus('<strong>Measuring download…</strong><br>Streaming test data for a quick estimate.');
      ui.dlLive.textContent = '0.0';
      updateGauge(0);

      const dl = await downloadTest();
      if (stopFlag) return;

      const finalDl = Number.isFinite(dl) ? dl : 0;
      ui.dl.textContent = Number.isFinite(dl) ? dl.toFixed(1) : '—';
      animateGaugeTo(finalDl);

      setStatus('<strong>Done.</strong><br>Run it again to compare results in different rooms, networks, or times of day.');
    } catch (err) {
      if (stopFlag) {
        setStatus('<strong>Stopped.</strong><br>You can start again anytime.');
      } else {
        setStatus('<strong>Test failed.</strong><br>Your browser or network blocked the test request. Try again or disable VPN / strict blocking.');
      }
    } finally {
      enableIdleButtons();
    }
  }

  ui.start.addEventListener('click', run);

  ui.stop.addEventListener('click', () => {
    stopFlag = true;
    abortActive();
    ui.stop.disabled = true;
    setStatus('<strong>Stopped.</strong><br>You can start again anytime.');
  });

  ui.reset.addEventListener('click', resetUI);

  resetUI();
});
