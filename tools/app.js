(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const els = {
    form: $("qrForm"),
    mode: $("qrMode"),

    text: $("text"),
    ssid: $("ssid"),
    security: $("security"),
    password: $("password"),
    hidden: $("hidden"),
    showPass: $("showPass"),

    size: $("size"),
    level: $("level"),

    generateBtn: $("generateBtn"),
    downloadBtn: $("downloadBtn"),
    clearBtn: $("clearBtn"),

    qrWrap: $("qrWrap"),
    status: $("status")
  };

  let qrInstance = null;
  let canvasEl = null;
  let autoTimer = null;
  let qrLibraryReady = typeof window.QRious !== "undefined";

  function getMode() {
    return (els.mode?.value || "text").toLowerCase();
  }

  function setStatus(message, type) {
    if (!els.status) return;
    els.status.textContent = message || "";
    els.status.className = "status";
    if (type) els.status.classList.add(type);
    els.status.style.display = message ? "block" : "none";
  }

  function clearStatus() {
    setStatus("", "");
  }

  function escapeWifiValue(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/:/g, "\\:");
  }

  function normalizeUrl(raw) {
    let value = String(raw || "").trim();
    if (!value) throw new Error("Please enter a website URL.");

    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)) {
      value = "https://" + value;
    }

    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error("Please enter a valid URL.");
    }

    if (!/^https?:$/.test(parsed.protocol)) {
      throw new Error("Only http:// and https:// URLs are supported.");
    }

    return parsed.toString();
  }

  function getSafeSize() {
    const raw = parseInt(els.size?.value || "320", 10);
    if (!Number.isFinite(raw)) return 320;
    return Math.max(128, Math.min(1024, raw));
  }

  function getSafeLevel() {
    const value = String(els.level?.value || "M").toUpperCase();
    return ["L", "M", "Q", "H"].includes(value) ? value : "M";
  }

  function buildPayload() {
    const mode = getMode();

    if (mode === "wifi") {
      const ssid = String(els.ssid?.value || "").trim();
      const security = String(els.security?.value || "WPA");
      const hidden = String(els.hidden?.value || "false");
      const password = String(els.password?.value || "");

      if (!ssid) {
        throw new Error("Please enter your Wi-Fi name (SSID).");
      }

      if (security !== "nopass" && !password.trim()) {
        throw new Error("Please enter your Wi-Fi password, or choose No password.");
      }

      return `WIFI:T:${security};S:${escapeWifiValue(ssid)};P:${escapeWifiValue(password)};H:${hidden};;`;
    }

    const url = normalizeUrl(els.text?.value || "");
    if (els.text) els.text.value = url;
    return url;
  }

  function createCanvas() {
    if (!els.qrWrap) {
      throw new Error("QR preview container is missing.");
    }

    els.qrWrap.innerHTML = "";

    const canvasWrap = document.createElement("div");
    canvasWrap.className = "canvasWrap";

    canvasEl = document.createElement("canvas");
    canvasEl.setAttribute("aria-label", "Generated QR code");

    canvasWrap.appendChild(canvasEl);
    els.qrWrap.appendChild(canvasWrap);

    return canvasEl;
  }

  function showPlaceholder() {
    if (!els.qrWrap) return;
    els.qrWrap.innerHTML = `<div class="hint">Your QR code will appear here.</div>`;
    qrInstance = null;
    canvasEl = null;
  }

  function generateQR() {
    clearStatus();

    if (!qrLibraryReady || typeof window.QRious === "undefined") {
      setStatus("QR generator library is still loading. Please try again in a moment.", "error");
      return;
    }

    let payload;
    try {
      payload = buildPayload();
    } catch (err) {
      setStatus(err.message || "Unable to generate QR code.", "error");
      return;
    }

    const size = getSafeSize();
    const level = getSafeLevel();

    try {
      const canvas = canvasEl || createCanvas();

      qrInstance = new window.QRious({
        element: canvas,
        value: payload,
        size,
        level,
        padding: 10,
        background: "white",
        foreground: "black"
      });

      canvas.width = size;
      canvas.height = size;
      canvas.style.width = "100%";
      canvas.style.maxWidth = size + "px";
      canvas.style.height = "auto";

      setStatus("QR code generated successfully.", "ok");
    } catch (err) {
      setStatus("Unable to generate the QR code. Please try again.", "error");
    }
  }

  function downloadPNG() {
    clearStatus();

    if (!canvasEl) {
      setStatus("Generate a QR code before downloading.", "error");
      return;
    }

    try {
      const mode = getMode();
      const fileName = mode === "wifi" ? "wifi-qr-code.png" : "url-qr-code.png";

      const link = document.createElement("a");
      link.href = canvasEl.toDataURL("image/png");
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setStatus("PNG download started.", "ok");
    } catch {
      setStatus("Unable to download PNG on this device/browser.", "error");
    }
  }

  function syncWifiState() {
    if (!els.security || !els.password) return;

    const noPass = els.security.value === "nopass";
    els.password.disabled = noPass;
    els.password.placeholder = noPass ? "(No password)" : "••••••••";
    if (noPass) els.password.value = "";
  }

  function clearForm() {
    clearStatus();

    if (els.text) els.text.value = "";
    if (els.ssid) els.ssid.value = "";
    if (els.password) els.password.value = "";
    if (els.security) els.security.value = "WPA";
    if (els.hidden) els.hidden.value = "false";
    if (els.showPass) els.showPass.checked = false;
    if (els.password) els.password.type = "password";
    if (els.size) els.size.value = "320";
    if (els.level) els.level.value = "M";

    syncWifiState();
    showPlaceholder();

    if (getMode() === "wifi" && els.ssid) els.ssid.focus();
    if (getMode() !== "wifi" && els.text) els.text.focus();
  }

  function scheduleAutoGenerate() {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      const mode = getMode();
      if (mode === "wifi") {
        if (String(els.ssid?.value || "").trim()) generateQR();
      } else {
        if (String(els.text?.value || "").trim()) generateQR();
      }
    }, 350);
  }

  function bindEvents() {
    els.generateBtn?.addEventListener("click", generateQR);
    els.downloadBtn?.addEventListener("click", downloadPNG);
    els.clearBtn?.addEventListener("click", clearForm);

    els.showPass?.addEventListener("change", () => {
      if (!els.password) return;
      els.password.type = els.showPass.checked ? "text" : "password";
    });

    els.security?.addEventListener("change", () => {
      syncWifiState();
      if (canvasEl) generateQR();
    });

    [els.text, els.ssid, els.password].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", scheduleAutoGenerate);
      el.addEventListener("paste", () => setTimeout(scheduleAutoGenerate, 40));
    });

    [els.hidden, els.size, els.level].forEach((el) => {
      if (!el) return;
      el.addEventListener("change", () => {
        if (canvasEl) generateQR();
      });
    });

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        generateQR();
      }
    });
  }

  function init() {
    syncWifiState();
    showPlaceholder();
    bindEvents();
  }

  document.addEventListener("qrious-ready", () => {
    qrLibraryReady = true;
    setStatus("", "");
  });

  document.addEventListener("qrious-failed", () => {
    qrLibraryReady = false;
    setStatus("QR generator library failed to load. Please refresh and try again.", "error");
  });

  window.InstantQRApp = {
    generateQR,
    downloadPNG,
    clearForm,
    init
  };

  init();
})();
