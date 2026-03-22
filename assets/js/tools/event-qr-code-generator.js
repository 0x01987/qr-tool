document.addEventListener('DOMContentLoaded', () => {
  const els = {
    eventTitle: document.getElementById('eventTitle'),
    startDate: document.getElementById('startDate'),
    startTime: document.getElementById('startTime'),
    endDate: document.getElementById('endDate'),
    endTime: document.getElementById('endTime'),
    eventLocation: document.getElementById('eventLocation'),
    eventDescription: document.getElementById('eventDescription'),
    allDayEvent: document.getElementById('allDayEvent'),

    generateBtn: document.getElementById('generateBtn'),
    sampleBtn: document.getElementById('sampleBtn'),
    clearBtn: document.getElementById('clearBtn'),
    copyEventBtn: document.getElementById('copyEventBtn'),
    downloadIcsBtn: document.getElementById('downloadIcsBtn'),
    downloadBtn: document.getElementById('downloadBtn'),

    charCount: document.getElementById('charCount'),
    readyLabel: document.getElementById('readyLabel'),
    allDayMetric: document.getElementById('allDayMetric'),
    locationMetric: document.getElementById('locationMetric'),

    previewName: document.getElementById('previewName'),
    previewSub: document.getElementById('previewSub'),
    previewLines: document.getElementById('previewLines'),

    qrCanvas: document.getElementById('qrCanvas'),
    qrEmpty: document.getElementById('qrEmpty'),
    outputCode: document.getElementById('outputCode'),
    statusBox: document.getElementById('statusBox'),
    year: document.getElementById('year')
  };

  if (!els.generateBtn || !els.qrCanvas) return;
  if (els.year) els.year.textContent = String(new Date().getFullYear());

  let lastEventText = '';
  let lastIcsText = '';

  function safeTrim(value) {
    return String(value || '').trim();
  }

  function setStatus(html) {
    if (els.statusBox) els.statusBox.innerHTML = html;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeIcsText(str) {
    return String(str || '')
      .replace(/\\/g, '\\\\')
      .replace(/\r?\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  }

  function formatDateTimeForDisplay(date, time, allDay) {
    if (!date) return 'No date selected';
    if (allDay) return `${date} • All day`;
    return time ? `${date} • ${time}` : `${date}`;
  }

  function toIcsDate(dateStr) {
    return String(dateStr || '').replace(/-/g, '');
  }

  function toIcsDateTime(dateStr, timeStr) {
    const d = safeTrim(dateStr);
    const t = safeTrim(timeStr);
    if (!d || !t) return '';
    return `${toIcsDate(d)}T${t.replace(':', '')}00`;
  }

  function buildEventText() {
    const title = safeTrim(els.eventTitle.value);
    const startDate = safeTrim(els.startDate.value);
    const startTime = safeTrim(els.startTime.value);
    const endDate = safeTrim(els.endDate.value);
    const endTime = safeTrim(els.endTime.value);
    const location = safeTrim(els.eventLocation.value);
    const description = safeTrim(els.eventDescription.value);
    const allDay = !!els.allDayEvent.checked;

    if (!title || !startDate) return '';

    const parts = [
      `BEGIN:VEVENT`,
      `SUMMARY:${title}`
    ];

    if (allDay) {
      parts.push(`DTSTART;VALUE=DATE:${toIcsDate(startDate)}`);
      if (endDate) {
        parts.push(`DTEND;VALUE=DATE:${toIcsDate(endDate)}`);
      }
    } else {
      const start = toIcsDateTime(startDate, startTime);
      const end = toIcsDateTime(endDate || startDate, endTime);
      if (start) parts.push(`DTSTART:${start}`);
      if (end) parts.push(`DTEND:${end}`);
    }

    if (location) parts.push(`LOCATION:${location}`);
    if (description) parts.push(`DESCRIPTION:${description}`);

    parts.push(`END:VEVENT`);
    return parts.join('\n');
  }

  function buildIcsText() {
    const title = safeTrim(els.eventTitle.value);
    const startDate = safeTrim(els.startDate.value);
    const startTime = safeTrim(els.startTime.value);
    const endDate = safeTrim(els.endDate.value);
    const endTime = safeTrim(els.endTime.value);
    const location = safeTrim(els.eventLocation.value);
    const description = safeTrim(els.eventDescription.value);
    const allDay = !!els.allDayEvent.checked;

    if (!title || !startDate) return '';

    const uid = `instantqr-${Date.now()}@instantqr.io`;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//InstantQR//Event QR Code Generator//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `SUMMARY:${escapeIcsText(title)}`
    ];

    if (allDay) {
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(startDate)}`);
      if (endDate) {
        lines.push(`DTEND;VALUE=DATE:${toIcsDate(endDate)}`);
      }
    } else {
      const start = toIcsDateTime(startDate, startTime);
      const end = toIcsDateTime(endDate || startDate, endTime);
      if (start) lines.push(`DTSTART:${start}`);
      if (end) lines.push(`DTEND:${end}`);
    }

    if (location) lines.push(`LOCATION:${escapeIcsText(location)}`);
    if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);

    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.join('\r\n');
  }

  function updateMeta() {
    const title = safeTrim(els.eventTitle.value) || 'Your event title';
    const startDate = safeTrim(els.startDate.value);
    const startTime = safeTrim(els.startTime.value);
    const endDate = safeTrim(els.endDate.value);
    const endTime = safeTrim(els.endTime.value);
    const location = safeTrim(els.eventLocation.value);
    const description = safeTrim(els.eventDescription.value);
    const allDay = !!els.allDayEvent.checked;

    if (els.charCount) els.charCount.textContent = String(description.length);
    if (els.allDayMetric) els.allDayMetric.textContent = allDay ? 'Yes' : 'No';
    if (els.locationMetric) els.locationMetric.textContent = location || '—';

    if (els.previewName) els.previewName.textContent = title;
    if (els.previewSub) {
      els.previewSub.textContent = startDate
        ? `${formatDateTimeForDisplay(startDate, startTime, allDay)}`
        : 'Your event date, time, and details will appear here.';
    }

    if (els.previewLines) {
      const parts = [];
      if (startDate) parts.push(`<div class="event-line">Start: ${escapeHtml(formatDateTimeForDisplay(startDate, startTime, allDay))}</div>`);
      if (endDate) parts.push(`<div class="event-line">End: ${escapeHtml(formatDateTimeForDisplay(endDate, endTime, allDay))}</div>`);
      if (location) parts.push(`<div class="event-line">Location: ${escapeHtml(location)}</div>`);
      if (description) parts.push(`<div class="event-line">Description: ${escapeHtml(description)}</div>`);

      els.previewLines.innerHTML = parts.length
        ? parts.join('')
        : '<div class="event-line">An event preview will appear here.</div>';
    }

    lastEventText = buildEventText();
    lastIcsText = buildIcsText();

    if (els.outputCode) {
      els.outputCode.textContent = lastEventText || 'No event content generated yet.';
    }
  }

  async function fetchBlob(url) {
    const res = await fetch(url, { mode: 'cors', cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.blob();
  }

  async function blobToImage(blob) {
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = objectUrl;
      });
      return img;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function buildQrApiUrl(text) {
    const params = new URLSearchParams({
      data: text,
      size: '320x320',
      margin: '20',
      color: '000000',
      bgcolor: 'ffffff',
      format: 'png'
    });
    return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
  }

  async function renderQr(text) {
    const blob = await fetchBlob(buildQrApiUrl(text));
    const qrImg = await blobToImage(blob);

    const canvas = els.qrCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = 320;
    canvas.height = 320;
    ctx.clearRect(0, 0, 320, 320);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 320, 320);
    ctx.drawImage(qrImg, 0, 0, 320, 320);
  }

  async function generate() {
    updateMeta();

    if (!lastEventText) {
      els.qrCanvas.hidden = true;
      els.qrEmpty.hidden = false;
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      setStatus('<strong>Not enough data.</strong><br>Enter at least an event title and start date.');
      return;
    }

    try {
      await renderQr(lastEventText);
      els.qrCanvas.hidden = false;
      els.qrEmpty.hidden = true;
      if (els.readyLabel) els.readyLabel.textContent = 'Yes';
      setStatus('<strong>Generated.</strong><br>Your event QR code is ready.');
    } catch (err) {
      console.error('Event QR generation failed:', err);
      els.qrCanvas.hidden = true;
      els.qrEmpty.hidden = false;
      if (els.readyLabel) els.readyLabel.textContent = 'No';
      setStatus('<strong>Generation failed.</strong><br>The event QR code could not be rendered.');
    }
  }

  async function copyText(text, successMessage, failMessage) {
    try {
      if (!text) throw new Error('No text');
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        temp.remove();
      }
      setStatus(`<strong>Copied.</strong><br>${successMessage}`);
    } catch (_) {
      setStatus(`<strong>Copy failed.</strong><br>${failMessage}`);
    }
  }

  function downloadIcs() {
    if (!lastIcsText) {
      setStatus('<strong>Nothing to download.</strong><br>Generate event content first.');
      return;
    }

    const fileName = (safeTrim(els.eventTitle.value) || 'event')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '.ics';

    const blob = new Blob([lastIcsText], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function clearAll() {
    els.eventTitle.value = '';
    els.startDate.value = '';
    els.startTime.value = '';
    els.endDate.value = '';
    els.endTime.value = '';
    els.eventLocation.value = '';
    els.eventDescription.value = '';
    els.allDayEvent.checked = false;
    lastEventText = '';
    lastIcsText = '';
    els.qrCanvas.hidden = true;
    els.qrEmpty.hidden = false;
    if (els.readyLabel) els.readyLabel.textContent = 'No';
    updateMeta();
    setStatus('<strong>Cleared.</strong><br>Your event details were reset.');
  }

  function loadSample() {
    els.eventTitle.value = 'InstantQR Launch Event';
    els.startDate.value = '2026-04-15';
    els.startTime.value = '18:00';
    els.endDate.value = '2026-04-15';
    els.endTime.value = '20:00';
    els.eventLocation.value = 'Phoenix Convention Center';
    els.eventDescription.value = 'Join us for a product launch event with demos, networking, and Q&A.';
    els.allDayEvent.checked = false;
    updateMeta();
    generate();
  }

  els.generateBtn?.addEventListener('click', async () => {
    await generate();
  });

  els.sampleBtn?.addEventListener('click', () => {
    loadSample();
  });

  els.clearBtn?.addEventListener('click', () => {
    clearAll();
  });

  els.copyEventBtn?.addEventListener('click', async () => {
    await copyText(lastEventText, 'The event text was copied.', 'Nothing to copy.');
  });

  els.downloadIcsBtn?.addEventListener('click', () => {
    downloadIcs();
  });

  els.downloadBtn?.addEventListener('click', () => {
    if (els.qrCanvas.hidden) {
      setStatus('<strong>Nothing to download.</strong><br>Generate a QR code first.');
      return;
    }
    const link = document.createElement('a');
    link.href = els.qrCanvas.toDataURL('image/png');
    link.download = 'event-qr-code.png';
    link.click();
  });

  [els.eventTitle, els.startDate, els.startTime, els.endDate, els.endTime, els.eventLocation, els.eventDescription, els.allDayEvent].forEach(el => {
    el?.addEventListener('input', updateMeta);
    el?.addEventListener('change', updateMeta);
  });

  updateMeta();
  els.qrCanvas.hidden = true;
});
