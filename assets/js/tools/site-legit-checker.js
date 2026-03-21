document.addEventListener('DOMContentLoaded', () => {
  const siteUrlEl = document.getElementById('siteUrl');
  const knownBrandEl = document.getElementById('knownBrand');
  const contextNotesEl = document.getElementById('contextNotes');

  const checkBtn = document.getElementById('checkBtn');
  const sampleBtn = document.getElementById('sampleBtn');
  const clearBtn = document.getElementById('clearBtn');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  const statusBoxEl = document.getElementById('statusBox');
  const hostLabelEl = document.getElementById('hostLabel');
  const trustScoreEl = document.getElementById('trustScore');
  const verdictLabelEl = document.getElementById('verdictLabel');
  const findingCountEl = document.getElementById('findingCount');
  const protocolLabelEl = document.getElementById('protocolLabel');
  const signalCountEl = document.getElementById('signalCount');
  const findingListEl = document.getElementById('findingList');
  const outputCodeEl = document.getElementById('outputCode');
  const nextStepsEl = document.getElementById('nextSteps');
  const yearEl = document.getElementById('year');

  if (!siteUrlEl || !checkBtn) return;

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  const SHORTENERS = [
    'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'buff.ly',
    'rb.gy', 'cutt.ly', 'is.gd', 'rebrand.ly', 'tiny.one', 'shorturl.at'
  ];

  const RISKY_TLDS = [
    'zip', 'mov', 'click', 'work', 'gq', 'tk', 'ml', 'cf', 'ga', 'top',
    'rest', 'country', 'kim', 'support', 'live', 'help', 'monster'
  ];

  const SUSPICIOUS_TERMS = [
    'login', 'signin', 'verify', 'verification', 'secure', 'account',
    'update', 'payment', 'invoice', 'wallet', 'bank', 'gift', 'bonus',
    'claim', 'refund', 'reset', 'unlock', 'confirm', 'free', 'winner',
    'airdrop', 'seed', 'recovery', 'auth', 'authenticate', 'support'
  ];

  const HIGH_RISK_CONTEXT = [
    'sms', 'text message', 'email', 'urgent', 'invoice', 'refund',
    'password', 'bank', 'wallet', 'crypto', 'gift card', 'login'
  ];

  let lastResultText = 'No analysis yet.';

  function safeTrim(value) {
    return String(value || '').trim();
  }

  function ensureUrl(url) {
    const clean = safeTrim(url);
    if (!clean) return '';
    if (/^https?:\/\//i.test(clean)) return clean;
    return 'https://' + clean;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setStatus(html) {
    if (statusBoxEl) statusBoxEl.innerHTML = html;
  }

  function addFinding(findings, severity, title, detail, penalty) {
    findings.push({
      severity,
      title,
      detail,
      penalty
    });
  }

  function isIPv4(host) {
    return /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(host);
  }

  function hasLongRandomSegment(value) {
    return /[a-z0-9]{18,}/i.test(value);
  }

  function countChar(value, char) {
    return (String(value).match(new RegExp(`\\${char}`, 'g')) || []).length;
  }

  function getBaseDomain(host) {
    const parts = host.split('.').filter(Boolean);
    if (parts.length <= 2) return host;
    return parts.slice(-2).join('.');
  }

  function analyzeUrl(inputUrl, brand, contextNotes) {
    const findings = [];
    const normalized = ensureUrl(inputUrl);

    if (!normalized) {
      return {
        ok: false,
        message: 'Please enter a website URL.',
        findings: [],
        score: 100,
        verdict: 'Unknown'
      };
    }

    let url;
    try {
      url = new URL(normalized);
    } catch (_) {
      return {
        ok: false,
        message: 'That does not look like a valid URL.',
        findings: [],
        score: 100,
        verdict: 'Unknown'
      };
    }

    const host = (url.hostname || '').toLowerCase();
    const href = url.href.toLowerCase();
    const pathname = (url.pathname || '').toLowerCase();
    const search = (url.search || '').toLowerCase();
    const fullPath = `${pathname}${search}`;
    const protocol = url.protocol.replace(':', '');
    const brandLower = safeTrim(brand).toLowerCase();
    const contextLower = safeTrim(contextNotes).toLowerCase();
    const tld = host.includes('.') ? host.split('.').pop() : '';
    const subdomainCount = Math.max(0, host.split('.').length - 2);
    const hyphenCount = countChar(host, '-');

    if (protocol !== 'https') {
      addFinding(findings, 'high', 'No HTTPS detected', 'The URL does not use HTTPS. Sensitive actions like login or payment should not be trusted on plain HTTP.', 28);
    }

    if (host.startsWith('xn--') || host.includes('.xn--')) {
      addFinding(findings, 'high', 'Punycode / IDN detected', 'This domain uses punycode, which can sometimes be used in lookalike phishing domains.', 26);
    }

    if (isIPv4(host)) {
      addFinding(findings, 'high', 'Raw IP address used as host', 'Legitimate consumer sites rarely ask users to log in or pay on a raw IP address URL.', 24);
    }

    if (SHORTENERS.some(shortener => host === shortener || host.endsWith(`.${shortener}`))) {
      addFinding(findings, 'medium', 'Shortened URL', 'Shortened links hide the final destination and are common in phishing and scam campaigns.', 16);
    }

    if (RISKY_TLDS.includes(tld)) {
      addFinding(findings, 'medium', 'Higher-risk top-level domain', `The .${tld} TLD is more commonly seen in low-trust or throwaway campaigns than traditional business domains.`, 12);
    }

    if (subdomainCount >= 3) {
      addFinding(findings, 'medium', 'Many subdomains', 'Excessive subdomains can be used to make a URL look official while hiding the real base domain.', 10);
    }

    if (hyphenCount >= 3) {
      addFinding(findings, 'medium', 'Many hyphens in hostname', 'Multiple hyphens in the domain can be a sign of low-quality or deceptive naming.', 8);
    }

    if (host.length > 35) {
      addFinding(findings, 'medium', 'Very long hostname', 'Overly long hostnames can be harder to verify visually and are sometimes used in phishing URLs.', 8);
    }

    if (fullPath.length > 90) {
      addFinding(findings, 'medium', 'Very long path or query string', 'Long paths and queries can hide suspicious parameters or mimic legitimate flows.', 8);
    }

    if (hasLongRandomSegment(fullPath)) {
      addFinding(findings, 'medium', 'Long random-looking URL segment', 'Long unbroken strings in the path or query can indicate tracking or suspicious URL structure.', 7);
    }

    const matchedTerms = SUSPICIOUS_TERMS.filter(term => href.includes(term));
    if (matchedTerms.length >= 3) {
      addFinding(findings, 'high', 'Many suspicious keywords in URL', `The URL contains several phishing-related terms: ${matchedTerms.slice(0, 5).join(', ')}.`, 22);
    } else if (matchedTerms.length >= 1) {
      addFinding(findings, 'medium', 'Suspicious keyword present', `The URL contains keyword${matchedTerms.length > 1 ? 's' : ''}: ${matchedTerms.slice(0, 4).join(', ')}.`, 10);
    }

    if (href.includes('@')) {
      addFinding(findings, 'high', 'At-sign found in URL', 'The @ character can obscure the real destination in deceptive links.', 20);
    }

    if (search.includes('redirect=') || search.includes('url=') || search.includes('next=') || search.includes('target=')) {
      addFinding(findings, 'medium', 'Redirect parameter found', 'Redirect-style parameters can sometimes be used to bounce users through tracking or phishing flows.', 8);
    }

    if (brandLower) {
      const baseDomain = getBaseDomain(host);
      const domainContainsBrand = baseDomain.includes(brandLower.replace(/\s+/g, '')) || host.includes(brandLower.replace(/\s+/g, ''));
      const urlMentionsBrand = href.includes(brandLower.replace(/\s+/g, ''));
      if (!domainContainsBrand && urlMentionsBrand) {
        addFinding(findings, 'high', 'Possible brand impersonation', `The URL mentions "${brand}" but the main domain does not clearly match that brand.`, 24);
      } else if (!domainContainsBrand && matchedTerms.length > 0) {
        addFinding(findings, 'medium', 'Brand does not clearly match domain', `You entered "${brand}", but the hostname does not clearly reflect that brand. Double-check the official domain.`, 12);
      }
    }

    const highRiskContextMatches = HIGH_RISK_CONTEXT.filter(term => contextLower.includes(term));
    if (highRiskContextMatches.length >= 2 && findings.length > 0) {
      addFinding(findings, 'medium', 'High-risk delivery context', 'You indicated this link came through a context often used in scams, such as urgent email, SMS, invoices, refunds, or wallet prompts.', 10);
    }

    let score = 100;
    findings.forEach(item => {
      score -= item.penalty;
    });
    score = Math.max(0, Math.min(100, score));

    let verdict = 'Likely Safe';
    let verdictClass = 'verdict-safe';

    if (score < 45) {
      verdict = 'High Risk';
      verdictClass = 'verdict-danger';
    } else if (score < 75) {
      verdict = 'Use Caution';
      verdictClass = 'verdict-caution';
    }

    return {
      ok: true,
      url,
      host,
      protocol,
      findings,
      score,
      verdict,
      verdictClass
    };
  }

  function renderFindings(result) {
    if (!findingListEl) return;

    if (!result.findings.length) {
      findingListEl.innerHTML = '<div class="empty-state">No strong URL-based warning signals were found. Still verify the site manually before entering sensitive information.</div>';
      return;
    }

    findingListEl.innerHTML = result.findings.map(item => `
      <div class="finding-item">
        <div class="item-head">
          <span class="item-badge ${item.severity}">${item.severity}</span>
          <span class="item-meta mono">-${item.penalty} score</span>
        </div>
        <div class="item-title">${escapeHtml(item.title)}</div>
        <div class="item-copy">${escapeHtml(item.detail)}</div>
      </div>
    `).join('');
  }

  function buildSummaryText(result) {
    const lines = [];
    lines.push(`URL: ${result.url.href}`);
    lines.push(`Host: ${result.host}`);
    lines.push(`Protocol: ${result.protocol.toUpperCase()}`);
    lines.push(`Trust score: ${result.score}/100`);
    lines.push(`Verdict: ${result.verdict}`);
    lines.push(`Signals found: ${result.findings.length}`);
    lines.push('');

    if (result.findings.length) {
      lines.push('Findings:');
      result.findings.forEach((item, index) => {
        lines.push(`${index + 1}. [${item.severity.toUpperCase()}] ${item.title} — ${item.detail}`);
      });
    } else {
      lines.push('No strong URL-based warning signals detected.');
    }

    lines.push('');
    lines.push('Important: This result is heuristic only and does not guarantee safety.');
    return lines.join('\n');
  }

  function renderNextSteps(result) {
    if (!nextStepsEl) return;

    if (result.verdict === 'High Risk') {
      nextStepsEl.innerHTML =
        'Avoid logging in, paying, connecting wallets, or downloading files. Navigate manually from the known official homepage, verify the domain carefully, and use additional trusted security tools before doing anything sensitive.';
      return;
    }

    if (result.verdict === 'Use Caution') {
      nextStepsEl.innerHTML =
        'Double-check the domain spelling, brand match, and HTTPS. Avoid trusting links from urgent emails, SMS, or unknown chats. Navigate manually from the official homepage when possible.';
      return;
    }

    nextStepsEl.innerHTML =
      'No strong URL-based warnings were found, but still verify the company, domain spelling, and page purpose before entering passwords, payment info, or wallet approvals.';
  }

  function updateUi(result) {
    if (!result.ok) {
      setStatus(`<strong>Could not analyze.</strong><br>${escapeHtml(result.message)}`);
      if (hostLabelEl) hostLabelEl.textContent = 'Host: —';
      if (trustScoreEl) trustScoreEl.textContent = '—';
      if (verdictLabelEl) {
        verdictLabelEl.textContent = 'Unknown';
        verdictLabelEl.className = 'v';
      }
      if (findingCountEl) findingCountEl.textContent = '0';
      if (protocolLabelEl) protocolLabelEl.textContent = '—';
      if (signalCountEl) signalCountEl.textContent = '0';
      if (outputCodeEl) outputCodeEl.textContent = result.message;
      if (findingListEl) findingListEl.innerHTML = '<div class="empty-state">No analysis yet.</div>';
      if (nextStepsEl) nextStepsEl.textContent = 'Run a check to get recommendations.';
      lastResultText = result.message;
      return;
    }

    if (hostLabelEl) hostLabelEl.textContent = `Host: ${result.host}`;
    if (trustScoreEl) trustScoreEl.textContent = String(result.score);
    if (verdictLabelEl) {
      verdictLabelEl.textContent = result.verdict;
      verdictLabelEl.className = `v ${result.verdictClass}`;
    }
    if (findingCountEl) findingCountEl.textContent = String(result.findings.length);
    if (signalCountEl) signalCountEl.textContent = String(result.findings.length);
    if (protocolLabelEl) protocolLabelEl.textContent = result.protocol.toUpperCase();

    setStatus(
      `<strong>Analysis complete.</strong><br>` +
      `This URL scored <b>${result.score}/100</b> and is currently flagged as <b>${escapeHtml(result.verdict)}</b>.`
    );

    renderFindings(result);
    renderNextSteps(result);

    const summary = buildSummaryText(result);
    lastResultText = summary;
    if (outputCodeEl) outputCodeEl.textContent = summary;
  }

  function runCheck() {
    const result = analyzeUrl(
      siteUrlEl.value,
      knownBrandEl.value,
      contextNotesEl.value
    );
    updateUi(result);
  }

  function reset() {
    siteUrlEl.value = '';
    knownBrandEl.value = '';
    contextNotesEl.value = '';

    if (hostLabelEl) hostLabelEl.textContent = 'Host: —';
    if (trustScoreEl) trustScoreEl.textContent = '100';
    if (verdictLabelEl) {
      verdictLabelEl.textContent = 'Unknown';
      verdictLabelEl.className = 'v verdict-safe';
    }
    if (findingCountEl) findingCountEl.textContent = '0';
    if (protocolLabelEl) protocolLabelEl.textContent = '—';
    if (signalCountEl) signalCountEl.textContent = '0';
    if (findingListEl) findingListEl.innerHTML = '<div class="empty-state">No analysis yet.</div>';
    if (outputCodeEl) outputCodeEl.textContent = 'No analysis yet.';
    if (nextStepsEl) nextStepsEl.textContent = 'Run a check to get recommendations.';
    setStatus('<strong>Ready.</strong><br>Enter a website URL, then click <b>Check Site</b>.');
    lastResultText = 'No analysis yet.';
  }

  function loadSample(kind = 'caution') {
    if (kind === 'safe') {
      siteUrlEl.value = 'https://www.paypal.com/us/home';
      knownBrandEl.value = 'PayPal';
      contextNotesEl.value = 'Opened manually from browser bookmark.';
    } else if (kind === 'danger') {
      siteUrlEl.value = 'http://paypal-login-secure-account-verify.top/refund/confirm?redirect=wallet&auth=freegift';
      knownBrandEl.value = 'PayPal';
      contextNotesEl.value = 'Sent by urgent email asking for password reset and refund confirmation.';
    } else {
      siteUrlEl.value = 'https://paypal-support-login-help.example-login-check.work/verify/account';
      knownBrandEl.value = 'PayPal';
      contextNotesEl.value = 'Sent by email asking to verify my account.';
    }
    runCheck();
  }

  async function copyOutput() {
    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(lastResultText);
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(lastResultText);
      } else {
        const temp = document.createElement('textarea');
        temp.value = lastResultText;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        temp.remove();
      }

      setStatus('<strong>Copied.</strong><br>Your analysis summary was copied to the clipboard.');
    } catch (_) {
      setStatus('<strong>Copy failed.</strong><br>Please copy the analysis summary manually.');
    }
  }

  function downloadOutput() {
    const blob = new Blob([lastResultText + '\n'], { type: 'text/plain;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = blobUrl;
    a.download = 'site-legit-check.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 500);
    setStatus('<strong>Downloaded.</strong><br>Your analysis summary was downloaded.');
  }

  checkBtn.addEventListener('click', runCheck);
  sampleBtn.addEventListener('click', () => loadSample('caution'));
  clearBtn.addEventListener('click', reset);
  copyBtn.addEventListener('click', copyOutput);
  downloadBtn.addEventListener('click', downloadOutput);

  document.querySelectorAll('[data-sample]').forEach(btn => {
    btn.addEventListener('click', () => loadSample(btn.getAttribute('data-sample')));
  });

  [siteUrlEl, knownBrandEl, contextNotesEl].forEach(el => {
    el.addEventListener('input', () => {
      const raw = safeTrim(siteUrlEl.value);
      if (!raw) {
        reset();
        return;
      }
      runCheck();
    });
  });

  reset();
});
