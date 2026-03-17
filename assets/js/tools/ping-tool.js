document.addEventListener("DOMContentLoaded", () => {
  const els = {
    host: document.getElementById("host"),
    count: document.getElementById("count"),
    timeout: document.getElementById("timeout"),
    pingBtn: document.getElementById("pingBtn"),
    copyBtn: document.getElementById("copyBtn"),
    shareBtn: document.getElementById("shareBtn"),
    loader: document.getElementById("loader"),
    resultsBody: document.getElementById("resultsBody"),
    statusBadge: document.getElementById("statusBadge"),
    avgLatency: document.getElementById("avgLatency"),
    bestLatency: document.getElementById("bestLatency"),
    worstLatency: document.getElementById("worstLatency"),
    successRate: document.getElementById("successRate")
  };

  const quickButtons = Array.from(document.querySelectorAll("[data-fill]"));
  let isRunning = false;
  let lastSummaryText = "";

  function log(...args) {
    console.log("[ping-tool]", ...args);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));
  }

  function requiredElsPresent() {
    const missing = Object.entries(els)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length) {
      console.error("Ping tool missing DOM elements:", missing);
      return false;
    }
    return true;
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
    if (els.statusBadge) els.statusBadge.textContent = text;
  }

  function setLoader(show) {
    if (els.loader) els.loader.hidden = !show;
  }

  function resetSummary() {
    els.avgLatency.textContent = "—";
    els.bestLatency.textContent = "—";
    els.worstLatency.textContent = "—";
    els.successRate.textContent = "—";
  }

  function setEmptyState(message) {
    els.resultsBody.innerHTML = `
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

  function addRow(attempt, result, status, latency, toneClass) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="resolver">${escapeHtml(String(attempt))}</td>
      <td class="resultCell">
        <div class="resultBox">
          <div class="mono ${toneClass || "muted"}">${escapeHtml(result)}</div>
        </div>
      </td>
      <td class="ttl">${escapeHtml(status)}</td>
      <td class="ttl">${escapeHtml(latency)}</td>
    `;
    els.resultsBody.appendChild(tr);
    return tr;
  }

  function updateRow(tr, result, status, latency, toneClass) {
    tr.innerHTML = `
      <td class="resolver">${escapeHtml(tr.dataset.attempt || "—")}</td>
      <td class="resultCell">
        <div class="resultBox">
          <div class="mono ${toneClass || "muted"}">${escapeHtml(result)}</div>
        </div>
      </td>
      <td class="ttl">${escapeHtml(status)}</td>
      <td class="ttl">${escapeHtml(latency)}</td>
    `;
  }

  function toneForLatency(ms) {
    if (ms < 50) return { cls: "ok", label: "Very Good" };
    if (ms < 100) return { cls: "warn", label: "Acceptable" };
    return { cls: "bad", label: "Slow" };
  }

  function updateSummary(times, totalCount) {
    if (!times.length) {
      els.avgLatency.textContent = "N/A";
      els.bestLatency.textContent = "N/A";
      els.worstLatency.textContent = "N/A";
      els.successRate.textContent = `0/${totalCount}`;
      return { avg: null, best: null, worst: null, success: 0 };
    }

    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const best = Math.min(...times);
    const worst = Math.max(...times);

    els.avgLatency.textContent = `${avg} ms`;
    els.bestLatency.textContent = `${best} ms`;
    els.worstLatency.textContent = `${worst} ms`;
    els.successRate.textContent = `${times.length}/${totalCount}`;

    return { avg, best, worst, success: times.length };
  }

  function buildSummaryText(hostname, totalCount, timeoutMs, stats) {
    return [
      "Ping Tool Summary",
      `Target: ${hostname}`,
      `Requests: ${totalCount}`,
      `Timeout: ${timeoutMs} ms`,
      `Average: ${stats.avg != null ? stats.avg + " ms" : "N/A"}`,
      `Best: ${stats.best != null ? stats.best + " ms" : "N/A"}`,
      `Worst: ${stats.worst != null ? stats.worst + " ms" : "N/A"}`,
      `Success Rate: ${stats.success}/${totalCount}`,
      "Note: Browser-based latency test, not true ICMP ping."
    ].join("\n");
  }

  function pingImage(origin, timeoutMs) {
    return new Promise((resolve) => {
      const start = performance.now();
      let done = false;
      const img = new Image();

      function finish(ok, errorText) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        const latency = Math.round(performance.now() - start);
        img.onload = null;
        img.onerror = null;

        if (ok) {
          resolve({ ok: true, latency });
        } else {
          resolve({ ok: false, error: errorText || "Timeout" });
        }
      }

      const timer = setTimeout(() => finish(false, "Timeout"), timeoutMs);

      img.onload = () => finish(true);
      img.onerror = () => {
        // A 404/error still proves the host answered.
        finish(true);
      };

      img.src = `${origin}/favicon.ico?instantqr_ping=${Date.now()}_${Math.random().toString(36).slice(2)}`;
    });
  }

  async function runTest() {
    if (isRunning) return;

    const parsed = normalizeTarget(els.host.value);
    const totalCount = Math.max(1, Number(els.count.value || 5));
    const timeoutMs = Math.max(1000, Number(els.timeout.value || 6000));

    if (!parsed) {
      resetSummary();
      setEmptyState("Please enter a valid domain or URL.");
      setStatus("Invalid input");
      els.host.focus();
      return;
    }

    isRunning = true;
    els.pingBtn.disabled = true;
    setLoader(true);
    setStatus("Running");
    resetSummary();
    lastSummaryText = "";
    els.resultsBody.innerHTML = "";

    log("Starting test for", parsed);

    addRow("—", `Target: ${parsed.hostname}`, "Starting", "—", "muted");

    const times = [];

    for (let i = 1; i <= totalCount; i++) {
      const pendingRow = addRow(i, `${parsed.hostname}`, "Testing...", "—", "muted");
      pendingRow.dataset.attempt = String(i);

      try {
        const result = await pingImage(parsed.origin, timeoutMs);

        if (result.ok) {
          times.push(result.latency);
          const tone = toneForLatency(result.latency);
          updateRow(
            pendingRow,
            `${parsed.hostname} responded`,
            tone.label,
            `${result.latency} ms`,
            tone.cls
          );
        } else {
          updateRow(
            pendingRow,
            `${parsed.hostname} did not respond in time`,
            result.error || "Timeout",
            "—",
            "bad"
          );
        }
      } catch (err) {
        console.error("Ping attempt failed:", err);
        updateRow(
          pendingRow,
          `${parsed.hostname} test failed`,
          "Error",
          "—",
          "bad"
        );
      }
    }

    const stats = updateSummary(times, totalCount);
    lastSummaryText = buildSummaryText(parsed.hostname, totalCount, timeoutMs, stats);

    setLoader(false);
    setStatus(times.length ? "Complete" : "No response");

    els.pingBtn.disabled = false;
    isRunning = false;
  }

  async function copySummary() {
    if (!lastSummaryText) return;
    try {
      await navigator.clipboard.writeText(lastSummaryText);
      const old = els.copyBtn.textContent;
      els.copyBtn.textContent = "Copied";
      setTimeout(() => {
        els.copyBtn.textContent = old;
      }, 1400);
    } catch (err) {
      console.error("Copy summary failed:", err);
    }
  }

  async function copyLink() {
    try {
      const parsed = normalizeTarget(els.host.value);
      const url = new URL(window.location.href);

      if (parsed) {
        url.searchParams.set("host", parsed.href);
      } else {
        url.searchParams.delete("host");
      }

      url.searchParams.set("count", els.count.value || "5");
      url.searchParams.set("timeout", els.timeout.value || "6000");

      await navigator.clipboard.writeText(url.toString());

      const old = els.shareBtn.textContent;
      els.shareBtn.textContent = "Copied";
      setTimeout(() => {
        els.shareBtn.textContent = old;
      }, 1400);
    } catch (err) {
      console.error("Copy link failed:", err);
    }
  }

  function applyQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const host = params.get("host");
    const count = params.get("count");
    const timeout = params.get("timeout");

    if (host) els.host.value = host;
    if (count && [...els.count.options].some(o => o.value === count)) {
      els.count.value = count;
    }
    if (timeout && [...els.timeout.options].some(o => o.value === timeout)) {
      els.timeout.value = timeout;
    }
  }

  if (!requiredElsPresent()) {
    return;
  }

  els.pingBtn.addEventListener("click", runTest);
  els.copyBtn.addEventListener("click", copySummary);
  els.shareBtn.addEventListener("click", copyLink);

  els.host.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runTest();
  });

  quickButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      els.host.value = btn.getAttribute("data-fill") || "";
      els.host.focus();
    });
  });

  applyQueryParams();
  setEmptyState("Enter a domain or URL, choose options, and run the test.");
  setStatus("Ready");
  log("Ping tool initialized");
});
