(function () {
  const form = document.getElementById("ping-form");
  const hostInput = document.getElementById("host");
  const pingButton = document.getElementById("ping-button");
  const clearButton = document.getElementById("clear-button");
  const resultsEl = document.getElementById("results");
  const statusText = document.getElementById("status-text");
  const summaryCards = document.getElementById("summary-cards");

  const avgLatencyEl = document.getElementById("avg-latency");
  const bestLatencyEl = document.getElementById("best-latency");
  const worstLatencyEl = document.getElementById("worst-latency");
  const successRateEl = document.getElementById("success-rate");

  const TOTAL_ATTEMPTS = 5;
  const PAUSE_MS = 400;
  const REQUEST_TIMEOUT_MS = 8000;

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
      };
      return map[char];
    });
  }

  function normalizeHost(input) {
    let value = String(input || "").trim();
    if (!value) return "";

    if (!/^https?:\/\//i.test(value)) {
      value = "https://" + value;
    }

    try {
      const url = new URL(value);
      return {
        origin: url.origin,
        hostname: url.hostname,
        href: url.href
      };
    } catch {
      return null;
    }
  }

  function clearResults() {
    resultsEl.innerHTML = '<div class="results-empty">No test results yet.</div>';
    statusText.textContent = "Ready.";
    summaryCards.hidden = true;
    avgLatencyEl.textContent = "—";
    bestLatencyEl.textContent = "—";
    worstLatencyEl.textContent = "—";
    successRateEl.textContent = "—";
  }

  function appendLine(html) {
    const line = document.createElement("div");
    line.className = "result-line";
    line.innerHTML = html;

    if (resultsEl.querySelector(".results-empty")) {
      resultsEl.innerHTML = "";
    }

    resultsEl.appendChild(line);
    resultsEl.scrollTop = resultsEl.scrollHeight;
  }

  async function pingOnce(origin) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const testUrl = origin + "/?instantqr_ping=" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const start = performance.now();

    try {
      await fetch(testUrl, {
        method: "GET",
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal
      });

      const latency = Math.round(performance.now() - start);
      clearTimeout(timeoutId);

      return {
        ok: true,
        latency
      };
    } catch (error) {
      clearTimeout(timeoutId);

      const timedOut = error && error.name === "AbortError";

      return {
        ok: false,
        error: timedOut ? "timeout" : "request failed"
      };
    }
  }

  function renderSummary(times, totalAttempts) {
    if (!times.length) {
      summaryCards.hidden = false;
      avgLatencyEl.textContent = "N/A";
      bestLatencyEl.textContent = "N/A";
      worstLatencyEl.textContent = "N/A";
      successRateEl.textContent = "0%";
      return;
    }

    const avg = Math.round(times.reduce((sum, value) => sum + value, 0) / times.length);
    const best = Math.min(...times);
    const worst = Math.max(...times);
    const successRate = Math.round((times.length / totalAttempts) * 100);

    avgLatencyEl.textContent = avg + " ms";
    bestLatencyEl.textContent = best + " ms";
    worstLatencyEl.textContent = worst + " ms";
    successRateEl.textContent = successRate + "%";
    summaryCards.hidden = false;
  }

  async function startPing(event) {
    event.preventDefault();

    const parsed = normalizeHost(hostInput.value);

    if (!parsed) {
      clearResults();
      statusText.textContent = "Please enter a valid domain or URL.";
      appendLine('<span class="result-bad">Invalid input.</span> Enter a valid domain like example.com');
      hostInput.focus();
      return;
    }

    pingButton.disabled = true;
    clearButton.disabled = true;
    summaryCards.hidden = true;
    resultsEl.innerHTML = "";

    const safeHostname = escapeHtml(parsed.hostname);
    const times = [];

    statusText.textContent = "Running test...";
    appendLine(`Target: <strong>${safeHostname}</strong>`);
    appendLine(`Protocol: <span class="result-warn">HTTP latency test via browser fetch</span>`);
    appendLine("Starting 5 requests...");

    for (let i = 1; i <= TOTAL_ATTEMPTS; i++) {
      const result = await pingOnce(parsed.origin);

      if (result.ok) {
        times.push(result.latency);
        appendLine(`Reply ${i}: <span class="result-ok">${result.latency} ms</span>`);
      } else {
        appendLine(`Reply ${i}: <span class="result-bad">${escapeHtml(result.error)}</span>`);
      }

      if (i < TOTAL_ATTEMPTS) {
        await sleep(PAUSE_MS);
      }
    }

    renderSummary(times, TOTAL_ATTEMPTS);

    if (times.length) {
      statusText.textContent = `Completed. ${times.length} of ${TOTAL_ATTEMPTS} requests succeeded.`;
      appendLine("<strong>Test complete.</strong>");
    } else {
      statusText.textContent = "Completed. No successful responses measured.";
      appendLine('<span class="result-bad">No successful responses measured.</span>');
      appendLine('Tip: some websites block browser-based requests, even when they are online.');
    }

    pingButton.disabled = false;
    clearButton.disabled = false;
  }

  form.addEventListener("submit", startPing);

  clearButton.addEventListener("click", () => {
    hostInput.value = "";
    clearResults();
    hostInput.focus();
  });

  hostInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      form.requestSubmit();
    }
  });

  clearResults();
})();
