// QR library must be loaded before this script

const pills = Array.from(document.querySelectorAll(".pill"));
const textForm = document.getElementById("textForm");
const wifiForm = document.getElementById("wifiForm");

const textEl = document.getElementById("text");
const ssidEl = document.getElementById("ssid");
const secEl = document.getElementById("security");
const passEl = document.getElementById("password");
const hiddenEl = document.getElementById("hidden");

const sizeEl = document.getElementById("size");
const levelEl = document.getElementById("level");

const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");

const qrWrap = document.getElementById("qrWrap");
const errorEl = document.getElementById("error");

let currentType = "text";
let lastCanvas = null;

function setType(t){
  currentType = t;
  pills.forEach(p => p.classList.toggle("active", p.dataset.type === t));
  textForm.style.display = t === "text" ? "block" : "none";
  wifiForm.style.display = t === "wifi" ? "block" : "none";
  hideError();
}

function hideError(){ errorEl.style.display = "none"; errorEl.textContent = ""; }
function showError(msg){ errorEl.textContent = msg; errorEl.style.display = "block"; }

function escWifi(s){
  return (s || "").replace(/([\\;,:"])/g, "\\$1");
}

function buildPayload(){
  if(currentType === "text"){
    const v = (textEl.value || "").trim();
    if(!v) throw new Error("Enter text or a URL.");
    return v;
  }

  const ssid = (ssidEl.value || "").trim();
  if(!ssid) throw new Error("Enter Wi-Fi name (SSID).");

  const sec = secEl.value; // WPA | WEP | nopass
  const hidden = hiddenEl.value; // true | false
  const pass = (passEl.value || "").trim();

  if(sec !== "nopass" && !pass) throw new Error("Enter Wi-Fi password (or choose No password).");

  return `WIFI:T:${sec};S:${escWifi(ssid)};P:${escWifi(pass)};H:${hidden};;`;
}

function clearQR(){
  qrWrap.innerHTML = `<div class="hint">Your QR code will appear here.</div>`;
  lastCanvas = null;
}

function generate(){
  hideError();
  try{
    if(typeof QRious === "undefined"){
      throw new Error("QR library failed to load. If you’re offline or blocked, download qrious.min.js and host it locally.");
    }

    const payload = buildPayload();
    const size = Math.max(128, Math.min(1024, parseInt(sizeEl.value || "320", 10)));
    const level = levelEl.value;

    clearQR();

    const qr = new QRious({ value: payload, size, level });

    const canvas = qr.canvas;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.borderRadius = "12px";
    canvas.style.background = "#ffffff";

    qrWrap.innerHTML = "";
    qrWrap.appendChild(canvas);

    lastCanvas = canvas;
  }catch(err){
    showError(err.message || "Could not generate QR code.");
  }
}

function downloadPNG(){
  hideError();
  if(!lastCanvas){
    showError("Generate a QR code first.");
    return;
  }
  const a = document.createElement("a");
  a.download = "qr-code.png";
  a.href = lastCanvas.toDataURL("image/png");
  a.click();
}

function clearAll(){
  hideError();
  textEl.value = "";
  ssidEl.value = "";
  passEl.value = "";
  secEl.value = "WPA";
  hiddenEl.value = "false";
  sizeEl.value = "320";
  levelEl.value = "M";
  clearQR();
}

// Events
document.getElementById("typeBar").addEventListener("click", (e) => {
  const pill = e.target.closest(".pill");
  if(!pill) return;
  setType(pill.dataset.type);
});

generateBtn.addEventListener("click", generate);
downloadBtn.addEventListener("click", downloadPNG);
clearBtn.addEventListener("click", clearAll);

document.addEventListener("keydown", (e) => {
  if(e.target && e.target.tagName === "TEXTAREA"){
    if(e.key === "Enter" && (e.ctrlKey || e.metaKey)) generate();
    return;
  }
  if(e.key === "Enter") generate();
});

// Init
setType("text");
