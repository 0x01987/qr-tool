(() => {
  const hostEl = document.getElementById("host");
  const countEl = document.getElementById("count");
  const timeoutEl = document.getElementById("timeout");
  const pingBtn = document.getElementById("pingBtn");
  const copyBtn = document.getElementById("copyBtn");
  const shareBtn = document.getElementById("shareBtn");
  const loader = document.getElementById("loader");
  const resultsBody = document.getElementById("resultsBody");
  const statusBadge = document.getElementById("statusBadge");

  const avgLatencyEl = document.getElementById("avgLatency");
  const bestLatencyEl = document.getElementById("bestLatency");
  const worstLatencyEl = document.getElementById("worstLatency");
  const successRateEl = document.getElementById("successRate");

  const quickButtons = Array.from(document.querySelectorAll("[data-fill]"));

  let lastSummaryText = "";
  let isRunning = false;

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));
  }

  function normalizeTarget(input) {
    let value = String(input || "").trim();
    if (!value) return null;

    if (!/^https?:\/\//i.test(value)) {
      value = "https://" + value;
    }

    try {
      const url = new URL(value);
      return {
        href: url.href,
        origin: url.origin,
        hostname: url.hostname
      };
    } catch {
      return null;
    }
  }

  function setStatus(text) {
    statusBadge.textContent = text;
  }

  function setLoader(show) {
    loader.hidden = !show;
  }

  function resetSummary() {
    avgLatencyEl.textContent = "—";
    bestLatencyEl.textContent = "—";
    worstLatencyEl.textContent = "—";
    successRateEl.textContent = "—";
  }

  function renderEmptyRow(message) {
    resultsBody.innerHTML = `
      <tr>
        <td class="resolver">Ready</td>
        <td class="resultCell">
          <div class="resultBox">
            <div class="mono muted">${escapeHtml(message)}</div>
          </div>
        </td>
        <td class="ttl">—</td>
        <td class="ttl">—</td>
      </tr>
    `;
  }

  function latencyTone(ms) {
    if (ms < 20) return "ok";
    if (ms < 50) return "ok";
    if (ms < 100) return "warn";
    return "bad";
  }

  function toneText(ms) {
    if (ms < 20) return "Excellent";
    if (ms < 50) return "Very Good";
    if (ms < 100) return "Acceptable";
    return "Slow";
  }

  function appendRow(attempt, resultText, statusText, latencyText, tone = "") {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="resolver">${escapeHtml(String(attempt))}</td>
      <td class="resultCell">
        <div class="resultBox">
          <div class="mono ${tone ? tone : "muted"}">${resultText}</div>
        </div>
      </td>
      <td class="ttl">${escapeHtml(statusText)}</td>
      <td class="ttl">${escapeHtml(latencyText)}</td>
    `;
    resultsBody.appendChild(tr);
  }

  async function pingOnce(origin, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const start = performance.now();
    const cacheBust = `instantqr_ping=${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const target = `${origin.replace(/\/$/, "")}/?${cacheBust}`;

    try {
      await fetch(target, {
        method: "GET",
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal
      });

      clearTimeout(timer);
      const latency = Math.round(performance.now() - start);

      return { ok: true, latency };
    } catch (err) {
      clearTimeout(timer);
      if (err && err.name === "AbortError") {
        return { ok: false, error: "Timeout" };
      }
      return { ok: false, error: "Blocked or failed" };
    }
  }

  function updateSummary(times, totalCount) {
    if (!times.length) {
      avgLatencyEl.textContent = "N/A";
      bestLatencyEl.textContent = "N/A";
      worstLatencyEl.textContent = "N/A";
      successRateEl.textContent = `0/${totalCount}`;
      return {
        avg: null,
        best: null,
        worst: null,
        success: 0
      };
    }

    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const best = Math.min(...times);
    const worst = Math.max(...times);

    avgLatencyEl.textContent = `${avg} ms`;
    bestLatencyEl.textContent = `${best} ms`;
    worstLatencyEl.textContent = `${worst} ms`;
    successRateEl.textContent = `${times.length}/${totalCount}`;

    return {
      avg,
      best,
      worst,
      success: times.length
    };
  }

  function buildSummaryText(hostname, totalCount, timeoutMs, stats) {
    return [
      `Ping Tool Summary`,
      `Target: ${hostname}`,
      `Requests: ${totalCount}`,
      `Timeout: ${timeoutMs} ms`,
      `Average: ${stats.avg != null ? stats.avg + " ms" : "N/A"}`,
      `Best: ${stats.best != null ? stats.best + " ms" : "N/A"}`,
      `Worst: ${stats.worst != null ? stats.worst + " ms" : "N/A"}`,
      `Success Rate: ${stats.success}/${totalCount}`,
      `Note: Browser-based HTTP/HTTPS latency test, not true ICMP ping.`
    ].join("\n");
  }

  async function runTest() {
    if (isRunning) return;

    const parsed = normalizeTarget(hostEl.value);
    const totalCount = Math.max(1, Number(countEl.value || 5));
    const timeoutMs = Math.max(1000, Number(timeoutEl.value || 6000));

    if (!parsed) {
      resetSummary();
      renderEmptyRow("Please enter a valid domain or URL.");
      setStatus("Invalid input");
      hostEl.focus();
      return;
    }

    isRunning = true;
    pingBtn.disabled = true;
    setLoader(true);
    setStatus("Running");
    resetSummary();
    lastSummaryText = "";

    resultsBody.innerHTML = "";

    const times = [];

    for (let i = 1; i <= totalCount; i++) {
      const result = await pingOnce(parsed.origin, timeoutMs);

      if (result.ok) {
        times.push(result.latency);
        const tone = latencyTone(result.latency);
        appendRow(
          i,
          `${escapeHtml(parsed.hostname)} responded`,
          toneText(result.latency),
          `${result.latency} ms`,
          tone
        );
      } else {
        appendRow(
          i,
          escapeHtml(parsed.hostname),
          result.error,
          "—",
          "bad"
        );
      }
    }

    const stats = updateSummary(times, totalCount);
    lastSummaryText = buildSummaryText(parsed.hostname, totalCount, timeoutMs, stats);

    setLoader(false);
    setStatus(times.length ? "Complete" : "No response");
    pingBtn.disabled = false;
    isRunning = false;
  }

  async function copySummary() {
    if (!lastSummaryText) return;

    try {
      await navigator.clipboard.writeText(lastSummaryText);
      const old = copyBtn.textContent;
      copyBtn.textContent = "Copied";
      setTimeout(() => { copyBtn.textContent = old; }, 1400);
    } catch {}
  }

  async function copyLink() {
    const parsed = normalizeTarget(hostEl.value);
    const url = new URL(window.location.href);

    if (parsed) {
      url.searchParams.set("host", parsed.href);
    } else {
      url.searchParams.delete("host");
    }

    url.searchParams.set("count", countEl.value || "5");
    url.searchParams.set("timeout", timeoutEl.value || "6000");

    try {
      await navigator.clipboard.writeText(url.toString());
      const old = shareBtn.textContent;
      shareBtn.textContent = "Copied";
      setTimeout(() => { shareBtn.textContent = old; }, 1400);
    } catch {}
  }

  function applyQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const host = params.get("host");
    const count = params.get("count");
    const timeout = params.get("timeout");

    if (host) hostEl.value = host;
    if (count && [...countEl.options].some(o => o.value === count)) countEl.value = count;
    if (timeout && [...timeoutEl.options].some(o => o.value === timeout)) timeoutEl.value = timeout;
  }

  pingBtn?.addEventListener("click", runTest);
  copyBtn?.addEventListener("click", copySummary);
  shareBtn?.addEventListener("click", copyLink);

  hostEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runTest();
  });

  quickButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      hostEl.value = btn.getAttribute("data-fill") || "";
      hostEl.focus();
    });
  });

  applyQueryParams();
  renderEmptyRow("Enter a domain or URL, choose options, and run the test.");
})();
