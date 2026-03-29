(function () {
  'use strict';

  const STORAGE_KEY = 'instantqr_world_clock_v2';

  const DEFAULT_CLOCKS = [
    'America/Phoenix',
    'America/New_York',
    'Europe/London',
    'Asia/Tokyo',
    'Asia/Phnom_Penh'
  ];

  const TIMEZONE_COORDS = {
    'America/Phoenix': { label: 'Phoenix', country: 'United States', lat: 33.4484, lon: -112.0740 },
    'America/New_York': { label: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060 },
    'America/Chicago': { label: 'Chicago', country: 'United States', lat: 41.8781, lon: -87.6298 },
    'America/Denver': { label: 'Denver', country: 'United States', lat: 39.7392, lon: -104.9903 },
    'America/Los_Angeles': { label: 'Los Angeles', country: 'United States', lat: 34.0522, lon: -118.2437 },
    'America/Toronto': { label: 'Toronto', country: 'Canada', lat: 43.6532, lon: -79.3832 },
    'America/Vancouver': { label: 'Vancouver', country: 'Canada', lat: 49.2827, lon: -123.1207 },
    'America/Mexico_City': { label: 'Mexico City', country: 'Mexico', lat: 19.4326, lon: -99.1332 },
    'America/Sao_Paulo': { label: 'São Paulo', country: 'Brazil', lat: -23.5505, lon: -46.6333 },
    'America/Bogota': { label: 'Bogotá', country: 'Colombia', lat: 4.7110, lon: -74.0721 },
    'America/Lima': { label: 'Lima', country: 'Peru', lat: -12.0464, lon: -77.0428 },
    'America/Anchorage': { label: 'Anchorage', country: 'United States', lat: 61.2181, lon: -149.9003 },
    'Pacific/Honolulu': { label: 'Honolulu', country: 'United States', lat: 21.3069, lon: -157.8583 },

    'Europe/London': { label: 'London', country: 'United Kingdom', lat: 51.5072, lon: -0.1276 },
    'Europe/Paris': { label: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
    'Europe/Berlin': { label: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050 },
    'Europe/Amsterdam': { label: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lon: 4.9041 },
    'Europe/Madrid': { label: 'Madrid', country: 'Spain', lat: 40.4168, lon: -3.7038 },
    'Europe/Rome': { label: 'Rome', country: 'Italy', lat: 41.9028, lon: 12.4964 },
    'Europe/Athens': { label: 'Athens', country: 'Greece', lat: 37.9838, lon: 23.7275 },
    'Europe/Istanbul': { label: 'Istanbul', country: 'Turkey', lat: 41.0082, lon: 28.9784 },
    'Europe/Moscow': { label: 'Moscow', country: 'Russia', lat: 55.7558, lon: 37.6173 },
    'Europe/Kiev': { label: 'Kyiv', country: 'Ukraine', lat: 50.4501, lon: 30.5234 },

    'Africa/Cairo': { label: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357 },
    'Africa/Johannesburg': { label: 'Johannesburg', country: 'South Africa', lat: -26.2041, lon: 28.0473 },
    'Africa/Nairobi': { label: 'Nairobi', country: 'Kenya', lat: -1.2864, lon: 36.8172 },
    'Africa/Lagos': { label: 'Lagos', country: 'Nigeria', lat: 6.5244, lon: 3.3792 },
    'Africa/Casablanca': { label: 'Casablanca', country: 'Morocco', lat: 33.5731, lon: -7.5898 },

    'Asia/Tokyo': { label: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 },
    'Asia/Seoul': { label: 'Seoul', country: 'South Korea', lat: 37.5665, lon: 126.9780 },
    'Asia/Shanghai': { label: 'Shanghai', country: 'China', lat: 31.2304, lon: 121.4737 },
    'Asia/Hong_Kong': { label: 'Hong Kong', country: 'Hong Kong', lat: 22.3193, lon: 114.1694 },
    'Asia/Singapore': { label: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198 },
    'Asia/Bangkok': { label: 'Bangkok', country: 'Thailand', lat: 13.7563, lon: 100.5018 },
    'Asia/Phnom_Penh': { label: 'Phnom Penh', country: 'Cambodia', lat: 11.5564, lon: 104.9282 },
    'Asia/Ho_Chi_Minh': { label: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.8231, lon: 106.6297 },
    'Asia/Jakarta': { label: 'Jakarta', country: 'Indonesia', lat: -6.2088, lon: 106.8456 },
    'Asia/Kuala_Lumpur': { label: 'Kuala Lumpur', country: 'Malaysia', lat: 3.1390, lon: 101.6869 },
    'Asia/Manila': { label: 'Manila', country: 'Philippines', lat: 14.5995, lon: 120.9842 },
    'Asia/Dubai': { label: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lon: 55.2708 },
    'Asia/Kolkata': { label: 'Mumbai / India', country: 'India', lat: 19.0760, lon: 72.8777 },
    'Asia/Kathmandu': { label: 'Kathmandu', country: 'Nepal', lat: 27.7172, lon: 85.3240 },

    'Australia/Sydney': { label: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093 },
    'Australia/Melbourne': { label: 'Melbourne', country: 'Australia', lat: -37.8136, lon: 144.9631 },
    'Australia/Perth': { label: 'Perth', country: 'Australia', lat: -31.9505, lon: 115.8605 },
    'Pacific/Auckland': { label: 'Auckland', country: 'New Zealand', lat: -36.8509, lon: 174.7645 }
  };

  const PREFERRED_TIMEZONES = Object.keys(TIMEZONE_COORDS);

  const el = {
    citySearch: document.getElementById('citySearch'),
    suggestList: document.getElementById('suggestList'),
    timeFormat: document.getElementById('timeFormat'),
    shareBtn: document.getElementById('shareBtn'),
    toggleGridBtn: document.getElementById('toggleGridBtn'),
    resetBtn: document.getElementById('resetBtn'),
    themeRow: document.getElementById('themeRow'),
    kpiFmt: document.getElementById('kpiFmt'),
    kpiCount: document.getElementById('kpiCount'),
    kpiTheme: document.getElementById('kpiTheme'),
    statusText: document.getElementById('statusText'),
    clockGrid: document.getElementById('clockGrid'),
    clockBadge: document.getElementById('clockBadge'),
    runBadge: document.getElementById('runBadge'),
    toast: document.getElementById('toast'),
    mapClockCount: document.getElementById('mapClockCount'),
    mapStatusText: document.getElementById('mapStatusText')
  };

  const state = {
    clocks: [],
    format: '12',
    theme: 'blue',
    gridMaximized: false,
    maximizedClock: null,
    activeSuggestionIndex: -1,
    suggestions: []
  };

  let supportedTimezones = [];
  let map = null;
  let markerLayer = null;

  function safeSupportedTimezones() {
    try {
      if (typeof Intl.supportedValuesOf === 'function') {
        return Intl.supportedValuesOf('timeZone');
      }
    } catch (err) {}
    return [
      ...new Set([...PREFERRED_TIMEZONES, ...DEFAULT_CLOCKS])
    ];
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state.clocks = [...DEFAULT_CLOCKS];
        return;
      }
      const parsed = JSON.parse(raw);
      state.clocks = Array.isArray(parsed.clocks) && parsed.clocks.length ? parsed.clocks : [...DEFAULT_CLOCKS];
      state.format = parsed.format === '24' ? '24' : '12';
      state.theme = ['blue', 'green', 'red', 'white'].includes(parsed.theme) ? parsed.theme : 'blue';
      state.gridMaximized = !!parsed.gridMaximized;
      state.maximizedClock = typeof parsed.maximizedClock === 'string' ? parsed.maximizedClock : null;
    } catch (err) {
      state.clocks = [...DEFAULT_CLOCKS];
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      clocks: state.clocks,
      format: state.format,
      theme: state.theme,
      gridMaximized: state.gridMaximized,
      maximizedClock: state.maximizedClock
    }));
  }

  function showToast(message) {
    if (!el.toast) return;
    el.toast.textContent = message;
    el.toast.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      el.toast.classList.remove('show');
    }, 1800);
  }

  function toLabel(timezone) {
    const meta = TIMEZONE_COORDS[timezone];
    if (meta?.label) return meta.label;
    const last = timezone.split('/').pop() || timezone;
    return last.replace(/_/g, ' ');
  }

  function toRegion(timezone) {
    const meta = TIMEZONE_COORDS[timezone];
    if (meta?.country) return meta.country;
    const first = timezone.split('/')[0] || 'Region';
    return first.replace(/_/g, ' ');
  }

  function formatOffset(timezone, date = new Date()) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'shortOffset'
      }).formatToParts(date);
      const tzName = parts.find((p) => p.type === 'timeZoneName')?.value || 'UTC';
      return tzName.replace('GMT', 'UTC');
    } catch (err) {
      return 'UTC';
    }
  }

  function getTimeParts(timezone) {
    const now = new Date();

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: state.format === '12'
    });

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const hourFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false
    });

    const time = timeFormatter.format(now);
    const dateText = dateFormatter.format(now);
    const hourNum = Number(hourFormatter.format(now));
    const isBusiness = hourNum >= 9 && hourNum < 17;
    const isEarly = hourNum >= 6 && hourNum < 9;
    const phase = isBusiness ? 'Business hours' : isEarly ? 'Morning' : (hourNum >= 17 && hourNum < 22 ? 'Evening' : 'Night');

    return {
      time,
      dateText,
      hourNum,
      isBusiness,
      phase,
      offset: formatOffset(timezone, now)
    };
  }

  function setTheme(theme) {
    state.theme = theme;
    document.body.classList.remove('theme-blue', 'theme-green', 'theme-red', 'theme-white');
    document.body.classList.add(`theme-${theme}`);

    const buttons = [...el.themeRow.querySelectorAll('.themeBtn')];
    buttons.forEach((btn) => btn.classList.toggle('active', btn.dataset.theme === theme));

    el.kpiTheme.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
    saveState();
  }

  function updateFormatUI() {
    el.timeFormat.value = state.format;
    el.kpiFmt.textContent = state.format === '24' ? '24-hour' : '12-hour';
  }

  function updateGridStateUI() {
    document.body.classList.toggle('grid-maximized', state.gridMaximized);
    el.toggleGridBtn.textContent = state.gridMaximized ? 'Restore Grid' : 'Maximize All';
  }

  function ensureUniqueClock(timezone) {
    if (!state.clocks.includes(timezone)) {
      state.clocks.push(timezone);
      return true;
    }
    return false;
  }

  function removeClock(timezone) {
    state.clocks = state.clocks.filter((tz) => tz !== timezone);
    if (state.maximizedClock === timezone) {
      state.maximizedClock = null;
    }
    if (!state.clocks.length) {
      state.clocks = [...DEFAULT_CLOCKS];
      showToast('Reset to default clocks');
    }
    saveState();
    renderAll();
  }

  function addClock(timezone) {
    if (!supportedTimezones.includes(timezone)) return;
    const added = ensureUniqueClock(timezone);
    saveState();
    renderAll();
    if (added) {
      showToast(`${toLabel(timezone)} added`);
      el.statusText.textContent = `${toLabel(timezone)} added to your world clock list.`;
    } else {
      showToast(`${toLabel(timezone)} already added`);
    }
    clearSuggestions();
    el.citySearch.value = '';
  }

  function copyClockText(timezone) {
    const parts = getTimeParts(timezone);
    const text = `${toLabel(timezone)} (${timezone}) — ${parts.time} — ${parts.dateText} — ${parts.offset}`;
    navigator.clipboard.writeText(text).then(() => {
      showToast('Clock copied');
    }).catch(() => {
      showToast('Unable to copy');
    });
  }

  function shareClocks() {
    const payload = state.clocks.map((tz) => {
      const parts = getTimeParts(tz);
      return `${toLabel(tz)} — ${parts.time} — ${parts.dateText} (${parts.offset})`;
    }).join('\n');

    if (navigator.share) {
      navigator.share({
        title: 'World Clock',
        text: payload
      }).catch(() => {});
      return;
    }

    navigator.clipboard.writeText(payload).then(() => {
      showToast('Clock list copied');
    }).catch(() => {
      showToast('Unable to share');
    });
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function focusClockCard(timezone) {
    const cards = [...document.querySelectorAll('.clockCard')];
    cards.forEach((card) => {
      card.classList.toggle('map-highlight', card.dataset.tz === timezone);
    });

    const target = cards.find((card) => card.dataset.tz === timezone);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function toggleMaximizeClock(timezone) {
    state.maximizedClock = state.maximizedClock === timezone ? null : timezone;
    saveState();
    renderClocks();
  }

  function renderClocks() {
    el.clockGrid.innerHTML = state.clocks.map((timezone) => {
      const parts = getTimeParts(timezone);
      const label = toLabel(timezone);
      const region = toRegion(timezone);
      const businessClass = parts.isBusiness ? 'good' : (parts.hourNum >= 6 && parts.hourNum < 9 ? 'warn' : 'bad');
      const maximized = state.maximizedClock === timezone;

      return `
        <article class="clockCard ${maximized ? 'maximized' : ''}" data-tz="${escapeHtml(timezone)}">
          <div class="topline">
            <div class="city">
              <b>${escapeHtml(label)}</b>
              <small>${escapeHtml(timezone)} · ${escapeHtml(region)}</small>
            </div>
            <div class="badge-soft">${escapeHtml(parts.offset)}</div>
          </div>

          <div class="chipRow">
            <span class="chip"><span class="dot ${businessClass}"></span>${escapeHtml(parts.phase)}</span>
            <span class="chip">${parts.isBusiness ? 'Open now' : 'Off hours'}</span>
          </div>

          <div class="time mono">${escapeHtml(parts.time)}</div>
          <div class="date">${escapeHtml(parts.dateText)}</div>

          <div class="btnRow">
            <button class="cta ghost copyClockBtn" type="button" data-tz="${escapeHtml(timezone)}">Copy</button>
            <button class="cta ghost mapFocusBtn" type="button" data-tz="${escapeHtml(timezone)}">Map</button>
            <button class="cta ghost maxClockBtn" type="button" data-tz="${escapeHtml(timezone)}">${maximized ? 'Restore' : 'Maximize'}</button>
            <button class="cta ghost removeClockBtn" type="button" data-tz="${escapeHtml(timezone)}">Remove</button>
          </div>
        </article>
      `;
    }).join('');

    el.kpiCount.textContent = String(state.clocks.length);
    el.clockBadge.textContent = `Updating ${state.clocks.length} ${state.clocks.length === 1 ? 'clock' : 'clocks'}`;

    [...document.querySelectorAll('.copyClockBtn')].forEach((btn) => {
      btn.addEventListener('click', () => copyClockText(btn.dataset.tz));
    });

    [...document.querySelectorAll('.removeClockBtn')].forEach((btn) => {
      btn.addEventListener('click', () => removeClock(btn.dataset.tz));
    });

    [...document.querySelectorAll('.maxClockBtn')].forEach((btn) => {
      btn.addEventListener('click', () => toggleMaximizeClock(btn.dataset.tz));
    });

    [...document.querySelectorAll('.mapFocusBtn')].forEach((btn) => {
      btn.addEventListener('click', () => {
        focusMapMarker(btn.dataset.tz);
        focusClockCard(btn.dataset.tz);
      });
    });
  }

  function renderSuggestions(items) {
    state.suggestions = items;
    state.activeSuggestionIndex = -1;

    if (!items.length) {
      clearSuggestions();
      return;
    }

    el.suggestList.innerHTML = items.map((timezone, index) => `
      <div class="suggestItem" role="option" data-index="${index}" data-tz="${escapeHtml(timezone)}">
        <div>
          <b>${escapeHtml(toLabel(timezone))}</b>
          <span>${escapeHtml(timezone)}</span>
        </div>
        <span>${escapeHtml(toRegion(timezone))}</span>
      </div>
    `).join('');

    el.suggestList.style.display = 'block';

    [...el.suggestList.querySelectorAll('.suggestItem')].forEach((item) => {
      item.addEventListener('click', () => {
        addClock(item.dataset.tz);
      });
    });
  }

  function clearSuggestions() {
    state.suggestions = [];
    state.activeSuggestionIndex = -1;
    el.suggestList.innerHTML = '';
    el.suggestList.style.display = 'none';
  }

  function searchTimezones(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      clearSuggestions();
      return;
    }

    const preferred = supportedTimezones
      .filter((tz) => {
        const label = toLabel(tz).toLowerCase();
        const region = toRegion(tz).toLowerCase();
        return tz.toLowerCase().includes(q) || label.includes(q) || region.includes(q);
      })
      .sort((a, b) => {
        const aExact = toLabel(a).toLowerCase() === q || a.toLowerCase() === q;
        const bExact = toLabel(b).toLowerCase() === q || b.toLowerCase() === q;
        if (aExact !== bExact) return aExact ? -1 : 1;

        const aStarts = toLabel(a).toLowerCase().startsWith(q) || a.toLowerCase().startsWith(q);
        const bStarts = toLabel(b).toLowerCase().startsWith(q) || b.toLowerCase().startsWith(q);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;

        const aPreferred = PREFERRED_TIMEZONES.includes(a);
        const bPreferred = PREFERRED_TIMEZONES.includes(b);
        if (aPreferred !== bPreferred) return aPreferred ? -1 : 1;

        return a.localeCompare(b);
      })
      .slice(0, 10);

    renderSuggestions(preferred);
  }

  function moveSuggestion(delta) {
    if (!state.suggestions.length) return;
    state.activeSuggestionIndex += delta;

    if (state.activeSuggestionIndex < 0) {
      state.activeSuggestionIndex = state.suggestions.length - 1;
    } else if (state.activeSuggestionIndex >= state.suggestions.length) {
      state.activeSuggestionIndex = 0;
    }

    [...el.suggestList.querySelectorAll('.suggestItem')].forEach((node, index) => {
      node.classList.toggle('active', index === state.activeSuggestionIndex);
    });
  }

  function chooseActiveSuggestion() {
    if (state.activeSuggestionIndex < 0 || !state.suggestions[state.activeSuggestionIndex]) return false;
    addClock(state.suggestions[state.activeSuggestionIndex]);
    return true;
  }

  function initMap() {
    if (map || typeof L === 'undefined') return;

    map = L.map('worldMap', {
      worldCopyJump: true,
      minZoom: 2,
      maxZoom: 6
    }).setView([18, 10], 2);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    markerLayer = L.layerGroup().addTo(map);

    setTimeout(() => {
      map.invalidateSize();
    }, 180);
  }

  function buildPopupHtml(timezone) {
    const parts = getTimeParts(timezone);
    return `
      <div style="min-width:180px;">
        <strong>${escapeHtml(toLabel(timezone))}</strong><br>
        <span style="color:#94a3b8;">${escapeHtml(timezone)}</span><br><br>
        <div><strong>${escapeHtml(parts.time)}</strong></div>
        <div>${escapeHtml(parts.dateText)}</div>
        <div>${escapeHtml(parts.offset)}</div>
      </div>
    `;
  }

  function getMapPoint(timezone) {
    if (TIMEZONE_COORDS[timezone]) return TIMEZONE_COORDS[timezone];

    const region = timezone.split('/')[0];
    const fallback = {
      America: { label: toLabel(timezone), country: 'Americas', lat: 25, lon: -85 },
      Europe: { label: toLabel(timezone), country: 'Europe', lat: 50, lon: 10 },
      Africa: { label: toLabel(timezone), country: 'Africa', lat: 5, lon: 20 },
      Asia: { label: toLabel(timezone), country: 'Asia', lat: 25, lon: 95 },
      Australia: { label: toLabel(timezone), country: 'Australia', lat: -25, lon: 135 },
      Pacific: { label: toLabel(timezone), country: 'Pacific', lat: -15, lon: 175 },
      Indian: { label: toLabel(timezone), country: 'Indian Ocean', lat: -10, lon: 75 },
      Atlantic: { label: toLabel(timezone), country: 'Atlantic', lat: 15, lon: -30 }
    };

    return fallback[region] || { label: toLabel(timezone), country: toRegion(timezone), lat: 20, lon: 0 };
  }

  function renderMap() {
    initMap();
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();

    const bounds = [];

    state.clocks.forEach((timezone) => {
      const point = getMapPoint(timezone);
      const marker = L.marker([point.lat, point.lon]);
      marker.bindPopup(buildPopupHtml(timezone));

      marker.on('click', () => {
        focusClockCard(timezone);
      });

      markerLayer.addLayer(marker);
      bounds.push([point.lat, point.lon]);
    });

    el.mapClockCount.textContent = `${state.clocks.length} ${state.clocks.length === 1 ? 'marker' : 'markers'}`;

    if (!state.clocks.length) {
      el.mapStatusText.textContent = 'Add clocks to show them on the map. Click a marker to view the city, current time, and UTC offset.';
      map.setView([18, 10], 2);
      return;
    }

    el.mapStatusText.textContent = 'Map updated with your selected clocks. Click any marker to see the live local time and UTC offset.';

    if (bounds.length === 1) {
      map.setView(bounds[0], 4);
    } else {
      map.fitBounds(bounds, { padding: [35, 35] });
    }
  }

  function focusMapMarker(timezone) {
    initMap();
    if (!map) return;

    const point = getMapPoint(timezone);
    map.setView([point.lat, point.lon], 4);

    markerLayer.eachLayer((layer) => {
      const popup = layer.getPopup?.();
      if (!popup) return;
      const content = popup.getContent();
      if (String(content).includes(timezone) || String(content).includes(toLabel(timezone))) {
        layer.openPopup();
      }
    });
  }

  function renderAll() {
    updateFormatUI();
    updateGridStateUI();
    renderClocks();
    renderMap();
    el.runBadge.textContent = 'Live';
    el.statusText.textContent = `Showing ${state.clocks.length} ${state.clocks.length === 1 ? 'clock' : 'clocks'} in ${state.format === '24' ? '24-hour' : '12-hour'} format. Theme: ${state.theme}.`;
  }

  function attachEvents() {
    el.citySearch.addEventListener('input', (e) => {
      searchTimezones(e.target.value);
    });

    el.citySearch.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSuggestion(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSuggestion(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!chooseActiveSuggestion()) {
          const exact = supportedTimezones.find((tz) => tz.toLowerCase() === el.citySearch.value.trim().toLowerCase());
          if (exact) addClock(exact);
        }
      } else if (e.key === 'Escape') {
        clearSuggestions();
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.suggest')) {
        clearSuggestions();
      }
    });

    el.timeFormat.addEventListener('change', () => {
      state.format = el.timeFormat.value === '24' ? '24' : '12';
      saveState();
      renderAll();
    });

    el.shareBtn.addEventListener('click', shareClocks);

    el.toggleGridBtn.addEventListener('click', () => {
      state.gridMaximized = !state.gridMaximized;
      saveState();
      updateGridStateUI();
      showToast(state.gridMaximized ? 'Grid maximized' : 'Grid restored');
      setTimeout(() => map && map.invalidateSize(), 180);
    });

    el.resetBtn.addEventListener('click', () => {
      state.clocks = [...DEFAULT_CLOCKS];
      state.format = '12';
      state.theme = 'blue';
      state.gridMaximized = false;
      state.maximizedClock = null;
      saveState();
      setTheme('blue');
      renderAll();
      showToast('World clock reset');
    });

    [...el.themeRow.querySelectorAll('.themeBtn')].forEach((btn) => {
      btn.addEventListener('click', () => {
        setTheme(btn.dataset.theme);
        renderAll();
      });
    });

    window.addEventListener('resize', () => {
      if (map) {
        setTimeout(() => map.invalidateSize(), 160);
      }
    });
  }

  function tick() {
    renderClocks();
    renderMap();
    el.clockBadge.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  }

  function init() {
    supportedTimezones = safeSupportedTimezones();
    loadState();
    setTheme(state.theme);
    attachEvents();
    renderAll();

    setTimeout(() => {
      initMap();
      renderMap();
    }, 200);

    setInterval(tick, 1000);
  }

  init();
})();
