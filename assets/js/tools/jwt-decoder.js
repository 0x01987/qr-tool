document.addEventListener('DOMContentLoaded', () => {
  const tokenInputEl = document.getElementById('tokenInput');
  const decodeBtn = document.getElementById('decodeBtn');
  const copyPayloadBtn = document.getElementById('copyPayloadBtn');
  const clearBtn = document.getElementById('clearBtn');

  const headerOutputEl = document.getElementById('headerOutput');
  const payloadOutputEl = document.getElementById('payloadOutput');
  const resultTextEl = document.getElementById('resultText');
  const formulaTextEl = document.getElementById('formulaText');

  const statusBadge = document.getElementById('statusBadge');
  const modeLabelEl = document.getElementById('modeLabel');
  const partsCountEl = document.getElementById('partsCount');
  const headerLenEl = document.getElementById('headerLen');
  const payloadLenEl = document.getElementById('payloadLen');

  const partsBoxEl = document.getElementById('partsBox');
  const claimsBoxEl = document.getElementById('claimsBox');

  let lastMode = 'Ready';

  function setStatus(text, kind = '') {
    if (!statusBadge) return;
    statusBadge.className = 'badge' + (kind ? ' ' + kind : '');
    statusBadge.textContent = text;
  }

  function updateMeta(partsCount = 0) {
    if (modeLabelEl) modeLabelEl.textContent = lastMode;
    if (partsCountEl) partsCountEl.textContent = String(partsCount);
    if (headerLenEl) headerLenEl.textContent = String((headerOutputEl.value || '').length);
    if (payloadLenEl) payloadLenEl.textContent = String((payloadOutputEl.value || '').length);
  }

  function setResult(text) {
    if (resultTextEl) resultTextEl.textContent = text;
  }

  function resetParts() {
    if (partsBoxEl) {
      partsBoxEl.innerHTML = `
        <div class="claimRow">
          <div class="claimKey">Header</div>
          <div class="claimVal">—</div>
        </div>
        <div class="claimRow">
          <div class="claimKey">Payload</div>
          <div class="claimVal">—</div>
        </div>
        <div class="claimRow">
          <div class="claimKey">Signature</div>
          <div class="claimVal">—</div>
        </div>
      `;
    }

    if (claimsBoxEl) {
      claimsBoxEl.innerHTML = `
        <div class="claimRow">
          <div class="claimKey">exp / iat / nbf</div>
          <div class="claimVal">Decoded timestamps will appear here if present.</div>
        </div>
      `;
    }
  }

  function resetOutput() {
    headerOutputEl.value = '';
    payloadOutputEl.value = '';
    lastMode = 'Ready';
    setStatus('Ready');
    setResult('Paste a JWT and click Decode JWT.');
    if (formulaTextEl) formulaTextEl.textContent = 'JWT format: header.payload.signature';
    resetParts();
    updateMeta(0);
  }

  function decodeBase64Url(segment) {
    let value = segment.replace(/-/g, '+').replace(/_/g, '/');
    const mod = value.length % 4;
    if (mod) value += '='.repeat(4 - mod);

    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function safeJsonParse(text) {
    try {
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  }

  function toPrettyJson(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') {
      const parsed = safeJsonParse(value);
      return parsed ? JSON.stringify(parsed, null, 2) : value;
    }
    return JSON.stringify(value, null, 2);
  }

  function formatUnixTime(value) {
    if (!Number.isFinite(value)) return String(value);
    const date = new Date(value * 1000);
    if (Number.isNaN(date.getTime())) return String(value);
    return `${value} → ${date.toISOString()}`;
  }

  function renderParts(headerPart, payloadPart, signaturePart) {
    if (!partsBoxEl) return;
    partsBoxEl.innerHTML = `
      <div class="claimRow">
        <div class="claimKey">Header</div>
        <div class="claimVal">${headerPart || '—'}</div>
      </div>
      <div class="claimRow">
        <div class="claimKey">Payload</div>
        <div class="claimVal">${payloadPart || '—'}</div>
      </div>
      <div class="claimRow">
        <div class="claimKey">Signature</div>
        <div class="claimVal">${signaturePart || '—'}</div>
      </div>
    `;
  }

  function renderClaims(payloadObj) {
    if (!claimsBoxEl) return;

    const keys = ['exp', 'iat', 'nbf'];
    const found = keys.filter((key) => payloadObj && Object.prototype.hasOwnProperty.call(payloadObj, key));

    if (!found.length) {
      claimsBoxEl.innerHTML = `
        <div class="claimRow">
          <div class="claimKey">Timestamp claims</div>
          <div class="claimVal">No exp, iat, or nbf values found in the payload.</div>
        </div>
      `;
      return;
    }

    claimsBoxEl.innerHTML = found.map((key) => `
      <div class="claimRow">
        <div class="claimKey">${key}</div>
        <div class="claimVal">${formatUnixTime(Number(payloadObj[key]))}</div>
      </div>
    `).join('');
  }

  function decodeJwt() {
    const token = (tokenInputEl.value || '').trim();

    if (!token) {
      headerOutputEl.value = '';
      payloadOutputEl.value = '';
      lastMode = 'No input';
      setStatus('Enter JWT', 'bad');
      setResult('Paste a JWT token first.');
      resetParts();
      updateMeta(0);
      return;
    }

    const parts = token.split('.');
    renderParts(parts[0] || '', parts[1] || '', parts[2] || '');

    if (parts.length < 2) {
      headerOutputEl.value = '';
      payloadOutputEl.value = '';
      lastMode = 'Invalid token';
      setStatus('Invalid JWT', 'bad');
      setResult('A JWT should contain at least header and payload segments.');
      if (formulaTextEl) formulaTextEl.textContent = 'JWT format: header.payload.signature';
      resetParts();
      updateMeta(parts.length);
      return;
    }

    try {
      const decodedHeader = decodeBase64Url(parts[0]);
      const decodedPayload = decodeBase64Url(parts[1]);

      const headerObj = safeJsonParse(decodedHeader);
      const payloadObj = safeJsonParse(decodedPayload);

      headerOutputEl.value = toPrettyJson(headerObj || decodedHeader);
      payloadOutputEl.value = toPrettyJson(payloadObj || decodedPayload);

      renderParts(parts[0] || '', parts[1] || '', parts[2] || '');
      renderClaims(payloadObj || {});

      lastMode = 'Decoded';
      setStatus('Decoded', 'ok');
      setResult('JWT decoded successfully. Header and payload are shown below.');
      if (formulaTextEl) formulaTextEl.textContent = `JWT parts detected: ${parts.length}`;
      updateMeta(parts.length);
    } catch (_) {
      headerOutputEl.value = '';
      payloadOutputEl.value = '';
      lastMode = 'Decode error';
      setStatus('Decode failed', 'bad');
      setResult('Unable to decode this JWT. Check that the token is valid Base64URL.');
      if (formulaTextEl) formulaTextEl.textContent = 'JWT format: header.payload.signature';
      resetParts();
      updateMeta(parts.length);
    }
  }

  decodeBtn?.addEventListener('click', decodeJwt);

  copyPayloadBtn?.addEventListener('click', async () => {
    const text = payloadOutputEl.value || '';
    if (!text) {
      setStatus('Nothing to copy', 'bad');
      return;
    }

    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setStatus('Copied', 'ok');
      setTimeout(() => {
        setStatus(lastMode === 'Ready' ? 'Ready' : 'Decoded', lastMode === 'Ready' ? '' : 'ok');
      }, 1200);
    } catch (_) {
      setStatus('Copy failed', 'bad');
    }
  });

  clearBtn?.addEventListener('click', () => {
    tokenInputEl.value = '';
    resetOutput();
    tokenInputEl.focus();
  });

  tokenInputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      decodeJwt();
    }
  });

  document.querySelectorAll('.quick button[data-fill]').forEach((btn) => {
    btn.addEventListener('click', () => {
      tokenInputEl.value = btn.dataset.fill || '';
      setStatus('Example loaded', 'ok');
      setResult('Example JWT loaded. Click Decode JWT.');
      lastMode = 'Example';
      updateMeta(0);
      tokenInputEl.focus();
    });
  });

  resetOutput();
});
