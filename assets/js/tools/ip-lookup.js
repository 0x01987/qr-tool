document.addEventListener('DOMContentLoaded', () => {
  const ipInput = document.getElementById('ipInput');

  const ip4Text = document.getElementById('ip4Text');
  const ip6Text = document.getElementById('ip6Text');
  const rdnsText = document.getElementById('rdnsText');
  const locText = document.getElementById('locText');
  const ispText = document.getElementById('ispText');
  const tzText = document.getElementById('tzText');
  const asnText = document.getElementById('asnText');
  const noteText = document.getElementById('noteText');

  const flagEmoji = document.getElementById('flagEmoji');
  const countryText = document.getElementById('countryText');
  const v4Badge = document.getElementById('v4Badge');
  const v6Badge = document.getElementById('v6Badge');

  const lookupBtn = document.getElementById('lookupBtn');
  const copyIpBtn = document.getElementById('copyIpBtn');
  const copyIp6Btn = document.getElementById('copyIp6Btn');
  const copyDetailsBtn = document.getElementById('copyDetailsBtn');
  const refreshBtn = document.getElementById('refreshBtn');

  if (!ipInput || !ip4Text || !ip6Text || !rdnsText || !locText || !ispText || !tzText || !asnText) {
    return;
  }

  let lastResult = null;

  const TIMEOUT_FAST_MS = 1800;
  const TIMEOUT_GEO_MS = 2200;
  const TIMEOUT_SLOW_MS = 3500;
  const CACHE_TTL_MS = 10 * 60 * 1000;

  function safe(value) {
    return (value === null || value === undefined || value === '') ? '—' : String(value);
  }

  function countryCodeToFlag(code) {
    const cc = String(code || '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc)) return '🌐';
    return String.fromCodePoint(...[...cc].map(c => 127397 + c.charCodeAt(0)));
  }

  function updateBadges(ip4, ip6) {
    if (v4Badge) v4Badge.textContent = `IPv4: ${ip4 ? 'Detected' : '—'}`;
    if (v6Badge) v6Badge.textContent = `IPv6: ${ip6 ? 'Detected' : '—'}`;
  }

  function setLoading() {
    ip4Text.textContent = 'Loading…';
    ip6Text.textContent = 'Loading…';
    rdnsText.textContent = 'Loading…';
    locText.textContent = '—';
    ispText.textContent = '—';
    tzText.textContent = '—';
    asnText.textContent = '—';
    noteText.textContent = '';
    if (flagEmoji) flagEmoji.textContent = '🌐';
    if (countryText) countryText.textContent = 'Loading region…';
    updateBadges(null, null);
    lastResult = null;
  }

  function setError(message) {
    ip4Text.textContent = '—';
    ip6Text.textContent = '—';
    rdnsText.textContent = '—';
    locText.textContent = '—';
    ispText.textContent = '—';
    tzText.textContent = '—';
    asnText.textContent = '—';
    noteText.textContent = message || 'Failed to fetch.';
    if (flagEmoji) flagEmoji.textContent = '🌐';
    if (countryText) countryText.textContent = 'Unknown region';
    updateBadges(null, null);
    lastResult = null;
  }

  function renderPartial({ ip4, ip6 }) {
    if (ip4 !== undefined) ip4Text.textContent = ip4 ? safe(ip4) : '—';
    if (ip6 !== undefined) {
      ip6Text.textContent = (ip6 === 'Loading…') ? 'Loading…' : (ip6 ? safe(ip6) : 'Not available');
    }
    updateBadges(ip4Text.textContent !== '—' && !ip4Text.textContent.includes('Loading'), ip6 && ip6 !== 'Loading…');
  }

  function renderGeo(geo) {
    const locParts = [geo.city, geo.region, geo.country].filter(Boolean);
    locText.textContent = locParts.length ? locParts.join(', ') : '—';
    ispText.textContent = safe(geo.isp || geo.org);
    tzText.textContent = safe(geo.timezone);
    asnText.textContent = safe(geo.asn);
    noteText.textContent = geo.provider ? `Geo source: ${geo.provider}` : '';

    if (flagEmoji) flagEmoji.textContent = countryCodeToFlag(geo.countryCode);
    if (countryText) countryText.textContent = geo.country || 'Unknown region';
  }

  function renderRdns(hostname) {
    rdnsText.textContent = hostname || 'Not available';
  }

  async function fetchWithTimeout(url, { timeoutMs = TIMEOUT_FAST_MS, as = 'json' } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      return as === 'text' ? (await res.text()).trim() : await res.json();
    } catch (err) {
      if (err && err.name === 'AbortError') throw new Error('Request timed out.');
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  function cacheGet(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.t || !('v' in obj)) return null;
      if ((Date.now() - obj.t) > CACHE_TTL_MS) return null;
      return obj.v;
    } catch {
      return null;
    }
  }

  function cacheSet(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
    } catch {}
  }

  async function getIPv4Fast() {
    const data = await fetchWithTimeout('https://api.ipify.org?format=json', {
      timeoutMs: TIMEOUT_FAST_MS,
      as: 'json'
    });
    if (!data || !data.ip || !data.ip.includes('.')) throw new Error('IPv4 not available');
    return data.ip;
  }

  async function getIPv4Fallback() {
    const providers = [
      () => fetchWithTimeout('https://ipv4.icanhazip.com/', { timeoutMs: TIMEOUT_SLOW_MS, as: 'text' }),
      () => fetchWithTimeout('https://ifconfig.me/ip', { timeoutMs: TIMEOUT_SLOW_MS, as: 'text' })
    ];

    let lastErr;
    for (const provider of providers) {
      try {
        const ip = await provider();
        if (ip && ip.includes('.')) return ip;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('IPv4 blocked by network or extension.');
  }

  async function getIPv4() {
    const cached = cacheGet('ip4');
    if (cached) return cached;

    try {
      const ip = await getIPv4Fast();
      cacheSet('ip4', ip);
      return ip;
    } catch {
      const ip = await getIPv4Fallback();
      cacheSet('ip4', ip);
      return ip;
    }
  }

  async function getIPv6NonBlocking() {
    const cached = cacheGet('ip6');
    if (cached) return cached;

    try {
      const data = await fetchWithTimeout('https://api64.ipify.org?format=json', {
        timeoutMs: TIMEOUT_FAST_MS,
        as: 'json'
      });
      const ip = data && data.ip && data.ip.includes(':') ? data.ip : null;
      if (ip) cacheSet('ip6', ip);
      return ip || null;
    } catch {
      try {
        const ip = await fetchWithTimeout('https://ipv6.icanhazip.com/', {
          timeoutMs: TIMEOUT_FAST_MS,
          as: 'text'
        });
        const value = ip && ip.includes(':') ? ip : null;
        if (value) cacheSet('ip6', value);
        return value;
      } catch {
        return null;
      }
    }
  }

  async function geoLookupFast(ip) {
    const cached = cacheGet(`geo:${ip}`);
    if (cached) return cached;

    const data = await fetchWithTimeout(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      timeoutMs: TIMEOUT_GEO_MS,
      as: 'json'
    });

    if (data && data.success === false) {
      throw new Error(data.message || 'ipwho.is blocked');
    }

    const geo = {
      provider: 'ipwho.is',
      city: data.city,
      region: data.region,
      country: data.country,
      countryCode: data.country_code,
      isp: data.connection?.isp,
      org: data.connection?.org,
      asn: data.connection?.asn,
      timezone: data.timezone?.id
    };

    cacheSet(`geo:${ip}`, geo);
    return geo;
  }

  async function geoLookupFallback(ip) {
    const providers = [
      async () => {
        const data = await fetchWithTimeout(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
          timeoutMs: TIMEOUT_SLOW_MS,
          as: 'json'
        });
        if (data && data.error) throw new Error(data.reason || 'ipapi blocked');
        return {
          provider: 'ipapi.co',
          city: data.city,
          region: data.region,
          country: data.country_name,
          countryCode: data.country_code,
          isp: data.org,
          org: data.org,
          asn: data.asn,
          timezone: data.timezone
        };
      },
      async () => {
        const data = await fetchWithTimeout(`https://ipinfo.io/${encodeURIComponent(ip)}/json`, {
          timeoutMs: TIMEOUT_SLOW_MS,
          as: 'json'
        });
        return {
          provider: 'ipinfo.io',
          city: data.city,
          region: data.region,
          country: data.country,
          countryCode: data.country,
          isp: data.org,
          org: data.org,
          asn: (data.org && data.org.match(/AS\d+/)) ? data.org.match(/AS\d+/)[0] : null,
          timezone: data.timezone
        };
      }
    ];

    let lastErr;
    for (const provider of providers) {
      try {
        return await provider();
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('Geo lookup blocked.');
  }

  async function geoLookup(ip) {
    try {
      return await geoLookupFast(ip);
    } catch {
      const geo = await geoLookupFallback(ip);
      cacheSet(`geo:${ip}`, geo);
      return geo;
    }
  }

  async function reverseDnsLookup(ip) {
    const cached = cacheGet(`rdns:${ip}`);
    if (cached !== null) return cached;

    try {
      const data = await fetchWithTimeout(`https://ipwho.is/${encodeURIComponent(ip)}`, {
        timeoutMs: TIMEOUT_GEO_MS,
        as: 'json'
      });

      const hostname = data?.connection?.domain || data?.connection?.hostname || null;
      cacheSet(`rdns:${ip}`, hostname || '');
      return hostname;
    } catch {
      cacheSet(`rdns:${ip}`, '');
      return null;
    }
  }

  function isLikelyIp(str) {
    const s = (str || '').trim();
    if (!s) return false;

    const ipv4 = /^\d{1,3}(\.\d{1,3}){3}$/;
    const ipv6 = /^[0-9a-fA-F:]+$/;

    return ipv4.test(s) || (s.includes(':') && ipv6.test(s));
  }

  async function lookup() {
    const manualIp = (ipInput.value || '').trim();
    setLoading();

    try {
      if (manualIp) {
        if (!isLikelyIp(manualIp)) {
          throw new Error('Enter a valid IPv4 or IPv6 address, or leave blank.');
        }

        renderPartial({
          ip4: manualIp.includes('.') ? manualIp : null,
          ip6: manualIp.includes(':') ? manualIp : null
        });

        const [geo, rdns] = await Promise.all([
          geoLookup(manualIp),
          reverseDnsLookup(manualIp)
        ]);

        renderGeo(geo);
        renderRdns(rdns);

        lastResult = {
          ip4: manualIp.includes('.') ? manualIp : null,
          ip6: manualIp.includes(':') ? manualIp : null,
          geo,
          rdns
        };
        updateBadges(lastResult.ip4, lastResult.ip6);
        return;
      }

      const ip4 = await getIPv4();
      renderPartial({ ip4, ip6: 'Loading…' });

      const geoPromise = geoLookup(ip4);
      const rdnsPromise = reverseDnsLookup(ip4);
      const ip6Promise = getIPv6NonBlocking();

      ip6Promise
        .then(ip6 => {
          renderPartial({ ip6 });
          updateBadges(ip4, ip6);
        })
        .catch(() => {
          renderPartial({ ip6: null });
          updateBadges(ip4, null);
        });

      const [geo, rdns] = await Promise.all([geoPromise, rdnsPromise]);
      renderGeo(geo);
      renderRdns(rdns);

      const ip6 = await ip6Promise.catch(() => null);
      lastResult = { ip4, ip6, geo, rdns };
      updateBadges(ip4, ip6);
    } catch (err) {
      setError(err.message || 'Failed to fetch.');
    }
  }

  async function copyText(text, btnEl, okLabel, baseLabel) {
    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }

      btnEl.textContent = okLabel;
      setTimeout(() => {
        btnEl.textContent = baseLabel;
      }, 1200);
    } catch {
      const t = document.createElement('textarea');
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      document.body.removeChild(t);

      btnEl.textContent = okLabel;
      setTimeout(() => {
        btnEl.textContent = baseLabel;
      }, 1200);
    }
  }

  function buildDetailsText(result) {
    const lines = [];
    lines.push('InstantQR — IP Lookup');
    lines.push(`IPv4: ${result.ip4 || '—'}`);
    lines.push(`IPv6: ${result.ip6 || 'Not available'}`);
    lines.push(`Reverse DNS: ${result.rdns || 'Not available'}`);
    lines.push(`Country: ${countryText?.textContent || '—'}`);
    lines.push(`Location: ${locText.textContent}`);
    lines.push(`ISP/Org: ${ispText.textContent}`);
    lines.push(`Timezone: ${tzText.textContent}`);
    lines.push(`ASN: ${asnText.textContent}`);
    if (noteText.textContent) lines.push(noteText.textContent);
    return lines.join('\n');
  }

  lookupBtn?.addEventListener('click', lookup);

  refreshBtn?.addEventListener('click', () => {
    ipInput.value = '';
    lookup();
  });

  copyIpBtn?.addEventListener('click', () => {
    const ip = (ip4Text.textContent || '').trim();
    if (!ip || ip === '—' || ip.toLowerCase().includes('loading')) return;
    copyText(ip, copyIpBtn, 'Copied!', 'Copy IPv4');
  });

  copyIp6Btn?.addEventListener('click', () => {
    const ip = (ip6Text.textContent || '').trim();
    if (!ip || ip === '—' || ip === 'Not available' || ip.toLowerCase().includes('loading')) return;
    copyText(ip, copyIp6Btn, 'Copied!', 'Copy IPv6');
  });

  copyDetailsBtn?.addEventListener('click', () => {
    if (!lastResult) return;
    copyText(buildDetailsText(lastResult), copyDetailsBtn, 'Copied!', 'Copy Details');
  });

  ipInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      lookup();
    }
  });

  lookup();
});
