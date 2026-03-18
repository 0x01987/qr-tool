document.addEventListener('DOMContentLoaded', () => {
  const pwEl = document.getElementById('pw');
  const checkBtn = document.getElementById('checkBtn');
  const clearBtn = document.getElementById('clearBtn');
  const statusEl = document.getElementById('status');
  const showPwEl = document.getElementById('showPw');
  const localOnlyEl = document.getElementById('localOnly');
  const strengthBarEl = document.getElementById('strengthBar');
  const strengthLabelEl = document.getElementById('strengthLabel');
  const yearEl = document.getElementById('year');

  if (!pwEl || !checkBtn || !clearBtn || !statusEl) return;

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  let activeRequestId = 0;

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function setStrength(score) {
    const pct = clamp(Math.round(score), 0, 100);

    if (strengthLabelEl) strengthLabelEl.textContent = `${pct}%`;
    if (!strengthBarEl) return;

    strengthBarEl.style.width = `${pct}%`;

    if (pct >= 75) {
      strengthBarEl.style.background = 'rgba(34,197,94,.95)';
    } else if (pct >= 45) {
      strengthBarEl.style.background = 'rgba(241,196,15,.95)';
    } else {
      strengthBarEl.style.background = 'rgba(255,92,122,.95)';
    }
  }

  function estimateStrength(password) {
    let score = 0;
    const len = password.length;

    score += Math.min(40, len * 3);

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNum = /\d/.test(password);
    const hasSym = /[^A-Za-z0-9]/.test(password);

    const classes = [hasLower, hasUpper, hasNum, hasSym].filter(Boolean).length;
    score += classes * 12;

    if (/^(.)\1+$/.test(password)) score -= 20;
    if (/password|qwerty|letmein|12345|iloveyou|admin|welcome/i.test(password)) score -= 25;
    if (/1234|abcd|aaaa|1111|0000/i.test(password)) score -= 10;
    if (len >= 14) score += 10;
    if (len >= 20) score += 6;

    return clamp(score, 0, 100);
  }

  async function sha1Hex(str) {
    const data = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const bytes = new Uint8Array(hashBuffer);

    let hex = '';
    for (const b of bytes) {
      hex += b.toString(16).padStart(2, '0');
    }
    return hex.toUpperCase();
  }

  function setStatus(html, tone = 'none') {
    statusEl.innerHTML = html;

    if (tone === 'good') {
      statusEl.style.borderColor = 'rgba(34,197,94,.25)';
      statusEl.style.background = 'rgba(34,197,94,.06)';
    } else if (tone === 'warn') {
      statusEl.style.borderColor = 'rgba(241,196,15,.22)';
      statusEl.style.background = 'rgba(241,196,15,.06)';
    } else if (tone === 'bad') {
      statusEl.style.borderColor = 'rgba(255,92,122,.22)';
      statusEl.style.background = 'rgba(255,92,122,.06)';
    } else {
      statusEl.style.borderColor = 'rgba(255,255,255,.12)';
      statusEl.style.background = 'rgba(0,0,0,.14)';
    }
  }

  function getLocalAdvice(password, score) {
    const notes = [];

    if (password.length < 12) {
      notes.push('Increase length to at least 12–16 characters.');
    }
    if (!/[a-z]/.test(password)) {
      notes.push('Add lowercase letters.');
    }
    if (!/[A-Z]/.test(password)) {
      notes.push('Add uppercase letters.');
    }
    if (!/\d/.test(password)) {
      notes.push('Add numbers.');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      notes.push('Add symbols for more variety.');
    }
    if (/password|qwerty|letmein|12345|admin|welcome/i.test(password)) {
      notes.push('Avoid common words and patterns.');
    }

    if (!notes.length) {
      if (score >= 80) return 'Strong local profile. Keep it unique to one site and store it in a password manager.';
      if (score >= 55) return 'Decent local profile, but longer is better.';
      return 'Usable, but could be improved with more length and variety.';
    }

    return notes.join(' ');
  }

  function resetUI() {
    pwEl.value = '';
    pwEl.type = 'password';

    if (showPwEl) showPwEl.checked = false;
    if (localOnlyEl) localOnlyEl.checked = true;

    if (strengthLabelEl) strengthLabelEl.textContent = '—';
    if (strengthBarEl) {
      strengthBarEl.style.width = '0%';
      strengthBarEl.style.background = 'rgba(255,92,122,.95)';
    }

    setStatus(
      '<strong>Awaiting input…</strong><br>Enter a password and click <b>Check</b>.',
      'none'
    );

    checkBtn.disabled = false;
  }

  function updateStrengthOnly() {
    const password = pwEl.value || '';
    if (!password) {
      if (strengthLabelEl) strengthLabelEl.textContent = '—';
      if (strengthBarEl) strengthBarEl.style.width = '0%';
      return;
    }

    setStrength(estimateStrength(password));
  }

  async function runLeakCheck() {
    const password = pwEl.value || '';
    const requestId = ++activeRequestId;

    if (!password) {
      setStatus('<strong>Enter a password.</strong><br>Nothing to check yet.', 'warn');
      return;
    }

    const score = estimateStrength(password);
    setStrength(score);

    if (localOnlyEl?.checked) {
      setStatus(
        `<strong>Privacy mode (offline)</strong><br>` +
          `No network calls were made. <br>` +
          `${getLocalAdvice(password, score)}`,
        'good'
      );
      return;
    }

    try {
      checkBtn.disabled = true;

      setStatus(
        '<strong>Checking breach database…</strong><br>' +
          'Hashing locally and querying by prefix (k-Anonymity).',
        'warn'
      );

      const hash = await sha1Hex(password);
      if (requestId !== activeRequestId) return;

      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);

      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        method: 'GET',
        headers: {
          Accept: 'text/plain'
        },
        cache: 'no-store'
      });

      if (requestId !== activeRequestId) return;

      if (!res.ok) {
        setStatus(
          `<strong>Unable to check right now.</strong><br>` +
            `Breach API returned status <b>${res.status}</b>. Try again later.`,
          'warn'
        );
        return;
      }

      const text = await res.text();
      if (requestId !== activeRequestId) return;

      let foundCount = 0;
      const lines = text.split('\n');

      for (const line of lines) {
        const parts = line.trim().split(':');
        if (parts.length !== 2) continue;

        if (parts[0].toUpperCase() === suffix) {
          foundCount = parseInt(parts[1], 10) || 0;
          break;
        }
      }

      if (foundCount > 0) {
        setStatus(
          `<strong>Found in breaches.</strong><br>` +
            `This password appears <b>${foundCount.toLocaleString()}</b> time(s) in known breach datasets. ` +
            `Change it everywhere you used it, switch to a unique password, and enable MFA.`,
          'bad'
        );
      } else {
        setStatus(
          `<strong>Not found in this dataset.</strong><br>` +
            `Good sign — but still use a unique password per site and enable MFA. ` +
            `${getLocalAdvice(password, score)}`,
          'good'
        );
      }
    } catch (_) {
      if (requestId !== activeRequestId) return;

      setStatus(
        '<strong>Error checking.</strong><br>' +
          'Your browser blocked the request or the network failed. Try again or enable Privacy mode.',
        'warn'
      );
    } finally {
      if (requestId === activeRequestId) {
        checkBtn.disabled = false;
      }
    }
  }

  showPwEl?.addEventListener('change', () => {
    pwEl.type = showPwEl.checked ? 'text' : 'password';
  });

  clearBtn.addEventListener('click', () => {
    activeRequestId += 1;
    resetUI();
    pwEl.focus();
  });

  checkBtn.addEventListener('click', runLeakCheck);

  pwEl.addEventListener('input', updateStrengthOnly);

  pwEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runLeakCheck();
    }
  });

  resetUI();
});
