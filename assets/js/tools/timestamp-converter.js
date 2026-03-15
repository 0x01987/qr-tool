document.addEventListener('DOMContentLoaded', () => {
  const timestampInputEl = document.getElementById('timestampInput');
  const dateInputEl = document.getElementById('dateInput');

  const fromTimestampBtn = document.getElementById('fromTimestampBtn');
  const fromDateBtn = document.getElementById('fromDateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');

  const statusBadge = document.getElementById('statusBadge');
  const resultTextEl = document.getElementById('resultText');
  const formulaTextEl = document.getElementById('formulaText');

  const modeLabelEl = document.getElementById('modeLabel');
  const detectedLabelEl = document.getElementById('detectedLabel');
  const secondsLabelEl = document.getElementById('secondsLabel');
  const millisecondsLabelEl = document.getElementById('millisecondsLabel');

  const utcOutputEl = document.getElementById('utcOutput');
  const localOutputEl = document.getElementById('localOutput');
  const isoOutputEl = document.getElementById('isoOutput');
  const secondsOutputEl = document.getElementById('secondsOutput');
  const millisecondsOutputEl = document.getElementById('millisecondsOutput');
  const offsetOutputEl = document.getElementById('offsetOutput');

  let lastMode = 'Ready';
  let lastSummary = '';

  function setStatus(text, kind = '') {
    if (!statusBadge) return;
    statusBadge.className = 'badge' + (kind ? ' ' + kind : '');
    statusBadge.textContent = text;
  }

  function setResult(text) {
    if (resultTextEl) resultTextEl.textContent = text;
  }

  function updateMeta(mode = lastMode, detected = '—', seconds = '—', milliseconds = '—') {
    lastMode = mode;
    if (modeLabelEl) modeLabelEl.textContent = mode;
    if (detectedLabelEl) detectedLabelEl.textContent = detected;
    if (secondsLabelEl) secondsLabelEl.textContent = String(seconds);
    if (millisecondsLabelEl) millisecondsLabelEl.textContent = String(milliseconds);
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function formatLocalDateTimeInput(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function timezoneOffsetString(date) {
    const mins = -date.getTimezoneOffset();
    const sign = mins >= 0 ? '+' : '-';
    const abs = Math.abs(mins);
    const hours = Math.floor(abs / 60);
    const minutes = abs % 60;
    return `${sign}${pad(hours)}:${pad(minutes)}`;
  }

  function setOutputs(date, seconds, milliseconds) {
    if (utcOutputEl) utcOutputEl.textContent = date.toUTCString();
    if (localOutputEl) localOutputEl.textContent = date.toString();
    if (isoOutputEl) isoOutputEl.textContent = date.toISOString();
    if (secondsOutputEl) secondsOutputEl.textContent = String(seconds);
    if (millisecondsOutputEl) millisecondsOutputEl.textContent = String(milliseconds);
    if (offsetOutputEl) offsetOutputEl.textContent = timezoneOffsetString(date);
  }

  function clearOutputs() {
    if (utcOutputEl) utcOutputEl.textContent = '—';
    if (localOutputEl) localOutputEl.textContent = '—';
    if (isoOutputEl) isoOutputEl.textContent = '—';
    if (secondsOutputEl) secondsOutputEl.textContent = '—';
    if (millisecondsOutputEl) millisecondsOutputEl.textContent = '—';
    if (offsetOutputEl) offsetOutputEl.textContent = '—';
  }

  function parseTimestamp(raw) {
    const value = String(raw || '').trim();
    if (!value) return null;
    if (!/^-?\d+$/.test(value)) return null;

    const num = Number(value);
    if (!Number.isFinite(num)) return null;

    const abs = Math.abs(num);

    if (abs >= 1e12) {
      return {
        detected: 'Milliseconds',
        milliseconds: num,
        seconds: Math.floor(num / 1000)
      };
    }

    return {
      detected: 'Seconds',
      seconds: num,
      milliseconds: num * 1000
    };
  }

  function convertFromTimestamp() {
    const parsed = parseTimestamp(timestampInputEl.value);

    if (!parsed) {
      clearOutputs();
      setResult('Enter a valid Unix timestamp in seconds or milliseconds.');
      setStatus('Invalid timestamp', 'bad');
      if (formulaTextEl) formulaTextEl.textContent = 'Mode: Timestamp and date conversion';
      updateMeta('Invalid timestamp', '—', '—', '—');
      lastSummary = '';
      return;
    }

    const date = new Date(parsed.milliseconds);
    if (Number.isNaN(date.getTime())) {
      clearOutputs();
      setResult('The timestamp could not be converted to a valid date.');
      setStatus('Conversion failed', 'bad');
      updateMeta('Conversion failed', parsed.detected, parsed.seconds, parsed.milliseconds);
      lastSummary = '';
      return;
    }

    setOutputs(date, parsed.seconds, parsed.milliseconds);
    dateInputEl.value = formatLocalDateTimeInput(date);

    setResult(`${parsed.detected} timestamp converted successfully.`);
    setStatus('Converted', 'ok');
    if (formulaTextEl) formulaTextEl.textContent = `Detected: ${parsed.detected}`;
    updateMeta('From timestamp', parsed.detected, parsed.seconds, parsed.milliseconds);

    lastSummary =
`Timestamp Converter
Mode: From timestamp
Detected: ${parsed.detected}
Unix Seconds: ${parsed.seconds}
Unix Milliseconds: ${parsed.milliseconds}
UTC: ${date.toUTCString()}
Local: ${date.toString()}
ISO: ${date.toISOString()}`;
  }

  function convertFromDate() {
    const raw = String(dateInputEl.value || '').trim();

    if (!raw) {
      clearOutputs();
      setResult('Choose a date and time first.');
      setStatus('Enter date', 'bad');
      if (formulaTextEl) formulaTextEl.textContent = 'Mode: Timestamp and date conversion';
      updateMeta('No date', 'Date input', '—', '—');
      lastSummary = '';
      return;
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      clearOutputs();
      setResult('The selected date is invalid.');
      setStatus('Invalid date', 'bad');
      updateMeta('Invalid date', 'Date input', '—', '—');
      lastSummary = '';
      return;
    }

    const milliseconds = date.getTime();
    const seconds = Math.floor(milliseconds / 1000);

    setOutputs(date, seconds, milliseconds);
    timestampInputEl.value = String(seconds);

    setResult('Date converted successfully.');
    setStatus('Converted', 'ok');
    if (formulaTextEl) formulaTextEl.textContent = 'Detected: Date input';
    updateMeta('From date', 'Date input', seconds, milliseconds);

    lastSummary =
`Timestamp Converter
Mode: From date
Unix Seconds: ${seconds}
Unix Milliseconds: ${milliseconds}
UTC: ${date.toUTCString()}
Local: ${date.toString()}
ISO: ${date.toISOString()}`;
  }

  function resetAll() {
    timestampInputEl.value = '';
    dateInputEl.value = '';
    clearOutputs();
    setResult('Enter a timestamp or select a date and time.');
    setStatus('Ready');
    if (formulaTextEl) formulaTextEl.textContent = 'Mode: Timestamp and date conversion';
    updateMeta('Ready', '—', '—', '—');
    lastSummary = '';
  }

  function fillNowDate() {
    const now = new Date();
    dateInputEl.value = formatLocalDateTimeInput(now);
  }

  fromTimestampBtn?.addEventListener('click', convertFromTimestamp);
  fromDateBtn?.addEventListener('click', convertFromDate);

  copyBtn?.addEventListener('click', async () => {
    if (!lastSummary) {
      setStatus('Nothing to copy', 'bad');
      return;
    }

    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(lastSummary);
      } else {
        await navigator.clipboard.writeText(lastSummary);
      }
      setStatus('Copied', 'ok');
      setTimeout(() => {
        setStatus(lastMode === 'Ready' ? 'Ready' : 'Converted', lastMode === 'Ready' ? '' : 'ok');
      }, 1200);
    } catch (_) {
      setStatus('Copy failed', 'bad');
    }
  });

  clearBtn?.addEventListener('click', resetAll);

  timestampInputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      convertFromTimestamp();
    }
  });

  dateInputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      convertFromDate();
    }
  });

  document.querySelectorAll('.quick button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ts = btn.dataset.timestamp;
      const mode = btn.dataset.mode;

      if (ts) {
        timestampInputEl.value = ts;
        setStatus('Example loaded', 'ok');
        setResult('Example timestamp loaded. Click From Timestamp.');
        updateMeta('Example', '—', '—', '—');
        return;
      }

      if (mode === 'now-seconds') {
        timestampInputEl.value = String(Math.floor(Date.now() / 1000));
        setStatus('Now loaded', 'ok');
        setResult('Current Unix seconds loaded. Click From Timestamp.');
        updateMeta('Example', '—', '—', '—');
        return;
      }

      if (mode === 'now-date') {
        fillNowDate();
        setStatus('Now loaded', 'ok');
        setResult('Current date and time loaded. Click From Date.');
        updateMeta('Example', '—', '—', '—');
      }
    });
  });

  fillNowDate();
  resetAll();
});
