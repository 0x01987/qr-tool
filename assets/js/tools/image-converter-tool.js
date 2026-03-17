document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  const formatSelect = document.getElementById("formatSelect");
  const resizeMode = document.getElementById("resizeMode");
  const qualityRange = document.getElementById("qualityRange");
  const widthInput = document.getElementById("widthInput");
  const heightInput = document.getElementById("heightInput");
  const keepAspect = document.getElementById("keepAspect");
  const convertBtn = document.getElementById("convertBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const resetBtn = document.getElementById("resetBtn");
  const statusBadge = document.getElementById("statusBadge");
  const resultsBody = document.getElementById("resultsBody");

  const summaryInput = document.getElementById("summaryInput");
  const summaryOriginalSize = document.getElementById("summaryOriginalSize");
  const summaryOutput = document.getElementById("summaryOutput");
  const summaryConvertedSize = document.getElementById("summaryConvertedSize");

  const originalPreviewWrap = document.getElementById("originalPreviewWrap");
  const convertedPreviewWrap = document.getElementById("convertedPreviewWrap");

  const sampleJpgBtn = document.getElementById("sampleJpgBtn");
  const samplePngBtn = document.getElementById("samplePngBtn");
  const sampleWebpBtn = document.getElementById("sampleWebpBtn");

  let sourceFile = null;
  let sourceImage = null;
  let convertedBlob = null;
  let convertedUrl = "";
  let originalUrl = "";

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[ch]));
  }

  function setStatus(text) {
    if (statusBadge) statusBadge.textContent = text;
  }

  function formatBytes(bytes) {
    const num = Number(bytes || 0);
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(2)} MB`;
  }

  function extensionForMime(mime) {
    switch (mime) {
      case "image/png": return "png";
      case "image/jpeg": return "jpg";
      case "image/webp": return "webp";
      case "image/svg+xml": return "svg";
      default: return "img";
    }
  }

  function labelForMime(mime) {
    switch (mime) {
      case "image/png": return "PNG";
      case "image/jpeg": return "JPG";
      case "image/webp": return "WEBP";
      case "image/svg+xml": return "SVG";
      default: return mime;
    }
  }

  function baseName(filename) {
    return String(filename || "converted-image").replace(/\.[^.]+$/, "");
  }

  function setSummary(input = "—", originalSize = "—", output = "—", convertedSize = "—") {
    summaryInput.textContent = input;
    summaryOriginalSize.textContent = originalSize;
    summaryOutput.textContent = output;
    summaryConvertedSize.textContent = convertedSize;
  }

  function setResultsRows(rows) {
    resultsBody.innerHTML = rows.map(row => `
      <tr>
        <td class="resolver">${escapeHtml(row.field)}</td>
        <td class="resultCell">
          <div class="resultBox">
            <div class="mono">${escapeHtml(String(row.value))}</div>
          </div>
        </td>
        <td class="ttl">${escapeHtml(row.note)}</td>
      </tr>
    `).join("");
  }

  function setOriginalPreviewEmpty() {
    originalPreviewWrap.innerHTML = `<div class="mono muted">No image loaded yet.</div>`;
  }

  function setConvertedPreviewEmpty() {
    convertedPreviewWrap.innerHTML = `<div class="mono muted">Converted preview will appear here.</div>`;
  }

  function renderPreview(container, url, alt) {
    container.innerHTML = `
      <div style="display:flex;justify-content:center;align-items:center;min-height:180px;">
        <img src="${url}" alt="${escapeHtml(alt)}" style="max-width:100%;max-height:420px;border-radius:12px;display:block;">
      </div>
    `;
  }

  function renderSvgPreview(container, url, alt) {
    container.innerHTML = `
      <div style="display:flex;justify-content:center;align-items:center;min-height:180px;">
        <img src="${url}" alt="${escapeHtml(alt)}" style="max-width:100%;max-height:420px;border-radius:12px;display:block;background:transparent;">
      </div>
    `;
  }

  function updateResizeInputsState() {
    const custom = resizeMode.value === "custom";
    widthInput.disabled = !custom;
    heightInput.disabled = !custom;
  }

  function updateQualityState() {
    const format = formatSelect.value;
    const useQuality = format === "image/jpeg" || format === "image/webp";
    qualityRange.disabled = !useQuality;
  }

  function resetTool() {
    sourceFile = null;
    sourceImage = null;
    convertedBlob = null;

    if (originalUrl) {
      URL.revokeObjectURL(originalUrl);
      originalUrl = "";
    }

    if (convertedUrl) {
      URL.revokeObjectURL(convertedUrl);
      convertedUrl = "";
    }

    fileInput.value = "";
    widthInput.value = "";
    heightInput.value = "";
    resizeMode.value = "original";
    formatSelect.value = "image/jpeg";
    qualityRange.value = "92";
    keepAspect.value = "yes";

    updateResizeInputsState();
    updateQualityState();

    downloadBtn.disabled = true;
    setStatus("Ready");
    setSummary();
    setOriginalPreviewEmpty();
    setConvertedPreviewEmpty();

    setResultsRows([
      {
        field: "Ready",
        value: "Upload an image and click Convert Image.",
        note: "Client-side processing"
      }
    ]);
  }

  function validateFile(file) {
    const allowed = new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml"
    ]);

    if (!file) return "Choose an image file first.";
    if (!allowed.has(file.type)) {
      return "Unsupported format. Use PNG, JPG/JPEG, WEBP, or SVG.";
    }
    return "";
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      if (file.type === "image/svg+xml") {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(img);
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Could not decode SVG image."));
        };

        img.src = objectUrl;
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Could not decode image."));
        img.src = reader.result;
      };

      reader.onerror = () => reject(new Error("Could not read file."));
      reader.readAsDataURL(file);
    });
  }

  function getTargetDimensions(img) {
    const originalWidth = img.naturalWidth || img.width;
    const originalHeight = img.naturalHeight || img.height;

    if (resizeMode.value !== "custom") {
      return {
        width: originalWidth,
        height: originalHeight
      };
    }

    let width = Number(widthInput.value || 0);
    let height = Number(heightInput.value || 0);

    const keepRatio = keepAspect.value === "yes";
    const aspect = originalWidth / originalHeight;

    if (keepRatio) {
      if (width > 0 && !(height > 0)) {
        height = Math.round(width / aspect);
      } else if (height > 0 && !(width > 0)) {
        width = Math.round(height * aspect);
      }
    }

    if (!(width > 0) && !(height > 0)) {
      width = originalWidth;
      height = originalHeight;
    } else {
      width = width > 0 ? width : originalWidth;
      height = height > 0 ? height : originalHeight;
    }

    width = Math.max(1, Math.round(width));
    height = Math.max(1, Math.round(height));

    return { width, height };
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error("Conversion failed in this browser."));
          return;
        }
        resolve(blob);
      }, mime, quality);
    });
  }

  async function handleFileSelection() {
    const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    const validationError = validateFile(file);

    if (validationError) {
      setStatus("Invalid file");
      setResultsRows([
        { field: "Error", value: validationError, note: "Supported: PNG, JPG, WEBP, SVG" }
      ]);
      setOriginalPreviewEmpty();
      setConvertedPreviewEmpty();
      setSummary();
      downloadBtn.disabled = true;
      sourceFile = null;
      sourceImage = null;
      return;
    }

    try {
      sourceFile = file;
      sourceImage = await loadImageFromFile(file);

      if (originalUrl) URL.revokeObjectURL(originalUrl);
      originalUrl = URL.createObjectURL(file);

      if (file.type === "image/svg+xml") {
        renderSvgPreview(originalPreviewWrap, originalUrl, file.name);
      } else {
        renderPreview(originalPreviewWrap, originalUrl, file.name);
      }

      setSummary(
        `${file.name} (${labelForMime(file.type)})`,
        formatBytes(file.size),
        labelForMime(formatSelect.value),
        "—"
      );

      setResultsRows([
        { field: "File Name", value: file.name, note: "Source image" },
        { field: "Source Type", value: labelForMime(file.type), note: "Detected format" },
        { field: "Original Dimensions", value: `${sourceImage.naturalWidth} × ${sourceImage.naturalHeight}`, note: "Width × height" },
        { field: "Original Size", value: formatBytes(file.size), note: "Source file size" }
      ]);

      setStatus("Loaded");
      downloadBtn.disabled = true;
      setConvertedPreviewEmpty();
      summaryConvertedSize.textContent = "—";
    } catch (error) {
      console.error(error);
      setStatus("Load failed");
      setResultsRows([
        { field: "Error", value: error.message || "Could not load image.", note: "Try a different file" }
      ]);
      setOriginalPreviewEmpty();
      setConvertedPreviewEmpty();
      setSummary();
      sourceFile = null;
      sourceImage = null;
      downloadBtn.disabled = true;
    }
  }

  function buildSvgDataUrl(canvas) {
    const pngDataUrl = canvas.toDataURL("image/png");
    const width = canvas.width;
    const height = canvas.height;

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image href="${pngDataUrl}" width="${width}" height="${height}" />
</svg>`.trim();

    return new Blob([svg], { type: "image/svg+xml" });
  }

  async function convertImage() {
    if (!sourceFile || !sourceImage) {
      setStatus("No file");
      setResultsRows([
        { field: "Error", value: "Choose an image file first.", note: "PNG, JPG, WEBP, SVG" }
      ]);
      return;
    }

    try {
      setStatus("Converting");

      const outputMime = formatSelect.value;
      const quality = Number(qualityRange.value || 92) / 100;
      const target = getTargetDimensions(sourceImage);

      const canvas = document.createElement("canvas");
      canvas.width = target.width;
      canvas.height = target.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available.");

      if (outputMime === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);

      let blob;
      let note = "";

      if (outputMime === "image/svg+xml") {
        if (sourceFile.type === "image/svg+xml" && resizeMode.value === "original") {
          blob = sourceFile;
          note = "Original SVG preserved";
        } else {
          blob = buildSvgDataUrl(canvas);
          note = "Raster-wrapped SVG output";
        }
      } else {
        blob = await canvasToBlob(canvas, outputMime, quality);
      }

      convertedBlob = blob;

      if (convertedUrl) URL.revokeObjectURL(convertedUrl);
      convertedUrl = URL.createObjectURL(blob);

      if (outputMime === "image/svg+xml") {
        renderSvgPreview(convertedPreviewWrap, convertedUrl, "Converted SVG image");
      } else {
        renderPreview(convertedPreviewWrap, convertedUrl, "Converted image");
      }

      const outLabel = labelForMime(outputMime);
      const outputFileName = `${baseName(sourceFile.name)}-converted.${extensionForMime(outputMime)}`;

      setSummary(
        `${sourceFile.name} (${labelForMime(sourceFile.type)})`,
        formatBytes(sourceFile.size),
        `${outputFileName} (${outLabel})`,
        formatBytes(blob.size)
      );

      setResultsRows([
        { field: "Input File", value: sourceFile.name, note: "Original upload" },
        { field: "Input Format", value: labelForMime(sourceFile.type), note: "Detected source format" },
        { field: "Output Format", value: outLabel, note: outputMime === "image/svg+xml" ? "SVG output" : "Selected conversion format" },
        { field: "Output Dimensions", value: `${target.width} × ${target.height}`, note: "Width × height" },
        { field: "Quality", value: outputMime === "image/png" || outputMime === "image/svg+xml" ? "Not applicable" : `${qualityRange.value}%`, note: outputMime === "image/svg+xml" ? "SVG does not use raster quality" : "Compression quality" },
        { field: "Converted Size", value: formatBytes(blob.size), note: note || "Generated file size" }
      ]);

      downloadBtn.disabled = false;
      downloadBtn.dataset.filename = outputFileName;
      setStatus("Converted");
    } catch (error) {
      console.error(error);
      setStatus("Conversion failed");
      setResultsRows([
        { field: "Error", value: error.message || "Conversion failed.", note: "Try a different file or output format" }
      ]);
      setConvertedPreviewEmpty();
      downloadBtn.disabled = true;
    }
  }

  function downloadConverted() {
    if (!convertedBlob || !convertedUrl) return;

    const a = document.createElement("a");
    a.href = convertedUrl;
    a.download = downloadBtn.dataset.filename || "converted-image";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function applyPreset(format) {
    formatSelect.value = format;
    updateQualityState();
    summaryOutput.textContent = labelForMime(format);
  }

  fileInput.addEventListener("change", handleFileSelection);
  convertBtn.addEventListener("click", convertImage);
  downloadBtn.addEventListener("click", downloadConverted);
  resetBtn.addEventListener("click", resetTool);

  resizeMode.addEventListener("change", updateResizeInputsState);
  formatSelect.addEventListener("change", () => {
    updateQualityState();
    summaryOutput.textContent = labelForMime(formatSelect.value);
  });

  sampleJpgBtn.addEventListener("click", () => applyPreset("image/jpeg"));
  samplePngBtn.addEventListener("click", () => applyPreset("image/png"));
  sampleWebpBtn.addEventListener("click", () => applyPreset("image/webp"));

  widthInput.addEventListener("input", () => {
    if (!sourceImage || keepAspect.value !== "yes" || resizeMode.value !== "custom") return;
    const width = Number(widthInput.value || 0);
    if (width > 0) {
      const aspect = sourceImage.naturalWidth / sourceImage.naturalHeight;
      heightInput.value = String(Math.round(width / aspect));
    }
  });

  heightInput.addEventListener("input", () => {
    if (!sourceImage || keepAspect.value !== "yes" || resizeMode.value !== "custom") return;
    const height = Number(heightInput.value || 0);
    if (height > 0) {
      const aspect = sourceImage.naturalWidth / sourceImage.naturalHeight;
      widthInput.value = String(Math.round(height * aspect));
    }
  });

  const dropZone = fileInput.parentElement;
  if (dropZone) {
    ["dragenter", "dragover"].forEach(evt => {
      dropZone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ["dragleave", "drop"].forEach(evt => {
      dropZone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    dropZone.addEventListener("drop", e => {
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) {
        fileInput.files = files;
        handleFileSelection();
      }
    });
  }

  updateResizeInputsState();
  updateQualityState();
  resetTool();
});
