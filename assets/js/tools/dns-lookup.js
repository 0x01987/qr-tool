document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  const nameEl = $('name');
  const resolverEl = $('resolver');
  const typePickEl = $('typePick');
  const lookupBtn = $('lookupBtn');
  const shareBtn = $('shareBtn');
  const clearBtn = $('clearBtn');
  const copyJsonBtn = $('copyJsonBtn');
  const toggleRawBtn = $('toggleRawBtn');

  const qOut = $('qOut');
  const msOut = $('msOut');
  const answersCount = $('answersCount');

  const headline = $('headline');
  const subline = $('subline');
  const statusText = $('statusText');
  const statusDot = $('statusDot');
  const resolverOut = $('resolverOut');
  const typeOut = $('typeOut');

  const tableWrap = $('tableWrap');
  const tbody = $('tbody');
  const raw = $('raw');
  const emptyState = $('emptyState');
  const toastEl = $('toast');

  const typeChips = Array.from(document.querySelectorAll('.type-chip'));

  let lastJson = null;
  let rawVisible = false;

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(window.__instantqrDnsToastTimer);
    window.__instantqrDnsToastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 1300);
  }

  async function copyText(text) {
    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }
      toast('Copied');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast('Copied');
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setStatus(kind, text) {
    statusText.textContent = text;
    statusDot.style.background =
      kind === 'ok' ? 'var(--ok)' :
      kind === 'warn' ? 'var(--warn)' :
      kind === 'bad' ? 'var(--danger)' :
      'var(--muted)';
  }

  function normalizeName(value) {
    let s = (value || '').trim();
    if (!s) return '';

    try {
      if (s.includes('://')) {
        s = new URL(s).hostname;
      } else if (s.includes('/')) {
        s = s.split('/')[0];
      }
    } catch {}

    s = s.replace(/\.+$/, '');
    return s;
  }

  function dohUrl(resolver, name, type) {
    const encName = encodeURIComponent(name);
    const encType = encodeURIComponent(type);

    if (resolver === 'google') {
      return `https://dns.google/resolve?name=${encName}&type=${encType}`;
    }

    return `https://cloudflare-dns.com/dns-query?name=${encName}&type=${encType}`;
  }

  async function fetchDoh(resolver, name, type) {
    const url = dohUrl(resolver, name, type);
    const started = performance.now();

    const res = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/dns-json' },
      cache: 'no-store'
    });

    const ms = Math.round(performance.now() - started);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    return { json, ms, url };
  }

  const TYPE_MAP = {
    1: 'A',
    2: 'NS',
    5: 'CNAME',
    6: 'SOA',
    15: 'MX',
    16: 'TXT',
    28: 'AAAA'
  };

  function typeNameFromNum(n) {
    return TYPE_MAP[n] || String(n);
  }

  function selectType(type) {
    typePickEl.value = type;
    typeOut.textContent = type;

    typeChips.forEach((chip) => {
      const active = chip.dataset.type === type;
      chip.classList.toggle('active', active);
      chip.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function resetViews() {
    tbody.innerHTML = '';
    tableWrap.style.display = 'none';
    raw.style.display = rawVisible ? 'block' : 'none';
    emptyState.style.display = '';
    answersCount.textContent = '—';
  }

  function setRawJson(obj) {
    raw.textContent = obj ? JSON.stringify(obj, null, 2) : '';
    raw.style.display = rawVisible ? 'block' : 'none';
  }

  function renderAnswers(json) {
    tbody.innerHTML = '';
    tableWrap.style.display = 'none';
    emptyState.style.display = 'none';

    const answers = (json && Array.isArray(json.Answer)) ? json.Answer : [];
    answersCount.textContent = String(answers.length);

    if (!answers.length) {
      headline.textContent = 'No answers found.';
      subline.textContent = 'Try another record type or use ANY for a broader overview.';
      emptyState.style.display = '';
      setRawJson(json);
      return;
    }

    headline.textContent = `Found ${answers.length} answer(s).`;
    subline.textContent = 'Click any answer value to copy it.';

    answers.forEach((answer) => {
      const tr = document.createElement('tr');
      const type = typeNameFromNum(answer.type || answer.Type);
      const data = (answer.data || answer.Data || '').toString();
      const ttl = (answer.TTL ?? answer.ttl ?? '').toString();

      tr.innerHTML = `
        <td class="mono"><strong>${escapeHtml(type)}</strong></td>
        <td class="mono"><span class="copy-link" data-copy="${escapeHtml(data)}">${escapeHtml(data)}</span></td>
        <td class="mono">${escapeHtml(ttl || '—')}</td>
      `;

      const copyEl = tr.querySelector('[data-copy]');
      if (copyEl) {
        copyEl.addEventListener('click', () => copyText(data));
      }

      tbody.appendChild(tr);
    });

    tableWrap.style.display = '';
    setRawJson(json);
  }

  async function runLookup(typeOverride) {
    const name = normalizeName(nameEl.value);
    const resolver = resolverEl.value;
    const type = (typeOverride || typePickEl.value || 'A').toUpperCase();

    nameEl.value = name;
    resolverOut.textContent = resolver === 'google' ? 'Google DoH' : 'Cloudflare DoH';
    selectType(type);
    qOut.textContent = name ? `${name} · ${type} · ${resolver}` : '—';
    typeOut.textContent = type;

    if (!name) {
      toast('Enter a domain');
      setStatus('warn', 'Missing domain');
      headline.textContent = 'Please enter a domain or hostname first.';
      subline.textContent = 'Example: instantqr.io';
      lastJson = null;
      setRawJson(null);
      resetViews();
      return;
    }

    setStatus('', 'Looking up…');
    lookupBtn.disabled = true;
    lookupBtn.textContent = 'Looking up…';
    msOut.textContent = '…';
    headline.textContent = 'Working…';
    subline.textContent = 'Fetching DNS-over-HTTPS response.';
    resetViews();

    try {
      let outJson = null;

      if (type === 'ANY') {
        const types = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA'];
        const started = performance.now();

        const results = await Promise.all(
          types.map(async (t) => {
            try {
              const res = await fetchDoh(resolver, name, t);
              return { type: t, ...res };
            } catch (error) {
              return { type: t, error: String(error) };
            }
          })
        );

        const totalMs = Math.round(performance.now() - started);
        const merged = [];

        results.forEach((res) => {
          if (res && res.json && Array.isArray(res.json.Answer)) {
            res.json.Answer.forEach((a) => merged.push(a));
          }
        });

        outJson = {
          Status: 0,
          Question: [{ name, type: 'ANY' }],
          Answer: merged,
          _meta: {
            resolver,
            bundle: results.map((res) => ({
              type: res.type,
              ms: res.ms,
              ok: !!(res.json && res.json.Answer),
              error: res.error || null
            }))
          }
        };

        msOut.textContent = `${totalMs} ms`;
        lastJson = outJson;

        if (merged.length) setStatus('ok', 'Success');
        else setStatus('warn', 'No answers');

        renderAnswers(outJson);
        return;
      }

      const { json, ms } = await fetchDoh(resolver, name, type);
      msOut.textContent = `${ms} ms`;
      lastJson = json;

      const status = json && (json.Status ?? json.status);
      const answers = (json && Array.isArray(json.Answer)) ? json.Answer : [];

      if (status === 0 && answers.length) setStatus('ok', 'Success');
      else if (status === 0 && !answers.length) setStatus('warn', 'No answers');
      else setStatus('bad', 'Resolver error');

      renderAnswers(json);
    } catch (error) {
      msOut.textContent = '—';
      lastJson = { error: String(error) };
      setStatus('bad', 'Request failed');
      headline.textContent = 'Request failed.';
      subline.textContent = 'Try another resolver or double-check the hostname.';
      answersCount.textContent = '0';
      emptyState.style.display = 'none';
      setRawJson(lastJson);
    } finally {
      lookupBtn.disabled = false;
      lookupBtn.textContent = 'Lookup DNS';
    }
  }

  lookupBtn.addEventListener('click', () => runLookup());

  typePickEl.addEventListener('change', () => {
    selectType(typePickEl.value);
  });

  resolverEl.addEventListener('change', () => {
    resolverOut.textContent = resolverEl.value === 'google' ? 'Google DoH' : 'Cloudflare DoH';
  });

  typeChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const type = chip.dataset.type;
      selectType(type);
      runLookup(type);
    });
  });

  nameEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runLookup();
    }
  });

  shareBtn.addEventListener('click', async () => {
    const name = normalizeName(nameEl.value);
    const type = (typePickEl.value || 'A').toUpperCase();
    const resolver = resolverEl.value;

    const url = new URL(window.location.href);
    url.searchParams.set('name', name || '');
    url.searchParams.set('type', type);
    url.searchParams.set('resolver', resolver);

    await copyText(url.toString());
  });

  clearBtn.addEventListener('click', () => {
    nameEl.value = '';
    msOut.textContent = '—';
    qOut.textContent = '—';
    lastJson = null;
    rawVisible = false;
    toggleRawBtn.textContent = 'Show Raw JSON';
    setStatus('', 'Ready');
    resolverOut.textContent = resolverEl.value === 'google' ? 'Google DoH' : 'Cloudflare DoH';
    selectType('A');
    headline.textContent = 'Ready to run a lookup.';
    subline.textContent = 'Run a lookup to see DNS answers and metadata.';
    setRawJson(null);
    resetViews();
    toast('Cleared');
    nameEl.focus();
  });

  copyJsonBtn.addEventListener('click', async () => {
    if (!lastJson) {
      toast('Nothing to copy');
      return;
    }
    await copyText(JSON.stringify(lastJson, null, 2));
  });

  toggleRawBtn.addEventListener('click', () => {
    rawVisible = !rawVisible;
    raw.style.display = rawVisible && raw.textContent ? 'block' : 'none';
    toggleRawBtn.textContent = rawVisible ? 'Hide Raw JSON' : 'Show Raw JSON';
  });

  (function init() {
    const url = new URL(window.location.href);
    const name = normalizeName(url.searchParams.get('name') || '');
    const type = (url.searchParams.get('type') || 'A').toUpperCase();
    const resolver = (url.searchParams.get('resolver') || 'cloudflare').toLowerCase();

    if (resolver === 'google') resolverEl.value = 'google';
    resolverOut.textContent = resolverEl.value === 'google' ? 'Google DoH' : 'Cloudflare DoH';

    if (['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'ANY'].includes(type)) {
      selectType(type);
    } else {
      selectType('A');
    }

    if (name) {
      nameEl.value = name;
      runLookup(typePickEl.value);
    } else {
      nameEl.value = 'instantqr.io';
    }
  })();
});
