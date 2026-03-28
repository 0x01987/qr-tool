(function () {
  'use strict';

  const nationalityEl = document.getElementById('nationality');
  const destinationEl = document.getElementById('destination');
  const purposeEl = document.getElementById('purpose');
  const stayLengthEl = document.getElementById('stayLength');
  const passportValidityEl = document.getElementById('passportValidity');
  const transitCountryEl = document.getElementById('transitCountry');

  const visaCheckBtn = document.getElementById('visaCheckBtn');
  const visaCopyBtn = document.getElementById('visaCopyBtn');
  const visaClearBtn = document.getElementById('visaClearBtn');
  const visaResultsEl = document.getElementById('visaResults');

  const NAMES = {
    us: 'United States',
    ca: 'Canada',
    uk: 'United Kingdom',
    eu: 'EU / Schengen country',
    au: 'Australia',
    other: 'Other',
    schengen: 'Schengen Area',
    japan: 'Japan',
    uae: 'United Arab Emirates',
    singapore: 'Singapore',
    australia: 'Australia'
  };

  function buildAssessment() {
    const nationality = nationalityEl.value;
    const destination = destinationEl.value;
    const purpose = purposeEl.value;
    const stayLength = stayLengthEl.value;
    const passportValidity = passportValidityEl.value;
    const transitCountry = transitCountryEl.value.trim();

    let status = 'Official verification strongly recommended';
    let detail = 'Your trip may need additional document review.';
    const advisories = [];

    const shortTouristWaiverPairs = new Set([
      'us:ca', 'ca:us',
      'us:uk', 'uk:us',
      'us:schengen', 'uk:schengen', 'ca:schengen', 'au:schengen',
      'us:japan', 'ca:japan', 'uk:japan', 'au:japan',
      'us:uae', 'uk:uae', 'ca:uae',
      'us:singapore', 'uk:singapore', 'ca:singapore', 'au:singapore',
      'uk:ca', 'au:uk', 'ca:uk'
    ]);

    const pair = `${nationality}:${destination}`;
    const isShortTourismLike = (purpose === 'tourism' || purpose === 'business' || purpose === 'transit') && stayLength === 'short';

    if (shortTouristWaiverPairs.has(pair) && isShortTourismLike) {
      status = 'May not require a visa for a short stay';
      detail = 'This route often allows short tourism or business visits, but final checks are still required.';
    }

    if (purpose === 'work' || purpose === 'study' || stayLength === 'long') {
      status = 'Likely requires additional travel authorization';
      detail = 'Work, study, or longer stays usually need more than a simple short-stay entry check.';
    }

    if (nationality === destination && destination !== 'other') {
      status = 'Likely no visa needed for domestic / citizen entry context';
      detail = 'Traveling to your own country generally changes entry rules, but document checks can still apply.';
    }

    if (passportValidity === '3to5') {
      advisories.push('Passport validity may be too short for some destinations. Many destinations prefer 6+ months remaining.');
    }

    if (passportValidity === 'under3') {
      status = 'Passport validity warning';
      detail = 'Your passport may not meet entry requirements for many destinations.';
      advisories.push('Renew your passport or verify requirements immediately before travel.');
    }

    if (transitCountry) {
      advisories.push(`Review transit requirements for: ${transitCountry}. Some transit stops may have separate rules.`);
    }

    advisories.push('Always verify final requirements with the destination government, embassy, airline, or official travel documentation source.');
    advisories.push('Check entry rules for onward travel proof, accommodations, and return tickets if applicable.');
    advisories.push('Health, customs, and arrival forms may also apply depending on destination.');

    return {
      nationality: NAMES[nationality] || nationality,
      destination: NAMES[destination] || destination,
      purpose: purpose.charAt(0).toUpperCase() + purpose.slice(1),
      stayLength: stayLength === 'short' ? 'Short stay' : stayLength === 'medium' ? 'Medium stay' : 'Long stay',
      passportValidity: passportValidity === '6plus' ? '6+ months remaining' : passportValidity === '3to5' ? '3–5 months remaining' : 'Under 3 months remaining',
      status,
      detail,
      advisories
    };
  }

  function renderResult() {
    const result = buildAssessment();

    visaResultsEl.innerHTML = `
      <div class="statusBadge">${result.status}</div>
      <div class="resultPanel">
        <div class="kv">
          <div class="k">Nationality</div>
          <div class="v">${result.nationality}</div>

          <div class="k">Destination</div>
          <div class="v">${result.destination}</div>

          <div class="k">Trip Purpose</div>
          <div class="v">${result.purpose}</div>

          <div class="k">Length of Stay</div>
          <div class="v">${result.stayLength}</div>

          <div class="k">Passport Validity</div>
          <div class="v">${result.passportValidity}</div>

          <div class="k">Summary</div>
          <div class="v">${result.detail}</div>
        </div>

        <ul class="advisoryList">
          ${result.advisories.map((item) => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  function extractText() {
    return visaResultsEl.textContent.trim();
  }

  visaCheckBtn?.addEventListener('click', renderResult);

  visaCopyBtn?.addEventListener('click', async function () {
    const text = extractText();
    if (!text || text.includes('Select your nationality')) {
      alert('Run the pre-check first.');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      visaCopyBtn.textContent = 'Copied';
      setTimeout(() => {
        visaCopyBtn.textContent = 'Copy Result';
      }, 1400);
    } catch (error) {
      alert('Unable to copy the result.');
    }
  });

  visaClearBtn?.addEventListener('click', function () {
    nationalityEl.value = 'us';
    destinationEl.value = 'us';
    purposeEl.value = 'tourism';
    stayLengthEl.value = 'short';
    passportValidityEl.value = '6plus';
    transitCountryEl.value = '';
    visaResultsEl.innerHTML = '<div class="emptyState">Select your nationality, destination, and travel purpose to run a visa pre-check.</div>';
  });
})();
