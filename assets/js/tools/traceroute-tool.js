document.addEventListener("DOMContentLoaded", () => {
  const hostEl = document.getElementById("host");
  const probesEl = document.getElementById("probes");
  const timeoutEl = document.getElementById("timeout");
  const traceBtn = document.getElementById("traceBtn");
  const copyBtn = document.getElementById("copyBtn");
  const shareBtn = document.getElementById("shareBtn");
  const loader = document.getElementById("loader");
  const resultsBody = document.getElementById("resultsBody");
  const statusBadge = document.getElementById("statusBadge");

  const summaryTarget = document.getElementById("summaryTarget");
  const summaryBest = document.getElementById("summaryBest");
  const summaryAvg = document.getElementById("summaryAvg");
  const summarySuccess = document.getElementById("summarySuccess");

  const quickButtons = Array.from(document.querySelectorAll("[data-fill]"));

  let isRunning = false;
  let lastCopyText = "";

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));
  }

  function setLoader(show) {
    if (loader) loader.hidden = !show;
  }

  function setStatus(text) {
    if (statusBadge) statusBadge.textContent = text;
  }

  function setSummary(target = "—", best = "—", avg = "—", success = "—") {
    if (summaryTarget) summaryTarget.textContent = target;
    if (summaryBest) summaryBest.textContent = best;
    if (summaryAvg) summaryAvg.textContent = avg;
    if (summarySuccess) summarySuccess.textContent = success;
  }

  function setEmptyState(message) {
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

  function latencyLabel(ms) {
    if (ms < 50) return "Very Good";
    if (ms < 100) return "Acceptable";
    if (ms < 250) return "Slow";
    return "High";
  }

  function probeOnce(origin, timeoutMs) {
    return new Promise((resolve) => {
      const start = performance.now();
      const img = new Image();
      let done = false;

      function finish(ok, message) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        img.onload = null;
        img.onerror = null;

        resolve({
          ok,
          latency: Math.round(performance.now() - start),
          message
        });
      }

      const timer = setTimeout(() => {
        finish(false, "Timed out");
      }, timeoutMs);

      img.onload = () => finish(true, "Target responded");
      img.onerror = () => finish(true, "Host responded");

      img.src = `${origin}/favicon.ico?trace_probe=${Date.now()}_${Math.random().toString(36).slice(2)}`;
    });
  }

  function buildCopyText(target, totalProbes, timeoutMs, successful, best, avg) {
    return [
      "Traceroute Tool",
      `Target: ${target}`,
      `Probes: ${totalProbes}`,
      `Timeout: ${timeoutMs} ms`,
      `Best: ${best != null ? best + " ms" : "N/A"}`,
      `Average: ${avg != null ? avg + " ms" : "N/A"}`,
      `Success Rate: ${successful}/${totalProbes}`,
      "Note: Browser-based repeated latency and reachability probe, not true hop-by-hop traceroute."
    ].join("\n");
  }

  async function runTrace() {
    if (isRunning) return;

    const parsed = normalizeTarget(hostEl.value);
    const totalProbes = Math.max(1, Number(probesEl.value || 8));
    const timeoutMs = Math.max(1000, Number(timeoutEl.value || 5000));

    if (!parsed) {
      setSummary("—", "—", "—", "—");
      setEmptyState("Enter a valid domain or URL.");
      setStatus("Invalid input");
      hostEl.focus();
      lastCopyText = "";
      return;
    }

    isRunning = true;
    traceBtn.disabled = true;
    setLoader(true);
    setStatus("Tracing");
    setSummary(parsed.hostname, "—", "—", `0/${totalProbes}`);
    lastCopyText = "";

    resultsBody.innerHTML = "";

    const latencies = [];
    let successCount = 0;

    for (let i = 1; i <= totalProbes; i++) {
      const pendingRow = document.createElement("tr");
      pendingRow.innerHTML = `
        <td class="resolver">${i}</td>
        <td class="resultCell">
          <div class="resultBox">
            <div class="mono muted">${escapeHtml(parsed.hostname)}</div>
          </div>
        </td>
        <td class="ttl">Testing...</td>
        <td class="ttl">—</td>
      `;
      resultsBody.appendChild(pendingRow);

      try {
        const result = await probeOnce(parsed.origin, timeoutMs);

        if (result.ok) {
          latencies.push(result.latency);
          successCount += 1;

          pendingRow.innerHTML = `
            <td class="resolver">${i}</td>
            <td class="resultCell">
              <div class="resultBox">
                <div class="mono ok">${escapeHtml(parsed.hostname)} responded</div>
              </div>
            </td>
            <td class="ttl">${escapeHtml(latencyLabel(result.latency))}</td>
            <td class="ttl">${escapeHtml(result.latency + " ms")}</td>
          `;
        } else {
          pendingRow.innerHTML = `
            <td class="resolver">${i}</td>
            <td class="resultCell">
              <div class="resultBox">
                <div class="mono bad">${escapeHtml(parsed.hostname)} did not respond in time</div>
              </div>
            </td>
            <td class="ttl">${escapeHtml(result.message || "Timeout")}</td>
            <td class="ttl">—</td>
          `;
        }
      } catch (error) {
        pendingRow.innerHTML = `
          <td class="resolver">${i}</td>
          <td class="resultCell">
            <div class="resultBox">
              <div class="mono bad">${escapeHtml(parsed.hostname)} probe failed</div>
            </div>
          </td>
          <td class="ttl">Error</td>
          <td class="ttl">—</td>
        `;
      }

      const best = latencies.length ? Math.min(...latencies) : null;
      const avg = latencies.length
        ? Math.round(latencies.reduce((sum, n) => sum + n, 0) / latencies.length)
        : null;

      setSummary(
        parsed.hostname,
        best != null ? `${best} ms` : "—",
        avg != null ? `${avg} ms` : "—",
        `${successCount}/${totalProbes}`
      );
    }

    const best = latencies.length ? Math.min(...latencies) : null;
    const avg = latencies.length
      ? Math.round(latencies.reduce((sum, n) => sum + n, 0) / latencies.length)
      : null;

    setStatus(successCount ? "Complete" : "No response");
    setLoader(false);
    traceBtn.disabled = false;
    isRunning = false;

    lastCopyText = buildCopyText(parsed.hostname, totalProbes, timeoutMs, successCount, best, avg);
  }

  async function copyResult() {
    if (!lastCopyText) return;

    try {
      await navigator.clipboard.writeText(lastCopyText);
      const old = copyBtn.textContent;
      copyBtn.textContent = "Copied";
      setTimeout(() => {
        copyBtn.textContent = old;
      }, 1400);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  }

  async function copyLink() {
    try {
      const url = new URL(window.location.href);
      const host = String(hostEl.value || "").trim();
      const probes = String(probesEl.value || "8");
      const timeout = String(timeoutEl.value || "5000");

      if (host) url.searchParams.set("host", host);
      else url.searchParams.delete("host");

      url.searchParams.set("probes", probes);
      url.searchParams.set("timeout", timeout);

      await navigator.clipboard.writeText(url.toString());

      const old = shareBtn.textContent;
      shareBtn.textContent = "Copied";
      setTimeout(() => {
        shareBtn.textContent = old;
      }, 1400);
    } catch (error) {
      console.error("Copy link failed:", error);
    }
  }

  function applyQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const host = params.get("host");
    const probes = params.get("probes");
    const timeout = params.get("timeout");

    if (host) hostEl.value = host;
    if (probes && [...probesEl.options].some(opt => opt.value === probes)) {
      probesEl.value = probes;
    }
    if (timeout && [...timeoutEl.options].some(opt => opt.value === timeout)) {
      timeoutEl.value = timeout;
    }
  }

  traceBtn?.addEventListener("click", runTrace);
  copyBtn?.addEventListener("click", copyResult);
  shareBtn?.addEventListener("click", copyLink);

  hostEl?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runTrace();
  });

  quickButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      hostEl.value = btn.getAttribute("data-fill") || "";
      runTrace();
    });
  });

  applyQueryParams();
  setSummary();
  setEmptyState("Enter a domain or URL and run the trace.");
  setStatus("Ready");
});
