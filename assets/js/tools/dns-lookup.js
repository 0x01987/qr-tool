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
  let activeRunId = 0;

  const RESOLVER_LABELS = {
    cloudflare: 'Cloudflare DoH',
    google: 'Google DoH'
  };

  const TYPE_MAP = {
    1: 'A',
    2: 'NS',
    5: 'CNAME',
    6: 'SOA',
    15: 'MX',
    16: 'TXT',
    28: 'AAAA'
  };

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
    const value = String(text || '');
    if (!value) return;

    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(value);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        throw new Error('Clipboard unavailable');
      }
      toast('Copied');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
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
    return s.toLowerCase();
  }

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
    emptyState.style.display = '';
    answersCount.textContent = '—';
    if (!rawVisible) raw.style.display = 'none';
  }

  function setRawJson(obj) {
    raw.textContent = obj ? JSON.stringify(obj, null, 2) : '';
    raw.style.display = rawVisible && raw.textContent ? 'block' : 'none';
  }

  function setResolverLabel() {
    resolverOut.textContent = RESOLVER_LABELS[resolverEl.value] || 'Cloudflare DoH';
  }

  function renderAnswers(json) {
    tbody.innerHTML = '';
    tableWrap.style.display = 'none';
    emptyState.style.display = 'none';

    const answers = Array.isArray(json?.Answer) ? json.Answer : [];
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
      const recordType = typeNameFromNum(answer.type || answer.Type);
      const data = (answer.data || answer.Data || '').toString();
      const ttl = (answer.TTL ?? answer.ttl ?? '').toString();

      tr.innerHTML = `
        <td class="mono"><strong>${escapeHtml(recordType)}</strong></td>
        <td class="mono"><span class="copy-link">${escapeHtml(data)}</span></td>
        <td class="mono">${escapeHtml(ttl || '—')}</td>
      `;

      const copyEl = tr.querySelector('.copy-link');
      copyEl?.addEventListener('click', () => copyText(data));

      tbody.appendChild(tr);
    });

    tableWrap.style.display = 'block';
    setRawJson(json);
  }

  function buildResolverUrl(resolver, name, type) {
    const encName = encodeURIComponent(name);
    const encType = encodeURIComponent(type);

    if (resolver === 'google') {
      return `https://dns.google/resolve?name=${encName}&type=${encType}`;
    }

    return `https://cloudflare-dns.com/dns-query?name=${encName}&type=${encType}`;
  }

  async function fetchDoh(resolver, name, type, timeoutMs = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const url = buildResolverUrl(resolver, name, type);
    const started = performance.now();

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { accept: 'application/dns-json' },
        cache: 'no-store',
        signal: controller.signal
      });

      const ms = Math.round(performance.now() - started);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      return { json, ms, url, resolver };
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function fetchWithFallback(preferredResolver, name, type) {
    const order = preferredResolver === 'google'
      ? ['google', 'cloudflare']
      : ['cloudflare', 'google'];

    let lastError = null;

    for (const resolver of order) {
      try {
        return await fetchDoh(resolver, name, type);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Lookup failed');
  }

  async function runLookup(typeOverride) {
    const runId = ++activeRunId;
    const name = normalizeName(nameEl.value);
    const preferredResolver = resolverEl.value;
    const type = (typeOverride || typePickEl.value || 'A').toUpperCase();

    nameEl.value = name;
    selectType(type);
    setResolverLabel();
    qOut.textContent = name ? `${name} · ${type} · ${preferredResolver}` : '—';
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
    answersCount.textContent = '…';
    headline.textContent = 'Working…';
    subline.textContent = 'Fetching DNS-over-HTTPS response.';
    tbody.innerHTML = '';
    tableWrap.style.display = 'none';
    emptyState.style.display = 'none';

    try {
      if (type === 'ANY') {
        const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA'];
        const started = performance.now();

        const results = await Promise.all(
          recordTypes.map(async (recordType) => {
            try {
              return await fetchWithFallback(preferredResolver, name, recordType);
            } catch (error) {
              return { error: String(error), resolver: preferredResolver, json: { Answer: [] }, ms: null, type: recordType };
            }
          })
        );

        if (runId !== activeRunId) return;

        const mergedAnswers = [];
        const meta = [];

        results.forEach((res, i) => {
          const recordType = recordTypes[i];
          const answers = Array.isArray(res?.json?.Answer) ? res.json.Answer : [];
          answers.forEach((a) => mergedAnswers.push(a));
          meta.push({
            type: recordType,
            resolver: res?.resolver || preferredResolver,
            ms: res?.ms ?? null,
            answers: answers.length,
            error: res?.error || null
          });
        });

        const totalMs = Math.round(performance.now() - started);

        const outJson = {
          Status: 0,
          Question: [{ name, type: 'ANY' }],
          Answer: mergedAnswers,
          _meta: meta
        };

        lastJson = outJson;
        msOut.textContent = `${totalMs} ms`;
        answersCount.textContent = String(mergedAnswers.length);

        if (mergedAnswers.length) {
          setStatus('ok', 'Success');
          headline.textContent = `Found ${mergedAnswers.length} answer(s).`;
          subline.textContent = 'Combined view from multiple record types.';
        } else {
          setStatus('warn', 'No answers');
          headline.textContent = 'No answers found.';
          subline.textContent = 'No supported records were returned for this hostname.';
        }

        renderAnswers(outJson);
        return;
      }

      const { json, ms, resolver } = await fetchWithFallback(preferredResolver, name, type);
      if (runId !== activeRunId) return;

      lastJson = json;
      msOut.textContent = `${ms} ms`;
      resolverOut.textContent = RESOLVER_LABELS[resolver] || resolver;
      qOut.textContent = `${name} · ${type} · ${resolver}`;

      const status = json?.Status ?? json?.status;
      const answers = Array.isArray(json?.Answer) ? json.Answer : [];

      if (status === 0 && answers.length) {
        setStatus('ok', 'Success');
      } else if (status === 0 && !answers.length) {
        setStatus('warn', 'No answers');
      } else {
        setStatus('bad', 'Resolver error');
      }

      renderAnswers(json);
    } catch (error) {
      if (runId !== activeRunId) return;

      msOut.textContent = '—';
      answersCount.textContent = '0';
      lastJson = { error: String(error) };
      setStatus('bad', 'Request failed');
      headline.textContent = 'Request failed.';
      subline.textContent = 'Try another resolver or double-check the hostname.';
      emptyState.style.display = 'none';
      setRawJson(lastJson);
      if (rawVisible) raw.style.display = 'block';
    } finally {
      if (runId === activeRunId) {
        lookupBtn.disabled = false;
        lookupBtn.textContent = 'Lookup DNS';
      }
    }
  }

  lookupBtn.addEventListener('click', () => runLookup());

  typePickEl.addEventListener('change', () => {
    selectType(typePickEl.value);
  });

  resolverEl.addEventListener('change', () => {
    setResolverLabel();
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
    activeRunId++;
    nameEl.value = '';
    msOut.textContent = '—';
    qOut.textContent = '—';
    lastJson = null;
    rawVisible = false;
    toggleRawBtn.textContent = 'Show Raw JSON';
    setStatus('', 'Ready');
    resolverEl.value = 'cloudflare';
    setResolverLabel();
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

    resolverEl.value = resolver === 'google' ? 'google' : 'cloudflare';
    setResolverLabel();

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
