document.addEventListener("DOMContentLoaded", () => {
  const ipEl = document.getElementById("ip");
  const cidrEl = document.getElementById("cidr");
  const calcBtn = document.getElementById("calcBtn");
  const copyBtn = document.getElementById("copyBtn");
  const shareBtn = document.getElementById("shareBtn");
  const resultsBody = document.getElementById("resultsBody");
  const statusBadge = document.getElementById("statusBadge");

  const summaryCidr = document.getElementById("summaryCidr");
  const summaryNetwork = document.getElementById("summaryNetwork");
  const summaryBroadcast = document.getElementById("summaryBroadcast");
  const summaryHosts = document.getElementById("summaryHosts");

  const quickButtons = Array.from(document.querySelectorAll("[data-ip][data-cidr]"));

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

  function setSummary(cidr = "—", network = "—", broadcast = "—", hosts = "—") {
    if (summaryCidr) summaryCidr.textContent = cidr;
    if (summaryNetwork) summaryNetwork.textContent = network;
    if (summaryBroadcast) summaryBroadcast.textContent = broadcast;
    if (summaryHosts) summaryHosts.textContent = hosts;
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
        <td class="ttl">IPv4 only</td>
      </tr>
    `;
  }

  function isValidIPv4(ip) {
    const parts = String(ip).trim().split(".");
    if (parts.length !== 4) return false;

    return parts.every(part => {
      if (!/^\d+$/.test(part)) return false;
      if (part.length > 1 && part.startsWith("0")) return false;
      const n = Number(part);
      return n >= 0 && n <= 255;
    });
  }

  function ipToInt(ip) {
    const parts = ip.split(".").map(Number);
    return (((parts[0] << 24) >>> 0) |
            ((parts[1] << 16) >>> 0) |
            ((parts[2] << 8) >>> 0) |
            (parts[3] >>> 0)) >>> 0;
  }

  function intToIp(int) {
    return [
      (int >>> 24) & 255,
      (int >>> 16) & 255,
      (int >>> 8) & 255,
      int & 255
    ].join(".");
  }

  function parseCidr(input) {
    if (!/^\d+$/.test(String(input).trim())) return null;
    const n = Number(input);
    return (n >= 0 && n <= 32) ? n : null;
  }

  function formatCount(n) {
    return Number(n).toLocaleString("en-US");
  }

  function calculateSubnet(ip, cidr) {
    const ipInt = ipToInt(ip);
    const mask = cidr === 0 ? 0 : ((0xffffffff << (32 - cidr)) >>> 0);
    const wildcard = (~mask) >>> 0;
    const network = (ipInt & mask) >>> 0;
    const broadcast = (network | wildcard) >>> 0;
    const totalAddresses = 2 ** (32 - cidr);

    let firstHost;
    let lastHost;
    let usableHosts;

    if (cidr === 32) {
      firstHost = network;
      lastHost = network;
      usableHosts = 1;
    } else if (cidr === 31) {
      firstHost = network;
      lastHost = broadcast;
      usableHosts = 2;
    } else {
      firstHost = network + 1;
      lastHost = broadcast - 1;
      usableHosts = Math.max(totalAddresses - 2, 0);
    }

    return {
      inputIp: ip,
      cidr,
      subnetMask: intToIp(mask),
      wildcardMask: intToIp(wildcard),
      networkAddress: intToIp(network),
      broadcastAddress: intToIp(broadcast),
      firstHost: intToIp(firstHost >>> 0),
      lastHost: intToIp(lastHost >>> 0),
      totalAddresses,
      usableHosts
    };
  }

  function renderResults(data) {
    const rows = [
      ["CIDR", `${data.inputIp}/${data.cidr}`, "Input address and prefix"],
      ["Subnet Mask", data.subnetMask, "Dotted decimal subnet mask"],
      ["Wildcard Mask", data.wildcardMask, "Inverse of subnet mask"],
      ["Network Address", data.networkAddress, "First address in the subnet"],
      ["Broadcast Address", data.broadcastAddress, "Last address in the subnet"],
      ["First Host", data.firstHost, data.cidr >= 31 ? "Special-case host range" : "First usable host"],
      ["Last Host", data.lastHost, data.cidr >= 31 ? "Special-case host range" : "Last usable host"],
      ["Total Addresses", formatCount(data.totalAddresses), "All addresses in the subnet"],
      ["Usable Hosts", formatCount(data.usableHosts), "Usable host count for this subnet"]
    ];

    resultsBody.innerHTML = rows.map(([field, value, note]) => `
      <tr>
        <td class="resolver">${escapeHtml(field)}</td>
        <td class="resultCell">
          <div class="resultBox">
            <div class="mono">${escapeHtml(String(value))}</div>
          </div>
        </td>
        <td class="ttl">${escapeHtml(note)}</td>
      </tr>
    `).join("");
  }

  function runCalculation() {
    const ip = String(ipEl.value || "").trim();
    const cidr = parseCidr(cidrEl.value);

    if (!ip || !isValidIPv4(ip)) {
      setSummary("—", "—", "—", "—");
      setEmptyState("Enter a valid IPv4 address.");
      setStatus("Invalid IP");
      ipEl.focus();
      lastCopyText = "";
      return;
    }

    if (cidr === null) {
      setSummary(`${ip}/—`, "—", "—", "—");
      setEmptyState("Enter a valid CIDR prefix between 0 and 32.");
      setStatus("Invalid CIDR");
      cidrEl.focus();
      lastCopyText = "";
      return;
    }

    const result = calculateSubnet(ip, cidr);

    setSummary(
      `${result.inputIp}/${result.cidr}`,
      result.networkAddress,
      result.broadcastAddress,
      formatCount(result.usableHosts)
    );
    setStatus("Calculated");
    renderResults(result);

    lastCopyText = [
      "Subnet Calculator",
      `CIDR: ${result.inputIp}/${result.cidr}`,
      `Subnet Mask: ${result.subnetMask}`,
      `Wildcard Mask: ${result.wildcardMask}`,
      `Network Address: ${result.networkAddress}`,
      `Broadcast Address: ${result.broadcastAddress}`,
      `First Host: ${result.firstHost}`,
      `Last Host: ${result.lastHost}`,
      `Total Addresses: ${formatCount(result.totalAddresses)}`,
      `Usable Hosts: ${formatCount(result.usableHosts)}`
    ].join("\n");
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
      const ip = String(ipEl.value || "").trim();
      const cidr = String(cidrEl.value || "").trim();

      if (ip) url.searchParams.set("ip", ip);
      else url.searchParams.delete("ip");

      if (cidr) url.searchParams.set("cidr", cidr);
      else url.searchParams.delete("cidr");

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
    const cidr = params.get("cidr");

    if (ip) ipEl.value = ip;
    if (cidr) cidrEl.value = cidr;
  }

  calcBtn?.addEventListener("click", runCalculation);
  copyBtn?.addEventListener("click", copyResult);
  shareBtn?.addEventListener("click", copyLink);

  ipEl?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runCalculation();
  });

  cidrEl?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runCalculation();
  });

  quickButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      ipEl.value = btn.getAttribute("data-ip") || "";
      cidrEl.value = btn.getAttribute("data-cidr") || "";
      runCalculation();
    });
  });

  applyQueryParams();
  setSummary();
  setEmptyState("Enter an IPv4 address and CIDR prefix, then calculate.");
  setStatus("Ready");
});
