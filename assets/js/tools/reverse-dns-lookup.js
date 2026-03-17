document.addEventListener("DOMContentLoaded", () => {
  const ipEl = document.getElementById("ip");
  const lookupBtn = document.getElementById("lookupBtn");
  const copyBtn = document.getElementById("copyBtn");
  const shareBtn = document.getElementById("shareBtn");
  const loader = document.getElementById("loader");
  const resultsBody = document.getElementById("resultsBody");
  const statusBadge = document.getElementById("statusBadge");

  const summaryIp = document.getElementById("summaryIp");
  const summaryPtr = document.getElementById("summaryPtr");
  const summaryType = document.getElementById("summaryType");
  const summaryStatus = document.getElementById("summaryStatus");

  const quickButtons = Array.from(document.querySelectorAll("[data-fill]"));

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

  function setStatus(text) {
    if (statusBadge) statusBadge.textContent = text;
  }

  function setLoader(show) {
    if (loader) loader.hidden = !show;
  }

  function setEmptyState(message) {
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

  function setSummary(ip = "—", ptr = "—", type = "—", status = "—") {
    if (summaryIp) summaryIp.textContent = ip;
    if (summaryPtr) summaryPtr.textContent = ptr;
    if (summaryType) summaryType.textContent = type;
    if (summaryStatus) summaryStatus.textContent = status;
  }

  function isValidIPv4(input) {
    const parts = String(input).trim().split(".");
    if (parts.length !== 4) return false;

    return parts.every(part => {
      if (!/^\d+$/.test(part)) return false;
      if (part.length > 1 && part.startsWith("0")) return false;
      const n = Number(part);
      return n >= 0 && n <= 255;
    });
  }

  function isValidIPv6(input) {
    const value = String(input).trim();

    if (!value || value.includes(":::")) return false;

    const parts = value.split("::");
    if (parts.length > 2) return false;

    const left = parts[0] ? parts[0].split(":") : [];
    const right = parts[1] ? parts[1].split(":") : [];

    const validGroup = group => /^[0-9a-fA-F]{1,4}$/.test(group);

    if (!left.every(g => g === "" ? false : validGroup(g))) return false;
    if (!right.every(g => g === "" ? false : validGroup(g))) return false;

    if (parts.length === 1) {
      return left.length === 8;
    }

    return (left.length + right.length) < 8;
  }

  function expandIPv6(input) {
    const value = input.toLowerCase();

    if (!isValidIPv6(value)) return null;

    const parts = value.split("::");
    const left = parts[0] ? parts[0].split(":") : [];
    const right = parts[1] ? parts[1].split(":") : [];

    const missing = 8 - (left.length + right.length);
    const middle = new Array(missing).fill("0");

    const full = [...left, ...middle, ...right].map(group => group.padStart(4, "0"));
    if (full.length !== 8) return null;

    return full.join("");
  }

  function buildReverseName(ip) {
    const value = String(ip).trim();

    if (isValidIPv4(value)) {
      const reversed = value.split(".").reverse().join(".");
      return {
        family: "IPv4",
        reverseName: `${reversed}.in-addr.arpa`
      };
    }

    if (isValidIPv6(value)) {
      const expanded = expandIPv6(value);
      if (!expanded) return null;

      const reversedNibbles = expanded.split("").reverse().join(".");
      return {
        family: "IPv6",
        reverseName: `${reversedNibbles}.ip6.arpa`
      };
    }

    return null;
  }

  function normalizePtr(value) {
    return String(value || "").replace(/\.$/, "");
  }

  function renderRows(ip, family, reverseName, answers, statusText) {
    const rows = [];

    rows.push(`
      <tr>
        <td class="resolver">IP Address</td>
        <td class="resultCell">
          <div class="resultBox">
            <div class="mono">${escapeHtml(ip)}</div>
          </div>
        </td>
        <td class="ttl">—</td>
        <td class="ttl">${escapeHtml(statusText)}</td>
      </tr>
    `);

    rows.push(`
      <tr>
        <td class="resolver">Lookup Type</td>
        <td class="resultCell">
          <div class="resultBox">
            <div class="mono">${escapeHtml(family)}</div>
          </div>
        </td>
        <td class="ttl">—</td>
        <td class="ttl">${escapeHtml(statusText)}</td>
      </tr>
    `);

    rows.push(`
      <tr>
        <td class="resolver">Reverse Name</td>
        <td class="resultCell">
          <div class="resultBox">
            <div class="mono">${escapeHtml(reverseName)}</div>
          </div>
        </td>
        <td class="ttl">—</td>
        <td class="ttl">${escapeHtml(statusText)}</td>
      </tr>
    `);

    if (answers.length) {
      answers.forEach((answer, index) => {
        rows.push(`
          <tr>
            <td class="resolver">${index === 0 ? "PTR Record" : "PTR Alias"}</td>
            <td class="resultCell">
              <div class="resultBox">
                <div class="mono ok">${escapeHtml(answer.data)}</div>
              </div>
            </td>
            <td class="ttl">${escapeHtml(String(answer.TTL ?? "—"))}</td>
            <td class="ttl">Found</td>
          </tr>
        `);
      });
    } else {
      rows.push(`
        <tr>
          <td class="resolver">PTR Record</td>
          <td class="resultCell">
            <div class="resultBox">
              <div class="mono bad">No PTR record found</div>
            </div>
          </td>
          <td class="ttl">—</td>
          <td class="ttl">Not found</td>
        </tr>
      `);
    }

    resultsBody.innerHTML = rows.join("");
  }

  async function lookupReverseDNS() {
    const rawIp = String(ipEl?.value || "").trim();

    if (!rawIp) {
      setSummary("—", "—", "—", "Enter an IP");
      setEmptyState("Please enter an IPv4 or IPv6 address.");
      setStatus("Enter IP");
      ipEl?.focus();
      return;
    }

    const reverseInfo = buildReverseName(rawIp);

    if (!reverseInfo) {
      setSummary(rawIp, "—", "Invalid", "Invalid IP");
      setEmptyState("Invalid IP address. Please enter a valid IPv4 or IPv6 address.");
      setStatus("Invalid IP");
      ipEl?.focus();
      return;
    }

    lookupBtn.disabled = true;
    setLoader(true);
    setStatus("Looking up");
    resultsBody.innerHTML = `
      <tr>
        <td class="resolver">Lookup</td>
        <td class="resultCell">
          <div class="resultBox">
            <div class="mono muted">Checking PTR record for ${escapeHtml(rawIp)}</div>
          </div>
        </td>
        <td class="ttl">—</td>
        <td class="ttl">Running</td>
      </tr>
    `;

    try {
      const url = `https://dns.google/resolve?name=${encodeURIComponent(reverseInfo.reverseName)}&type=PTR`;
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const answers = Array.isArray(data.Answer)
        ? data.Answer
            .filter(item => item && typeof item.data === "string")
            .map(item => ({
              data: normalizePtr(item.data),
              TTL: item.TTL
            }))
        : [];

      renderRows(rawIp, reverseInfo.family, reverseInfo.reverseName, answers, answers.length ? "Complete" : "No record");

      const primaryPtr = answers.length ? answers[0].data : "No PTR record";
      const statusText = answers.length ? "Found" : "Not found";

      setSummary(rawIp, primaryPtr, reverseInfo.family, statusText);
      setStatus(statusText);

      lastCopyText = [
        "Reverse DNS Lookup",
        `IP Address: ${rawIp}`,
        `Lookup Type: ${reverseInfo.family}`,
        `Reverse Name: ${reverseInfo.reverseName}`,
        `PTR Hostname: ${primaryPtr}`,
        `Status: ${statusText}`
      ].join("\n");
    } catch (error) {
      resultsBody.innerHTML = `
        <tr>
          <td class="resolver">Error</td>
          <td class="resultCell">
            <div class="resultBox">
              <div class="mono bad">Lookup failed. Please try again.</div>
            </div>
          </td>
          <td class="ttl">—</td>
          <td class="ttl">Failed</td>
        </tr>
      `;
      setSummary(rawIp, "—", reverseInfo.family, "Lookup failed");
      setStatus("Lookup failed");
      lastCopyText = "";
      console.error("Reverse DNS lookup failed:", error);
    } finally {
      setLoader(false);
      lookupBtn.disabled = false;
    }
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
      const rawIp = String(ipEl?.value || "").trim();

      if (rawIp) {
        url.searchParams.set("ip", rawIp);
      } else {
        url.searchParams.delete("ip");
      }

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
    const ip = params.get("ip");
    if (ip && ipEl) ipEl.value = ip;
  }

  lookupBtn?.addEventListener("click", lookupReverseDNS);
  copyBtn?.addEventListener("click", copyResult);
  shareBtn?.addEventListener("click", copyLink);

  ipEl?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      lookupReverseDNS();
    }
  });

  quickButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (ipEl) {
        ipEl.value = btn.getAttribute("data-fill") || "";
        ipEl.focus();
      }
    });
  });

  applyQueryParams();
  setSummary();
  setEmptyState("Enter an IPv4 or IPv6 address and run the lookup.");
  setStatus("Ready");
});
