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
        hostname: url.hostname,
        protocol: url.protocol
      };
    } catch {
      return null;
    }
  }

  function setStatus(text) {
    if (statusBadge) statusBadge.textContent = text;
  }

  function setLoader(show) {
    if (loader) loader.hidden = !show;
  }

  function resetSummary() {
    if (avgLatencyEl) avgLatencyEl.textContent = "—";
    if (bestLatencyEl) bestLatencyEl.textContent = "—";
    if (worstLatencyEl) worstLatencyEl.textContent = "—";
    if (successRateEl) successRateEl.textContent = "—";
  }

  function renderEmptyRow(message) {
    if (!resultsBody) return;
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
    if (!resultsBody) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="resolver">${escapeHtml(String(attempt))}</td>
      <td class="resultCell">
        <div class="resultBox">
          <div class="mono ${tone || "muted"}">${escapeHtml(resultText)}</div>
        </div>
      </td>
      <td class="ttl">${escapeHtml(statusText)}</td>
      <td class="ttl">${escapeHtml(latencyText)}</td>
    `;
    resultsBody.appendChild(tr);
  }

  function updateSummary(times, totalCount) {
    if (!times.length) {
      if (avgLatencyEl) avgLatencyEl.textContent = "N/A";
      if (bestLatencyEl) bestLatencyEl.textContent = "N/A";
      if (worstLatencyEl) worstLatencyEl.textContent = "N/A";
      if (successRateEl) successRateEl.textContent = `0/${totalCount}`;
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

    if (avgLatencyEl) avgLatencyEl.textContent = `${avg} ms`;
    if (bestLatencyEl) bestLatencyEl.textContent = `${best} ms`;
    if (worstLatencyEl) worstLatencyEl.textContent = `${worst} ms`;
    if (successRateEl) successRateEl.textContent = `${times.length}/${totalCount}`;

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
      `Note: Browser-based latency test, not true ICMP ping.`
    ].join("\n");
  }

  function pingOnce(origin, timeoutMs) {
    return new Promise((resolve) => {
      const start = performance.now();
      const img = new Image();

      let done = false;
      const finalize = (ok, errorText = "") => {
        if (done) return;
        done = true;
        clearTimeout(timer);

        const latency = Math.round(performance.now() - start);

        img.onload = null;
        img.onerror = null;

        if (ok) {
          resolve({ ok: true, latency });
        } else {
          resolve({ ok: false, error: errorText || "No response" });
        }
      };

      const timer = setTimeout(() => finalize(false, "Timeout"), timeoutMs);

      img.onload = () => finalize(true);
      img.onerror = () => {
        // Even an image error proves the host responded.
        // For browser-based reachability timing, treat this as success.
        finalize(true);
      };

      const sep = origin.includes("?") ? "&" : "?";
      img.src = `${origin}/favicon.ico${sep}instantqr_ping=${Date.now()}_${Math.random().toString(36).slice(2)}`;
    });
  }

  async function runTest() {
    if (isRunning) return;

    const parsed = normalizeTarget(hostEl?.value || "");
    const totalCount = Math.max(1, Number(countEl?.value || 5));
    const timeoutMs = Math.max(1000, Number(timeoutEl?.value || 6000));

    if (!parsed) {
      resetSummary();
      renderEmptyRow("Please enter a valid domain or URL.");
      setStatus("Invalid input");
      if (hostEl) hostEl.focus();
      return;
    }

    isRunning = true;
    if (pingBtn) pingBtn.disabled = true;
    setLoader(true);
    setStatus("Running");
    resetSummary();
    lastSummaryText = "";

    if (resultsBody) resultsBody.innerHTML = "";

    const times = [];

    appendRow("—", `Target: ${parsed.hostname}`, "Starting", "—");

    for (let i = 1; i <= totalCount; i++) {
      const result = await pingOnce(parsed.origin, timeoutMs);

      if (result.ok) {
        times.push(result.latency);
        const tone = latencyTone(result.latency);
        appendRow(
          i,
          `${parsed.hostname} responded`,
          toneText(result.latency),
          `${result.latency} ms`,
          tone
        );
      } else {
        appendRow(
          i,
          `${parsed.hostname} did not respond in time`,
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

    if (pingBtn) pingBtn.disabled = false;
    isRunning = false;
  }

  async function copySummary() {
    if (!lastSummaryText) return;

    try {
      await navigator.clipboard.writeText(lastSummaryText);
      if (!copyBtn) return;
      const old = copyBtn.textContent;
      copyBtn.textContent = "Copied";
      setTimeout(() => { copyBtn.textContent = old; }, 1400);
    } catch {}
  }

  async function copyLink() {
    const parsed = normalizeTarget(hostEl?.value || "");
    const url = new URL(window.location.href);

    if (parsed) {
      url.searchParams.set("host", parsed.href);
    } else {
      url.searchParams.delete("host");
    }

    url.searchParams.set("count", countEl?.value || "5");
    url.searchParams.set("timeout", timeoutEl?.value || "6000");

    try {
      await navigator.clipboard.writeText(url.toString());
      if (!shareBtn) return;
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

    if (hostEl && host) hostEl.value = host;
    if (countEl && count && [...countEl.options].some(o => o.value === count)) {
      countEl.value = count;
    }
    if (timeoutEl && timeout && [...timeoutEl.options].some(o => o.value === timeout)) {
      timeoutEl.value = timeout;
    }
  }

  if (pingBtn) pingBtn.addEventListener("click", runTest);
  if (copyBtn) copyBtn.addEventListener("click", copySummary);
  if (shareBtn) shareBtn.addEventListener("click", copyLink);

  if (hostEl) {
    hostEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") runTest();
    });
  }

  quickButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (hostEl) {
        hostEl.value = btn.getAttribute("data-fill") || "";
        hostEl.focus();
      }
    });
  });

  applyQueryParams();
  renderEmptyRow("Enter a domain or URL, choose options, and run the test.");
})();
