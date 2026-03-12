// app.js
// Safe shared QR generator logic for InstantQR
// Supports:
// - text/url QR pages
// - WiFi QR pages
// - mixed pages with type pills
//
// Requires QRious to be loaded before generate() is called.

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const pills = $$(".pill");
  const typeBar = $("typeBar");

  const textForm = $("textForm");
  const wifiForm = $("wifiForm");

  const textEl = $("text");
  const ssidEl = $("ssid");
  const secEl = $("security");
  const passEl = $("password");
  const hiddenEl = $("hidden");
  const showPassEl = $("showPass");

  const sizeEl = $("size");
  const levelEl = $("level");

  const generateBtn = $("generateBtn");
  const downloadBtn = $("downloadBtn");
  const clearBtn = $("clearBtn");

  const qrWrap = $("qrWrap");
  const errorEl = $("error") || $("status");

  let currentType = detectInitialType();
  let lastCanvas = null;
  let qrInstance = null;

  function detectInitialType() {
    if (wifiForm && !textForm) return "wifi";
    if (textForm && !wifiForm) return "text";
    return "text";
  }

  function hasEl(el) {
    return !!el;
  }

  function setType(type) {
    currentType = type === "wifi" ? "wifi" : "text";

    pills.forEach((p) => {
      p.classList.toggle("active", p.dataset.type === currentType);
    });

    if (textForm) {
      textForm.style.display = currentType === "text" ? "block" : "none";
    }
    if (wifiForm) {
      wifiForm.style.display = currentType === "wifi" ? "block" : "none";
    }

    hideError();
  }

  function hideError() {
    if (!errorEl) return;
    errorEl.textContent = "";
    errorEl.style.display = "none";
    errorEl.classList.remove("error", "ok");
  }

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.style.display = "block";
    errorEl.classList.remove("ok");
    errorEl.classList.add("error");
  }

  function showOk(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.style.display = "block";
    errorEl.classList.remove("error");
    errorEl.classList.add("ok");
  }

  function escWifi(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/:/g, "\\:");
  }

  function normalizeUrl(value) {
    let v = String(value || "").trim();
    if (!v) throw new Error("Enter a URL.");

    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(v)) {
      v = "https://" + v;
    }

    let parsed;
    try {
      parsed = new URL(v);
    } catch {
      throw new Error("Enter a valid URL.");
    }

    if (!/^https?:$/.test(parsed.protocol)) {
      throw new Error("Only http:// and https:// URLs are supported.");
    }

    return parsed.toString();
  }

  function getSafeSize() {
    const raw = parseInt(sizeEl?.value || "320", 10);
    if (!Number.isFinite(raw)) return 320;
    return Math.max(128, Math.min(1024, raw));
  }

  function getSafeLevel() {
    const level = String(levelEl?.value || "M").toUpperCase();
    return ["L", "M", "Q", "H"].includes(level) ? level : "M";
  }

  function buildPayload() {
    if (currentType === "text") {
      if (!textEl) throw new Error("Text input is missing.");
      const value = normalizeUrl(textEl.value);
      textEl.value = value;
      return value;
    }

    if (!ssidEl || !secEl || !hiddenEl) {
      throw new Error("WiFi fields are missing.");
    }

    const ssid = String(ssidEl.value || "").trim();
    const sec = String(secEl.value || "WPA");
    const hidden = String(hiddenEl.value || "false");
    const pass = String(passEl?.value || "").trim();

    if (!ssid) throw new Error("Enter Wi-Fi name (SSID).");
    if (sec !== "nopass" && !pass) {
      throw new Error("Enter Wi-Fi password or choose No password.");
    }

    return `WIFI:T:${sec};S:${escWifi(ssid)};P:${escWifi(pass)};H:${hidden};;`;
  }

  function clearQR() {
    if (!qrWrap) return;
    qrWrap.innerHTML = `<div class="hint">Your QR code will appear here.</div>`;
    lastCanvas = null;
    qrInstance = null;
  }

  function ensureCanvas() {
    if (!qrWrap) throw new Error("QR preview container is missing.");

    qrWrap.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "canvasWrap";
    wrap.style.width = "100%";
    wrap.style.height = "100%";
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.justifyContent = "center";
    wrap.style.background = "#ffffff";
    wrap.style.borderRadius = "12px";
    wrap.style.overflow = "hidden";

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.maxWidth = "100%";
    canvas.style.maxHeight = "100%";
    canvas.style.display = "block";
    canvas.style.background = "#ffffff";
    canvas.style.borderRadius = "12px";

    wrap.appendChild(canvas);
    qrWrap.appendChild(wrap);

    return canvas;
  }

  function generate() {
    hideError();

    try {
      if (typeof window.QRious === "undefined") {
        throw new Error("QR library failed to load.");
      }

      const payload = buildPayload();
      const size = getSafeSize();
      const level = getSafeLevel();
      const canvas = ensureCanvas();

      qrInstance = new window.QRious({
        element: canvas,
        value: payload,
        size,
        level,
        background: "white",
        foreground: "black",
        padding: 10
      });

      canvas.width = size;
      canvas.height = size;
      canvas.style.maxWidth = size + "px";
      canvas.style.maxHeight = size + "px";

      lastCanvas = canvas;
      showOk("QR code generated.");
    } catch (err) {
      showError(err?.message || "Could not generate QR code.");
    }
  }

  function downloadPNG() {
    hideError();

    if (!lastCanvas) {
      showError("Generate a QR code first.");
      return;
    }

    try {
      const a = document.createElement("a");
      a.download = currentType === "wifi" ? "wifi-qr-code.png" : "url-qr-code.png";
      a.href = lastCanvas.toDataURL("image/png");
      document.body.appendChild(a);
      a.click();
      a.remove();
      showOk("PNG download started.");
    } catch {
      showError("Could not download PNG.");
    }
  }

  function clearAll() {
    hideError();

    if (textEl) textEl.value = "";
    if (ssidEl) ssidEl.value = "";
    if (passEl) passEl.value = "";
    if (secEl) secEl.value = "WPA";
    if (hiddenEl) hiddenEl.value = "false";
    if (sizeEl) sizeEl.value = "320";
    if (levelEl) levelEl.value = "M";

    if (showPassEl && passEl) {
      showPassEl.checked = false;
      passEl.type = "password";
    }

    syncPasswordState();
    clearQR();

    if (currentType === "wifi" && ssidEl) ssidEl.focus();
    if (currentType === "text" && textEl) textEl.focus();
  }

  function syncPasswordState() {
    if (!secEl || !passEl) return;

    const noPass = secEl.value === "nopass";
    passEl.disabled = noPass;
    passEl.placeholder = noPass ? "(No password)" : "••••••••";
    if (noPass) passEl.value = "";
  }

  function debounce(fn, delay) {
    let t = null;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, delay);
    };
  }

  const autoGenerate = debounce(() => {
    try {
      if (currentType === "text" && textEl && String(textEl.value || "").trim()) {
        generate();
      }
      if (currentType === "wifi" && ssidEl && String(ssidEl.value || "").trim()) {
        generate();
      }
    } catch (_) {}
  }, 350);

  if (typeBar) {
    typeBar.addEventListener("click", (e) => {
      const pill = e.target.closest(".pill");
      if (!pill) return;
      setType(pill.dataset.type);
    });
  }

  if (generateBtn) generateBtn.addEventListener("click", generate);
  if (downloadBtn) downloadBtn.addEventListener("click", downloadPNG);
  if (clearBtn) clearBtn.addEventListener("click", clearAll);

  if (showPassEl && passEl) {
    showPassEl.addEventListener("change", () => {
      passEl.type = showPassEl.checked ? "text" : "password";
    });
  }

  if (secEl) {
    secEl.addEventListener("change", () => {
      syncPasswordState();
      autoGenerate();
    });
  }

  [textEl, ssidEl, passEl].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", autoGenerate);
    el.addEventListener("paste", () => setTimeout(autoGenerate, 40));
  });

  [hiddenEl, sizeEl, levelEl].forEach((el) => {
    if (!el) return;
    el.addEventListener("change", autoGenerate);
  });

  document.addEventListener("keydown", (e) => {
    const tag = e.target?.tagName;
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      generate();
      return;
    }
    if (e.key === "Enter" && tag !== "TEXTAREA" && tag !== "INPUT" && tag !== "SELECT") {
      generate();
    }
  });

  window.setType = setType;
  window.generateQR = generate;
  window.downloadQR = downloadPNG;
  window.clearQRForm = clearAll;

  syncPasswordState();
  setType(currentType);
})();
