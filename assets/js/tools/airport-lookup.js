(function () {
  'use strict';

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
    { name: 'McCarran / Harry Reid International Airport', city: 'Las Vegas', country: 'United States', iata: 'LAS', icao: 'KLAS', timezone: 'America/Los_Angeles', lat: 36.0840, lon: -115.1537 },
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

  const input = document.getElementById('airportInput');
  const resultsEl = document.getElementById('airportResults');
  const searchBtn = document.getElementById('airportSearchBtn');
  const clearBtn = document.getElementById('airportClearBtn');
  const popularBtn = document.getElementById('airportPopularBtn');

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function mapsLink(lat, lon) {
    return `https://www.google.com/maps?q=${encodeURIComponent(lat + ',' + lon)}`;
  }

  function scoreAirport(airport, query) {
    const q = query.trim().toLowerCase();
    if (!q) return 0;

    let score = 0;
    const fields = {
      iata: (airport.iata || '').toLowerCase(),
      icao: (airport.icao || '').toLowerCase(),
      name: (airport.name || '').toLowerCase(),
      city: (airport.city || '').toLowerCase(),
      country: (airport.country || '').toLowerCase()
    };

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
      resultsEl.innerHTML = `<div class="emptyState">${escapeHtml(message || 'No airports found.')}</div>`;
      return;
    }

    resultsEl.innerHTML = items.map((airport) => `
      <article class="resultItem">
        <div class="airportHead">
          <div>
            <div class="airportTitle">${escapeHtml(airport.name)}</div>
            <div class="airportSub">${escapeHtml(airport.city)}, ${escapeHtml(airport.country)}</div>
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
    const query = input.value.trim();
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

  function showPopular() {
    renderAirports(AIRPORTS.slice(0, 10), 'No airports available.');
  }

  searchBtn?.addEventListener('click', searchAirports);
  clearBtn?.addEventListener('click', function () {
    input.value = '';
    resultsEl.innerHTML = '<div class="emptyState">Search for an airport by code, city, or name to view results.</div>';
    input.focus();
  });
  popularBtn?.addEventListener('click', showPopular);

  input?.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchAirports();
    }
  });
})();
