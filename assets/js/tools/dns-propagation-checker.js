document.addEventListener('DOMContentLoaded', () => {
  const RESOLVERS = [
    {
      id: 'google',
      name: 'Google Public DNS',
      provider: 'dns.google',
      url: 'https://dns.google/resolve',
      kind: 'standard',
      weight: 1.0
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare 1.1.1.1',
      provider: 'cloudflare-dns.com',
      url: 'https://cloudflare-dns.com/dns-query',
      kind: 'standard',
      weight: 1.0
    },
    {
      id: 'cfsecurity',
      name: 'Cloudflare Security',
      provider: 'security.cloudflare-dns.com',
      url: 'https://security.cloudflare-dns.com/dns-query',
      kind: 'security',
      weight: 0.55
    },
    {
      id: 'cffamily',
      name: 'Cloudflare Family',
      provider: 'family.cloudflare-dns.com',
      url: 'https://family.cloudflare-dns.com/dns-query',
      kind: 'family',
      weight: 0.45
    }
  ];

  const domainEl = document.getElementById('domain');
  const typeEl = document.getElementById('type');
  const expectedEl = document.getElementById('expected');
  const checkBtn = document.getElementById('checkBtn');
  const copyBtn = document.getElementById('copyBtn');
  const shareBtn = document.getElementById('shareBtn');
  const loader = document.getElementById('loader');
  const resultsBody = document.getElementById('resultsBody');
  const matchedCountEl = document.getElementById('matchedCount');
  const propPercentEl = document.getElementById('propPercent');
  const consensusValueEl = document.getElementById('consensusValue');
  const queryLabelEl = document.getElementById('queryLabel');
  const statusBadge = document.getElementById('statusBadge');

  if (!domainEl || !typeEl || !expectedEl || !checkBtn || !resultsBody) return;

  let lastSummary = '';
  let activeRunId = 0;

  function normalizeDomain(input) {
    let s = (input || '').trim();
    if (!s) return '';
    try {
      if (s.includes('://')) s = new URL(s).hostname;
    } catch (_) {}
    s = s.split('/')[0].replace(/\.+$/, '');
    return s.toLowerCase();
  }

  function formatAnswer(ans) {
    if (!ans || !ans.length) return '';
    return ans
      .map((a) => {
        const val = (a.data || a.Data || '').toString();
        return val.replace(/^"|"$/g, '');
      })
      .join(' | ');
  }

  function mostCommon(arr) {
    const map = new Map();
    arr.forEach((v) => map.set(v, (map.get(v) || 0) + 1));
    let best = '';
    let count = 0;
    for (const [k, v] of map.entries()) {
      if (v > count) {
        best = k;
        count = v;
      }
    }
    return best;
  }

  function setStatus(text, kind = '') {
    if (!statusBadge) return;
    statusBadge.textContent = text;
    statusBadge.className = 'badge' + (kind ? ' ' + kind : '');
  }

  async function copyText(text) {
    try {
      await window.InstantQR.copyText(text);
      setStatus('Copied', 'ok');
      setTimeout(() => setStatus('Ready'), 1200);
    } catch (_) {
      setStatus('Copy failed', 'bad');
    }
  }

  function getHeadersForResolver() {
    return { accept: 'application/dns-json' };
  }

  async function queryResolver(resolver, domain, type) {
    const base = resolver.url.includes('?') ? resolver.url + '&' : resolver.url + '?';
    const url = `${base}name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;
    const started = performance.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const res = await fetch(url, {
        headers: getHeadersForResolver(),
        cache: 'no-store',
        signal: controller.signal
      });

      const ms = Math.round(performance.now() - started);
      if (!res.ok) throw new Error('HTTP ' + res.status);

      const json = await res.json();
      const answers = Array.isArray(json.Answer) ? json.Answer : [];
      const text = formatAnswer(answers);
      const ttl = answers.length ? (answers[0].TTL ?? '—') : '—';

      return {
        id: resolver.id,
        resolver: resolver.name,
        provider: resolver.provider,
        kind: resolver.kind,
        weight: resolver.weight,
        ok: answers.length > 0,
        answers,
        text,
        ttl,
        ms,
        raw: json
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function getConsensus(results) {
    const visibleRows = results.filter((r) => r && r.ok && r.text);

    const primaryPool = visibleRows
      .filter((r) => r.kind === 'standard')
      .map((r) => r.text.trim())
      .filter(Boolean);

    const fallbackPool = visibleRows
      .map((r) => r.text.trim())
      .filter(Boolean);

    if (primaryPool.length) return mostCommon(primaryPool);
    if (fallbackPool.length) return mostCommon(fallbackPool);
    return '';
  }

  function isMatch(row, expected, consensus) {
    if (!row || !row.ok || !row.text) return false;
    const value = row.text.toLowerCase();
    if (expected) return value.includes(expected.toLowerCase());
    if (consensus) return value === consensus.toLowerCase();
    return false;
  }

  function computeWeightedStats(results, expected, consensus) {
    let totalWeight = 0;
    let matchedWeight = 0;

    results.forEach((row) => {
      if (!row) return;
      totalWeight += row.weight;
      if (isMatch(row, expected, consensus)) matchedWeight += row.weight;
    });

    const percent = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;
    return { totalWeight, matchedWeight, percent };
  }

  function getWeightLabel(weight) {
    return weight >= 1 ? 'Primary' : 'Secondary';
  }

  function makePendingRow(resolver) {
    const e = window.InstantQR.escapeHtml;
    return `
      <tr id="row-${resolver.id}">
        <td class="resolver">
          ${e(resolver.name)}
          <small>${e(resolver.provider)}</small>
        </td>
        <td class="resultCell">
          <div class="resultBox pending">
            <div class="resultTop">
              <div class="resultStatus pending">Checking…</div>
              <div class="small muted">Waiting for response</div>
            </div>
            <div class="mono muted">Query in progress.</div>
          </div>
        </td>
        <td class="ttl">${e(getWeightLabel(resolver.weight))}</td>
        <td class="ttl">—</td>
        <td class="ttl">—</td>
      </tr>
    `;
  }

  function makeRowHtml(row, expected, consensus) {
    const e = window.InstantQR.escapeHtml;
    const match = isMatch(row, expected, consensus);

    const boxClass = row.ok ? (match ? 'resultBox ok' : 'resultBox') : 'resultBox bad';
    const statusClass = row.ok ? (match ? 'resultStatus ok' : 'resultStatus') : 'resultStatus bad';

    let statusText = row.ok ? (match ? 'Visible / Match' : 'Visible') : 'No answer';
    if (row.ok && row.kind === 'security') statusText = match ? 'Visible / Match (Security)' : 'Visible (Security)';
    if (row.ok && row.kind === 'family') statusText = match ? 'Visible / Match (Family)' : 'Visible (Family)';

    const detailText = row.ok ? 'Record returned' : (row.error ? row.error : 'Nothing returned');

    return `
      <tr id="row-${row.id}">
        <td class="resolver">
          ${e(row.resolver)}
          <small>${e(row.provider)}</small>
        </td>
        <td class="resultCell">
          <div class="${boxClass}">
            <div class="resultTop">
              <div class="${statusClass}">${e(statusText)}</div>
              <div class="small muted">${e(detailText)}</div>
            </div>
            <div class="mono">${row.text ? e(row.text) : '<span class="muted">No record found or not returned by resolver.</span>'}</div>
          </div>
        </td>
        <td class="ttl">${e(getWeightLabel(row.weight))}</td>
        <td class="ttl">${e(String(row.ttl))}</td>
        <td class="ttl">${e(String(row.ms))} ms</td>
      </tr>
    `;
  }

  function rerenderRows(results, expected, consensus) {
    RESOLVERS.forEach((resolver) => {
      const target = document.getElementById(`row-${resolver.id}`);
      if (!target) return;
      const row = results.find((r) => r && r.id === resolver.id);
      target.outerHTML = row ? makeRowHtml(row, expected, consensus) : makePendingRow(resolver);
    });
  }

  function initPendingTable() {
    resultsBody.innerHTML = RESOLVERS.map(makePendingRow).join('');
  }

  function updateSummary(results, domain, type, expected) {
    const consensus = getConsensus(results);
    const stats = computeWeightedStats(results, expected, consensus);

    consensusValueEl.textContent = consensus || 'No consensus';
    matchedCountEl.textContent = `${stats.matchedWeight.toFixed(2)}/${stats.totalWeight.toFixed(2)}`;
    propPercentEl.textContent = `${stats.percent}%`;
    queryLabelEl.textContent = `${domain} / ${type}`;

    rerenderRows(results, expected, consensus);

    const completed = results.filter(Boolean).length;
    const standardOk = results.filter((r) => r && r.kind === 'standard' && r.ok).length;

    if (completed < RESOLVERS.length) {
      setStatus(`Checking… ${completed}/${RESOLVERS.length}`);
    } else if (stats.matchedWeight > 0) {
      if (standardOk >= 2 && stats.percent >= 75) setStatus('Strong propagation', 'ok');
      else setStatus('Partial propagation', 'ok');
    } else {
      setStatus('No clear propagation yet', 'bad');
    }

    lastSummary =
`DNS Propagation Checker
Domain: ${domain}
Type: ${type}
Expected: ${expected || '(none)'}
Consensus: ${consensus || '(none)'}
Weighted Match: ${stats.matchedWeight.toFixed(2)}/${stats.totalWeight.toFixed(2)}
Propagation: ${stats.percent}%

${results.filter(Boolean).map((r) => `- ${r.resolver}: ${r.text || 'No answer'} | Weight: ${r.weight} | TTL: ${r.ttl} | Latency: ${r.ms}ms`).join('\n')}`;
  }

  async function runCheck() {
    const domain = normalizeDomain(domainEl.value);
    const type = typeEl.value;
    const expected = (expectedEl.value || '').trim();

    if (!domain) {
      setStatus('Enter a domain', 'bad');
      domainEl.focus();
      return;
    }

    activeRunId += 1;
    const runId = activeRunId;

    queryLabelEl.textContent = `${domain} / ${type}`;
    matchedCountEl.textContent = '…';
    propPercentEl.textContent = '…';
    consensusValueEl.textContent = 'Checking…';
    loader.classList.add('show');
    setStatus('Checking…');

    checkBtn.disabled = true;
    checkBtn.textContent = 'Checking…';

    const results = [];
    initPendingTable();

    try {
      const tasks = RESOLVERS.map(async (resolver, index) => {
        let row;
        try {
          row = await queryResolver(resolver, domain, type);
        } catch (err) {
          row = {
            id: resolver.id,
            resolver: resolver.name,
            provider: resolver.provider,
            kind: resolver.kind,
            weight: resolver.weight,
            ok: false,
            answers: [],
            text: '',
            ttl: '—',
            ms: '—',
            error: err && err.name === 'AbortError' ? 'Timed out' : String(err)
          };
        }

        if (runId !== activeRunId) return;
        results[index] = row;
        updateSummary(results, domain, type, expected);
      });

      await Promise.all(tasks);

      if (runId !== activeRunId) return;

      loader.classList.remove('show');
      checkBtn.disabled = false;
      checkBtn.textContent = 'Check Propagation';
    } catch (err) {
      if (runId !== activeRunId) return;

      resultsBody.innerHTML = `
        <tr>
          <td class="resolver">Error</td>
          <td class="resultCell">
            <div class="resultBox bad">
              <div class="resultTop">
                <div class="resultStatus bad">Request failed</div>
              </div>
              <div class="mono">${window.InstantQR.escapeHtml(String(err))}</div>
            </div>
          </td>
          <td class="ttl">—</td>
          <td class="ttl">—</td>
          <td class="ttl">—</td>
        </tr>
      `;
      matchedCountEl.textContent = '0.00/0.00';
      propPercentEl.textContent = '0%';
      consensusValueEl.textContent = '—';
      setStatus('Request failed', 'bad');
      loader.classList.remove('show');
      checkBtn.disabled = false;
      checkBtn.textContent = 'Check Propagation';
    }
  }

  checkBtn.addEventListener('click', runCheck);

  domainEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runCheck();
    }
  });

  expectedEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runCheck();
    }
  });

  document.querySelectorAll('.quick button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [d, t, e] = btn.dataset.fill.split('|');
      domainEl.value = d || '';
      typeEl.value = t || 'A';
      expectedEl.value = e || '';
      runCheck();
    });
  });

  copyBtn.addEventListener('click', () => {
    if (!lastSummary) {
      setStatus('Nothing to copy', 'bad');
      return;
    }
    copyText(lastSummary);
  });

  shareBtn.addEventListener('click', () => {
    const domain = normalizeDomain(domainEl.value);
    const type = typeEl.value;
    const expected = (expectedEl.value || '').trim();
    const u = new URL(location.href);
    if (domain) u.searchParams.set('domain', domain);
    if (type) u.searchParams.set('type', type);
    if (expected) u.searchParams.set('expected', expected);
    copyText(u.toString());
  });

  (function initFromQuery() {
    const p = new URLSearchParams(location.search);
    const d = p.get('domain');
    const t = p.get('type');
    const e = p.get('expected');
    if (d) domainEl.value = d;
    if (t && [...typeEl.options].some((o) => o.value === t)) typeEl.value = t;
    if (e) expectedEl.value = e;
    if (d) runCheck();
  })();
});
