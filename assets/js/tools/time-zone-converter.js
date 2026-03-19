document.addEventListener('DOMContentLoaded', () => {
  const dateEl = document.getElementById('date');
  const timeEl = document.getElementById('time');
  const fromEl = document.getElementById('fromTz');
  const toEl = document.getElementById('toTz');

  const convertBtn = document.getElementById('convertBtn');
  const swapBtn = document.getElementById('swapBtn');
  const nowBtn = document.getElementById('nowBtn');
  const copyBtn = document.getElementById('copyBtn');

  const statusBox = document.getElementById('statusBox');
  const statusLine = document.getElementById('statusLine');

  const fromOut = document.getElementById('fromOut');
  const toOut = document.getElementById('toOut');
  const diffOut = document.getElementById('diffOut');
  const dstOut = document.getElementById('dstOut');
  const fromMeta = document.getElementById('fromMeta');
  const toMeta = document.getElementById('toMeta');
  const fromNow = document.getElementById('fromNow');
  const toNow = document.getElementById('toNow');

  const yearEl = document.getElementById('year');

  if (yearEl) yearEl.textContent = new Date().getFullYear();
  if (!dateEl || !timeEl || !fromEl || !toEl) return;

  const COMMON_TZ = [
    'America/Phoenix',
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Madrid',
    'Europe/Rome',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Phnom_Penh',
    'Australia/Sydney',
    'Australia/Perth',
    'UTC'
  ];

  function setStatus(message, type = 'hint') {
    if (!statusLine || !statusBox) return;
    statusLine.className = type;
    statusLine.textContent = message;
    statusBox.classList.toggle('good', type === 'ok');
  }

  function getAllTimeZones() {
    if (typeof Intl.supportedValuesOf === 'function') {
      try {
        const zones = Intl.supportedValuesOf('timeZone');
        if (Array.isArray(zones) && zones.length) return zones;
      } catch (_) {}
    }
    return COMMON_TZ;
  }

  function fillSelect(selectEl, values) {
    selectEl.innerHTML = '';
    for (const tz of values) {
      const option = document.createElement('option');
      option.value = tz;
      option.textContent = tz;
      selectEl.appendChild(option);
    }
  }

  function pad2(number) {
    return String(number).padStart(2, '0');
  }

  function formatOffset(minutes) {
    const sign = minutes >= 0 ? '+' : '-';
    const abs = Math.abs(minutes);
    const hh = Math.floor(abs / 60);
    const mm = abs % 60;
    return `UTC${sign}${hh}${mm ? `:${String(mm).padStart(2, '0')}` : ''}`;
  }

  function setNow() {
    const now = new Date();
    dateEl.value = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    timeEl.value = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    setStatus('Loaded current local date and time.', 'ok');
    convert();
  }

  function formatInTZ(date, timeZone) {
    const formatter = new Intl.DateTimeFormat(undefined, {
      timeZone,
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short'
    });
    return formatter.format(date);
  }

  function getOffsetMinutes(date, timeZone) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'shortOffset'
    }).formatToParts(date);

    const tzPart = parts.find((part) => part.type === 'timeZoneName');
    if (!tzPart) return 0;

    const match = tzPart.value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!match) return 0;

    const sign = match[1] === '-' ? -1 : 1;
    const hh = Number(match[2] || 0);
    const mm = Number(match[3] || 0);

    return sign * (hh * 60 + mm);
  }

  function dateTimeInZoneToInstant(dateStr, timeStr, timeZone) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);

    let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

    for (let i = 0; i < 3; i += 1) {
      const offsetMinutes = getOffsetMinutes(guess, timeZone);
      const desiredUTC = Date.UTC(year, month - 1, day, hour, minute, 0) - offsetMinutes * 60 * 1000;
      guess = new Date(desiredUTC);
    }

    return guess;
  }

  function updateNowLabels() {
    const now = new Date();
    const fromTz = fromEl.value;
    const toTz = toEl.value;

    if (fromNow) fromNow.textContent = fromTz ? `Now: ${formatInTZ(now, fromTz)}` : 'Now: —';
    if (toNow) toNow.textContent = toTz ? `Now: ${formatInTZ(now, toTz)}` : 'Now: —';
  }

  function convert() {
    const dateStr = (dateEl.value || '').trim();
    const timeStr = (timeEl.value || '').trim();
    const fromTz = fromEl.value;
    const toTz = toEl.value;

    if (!dateStr || !timeStr) {
      setStatus('Please choose a date and time.', 'error');
      return;
    }

    if (!fromTz || !toTz) {
      setStatus('Please select both time zones.', 'error');
      return;
    }

    try {
      const instant = dateTimeInZoneToInstant(dateStr, timeStr, fromTz);

      const fromText = formatInTZ(instant, fromTz);
      const toText = formatInTZ(instant, toTz);

      fromOut.textContent = fromText;
      toOut.textContent = toText;

      const offsetFrom = getOffsetMinutes(instant, fromTz);
      const offsetTo = getOffsetMinutes(instant, toTz);
      const diffMinutes = offsetTo - offsetFrom;

      const sign = diffMinutes >= 0 ? '+' : '-';
      const abs = Math.abs(diffMinutes);
      const hh = Math.floor(abs / 60);
      const mm = abs % 60;

      diffOut.textContent = `${sign}${hh}h ${mm}m`;
      fromMeta.textContent = `${fromTz} (${formatOffset(offsetFrom)})`;
      toMeta.textContent = `${toTz} (${formatOffset(offsetTo)})`;
      dstOut.textContent = `Offsets at this time: ${fromTz} = ${formatOffset(offsetFrom)}, ${toTz} = ${formatOffset(offsetTo)}`;

      setStatus('Converted successfully.', 'ok');
      updateNowLabels();
    } catch (error) {
      setStatus(`Conversion error: ${error.message || String(error)}`, 'error');
    }
  }

  async function copyResult() {
    const fromTz = fromEl.value;
    const toTz = toEl.value;
    const text = `From (${fromTz}): ${fromOut.textContent}\nTo (${toTz}): ${toOut.textContent}\nDifference: ${diffOut.textContent}`;

    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }

      copyBtn.textContent = 'Copied!';
      setStatus('Result copied to clipboard.', 'ok');

      setTimeout(() => {
        copyBtn.textContent = 'Copy Result';
      }, 1200);
    } catch (_) {
      setStatus('Copy failed. Clipboard may be blocked by your browser.', 'error');
    }
  }

  function swapZones() {
    const fromValue = fromEl.value;
    fromEl.value = toEl.value;
    toEl.value = fromValue;

    if (!fromEl.value && fromEl.options.length) fromEl.selectedIndex = 0;
    if (!toEl.value && toEl.options.length) toEl.selectedIndex = 0;

    setStatus('Swapped time zones.', 'ok');
    convert();
  }

  function init() {
    const zones = getAllTimeZones();
    const zoneSet = new Set(zones);

    const ordered = [
      ...COMMON_TZ.filter((zone) => zoneSet.has(zone)),
      ...zones.filter((zone) => !COMMON_TZ.includes(zone))
    ];

    fillSelect(fromEl, ordered);
    fillSelect(toEl, ordered);

    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    fromEl.value = ordered.includes(localTz) ? localTz : 'UTC';

    let target = fromEl.value === 'America/Phoenix' ? 'UTC' : 'America/Phoenix';
    if (!ordered.includes(target)) {
      target = ordered.includes('UTC') ? 'UTC' : (ordered[0] || 'UTC');
    }
    toEl.value = target;

    if (!fromEl.value && fromEl.options.length) fromEl.selectedIndex = 0;
    if (!toEl.value && toEl.options.length) toEl.selectedIndex = 0;

    setNow();
    updateNowLabels();
  }

  convertBtn?.addEventListener('click', convert);
  swapBtn?.addEventListener('click', swapZones);
  nowBtn?.addEventListener('click', setNow);
  copyBtn?.addEventListener('click', copyResult);

  fromEl.addEventListener('change', () => {
    updateNowLabels();
    convert();
  });

  toEl.addEventListener('change', () => {
    updateNowLabels();
    convert();
  });

  dateEl.addEventListener('change', convert);
  timeEl.addEventListener('change', convert);

  init();
});
