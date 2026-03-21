document.addEventListener('DOMContentLoaded', () => {
  const defaultAgentEl = document.getElementById('defaultAgent');
  const customAgentWrapEl = document.getElementById('customAgentWrap');
  const customAgentEl = document.getElementById('customAgent');
  const siteUrlEl = document.getElementById('siteUrl');
  const sitemapUrlEl = document.getElementById('sitemapUrl');
  const disallowRulesEl = document.getElementById('disallowRules');
  const allowRulesEl = document.getElementById('allowRules');
  const extraSitemapsEl = document.getElementById('extraSitemaps');
  const customDirectivesEl = document.getElementById('customDirectives');

  const generateBtn = document.getElementById('generateBtn');
  const sampleBtn = document.getElementById('sampleBtn');
  const clearBtn = document.getElementById('clearBtn');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  const outputCodeEl = document.getElementById('outputCode');
  const statusBoxEl = document.getElementById('statusBox');
  const activeAgentEl = document.getElementById('activeAgent');
  const groupListEl = document.getElementById('groupList');
  const sitemapListEl = document.getElementById('sitemapList');

  const groupCountEl = document.getElementById('groupCount');
  const ruleCountEl = document.getElementById('ruleCount');
  const sitemapCountEl = document.getElementById('sitemapCount');
  const outputLineCountEl = document.getElementById('outputLineCount');
  const ruleLineCountEl = document.getElementById('ruleLineCount');
  const yearEl = document.getElementById('year');

  if (!defaultAgentEl || !outputCodeEl) return;

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  function safeTrim(value) {
    return String(value || '').trim();
  }

  function uniqueNonEmptyLines(value) {
    const seen = new Set();
    const out = [];

    String(value || '')
      .split(/\r?\n/)
      .map(line => safeTrim(line))
      .forEach(line => {
        if (!line || seen.has(line)) return;
        seen.add(line);
        out.push(line);
      });

    return out;
  }

  function normalizeAgent() {
    const selected = defaultAgentEl.value;
    if (selected === '__custom__') {
      return safeTrim(customAgentEl.value) || '*';
    }
    return selected || '*';
  }

  function normalizePathLine(path) {
    const clean = safeTrim(path);
    if (!clean) return '';
    if (clean === '/') return '/';
    if (/^[a-z]+:\/\//i.test(clean)) {
      try {
        const url = new URL(clean);
        return url.pathname + (url.search || '');
      } catch (_) {
        return clean;
      }
    }
    return clean.startsWith('/') ? clean : '/' + clean;
  }

  function normalizeSitemapUrl(url) {
    const clean = safeTrim(url);
    if (!clean) return '';
    if (/^https?:\/\//i.test(clean)) return clean;
    const base = safeTrim(siteUrlEl.value);
    if (base) {
      try {
        return new URL(clean.replace(/^\/+/, '/'), base).toString();
      } catch (_) {
        return clean;
      }
    }
    return clean;
  }

  function setStatus(html) {
    if (statusBoxEl) statusBoxEl.innerHTML = html;
  }

  function countRuleLines() {
    const disallowCount = uniqueNonEmptyLines(disallowRulesEl.value).length;
    const allowCount = uniqueNonEmptyLines(allowRulesEl.value).length;
    const customCount = uniqueNonEmptyLines(customDirectivesEl.value).length;
    const total = disallowCount + allowCount + customCount;
    if (ruleLineCountEl) ruleLineCountEl.textContent = String(total);
  }

  function buildRobots() {
    const agent = normalizeAgent();
    const disallowRules = uniqueNonEmptyLines(disallowRulesEl.value).map(normalizePathLine).filter(Boolean);
    const allowRules = uniqueNonEmptyLines(allowRulesEl.value).map(normalizePathLine).filter(Boolean);
    const customDirectives = uniqueNonEmptyLines(customDirectivesEl.value);

    const sitemaps = [
      normalizeSitemapUrl(sitemapUrlEl.value),
      ...uniqueNonEmptyLines(extraSitemapsEl.value).map(normalizeSitemapUrl)
    ].filter(Boolean);

    const lines = [];
    lines.push(`User-agent: ${agent}`);

    if (!disallowRules.length && !allowRules.length) {
      lines.push('Disallow:');
    } else {
      disallowRules.forEach(rule => lines.push(`Disallow: ${rule}`));
      allowRules.forEach(rule => lines.push(`Allow: ${rule}`));
    }

    if (customDirectives.length) {
      customDirectives.forEach(rule => lines.push(rule));
    }

    if (sitemaps.length) {
      lines.push('');
      sitemaps.forEach(url => lines.push(`Sitemap: ${url}`));
    }

    return {
      agent,
      disallowRules,
      allowRules,
      customDirectives,
      sitemaps,
      lines,
      output: lines.join('\n')
    };
  }

  function renderGroups(data) {
    if (!groupListEl) return;

    const totalRules = data.disallowRules.length + data.allowRules.length + data.customDirectives.length;

    if (!totalRules) {
      groupListEl.innerHTML = '<div class="empty-state">No specific rules yet. The generated file currently allows all crawlers.</div>';
      return;
    }

    const rows = [];

    data.disallowRules.forEach(rule => {
      rows.push(`
        <div class="group-item">
          <div class="item-head">
            <span class="item-badge">Disallow</span>
            <span class="item-meta mono">User-agent: ${escapeHtml(data.agent)}</span>
          </div>
          <div class="item-path mono">${escapeHtml(rule)}</div>
        </div>
      `);
    });

    data.allowRules.forEach(rule => {
      rows.push(`
        <div class="group-item">
          <div class="item-head">
            <span class="item-badge">Allow</span>
            <span class="item-meta mono">User-agent: ${escapeHtml(data.agent)}</span>
          </div>
          <div class="item-path mono">${escapeHtml(rule)}</div>
        </div>
      `);
    });

    data.customDirectives.forEach(rule => {
      rows.push(`
        <div class="group-item">
          <div class="item-head">
            <span class="item-badge">Directive</span>
            <span class="item-meta mono">Custom</span>
          </div>
          <div class="item-path mono">${escapeHtml(rule)}</div>
        </div>
      `);
    });

    groupListEl.innerHTML = rows.join('');
  }

  function renderSitemaps(data) {
    if (!sitemapListEl) return;

    if (!data.sitemaps.length) {
      sitemapListEl.innerHTML = '<div class="empty-state">No sitemap URLs added yet.</div>';
      return;
    }

    sitemapListEl.innerHTML = data.sitemaps.map(url => `
      <div class="sitemap-item">
        <div class="item-head">
          <span class="item-badge">Sitemap</span>
          <span class="item-meta mono">Included</span>
        </div>
        <div class="item-path mono">${escapeHtml(url)}</div>
      </div>
    `).join('');
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function updateSummary(data) {
    if (activeAgentEl) activeAgentEl.textContent = `Agent: ${data.agent}`;
    if (groupCountEl) groupCountEl.textContent = '1';
    if (ruleCountEl) ruleCountEl.textContent = String(data.disallowRules.length + data.allowRules.length + data.customDirectives.length);
    if (sitemapCountEl) sitemapCountEl.textContent = String(data.sitemaps.length);
    if (outputLineCountEl) outputLineCountEl.textContent = String(data.lines.length);
  }

  function generate() {
    const data = buildRobots();
    outputCodeEl.textContent = data.output;
    updateSummary(data);
    renderGroups(data);
    renderSitemaps(data);

    const totalRules = data.disallowRules.length + data.allowRules.length + data.customDirectives.length;

    setStatus(
      `<strong>Generated.</strong><br>` +
      `Created a robots.txt file for <b>${escapeHtml(data.agent)}</b> with ` +
      `<b>${totalRules}</b> directive${totalRules === 1 ? '' : 's'} and ` +
      `<b>${data.sitemaps.length}</b> sitemap${data.sitemaps.length === 1 ? '' : 's'}.`
    );
  }

  function reset() {
    defaultAgentEl.value = '*';
    customAgentEl.value = '';
    customAgentWrapEl.hidden = true;
    siteUrlEl.value = '';
    sitemapUrlEl.value = '';
    disallowRulesEl.value = '';
    allowRulesEl.value = '';
    extraSitemapsEl.value = '';
    customDirectivesEl.value = '';

    const data = buildRobots();
    outputCodeEl.textContent = data.output;
    updateSummary(data);
    renderGroups(data);
    renderSitemaps(data);
    countRuleLines();

    setStatus('<strong>Ready.</strong><br>Add your rules, then click <b>Generate Robots.txt</b>.');
  }

  function loadSample(preset = 'basic') {
    defaultAgentEl.value = '*';
    customAgentWrapEl.hidden = true;
    customAgentEl.value = '';
    siteUrlEl.value = 'https://example.com';
    extraSitemapsEl.value = '';
    customDirectivesEl.value = '';

    if (preset === 'wordpress') {
      sitemapUrlEl.value = 'https://example.com/sitemap_index.xml';
      disallowRulesEl.value = '/wp-admin/\n/cgi-bin/\n/search?';
      allowRulesEl.value = '/wp-admin/admin-ajax.php\n/wp-content/uploads/';
    } else if (preset === 'shop') {
      sitemapUrlEl.value = 'https://example.com/sitemap.xml';
      disallowRulesEl.value = '/cart/\n/checkout/\n/account/\n/search?';
      allowRulesEl.value = '/products/\n/collections/\n/assets/';
    } else if (preset === 'open') {
      sitemapUrlEl.value = 'https://example.com/sitemap.xml';
      disallowRulesEl.value = '';
      allowRulesEl.value = '';
    } else {
      sitemapUrlEl.value = 'https://example.com/sitemap.xml';
      disallowRulesEl.value = '/admin/\n/private/\n/tmp/';
      allowRulesEl.value = '/admin/help/\n/assets/\n/images/';
    }

    countRuleLines();
    generate();
  }

  async function copyOutput() {
    const text = outputCodeEl.textContent || '';
    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(text);
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        temp.remove();
      }

      setStatus('<strong>Copied.</strong><br>Your generated robots.txt was copied to the clipboard.');
    } catch (_) {
      setStatus('<strong>Copy failed.</strong><br>Please copy the generated robots.txt manually.');
    }
  }

  function downloadOutput() {
    const text = (outputCodeEl.textContent || '') + '\n';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = blobUrl;
    a.download = 'robots.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 500);
    setStatus('<strong>Downloaded.</strong><br>Your robots.txt file was downloaded.');
  }

  defaultAgentEl.addEventListener('change', () => {
    customAgentWrapEl.hidden = defaultAgentEl.value !== '__custom__';
    if (defaultAgentEl.value !== '__custom__') {
      customAgentEl.value = '';
    }
    generate();
  });

  [
    customAgentEl,
    siteUrlEl,
    sitemapUrlEl,
    disallowRulesEl,
    allowRulesEl,
    extraSitemapsEl,
    customDirectivesEl
  ].forEach(el => {
    el.addEventListener('input', () => {
      countRuleLines();
      generate();
    });
  });

  generateBtn.addEventListener('click', generate);
  sampleBtn.addEventListener('click', () => loadSample('basic'));
  clearBtn.addEventListener('click', reset);
  copyBtn.addEventListener('click', copyOutput);
  downloadBtn.addEventListener('click', downloadOutput);

  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => loadSample(btn.getAttribute('data-preset')));
  });

  countRuleLines();
  reset();
});
