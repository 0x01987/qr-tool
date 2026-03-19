document.addEventListener('DOMContentLoaded', () => {
  const LS_KEY = 'instantqr_world_clock_v4';
  const LS_FMT = 'instantqr_world_clock_fmt_v3';
  const LS_THEME = 'instantqr_world_clock_theme_v2';

  const $ = (id) => document.getElementById(id);

  const searchEl = $('citySearch');
  const listEl = $('suggestList');
  const gridEl = $('clockGrid');
  const timeFormatSel = $('timeFormat');
  const themeRow = $('themeRow');

  const shareBtn = $('shareBtn');
  const toggleGridBtn = $('toggleGridBtn');
  const resetBtn = $('resetBtn');

  const kpiFmt = $('kpiFmt');
  const kpiCount = $('kpiCount');
  const kpiTheme = $('kpiTheme');
  const runBadge = $('runBadge');
  const clockBadge = $('clockBadge');
  const statusText = $('statusText');

  const toastEl = $('toast');
  const yearEl = $('year');

  if (yearEl) yearEl.textContent = new Date().getFullYear();
  if (!searchEl || !gridEl || !timeFormatSel) return;

  let toastTimer = null;
  let maximizedCardId = null;
  let gridMaximized = false;
  let tickTimer = null;
  let suggestTimer = null;

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.style.display = 'none';
    }, 1600);
  }

  async function copyText(text) {
    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }
      showToast('Copied!');
      return true;
    } catch (_) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Copied!');
        return true;
      } catch {
        showToast('Copy failed');
        return false;
      }
    }
  }

  function safeJSONParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function uniq(values) {
    return Array.from(new Set(values));
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  function normalize(value) {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s\-\/_]/g, '')
      .trim();
  }

  function getAllTimeZones() {
    if (Intl && typeof Intl.supportedValuesOf === 'function') {
      const zones = Intl.supportedValuesOf('timeZone');
      if (!zones.includes('UTC')) zones.unshift('UTC');
      return zones;
    }
    return [
      'UTC',
      'America/Phoenix',
      'America/Los_Angeles',
      'America/Denver',
      'America/Chicago',
      'America/New_York',
      'America/Toronto',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Seoul',
      'Asia/Singapore',
      'Asia/Bangkok',
      'Asia/Phnom_Penh',
      'Australia/Sydney'
    ];
  }

  const TIMEZONES = getAllTimeZones();
  const TZ_SET = new Set(TIMEZONES);

  function tzToEntry(tz) {
    if (tz === 'UTC') {
      return { id: 'UTC', name: 'UTC', region: 'Coordinated Universal Time', tz: 'UTC' };
    }
    const parts = tz.split('/');
    const region = parts[0] || 'Other';
    const cityRaw = parts[parts.length - 1] || tz;
    const city = cityRaw.replace(/_/g, ' ');
    return { id: tz, name: city, region, tz };
  }

  function getEntryById(id) {
    if (!id || !TZ_SET.has(id)) return null;
    return tzToEntry(id);
  }

  const localTZ = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  })();

  const defaultSelected = uniq([
    localTZ,
    'UTC',
    'America/New_York',
    'Europe/London',
    'Asia/Tokyo',
    'Asia/Phnom_Penh'
  ].filter((tz) => TZ_SET.has(tz)));

  let timeFormat = localStorage.getItem(LS_FMT) || '12';
  let currentTheme = localStorage.getItem(LS_THEME) || 'blue';

  function sanitizeSelected(ids) {
    const cleaned = [];
    for (const id of (ids || [])) {
      if (typeof id !== 'string') continue;
      if (TZ_SET.has(id)) cleaned.push(id);
    }
    return uniq(cleaned).slice(0, 24);
  }

  function loadSelectedFromLS() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = safeJSONParse(raw, null);
    return Array.isArray(parsed) ? parsed : null;
  }

  function loadSelectedFromURL() {
    const url = new URL(location.href);
    const cities = url.searchParams.get('cities');
    const fmt = url.searchParams.get('fmt');

    if (fmt === '12' || fmt === '24') {
      timeFormat = fmt;
      localStorage.setItem(LS_FMT, timeFormat);
    }

    if (!cities) return null;
    const ids = cities
      .split(',')
      .map((s) => decodeURIComponent(s.trim()))
      .filter(Boolean);

    return ids.length ? ids : null;
  }

  let selectedIds = sanitizeSelected(loadSelectedFromURL() || loadSelectedFromLS() || defaultSelected);

  function saveSelected() {
    localStorage.setItem(LS_KEY, JSON.stringify(selectedIds));
  }

  function applyTheme(theme) {
    const validThemes = ['blue', 'green', 'red', 'white'];
    currentTheme = validThemes.includes(theme) ? theme : 'blue';

    document.body.classList.remove('theme-blue', 'theme-green', 'theme-red', 'theme-white');
    document.body.classList.add(`theme-${currentTheme}`);

    localStorage.setItem(LS_THEME, currentTheme);

    if (kpiTheme) {
      kpiTheme.textContent = currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1);
    }

    themeRow?.querySelectorAll('.themeBtn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    });
  }

  function applyGridState() {
    document.body.classList.toggle('grid-maximized', gridMaximized);
    if (toggleGridBtn) {
      toggleGridBtn.textContent = gridMaximized ? 'Restore All' : 'Maximize All';
    }
  }

  const INDEX = TIMEZONES.map((tz) => {
    const entry = tzToEntry(tz);
    const hay = normalize(`${entry.name} ${entry.region} ${entry.tz}`);
    return { id: entry.id, entry, hay };
  });

  function getSuggestions(query) {
    const nq = normalize(query);
    if (!nq) return [];

    const parts = nq.split(/\s+/).filter(Boolean);
    const scored = [];

    for (const item of INDEX) {
      let score = 0;

      if (normalize(item.entry.tz) === nq) score += 20;

      for (const part of parts) {
        if (item.hay.startsWith(part)) score += 6;
        else if (item.hay.includes(part)) score += 3;
      }

      if (score > 0) {
        if (selectedIds.includes(item.id)) score -= 2;
        scored.push({ entry: item.entry, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 12).map((x) => x.entry);
  }

  function renderSuggestions(items) {
    if (!listEl) return;

    if (!items.length) {
      listEl.style.display = 'none';
      listEl.innerHTML = '';
      return;
    }

    listEl.innerHTML = items.map((entry) => `
      <div class="suggestItem" role="option" data-id="${escapeHTML(entry.id)}">
        <div style="min-width:0">
          <b>${escapeHTML(entry.name)}</b>
          <div><span>${escapeHTML(entry.region)}</span></div>
        </div>
        <span class="mono">${escapeHTML(entry.tz)}</span>
      </div>
    `).join('');

    listEl.style.display = 'block';
  }

  function hideSuggestions() {
    if (!listEl) return;
    listEl.style.display = 'none';
  }

  function scheduleSuggestions() {
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(() => {
      renderSuggestions(getSuggestions(searchEl.value));
    }, 60);
  }

  searchEl.addEventListener('input', scheduleSuggestions);
  searchEl.addEventListener('focus', scheduleSuggestions);

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.suggest')) hideSuggestions();
  });

  listEl?.addEventListener('click', (event) => {
    const item = event.target.closest('.suggestItem');
    if (!item) return;
    addTZ(item.getAttribute('data-id'));
  });

  searchEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const items = getSuggestions(searchEl.value);
      if (items.length) addTZ(items[0].id);
      else showToast('No match');
    }
    if (event.key === 'Escape') {
      hideSuggestions();
    }
  });

  themeRow?.addEventListener('click', (event) => {
    const btn = event.target.closest('.themeBtn');
    if (!btn) return;
    applyTheme(btn.dataset.theme);
    renderGrid();
    showToast('Theme updated');
  });

  toggleGridBtn?.addEventListener('click', () => {
    gridMaximized = !gridMaximized;
    applyGridState();
    showToast(gridMaximized ? 'All clocks maximized' : 'Grid restored');
  });

  const formatterCache = new Map();

  function getFormatters(tz) {
    const key = `${tz}|${timeFormat}`;
    if (formatterCache.has(key)) return formatterCache.get(key);

    const hour12 = timeFormat !== '24';

    const formatters = {
      time: new Intl.DateTimeFormat(undefined, {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12
      }),
      date: new Intl.DateTimeFormat(undefined, {
        timeZone: tz,
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      }),
      hourOnly: new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit',
        hour12: false
      })
    };

    formatterCache.set(key, formatters);
    return formatters;
  }

  function updateKpis() {
    if (kpiFmt) kpiFmt.textContent = timeFormat === '24' ? '24-hour' : '12-hour';
    if (kpiCount) kpiCount.textContent = String(selectedIds.length);
    if (kpiTheme) kpiTheme.textContent = currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1);
    if (runBadge) runBadge.textContent = 'Live';
  }

  timeFormatSel.value = timeFormat === '24' ? '24' : '12';

  timeFormatSel.addEventListener('change', () => {
    timeFormat = timeFormatSel.value === '24' ? '24' : '12';
    localStorage.setItem(LS_FMT, timeFormat);
    formatterCache.clear();
    updateKpis();
    renderGrid();
    showToast('Updated');
  });

  function getBusinessStatus(now, tz) {
    const hour = parseInt(getFormatters(tz).hourOnly.format(now), 10);

    if (!Number.isFinite(hour)) return { cls: 'warn', label: 'Time unavailable' };
    if (hour >= 9 && hour < 17) return { cls: 'good', label: 'Business hours' };
    if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) return { cls: 'warn', label: 'Edge hours' };
    return { cls: 'bad', label: 'Off hours' };
  }

  function renderGrid() {
    const now = new Date();

    const html = selectedIds.map((id) => {
      const entry = getEntryById(id);
      if (!entry) return '';

      const formatters = getFormatters(entry.tz);
      const timeStr = formatters.time.format(now);
      const dateStr = formatters.date.format(now);
      const businessStatus = getBusinessStatus(now, entry.tz);
      const isMax = maximizedCardId === entry.id;

      return `
        <article class="clockCard ${isMax ? 'maximized' : ''}" data-id="${escapeHTML(entry.id)}">
          <div class="topline">
            <div class="city">
              <b title="${escapeHTML(entry.name)}">${escapeHTML(entry.name)}</b>
              <small title="${escapeHTML(entry.region)}">${escapeHTML(entry.region)} · <span class="mono">${escapeHTML(entry.tz)}</span></small>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="cta ghost" data-action="maximize" type="button" aria-label="${isMax ? 'Restore' : 'Maximize'} ${escapeHTML(entry.name)}">${isMax ? 'Restore' : 'Maximize'}</button>
              <button class="cta ghost" data-action="remove" type="button" aria-label="Remove ${escapeHTML(entry.name)}">Remove</button>
            </div>
          </div>

          <div class="chipRow">
            <span class="chip">
              <span class="dot ${businessStatus.cls}"></span>
              ${escapeHTML(businessStatus.label)}
            </span>
          </div>

          <div class="time mono" data-field="time">${escapeHTML(timeStr)}</div>
          <div class="date" data-field="date">${escapeHTML(dateStr)}</div>

          <div class="btnRow">
            <button class="cta ghost" data-action="copy" type="button">Copy</button>
            <button class="cta ghost" data-action="open" type="button">Open</button>
          </div>
        </article>
      `;
    }).join('');

    gridEl.innerHTML = html || `<div class="note-box">No clocks selected. Add a city or time zone above.</div>`;

    if (clockBadge) {
      clockBadge.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
    }

    updateKpis();

    if (statusText) {
      statusText.innerHTML = selectedIds.length
        ? `Showing <strong>${selectedIds.length}</strong> saved clock${selectedIds.length === 1 ? '' : 's'}. Use Share to copy a link with your selected time zones.`
        : 'No clocks selected yet. Search for a city or time zone above to get started.';
    }
  }

  function tick() {
    const now = new Date();

    for (const id of selectedIds) {
      const entry = getEntryById(id);
      if (!entry) continue;

      const card = gridEl.querySelector(`.clockCard[data-id="${CSS.escape(entry.id)}"]`);
      if (!card) continue;

      const formatters = getFormatters(entry.tz);
      const timeEl = card.querySelector('[data-field="time"]');
      const dateEl = card.querySelector('[data-field="date"]');

      if (timeEl) timeEl.textContent = formatters.time.format(now);
      if (dateEl) dateEl.textContent = formatters.date.format(now);

      const businessStatus = getBusinessStatus(now, entry.tz);
      const chip = card.querySelector('.chip');
      if (chip) {
        chip.innerHTML = `<span class="dot ${businessStatus.cls}"></span> ${escapeHTML(businessStatus.label)}`;
      }
    }

    if (clockBadge) {
      clockBadge.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
    }
  }

  gridEl.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    const card = event.target.closest('.clockCard');
    if (!card) return;

    const id = card.getAttribute('data-id');
    const entry = getEntryById(id);
    if (!entry) return;

    if (action === 'maximize') {
      maximizedCardId = maximizedCardId === id ? null : id;
      renderGrid();
      showToast(maximizedCardId ? 'Clock maximized' : 'Clock restored');
      return;
    }

    if (action === 'remove') {
      selectedIds = selectedIds.filter((value) => value !== id);
      if (maximizedCardId === id) maximizedCardId = null;
      saveSelected();
      renderGrid();
      showToast('Removed');
      return;
    }

    if (action === 'copy') {
      const now = new Date();
      const formatters = getFormatters(entry.tz);
      const text = `${entry.name} — ${formatters.time.format(now)} (${formatters.date.format(now)}) · ${entry.tz}`;
      copyText(text);
      return;
    }

    if (action === 'open') {
      window.open('/tools/time-zone-converter.html', '_blank', 'noopener');
    }
  });

  function addTZ(id) {
    if (!TZ_SET.has(id)) {
      showToast('Unknown time zone');
      return;
    }

    if (selectedIds.includes(id)) {
      showToast('Already added');
      return;
    }

    selectedIds.push(id);
    selectedIds = sanitizeSelected(selectedIds);
    saveSelected();
    renderGrid();

    searchEl.value = '';
    hideSuggestions();
    searchEl.focus();
    showToast('Added');
  }

  function buildShareURL() {
    const base = `${location.origin}${location.pathname}`;
    const ids = sanitizeSelected(selectedIds);
    const fmt = timeFormat === '24' ? '24' : '12';

    const params = new URLSearchParams();
    params.set('cities', ids.map(encodeURIComponent).join(','));
    params.set('fmt', fmt);

    return `${base}?${params.toString()}`;
  }

  shareBtn?.addEventListener('click', async () => {
    const ok = await copyText(buildShareURL());
    if (statusText) {
      statusText.innerHTML = ok
        ? 'Copied a share link with your selected clocks.'
        : 'Could not copy the share link.';
    }
  });

  resetBtn?.addEventListener('click', () => {
    selectedIds = [...defaultSelected];
    timeFormat = '12';
    maximizedCardId = null;
    gridMaximized = false;

    localStorage.setItem(LS_FMT, timeFormat);
    timeFormatSel.value = '12';

    formatterCache.clear();
    saveSelected();
    applyGridState();

    try {
      history.replaceState({}, '', location.pathname);
    } catch (_) {}

    renderGrid();
    showToast('Reset');
  });

  function startTicking() {
    stopTicking();
    tickTimer = setInterval(tick, 1000);
  }

  function stopTicking() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopTicking();
    } else {
      tick();
      startTicking();
    }
  });

  saveSelected();
  applyTheme(currentTheme);
  applyGridState();
  renderGrid();
  tick();
  startTicking();
});
