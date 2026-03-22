document.addEventListener('DOMContentLoaded', function () {
  const $ = (id) => document.getElementById(id);

  const els = {
    pdfToImageBtn: $('pdfToImageBtn'),
    imageToPdfBtn: $('imageToPdfBtn'),
    fileInput: $('fileInput'),
    dropzone: $('dropzone'),
    dropzoneHint: $('dropzoneHint'),

    outputFormat: $('outputFormat'),
    pageScale: $('pageScale'),
    pageSelection: $('pageSelection'),
    jpgQuality: $('jpgQuality'),
    pdfPageSize: $('pdfPageSize'),
    pdfOrientation: $('pdfOrientation'),

    outputFormatWrap: $('outputFormatWrap'),
    pageScaleWrap: $('pageScaleWrap'),
    pageSelectionWrap: $('pageSelectionWrap'),
    jpgQualityWrap: $('jpgQualityWrap'),
    pdfPageSizeWrap: $('pdfPageSizeWrap'),
    pdfOrientationWrap: $('pdfOrientationWrap'),

    processBtn: $('processBtn'),
    sampleBtn: $('sampleBtn'),
    clearBtn: $('clearBtn'),
    downloadAllBtn: $('downloadAllBtn'),

    previewStage: $('previewStage'),
    outputLog: $('outputLog'),
    statusBox: $('statusBox'),

    resultMode: $('resultMode'),
    fileCount: $('fileCount'),
    modeHelp: $('modeHelp'),
    summaryInputCount: $('summaryInputCount'),
    summaryOutputCount: $('summaryOutputCount'),
    summaryMode: $('summaryMode'),
    summaryReady: $('summaryReady'),
    year: $('year')
  };

  if (!els.processBtn) return;

  if (els.year) {
    els.year.textContent = String(new Date().getFullYear());
  }

  let currentMode = 'pdf-to-image';
  let inputFiles = [];
  let outputItems = [];
  let outputPdfBlob = null;

  function setStatus(html) {
    els.statusBox.innerHTML = html;
  }

  function setLog(text) {
    els.outputLog.textContent = text;
  }

  function setMode(mode) {
    currentMode = mode === 'image-to-pdf' ? 'image-to-pdf' : 'pdf-to-image';

    els.pdfToImageBtn.classList.toggle('active', currentMode === 'pdf-to-image');
    els.imageToPdfBtn.classList.toggle('active', currentMode === 'image-to-pdf');

    els.outputFormatWrap.classList.toggle('hidden', currentMode !== 'pdf-to-image');
    els.pageScaleWrap.classList.toggle('hidden', currentMode !== 'pdf-to-image');
    els.pageSelectionWrap.classList.toggle('hidden', currentMode !== 'pdf-to-image');
    els.jpgQualityWrap.classList.toggle('hidden', currentMode !== 'pdf-to-image');

    els.pdfPageSizeWrap.classList.toggle('hidden', currentMode !== 'image-to-pdf');
    els.pdfOrientationWrap.classList.toggle('hidden', currentMode !== 'image-to-pdf');

    if (currentMode === 'pdf-to-image') {
      els.fileInput.accept = 'application/pdf';
      els.dropzoneHint.textContent = 'Upload a PDF file';
      els.modeHelp.textContent = 'Export one PDF page or all pages as images.';
      els.resultMode.textContent = 'Mode: PDF → Image';
      els.summaryMode.textContent = 'PDF → Image';
    } else {
      els.fileInput.accept = 'image/png,image/jpeg,image/jpg,image/webp';
      els.fileInput.multiple = true;
      els.dropzoneHint.textContent = 'Upload one or more image files';
      els.modeHelp.textContent = 'Combine multiple images into one PDF document.';
      els.resultMode.textContent = 'Mode: Image → PDF';
      els.summaryMode.textContent = 'Image → PDF';
    }

    updateCounts();
    clearOutputOnly();
  }

  function updateCounts() {
    els.fileCount.textContent = String(inputFiles.length);
    els.summaryInputCount.textContent = String(inputFiles.length);
    els.summaryOutputCount.textContent = String(outputItems.length || (outputPdfBlob ? 1 : 0));
    els.summaryReady.textContent = outputItems.length || outputPdfBlob ? 'Yes' : 'No';
  }

  function clearPreview() {
    els.previewStage.innerHTML = `
      <div class="thumb">
        <div class="meta">No output yet. Process a PDF or image file to preview results here.</div>
      </div>
    `;
  }

  function clearOutputOnly() {
    outputItems = [];
    outputPdfBlob = null;
    clearPreview();
    setLog(currentMode === 'pdf-to-image'
      ? 'Ready. Upload a PDF to export image pages.'
      : 'Ready. Upload image files to combine them into a PDF.');
    updateCounts();
    setStatus('<strong>Ready.</strong><br>Choose a mode, upload files, and click <b>Process Files</b>.');
  }

  function resetAll() {
    inputFiles = [];
    els.fileInput.value = '';
    clearOutputOnly();
    updateCounts();
  }

  function setFiles(fileList) {
    inputFiles = Array.from(fileList || []);
    clearOutputOnly();
    updateCounts();

    if (!inputFiles.length) {
      setStatus('<strong>No files selected.</strong><br>Upload a file to continue.');
      return;
    }

    setStatus(`<strong>${inputFiles.length} file(s) selected.</strong><br>Click <b>Process Files</b> to continue.`);
    setLog(inputFiles.map((f, i) => `${i + 1}. ${f.name} (${Math.round(f.size / 1024)} KB)`).join('\n'));
  }

  function handleDropzone() {
    ['dragenter', 'dragover'].forEach((eventName) => {
      els.dropzone.addEventListener(eventName, function (e) {
        e.preventDefault();
        e.stopPropagation();
        els.dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      els.dropzone.addEventListener(eventName, function (e) {
        e.preventDefault();
        e.stopPropagation();
        els.dropzone.classList.remove('dragover');
      });
    });

    els.dropzone.addEventListener('drop', function (e) {
      const files = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : [];
      setFiles(files);
    });

    els.fileInput.addEventListener('change', function () {
      setFiles(els.fileInput.files);
    });
  }

  async function ensurePdfJs() {
    if (window.pdfjsLib) return window.pdfjsLib;
    if (window['pdfjs-dist/build/pdf']) return window['pdfjs-dist/build/pdf'];

    try {
      const mod = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
      if (mod) return mod;
    } catch (err) {
      return null;
    }
    return null;
  }

  function fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function addPreviewItem(src, label, meta) {
    const div = document.createElement('div');
    div.className = 'thumb';
    div.innerHTML = `
      <img src="${src}" alt="${label}">
      <div class="meta"><strong>${label}</strong><br>${meta}</div>
    `;
    els.previewStage.appendChild(div);
  }

  async function processPdfToImage() {
    if (!inputFiles.length) {
      setStatus('<strong>No PDF selected.</strong><br>Upload a PDF file first.');
      return;
    }

    const pdfFile = inputFiles[0];
    if (pdfFile.type !== 'application/pdf' && !pdfFile.name.toLowerCase().endsWith('.pdf')) {
      setStatus('<strong>Invalid file.</strong><br>Please upload a PDF file.');
      return;
    }

    const pdfjs = await ensurePdfJs();
    if (!pdfjs) {
      setStatus('<strong>PDF engine unavailable.</strong><br>Could not load PDF processing library.');
      return;
    }

    if (pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
    }

    setStatus('<strong>Processing PDF...</strong><br>Rendering PDF page(s) to images.');
    setLog('Reading PDF file...');
    clearPreview();
    outputItems = [];

    try {
      const buffer = await fileToArrayBuffer(pdfFile);
      const loadingTask = pdfjs.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;

      const totalPages = pdf.numPages;
      const pageSelection = els.pageSelection.value;
      const scale = Number(els.pageScale.value || 1.75);
      const outputFormat = els.outputFormat.value;
      const jpgQuality = Number(els.jpgQuality.value || 0.85);

      const pageNumbers = pageSelection === 'all'
        ? Array.from({ length: totalPages }, (_, i) => i + 1)
        : [1];

      setLog(`Loaded PDF: ${pdfFile.name}\nPages: ${totalPages}\nExporting: ${pageNumbers.join(', ')}`);

      for (const pageNumber of pageNumbers) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        await page.render({
          canvasContext: ctx,
          viewport
        }).promise;

        const mimeType = outputFormat === 'jpg' ? 'image/jpeg' : 'image/png';
        const dataUrl = outputFormat === 'jpg'
          ? canvas.toDataURL(mimeType, jpgQuality)
          : canvas.toDataURL(mimeType);

        const extension = outputFormat === 'jpg' ? 'jpg' : 'png';
        const filename = `${pdfFile.name.replace(/\.pdf$/i, '')}-page-${pageNumber}.${extension}`;

        outputItems.push({
          type: 'image',
          filename,
          dataUrl
        });

        addPreviewItem(
          dataUrl,
          `Page ${pageNumber}`,
          `${canvas.width} × ${canvas.height}px • ${extension.toUpperCase()}`
        );
      }

      setLog(
        `PDF processed successfully.\n` +
        `Input: ${pdfFile.name}\n` +
        `Pages exported: ${outputItems.length}\n` +
        `Format: ${outputFormat.toUpperCase()}`
      );
      setStatus('<strong>Done.</strong><br>Your PDF pages were converted successfully.');
      updateCounts();
    } catch (err) {
      setLog(`Conversion failed.\n${err && err.message ? err.message : 'Unknown error'}`);
      setStatus('<strong>Conversion failed.</strong><br>Please try another PDF or lower the render quality.');
      clearPreview();
    }
  }

  async function processImageToPdf() {
    if (!inputFiles.length) {
      setStatus('<strong>No images selected.</strong><br>Upload one or more image files first.');
      return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
      setStatus('<strong>PDF engine unavailable.</strong><br>Could not load jsPDF library.');
      return;
    }

    setStatus('<strong>Building PDF...</strong><br>Combining selected images into a PDF.');
    setLog('Reading image files...');
    clearPreview();
    outputItems = [];
    outputPdfBlob = null;

    try {
      const { jsPDF } = window.jspdf;
      const pageSize = els.pdfPageSize.value || 'a4';
      const orientationSetting = els.pdfOrientation.value || 'auto';

      let pdf = null;

      for (let i = 0; i < inputFiles.length; i++) {
        const file = inputFiles[i];
        const dataUrl = await fileToDataUrl(file);
        const img = await loadImage(dataUrl);

        let orientation = 'portrait';
        if (orientationSetting === 'landscape') orientation = 'landscape';
        else if (orientationSetting === 'portrait') orientation = 'portrait';
        else orientation = img.width >= img.height ? 'landscape' : 'portrait';

        let format = pageSize === 'fit' ? [img.width, img.height] : pageSize;

        if (!pdf) {
          pdf = new jsPDF({
            orientation,
            unit: 'pt',
            format
          });
        } else {
          pdf.addPage(format, orientation);
        }

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
        const renderWidth = img.width * ratio;
        const renderHeight = img.height * ratio;
        const x = (pageWidth - renderWidth) / 2;
        const y = (pageHeight - renderHeight) / 2;

        const imageType = file.type === 'image/png' ? 'PNG' : 'JPEG';
        pdf.addImage(dataUrl, imageType, x, y, renderWidth, renderHeight);

        addPreviewItem(
          dataUrl,
          file.name,
          `${img.width} × ${img.height}px`
        );
      }

      const blob = pdf.output('blob');
      outputPdfBlob = blob;

      setLog(
        `PDF created successfully.\n` +
        `Images combined: ${inputFiles.length}\n` +
        `Output: merged-images.pdf`
      );
      setStatus('<strong>Done.</strong><br>Your images were combined into a PDF successfully.');
      updateCounts();
    } catch (err) {
      setLog(`PDF creation failed.\n${err && err.message ? err.message : 'Unknown error'}`);
      setStatus('<strong>PDF creation failed.</strong><br>Please try smaller images or fewer files at once.');
      clearPreview();
    }
  }

  function downloadOutput() {
    if (currentMode === 'pdf-to-image') {
      if (!outputItems.length) {
        setStatus('<strong>Nothing to download.</strong><br>Process a PDF first.');
        return;
      }

      outputItems.forEach((item) => {
        const link = document.createElement('a');
        link.href = item.dataUrl;
        link.download = item.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      });

      setStatus('<strong>Download started.</strong><br>Your converted image file(s) are downloading.');
      return;
    }

    if (currentMode === 'image-to-pdf') {
      if (!outputPdfBlob) {
        setStatus('<strong>Nothing to download.</strong><br>Process images first.');
        return;
      }

      const url = URL.createObjectURL(outputPdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'merged-images.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setStatus('<strong>Download started.</strong><br>Your PDF file is downloading.');
    }
  }

  function loadSampleState() {
    if (currentMode === 'pdf-to-image') {
      setLog('Sample state loaded.\nUpload a PDF and click Process Files to export PNG or JPG pages.');
      setStatus('<strong>Sample state loaded.</strong><br>Upload a PDF file to continue.');
    } else {
      setLog('Sample state loaded.\nUpload JPG, PNG, or WebP images and click Process Files to build a PDF.');
      setStatus('<strong>Sample state loaded.</strong><br>Upload image files to continue.');
    }
  }

  els.pdfToImageBtn.addEventListener('click', function () {
    setMode('pdf-to-image');
    els.fileInput.multiple = false;
  });

  els.imageToPdfBtn.addEventListener('click', function () {
    setMode('image-to-pdf');
    els.fileInput.multiple = true;
  });

  els.processBtn.addEventListener('click', function () {
    if (currentMode === 'pdf-to-image') {
      processPdfToImage();
    } else {
      processImageToPdf();
    }
  });

  els.sampleBtn.addEventListener('click', loadSampleState);
  els.clearBtn.addEventListener('click', resetAll);
  els.downloadAllBtn.addEventListener('click', downloadOutput);

  handleDropzone();
  setMode('pdf-to-image');
  resetAll();
});
