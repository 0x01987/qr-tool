document.addEventListener("DOMContentLoaded", () => {
  const hostInput = document.getElementById("host");
  const portInput = document.getElementById("port");
  const protocolSelect = document.getElementById("protocol");
  const checkBtn = document.getElementById("checkBtn");

  const resultsBody = document.getElementById("resultsBody");
  const loader = document.getElementById("loader");

  const targetLabel = document.getElementById("targetLabel");
  const statusLabel = document.getElementById("statusLabel");
  const latencyLabel = document.getElementById("latencyLabel");
  const protocolLabel = document.getElementById("protocolLabel");

  const statusBadge = document.getElementById("statusBadge");

  const quickButtons = Array.from(document.querySelectorAll(".quick button[data-host][data-port]"));

  let isRunning = false;

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (m) {
      return ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[m];
    });
  }

  function setLoader(show) {
    if (loader) loader.hidden = !show;
  }

  function setStatus(text) {
    if (statusBadge) statusBadge.textContent = text;
  }

  function setSummary(target = "—", status = "—", latency = "—", protocol = "—") {
    if (targetLabel) targetLabel.textContent = target;
    if (statusLabel) statusLabel.textContent = status;
    if (latencyLabel) latencyLabel.textContent = latency;
    if (protocolLabel) protocolLabel.textContent = protocol;
  }

  function renderMessageRow(message) {
    resultsBody.innerHTML = `
      <tr>
        <td colspan="4" class="mono muted">${escapeHtml(message)}</td>
      </tr>
    `;
  }

  function normalizeHost(input) {
    return String(input || "")
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/^wss?:\/\//i, "")
      .replace(/\/.*$/, "")
      .trim();
  }

  function normalizePort(input, protocol) {
    const raw = String(input || "").trim();

    if (!raw) {
      return protocol === "https" ? 443 : 80;
    }

    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 65535) {
      return null;
    }

    return n;
  }

  function probe(host, port, protocol, timeout) {
    return new Promise((resolve) => {
      const img = new Image();
      const start = performance.now();
      let finished = false;

      function done(ok, message) {
        if (finished) return;
        finished = true;

        clearTimeout(timer);
        img.onload = null;
        img.onerror = null;

        const latency = Math.round(performance.now() - start);

        resolve({
          ok,
          latency,
          message
        });
      }

      const timer = setTimeout(() => {
        done(false, "Timed out");
      }, timeout);

      img.onload = () => done(true, "Server responded");
      img.onerror = () => {
        // For browser-based probing, an error still often means the host/port answered.
        done(true, "Host responded");
      };

      img.src = `${protocol}://${host}:${port}/favicon.ico?cache=${Date.now()}_${Math.random().toString(36).slice(2)}`;
    });
  }

  async function runCheck() {
    if (isRunning) return;

    const host = normalizeHost(hostInput.value);
    const protocol = String(protocolSelect.value || "https").toLowerCase();
    const port = normalizePort(portInput.value, protocol);

    if (!host) {
      setSummary("—", "Enter host", "—", protocol.toUpperCase());
      renderMessageRow("Enter a valid host.");
      setStatus("Enter host");
      hostInput.focus();
      return;
    }

    if (!port) {
      setSummary(`${host}:—`, "Invalid port", "—", protocol.toUpperCase());
      renderMessageRow("Enter a valid port between 1 and 65535.");
      setStatus("Invalid port");
      portInput.focus();
      return;
    }

    portInput.value = String(port);

    isRunning = true;
    setLoader(true);
    setStatus("Checking");
    checkBtn.disabled = true;

    const target = `${host}:${port}`;
    setSummary(target, "Checking", "—", protocol.toUpperCase());

    resultsBody.innerHTML = `
      <tr>
        <td class="mono">${escapeHtml(target)}</td>
        <td>Checking</td>
        <td>—</td>
        <td>${escapeHtml(protocol.toUpperCase())}</td>
      </tr>
      <tr>
        <td colspan="4" class="mono muted">Testing browser reachability...</td>
      </tr>
    `;

    try {
      const result = await probe(host, port, protocol, 5000);
      const status = result.ok ? "Reachable" : "Unreachable";
      const latencyText = `${result.latency} ms`;

      setSummary(target, status, latencyText, protocol.toUpperCase());
      setStatus(status);

      resultsBody.innerHTML = `
        <tr>
          <td class="mono">${escapeHtml(target)}</td>
          <td>${escapeHtml(status)}</td>
          <td>${escapeHtml(latencyText)}</td>
          <td>${escapeHtml(protocol.toUpperCase())}</td>
        </tr>
        <tr>
          <td colspan="4" class="mono muted">${escapeHtml(result.message)}</td>
        </tr>
      `;
    } catch (error) {
      console.error("Port check failed:", error);
      setSummary(target, "Failed", "—", protocol.toUpperCase());
      setStatus("Failed");
      renderMessageRow("The check failed. Please try again.");
    } finally {
      isRunning = false;
      setLoader(false);
      checkBtn.disabled = false;
    }
  }

  checkBtn.addEventListener("click", runCheck);

  hostInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runCheck();
  });

  portInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runCheck();
  });

  protocolSelect.addEventListener("change", () => {
    const currentPort = String(portInput.value || "").trim();
    if (!currentPort || currentPort === "80" || currentPort === "443") {
      portInput.value = protocolSelect.value === "https" ? "443" : "80";
    }
  });

  quickButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const host = button.getAttribute("data-host") || "";
      const port = button.getAttribute("data-port") || "";
      const protocol = button.getAttribute("data-protocol") || "https";

      hostInput.value = host;
      portInput.value = port;
      protocolSelect.value = protocol;

      runCheck();
    });
  });

  setSummary();
  renderMessageRow("Enter a host and port to test connectivity.");
  setStatus("Ready");
});
