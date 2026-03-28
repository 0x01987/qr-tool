(function () {
  'use strict';

  /*
    IMPORTANT:
    For production, proxy these requests through your own backend/serverless function
    instead of exposing the key in the browser.

    Example proxy idea:
    /api/aviationstack?path=/v1/flights&flight_iata=AA123
  */
  const API_KEY = 'YOUR_AVIATIONSTACK_KEY';
  const API_BASE = 'https://api.aviationstack.com/v1';

  const AIRPORTS = [
    { name: 'Phoenix Sky Harbor International Airport', city: 'Phoenix', country: 'United States', iata: 'PHX', icao: 'KPHX', timezone: 'America/Phoenix', lat: 33.4342, lon: -112.0116 },
    { name: 'Phoenix-Mesa Gateway Airport', city: 'Mesa', country: 'United States', iata: 'AZA', icao: 'KIWA', timezone: 'America/Phoenix', lat: 33.3078, lon: -111.6556 },
    { name: 'Tucson International Airport', city: 'Tucson', country: 'United States', iata: 'TUS', icao: 'KTUS', timezone: 'America/Phoenix', lat: 32.1161, lon: -110.9410 },
    { name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States', iata: 'LAX', icao: 'KLAX', timezone: 'America/Los_Angeles', lat: 33.9416, lon: -118.4085 },
    { name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States', iata: 'JFK', icao: 'KJFK', timezone: 'America/New_York', lat: 40.6413, lon: -73.7781 },
    { name: 'LaGuardia Airport', city: 'New York', country: 'United States', iata: 'LGA', icao: 'KLGA', timezone: 'America/New_York', lat: 40.7769, lon: -73.8740 },
    { name: 'Newark Liberty International Airport', city: 'Newark', country: 'United States', iata: 'EWR', icao: 'KEWR', timezone: 'America/New_York', lat: 40.6895, lon: -74.1745 },
    { name: 'Chicago O\'Hare International Airport', city: 'Chicago', country: 'United States', iata: 'ORD', icao: 'KORD', timezone: 'America/Chicago', lat: 41.9742, lon: -87.9073 },
    { name: 'Dallas/Fort Worth International Airport', city: 'Dallas-Fort Worth', country: 'United States', iata: 'DFW', icao: 'KDFW', timezone: 'America/Chicago', lat: 32.8998, lon: -97.0403 },
    { name: 'Denver International Airport', city: 'Denver', country: 'United States', iata: 'DEN', icao: 'KDEN', timezone: 'America/Denver', lat: 39.8561, lon: -104.6737 },
    { name: 'San Francisco International Airport', city: 'San Francisco', country: 'United States', iata: 'SFO', icao: 'KSFO', timezone: 'America/Los_Angeles', lat: 37.6213, lon: -122.3790 },
    { name: 'Seattle-Tacoma International Airport', city: 'Seattle', country: 'United States', iata: 'SEA', icao: 'KSEA', timezone: 'America/Los_Angeles', lat: 47.4502, lon: -122.3088 },
    { name: 'Harry Reid International Airport', city: 'Las Vegas', country: 'United States', iata: 'LAS', icao: 'KLAS', timezone: 'America/Los_Angeles', lat: 36.0840, lon: -115.1537 },
    { name: 'Hartsfield-Jackson Atlanta International Airport', city: 'Atlanta', country: 'United States', iata: 'ATL', icao: 'KATL', timezone: 'America/New_York', lat: 33.6407, lon: -84.4277 },
    { name: 'Miami International Airport', city: 'Miami', country: 'United States', iata: 'MIA', icao: 'KMIA', timezone: 'America/New_York', lat: 25.7959, lon: -80.2870 },
    { name: 'Orlando International Airport', city: 'Orlando', country: 'United States', iata: 'MCO', icao: 'KMCO', timezone: 'America/New_York', lat: 28.4312, lon: -81.3081 },
    { name: 'Boston Logan International Airport', city: 'Boston', country: 'United States', iata: 'BOS', icao: 'KBOS', timezone: 'America/New_York', lat: 42.3656, lon: -71.0096 },
    { name: 'Washington Dulles International Airport', city: 'Washington', country: 'United States', iata: 'IAD', icao: 'KIAD', timezone: 'America/New_York', lat: 38.9531, lon: -77.4565 },
    { name: 'Ronald Reagan Washington National Airport', city: 'Washington', country: 'United States', iata: 'DCA', icao: 'KDCA', timezone: 'America/New_York', lat: 38.8512, lon: -77.0402 },
    { name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom', iata: 'LHR', icao: 'EGLL', timezone: 'Europe/London', lat: 51.4700, lon: -0.4543 },
    { name: 'London Gatwick Airport', city: 'London', country: 'United Kingdom', iata: 'LGW', icao: 'EGKK', timezone: 'Europe/London', lat: 51.1537, lon: -0.1821 },
    { name: 'Paris Charles de Gaulle Airport', city: 'Paris', country: 'France', iata: 'CDG', icao: 'LFPG', timezone: 'Europe/Paris', lat: 49.0097, lon: 2.5479 },
    { name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands', iata: 'AMS', icao: 'EHAM', timezone: 'Europe/Amsterdam', lat: 52.3105, lon: 4.7683 },
    { name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', iata: 'FRA', icao: 'EDDF', timezone: 'Europe/Berlin', lat: 50.0379, lon: 8.5622 },
    { name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates', iata: 'DXB', icao: 'OMDB', timezone: 'Asia/Dubai', lat: 25.2532, lon: 55.3657 },
    { name: 'Tokyo Haneda Airport', city: 'Tokyo', country: 'Japan', iata: 'HND', icao: 'RJTT', timezone: 'Asia/Tokyo', lat: 35.5494, lon: 139.7798 },
    { name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', iata: 'NRT', icao: 'RJAA', timezone: 'Asia/Tokyo', lat: 35.7720, lon: 140.3929 },
    { name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', iata: 'SIN', icao: 'WSSS', timezone: 'Asia/Singapore', lat: 1.3644, lon: 103.9915 },
    { name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong', iata: 'HKG', icao: 'VHHH', timezone: 'Asia/Hong_Kong', lat: 22.3080, lon: 113.9185 },
    { name: 'Sydney Airport', city: 'Sydney', country: 'Australia', iata: 'SYD', icao: 'YSSY', timezone: 'Australia/Sydney', lat: -33.9399, lon: 151.1753 },
    { name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada', iata: 'YYZ', icao: 'CYYZ', timezone: 'America/Toronto', lat: 43.6777, lon: -79.6248 },
    { name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada', iata: 'YVR', icao: 'CYVR', timezone: 'America/Vancouver', lat: 49.1967, lon: -123.1815 },
    { name: 'Mexico City International Airport', city: 'Mexico City', country: 'Mexico', iata: 'MEX', icao: 'MMMX', timezone: 'America/Mexico_City', lat: 19.4361, lon: -99.0719 }
  ];

  const airportInput = document.getElementById('airportInput');
  const airportResultsEl = document.getElementById('airportResults');
  const airportSearchBtn = document.getElementById('airportSearchBtn');
  const airportClearBtn = document.getElementById('airportClearBtn');
  const airportPopularBtn = document.getElementById('airportPopularBtn');

  const flightNumberInput = document.getElementById('flightNumberInput');
  const scheduleAirportInput = document.getElementById('scheduleAirportInput');
  const scheduleTypeSelect = document.getElementById('scheduleTypeSelect');
  const flightStatusFilter = document.getElementById('flightStatusFilter');
  const flightResultsEl = document.getElementById('flightResults');
  const flightSearchBtn = document.getElementById('flightSearchBtn');
  const scheduleSearchBtn = document.getElementById('scheduleSearchBtn');
  const flightClearBtn = document.getElementById('flightClearBtn');

  const tabButtons = Array.from(document.querySelectorAll('.tabBtn'));
  const panels = Array.from(document.querySelectorAll('.panel'));

  let map;
  let mapMarker;
  let mapInitDone = false;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initMap() {
    if (mapInitDone || typeof L === 'undefined') return;

    map = L.map('flightMap').setView([20, 0], 2);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    mapInitDone = true;

    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }

  function showMapPosition(lat, lon, popupHtml) {
    initMap();

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    if (mapMarker) {
      map.removeLayer(mapMarker);
    }

    map.setView([lat, lon], 6);
    mapMarker = L.marker([lat, lon]).addTo(map);

    if (popupHtml) {
      mapMarker.bindPopup(popupHtml).openPopup();
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }

  function resetMap() {
    initMap();
    if (mapMarker) {
      map.removeLayer(mapMarker);
      mapMarker = null;
    }
    map.setView([20, 0], 2);
    setTimeout(() => map.invalidateSize(), 150);
  }

  function mapsLink(lat, lon) {
    return `https://www.google.com/maps?q=${encodeURIComponent(lat + ',' + lon)}`;
  }

  function scoreAirport(airport, query) {
    const q = query.trim().toLowerCase();
    if (!q) return 0;

    const fields = {
      iata: (airport.iata || '').toLowerCase(),
      icao: (airport.icao || '').toLowerCase(),
      name: (airport.name || '').toLowerCase(),
      city: (airport.city || '').toLowerCase(),
      country: (airport.country || '').toLowerCase()
    };

    let score = 0;

    if (fields.iata === q) score += 100;
    if (fields.icao === q) score += 95;
    if (fields.name === q) score += 90;
    if (fields.city === q) score += 70;

    if (fields.iata.startsWith(q)) score += 40;
    if (fields.icao.startsWith(q)) score += 35;
    if (fields.name.includes(q)) score += 30;
    if (fields.city.includes(q)) score += 25;
    if (fields.country.includes(q)) score += 10;

    return score;
  }

  function renderAirports(items, message) {
    if (!items.length) {
      airportResultsEl.innerHTML = `<div class="emptyState">${escapeHtml(message || 'No airports found.')}</div>`;
      return;
    }

    airportResultsEl.innerHTML = items.map((airport) => `
      <article class="resultItem">
        <div class="resultHead">
          <div>
            <div class="resultTitle">${escapeHtml(airport.name)}</div>
            <div class="resultSub">${escapeHtml(airport.city)}, ${escapeHtml(airport.country)}</div>
          </div>
          <div class="badgeRow">
            <span class="codeBadge">IATA: ${escapeHtml(airport.iata || '—')}</span>
            <span class="codeBadge">ICAO: ${escapeHtml(airport.icao || '—')}</span>
          </div>
        </div>

        <div class="kv">
          <div class="k">City</div>
          <div class="v">${escapeHtml(airport.city)}</div>

          <div class="k">Country</div>
          <div class="v">${escapeHtml(airport.country)}</div>

          <div class="k">Timezone</div>
          <div class="v">${escapeHtml(airport.timezone || '—')}</div>

          <div class="k">Coordinates</div>
          <div class="v">${escapeHtml(airport.lat)}, ${escapeHtml(airport.lon)}</div>

          <div class="k">Map</div>
          <div class="v"><a href="${mapsLink(airport.lat, airport.lon)}" target="_blank" rel="noopener">Open in Maps</a></div>
        </div>
      </article>
    `).join('');
  }

  function searchAirports() {
    const query = airportInput.value.trim();
    if (!query) {
      renderAirports([], 'Enter a city, airport name, IATA code, or ICAO code to search.');
      return;
    }

    const matches = AIRPORTS
      .map((airport) => ({ airport, score: scoreAirport(airport, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.airport.name.localeCompare(b.airport.name))
      .slice(0, 8)
      .map((entry) => entry.airport);

    renderAirports(matches, `No matches found for "${query}".`);
  }

  function showPopularAirports() {
    renderAirports(AIRPORTS.slice(0, 10), 'No airports available.');
  }

  function statusClass(status, delayMinutes) {
    const s = String(status || '').toLowerCase();
    if (s === 'active') return 'status-active';
    if (s === 'landed') return 'status-landed';
    if (s === 'cancelled') return 'status-cancelled';
    if (delayMinutes && Number(delayMinutes) > 0) return 'status-delayed';
    if (s === 'scheduled') return 'status-scheduled';
    return 'status-unknown';
  }

  function formatMaybeTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  function normalizeFlightArray(json) {
    if (!json) return [];
    if (Array.isArray(json.data)) return json.data;
    if (Array.isArray(json.results)) return json.results;
    return [];
  }

  async function apiGet(path, params) {
    const url = new URL(API_BASE + path);
    url.searchParams.set('access_key', API_KEY);

    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        url.searchParams.set(key, value);
      }
    });

    const res = await fetch(url.toString(), { method: 'GET' });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }

    if (json && json.error) {
      throw new Error(json.error.info || json.error.message || 'API error');
    }

    return json;
  }

  function renderFlights(items, emptyMessage) {
    if (!items.length) {
      flightResultsEl.innerHTML = `<div class="emptyState">${escapeHtml(emptyMessage || 'No flights found.')}</div>`;
      return;
    }

    flightResultsEl.innerHTML = items.map((flight, index) => {
      const airlineName = flight.airline?.name || flight.airline_name || 'Unknown airline';
      const flightIata = flight.flight?.iata || flight.flight_iata || flight.flight?.number || '—';
      const flightIcao = flight.flight?.icao || flight.flight_icao || '—';
      const status = (flight.flight_status || flight.status || 'unknown').toLowerCase();

      const dep = flight.departure || {};
      const arr = flight.arrival || {};
      const live = flight.live || {};

      const depAirport = dep.airport || dep.iata || dep.icao || '—';
      const arrAirport = arr.airport || arr.iata || arr.icao || '—';

      const delayMinutes = dep.delay || arr.delay || live.updated || 0;
      const liveLat = Number(live.latitude);
      const liveLon = Number(live.longitude);

      return `
        <article class="resultItem">
          <div class="resultHead">
            <div>
              <div class="resultTitle">${escapeHtml(airlineName)} — ${escapeHtml(flightIata)}</div>
              <div class="resultSub">${escapeHtml(depAirport)} → ${escapeHtml(arrAirport)}</div>
            </div>
            <div class="badgeRow">
              <span class="codeBadge">IATA: ${escapeHtml(flightIata)}</span>
              <span class="codeBadge">ICAO: ${escapeHtml(flightIcao)}</span>
              <span class="statusBadge ${statusClass(status, delayMinutes)}">${escapeHtml(status)}</span>
            </div>
          </div>

          <div class="kv">
            <div class="k">Departure</div>
            <div class="v">${escapeHtml(dep.airport || '—')} (${escapeHtml(dep.iata || dep.icao || '—')})</div>

            <div class="k">Arrival</div>
            <div class="v">${escapeHtml(arr.airport || '—')} (${escapeHtml(arr.iata || arr.icao || '—')})</div>

            <div class="k">Scheduled Out</div>
            <div class="v">${escapeHtml(formatMaybeTime(dep.scheduled || dep.scheduledTime || dep.scheduled_time || dep.estTime || dep.dep_schTime))}</div>

            <div class="k">Estimated Out</div>
            <div class="v">${escapeHtml(formatMaybeTime(dep.estimated || dep.estimatedTime || dep.estimated_time || dep.dep_estTime))}</div>

            <div class="k">Scheduled In</div>
            <div class="v">${escapeHtml(formatMaybeTime(arr.scheduled || arr.scheduledTime || arr.scheduled_time || arr.estTime || arr.arr_schTime))}</div>

            <div class="k">Estimated In</div>
            <div class="v">${escapeHtml(formatMaybeTime(arr.estimated || arr.estimatedTime || arr.estimated_time || arr.arr_estTime))}</div>

            <div class="k">Terminal / Gate</div>
            <div class="v">
              Departure: ${escapeHtml(dep.terminal || '—')} / ${escapeHtml(dep.gate || '—')}
              <br>
              Arrival: ${escapeHtml(arr.terminal || '—')} / ${escapeHtml(arr.gate || '—')}
            </div>

            <div class="k">Delay</div>
            <div class="v">${escapeHtml(String(dep.delay || arr.delay || '0'))} min</div>

            <div class="k">Live Position</div>
            <div class="v">${Number.isFinite(liveLat) && Number.isFinite(liveLon) ? `${liveLat}, ${liveLon}` : 'Not available'}</div>
          </div>

          ${Number.isFinite(liveLat) && Number.isFinite(liveLon) ? `
            <div class="helper">
              <button class="cta ghost mapFlightBtn" type="button" data-lat="${liveLat}" data-lon="${liveLon}" data-title="${escapeHtml(airlineName)} ${escapeHtml(flightIata)}">Show on Map</button>
            </div>
          ` : ''}
        </article>
      `;
    }).join('');

    bindMapButtons(items);
  }

  function bindMapButtons(items) {
    const buttons = Array.from(document.querySelectorAll('.mapFlightBtn'));
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const lat = Number(btn.dataset.lat);
        const lon = Number(btn.dataset.lon);
        const title = btn.dataset.title || 'Flight';
        showMapPosition(lat, lon, `<strong>${title}</strong><br>Live aircraft position`);
      });
    });

    const firstWithLive = items.find((f) => Number.isFinite(Number(f.live?.latitude)) && Number.isFinite(Number(f.live?.longitude)));
    if (firstWithLive) {
      const lat = Number(firstWithLive.live.latitude);
      const lon = Number(firstWithLive.live.longitude);
      const title = `${firstWithLive.airline?.name || 'Flight'} ${firstWithLive.flight?.iata || firstWithLive.flight_iata || ''}`.trim();
      showMapPosition(lat, lon, `<strong>${escapeHtml(title)}</strong><br>Live aircraft position`);
    } else {
      resetMap();
    }
  }

  async function trackFlightByNumber() {
    const raw = flightNumberInput.value.trim().toUpperCase();
    if (!raw) {
      flightResultsEl.innerHTML = '<div class="emptyState">Enter a flight number like AA123.</div>';
      resetMap();
      return;
    }

    flightResultsEl.innerHTML = '<div class="emptyState">Loading flight data…</div>';

    try {
      const json = await apiGet('/flights', {
        flight_iata: raw
      });

      const flights = normalizeFlightArray(json).slice(0, 6);
      renderFlights(flights, `No live flights found for "${raw}".`);
    } catch (error) {
      flightResultsEl.innerHTML = `<div class="emptyState">Unable to load flight data. ${escapeHtml(error.message)}</div>`;
      resetMap();
    }
  }

  async function getAirportSchedule() {
    const airportCode = scheduleAirportInput.value.trim().toUpperCase();
    const type = scheduleTypeSelect.value;
    const status = flightStatusFilter.value;

    if (!airportCode) {
      flightResultsEl.innerHTML = '<div class="emptyState">Enter an airport IATA code like PHX.</div>';
      resetMap();
      return;
    }

    flightResultsEl.innerHTML = '<div class="emptyState">Loading airport schedule…</div>';

    try {
      const json = await apiGet('/timetable', {
        iataCode: airportCode,
        type,
        status
      });

      const flights = normalizeFlightArray(json).slice(0, 10);
      renderFlights(flights, `No ${type}s found for ${airportCode}.`);
    } catch (error) {
      flightResultsEl.innerHTML = `<div class="emptyState">Unable to load airport schedule. ${escapeHtml(error.message)}</div>`;
      resetMap();
    }
  }

  function clearFlightPanel() {
    flightNumberInput.value = '';
    scheduleAirportInput.value = '';
    scheduleTypeSelect.value = 'departure';
    flightStatusFilter.value = '';
    flightResultsEl.innerHTML = '<div class="emptyState">Enter a flight number to track a flight, or enter an airport code to load arrivals or departures.</div>';
    resetMap();
  }

  function setActivePanel(panelId) {
    panels.forEach((panel) => {
      panel.classList.toggle('active', panel.id === panelId);
    });

    tabButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.panel === panelId);
    });

    if (panelId === 'flightPanel') {
      initMap();
      setTimeout(() => map && map.invalidateSize(), 200);
    }
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setActivePanel(btn.dataset.panel);
    });
  });

  airportSearchBtn?.addEventListener('click', searchAirports);

  airportClearBtn?.addEventListener('click', () => {
    airportInput.value = '';
    airportResultsEl.innerHTML = '<div class="emptyState">Search for an airport by code, city, or name to view results.</div>';
    airportInput.focus();
  });

  airportPopularBtn?.addEventListener('click', showPopularAirports);

  airportInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchAirports();
    }
  });

  flightSearchBtn?.addEventListener('click', trackFlightByNumber);
  scheduleSearchBtn?.addEventListener('click', getAirportSchedule);
  flightClearBtn?.addEventListener('click', clearFlightPanel);

  flightNumberInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      trackFlightByNumber();
    }
  });

  scheduleAirportInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      getAirportSchedule();
    }
  });

  initMap();
})();
