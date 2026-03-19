document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  const yearEl = $('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const statusTextEl = $('statusText');
  const summaryTextEl = $('summaryText');
  const currentModeTextEl = $('currentModeText');
  const toastEl = $('toast');

  let toastTimer = null;

  function setStatus(text) {
    if (statusTextEl) statusTextEl.textContent = text;
  }

  function setSummary(text) {
    if (summaryTextEl) summaryTextEl.textContent = text;
  }

  function toast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.style.display = 'none';
    }, 1600);
  }

  async function copyText(text) {
    try {
      if (window.InstantQR && typeof window.InstantQR.copyText === 'function') {
        await window.InstantQR.copyText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }
      toast('Copied!');
      return true;
    } catch (_) {
      toast('Copy failed');
      return false;
    }
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function formatDHMS(ms) {
    const safeMs = Math.max(0, ms);
    const totalSec = Math.floor(safeMs / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return { days, hours, mins, secs, totalSec };
  }

  function fmtDisplay(obj) {
    return `${obj.days}d ${pad(obj.hours)}h ${pad(obj.mins)}m ${pad(obj.secs)}s`;
  }

  function parseDateTime(dateStr, timeStr, tzMode) {
    if (!dateStr) return null;
    const t = timeStr || '00:00:00';
    const parts = t.split(':').map(Number);
    const hh = parts[0] || 0;
    const mm = parts[1] || 0;
    const ss = parts[2] || 0;
    const [year, month, day] = dateStr.split('-').map(Number);

    if (tzMode === 'utc') {
      return new Date(Date.UTC(year, month - 1, day, hh, mm, ss));
    }

    return new Date(year, month - 1, day, hh, mm, ss);
  }

  function nowInMode(tzMode) {
    const now = new Date();
    if (tzMode === 'utc') {
      return new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
      ));
    }
    return now;
  }

  function setInputsToNow(dateId, timeId) {
    const now = new Date();
    const dateEl = $(dateId);
    const timeEl = $(timeId);

    if (dateEl) {
      dateEl.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }
    if (timeEl) {
      timeEl.value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }
  }

  // Tabs
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = {
    countdown: $('panel-countdown'),
    duration: $('panel-duration'),
    calc: $('panel-calc'),
    between: $('panel-between')
  };

  function showTab(name) {
    tabs.forEach((tab) => {
      const active = tab.dataset.tab === name;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    Object.entries(panels).forEach(([key, panel]) => {
      if (!panel) return;
      panel.classList.toggle('active', key === name);
    });

    const labels = {
      countdown: 'Countdown',
      duration: 'Duration',
      calc: 'Time Calculator',
      between: 'Time Between'
    };

    if (currentModeTextEl) currentModeTextEl.textContent = labels[name] || 'Countdown';
    setStatus('Ready');
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => showTab(tab.dataset.tab));
  });

  // Defaults
  setInputsToNow('tcBaseDate', 'tcBaseTime');
  setInputsToNow('tbStartDate', 'tbStartTime');
  setInputsToNow('tbEndDate', 'tbEndTime');

  // COUNTDOWN
  let cdTimer = null;
  let cdPaused = false;
  let cdRemaining = 0;

  function cdUpdate() {
    const tzMode = $('cdTimezone').value === 'utc' ? 'utc' : 'local';
    const dateStr = $('cdDate').value;
    const timeStr = $('cdTime').value;
    const target = parseDateTime(dateStr, timeStr, tzMode);

    if (!target) {
      $('cdDisplay').textContent = '—';
      return;
    }

    const title = ($('cdTitle').value || 'Countdown').trim();
    $('cdLiveLabel').textContent = title;

    const targetText = tzMode === 'utc'
      ? `${target.toISOString().replace('T', ' ').replace('Z', '')} UTC`
      : target.toLocaleString();

    $('cdTargetText').textContent = `Target: ${targetText}`;

    const now = nowInMode(tzMode);
    const diff = target.getTime() - now.getTime();
    const ms = cdPaused ? cdRemaining : diff;
    const formatted = formatDHMS(ms);

    $('cdDisplay').textContent = fmtDisplay(formatted);
    $('cdTotalSec').textContent = formatted.totalSec.toLocaleString();
    $('cdTotalMin').textContent = (formatted.totalSec / 60).toFixed(2);
    $('cdTotalHr').textContent = (formatted.totalSec / 3600).toFixed(2);
    $('cdTotalDays').textContent = (formatted.totalSec / 86400).toFixed(4);

    const display = $('cdDisplay');
    display.classList.remove('warn', 'bad');

    if (ms <= 0) {
      display.classList.add('bad');
      setStatus('Done');
      setSummary('Countdown complete.');
      $('cdPause').disabled = true;
      clearInterval(cdTimer);
      cdTimer = null;
      return;
    }

    setSummary(`Counting down to ${targetText}.`);
  }

  function cdStart() {
    const dateStr = $('cdDate').value;
    if (!dateStr) {
      toast('Pick a date');
      return;
    }

    if (cdTimer) clearInterval(cdTimer);
    cdPaused = false;
    $('cdPause').disabled = false;
    $('cdPause').textContent = 'Pause';
    setStatus('Running');
    cdUpdate();
    cdTimer = setInterval(cdUpdate, 250);
  }

  function cdPauseToggle() {
    if (!cdTimer && !cdPaused) return;

    const tzMode = $('cdTimezone').value === 'utc' ? 'utc' : 'local';
    const target = parseDateTime($('cdDate').value, $('cdTime').value, tzMode);
    if (!target) return;

    if (!cdPaused) {
      const now = nowInMode(tzMode);
      cdRemaining = Math.max(0, target.getTime() - now.getTime());
      cdPaused = true;
      clearInterval(cdTimer);
      cdTimer = null;
      $('cdPause').textContent = 'Resume';
      setStatus('Paused');
      setSummary('Countdown paused.');
      cdUpdate();
    } else {
      cdPaused = false;
      $('cdPause').textContent = 'Pause';
      const startNow = nowInMode(tzMode).getTime();
      const newTarget = new Date(startNow + cdRemaining);

      if (tzMode === 'utc') {
        const iso = newTarget.toISOString();
        $('cdDate').value = iso.slice(0, 10);
        $('cdTime').value = iso.slice(11, 19);
      } else {
        $('cdDate').value = `${newTarget.getFullYear()}-${pad(newTarget.getMonth() + 1)}-${pad(newTarget.getDate())}`;
        $('cdTime').value = `${pad(newTarget.getHours())}:${pad(newTarget.getMinutes())}:${pad(newTarget.getSeconds())}`;
      }

      cdStart();
    }
  }

  function cdReset() {
    clearInterval(cdTimer);
    cdTimer = null;
    cdPaused = false;
    cdRemaining = 0;
    $('cdPause').disabled = true;
    $('cdPause').textContent = 'Pause';
    $('cdTitle').value = '';
    $('cdDate').value = '';
    $('cdTime').value = '';
    $('cdLiveLabel').textContent = 'Countdown';
    $('cdTargetText').textContent = 'Target: —';
    $('cdDisplay').textContent = '—';
    $('cdTotalSec').textContent = '—';
    $('cdTotalMin').textContent = '—';
    $('cdTotalHr').textContent = '—';
    $('cdTotalDays').textContent = '—';
    setStatus('Ready');
    setSummary('Ready. Set a target date and time, then start the countdown.');
  }

  $('cdStart')?.addEventListener('click', cdStart);
  $('cdPause')?.addEventListener('click', cdPauseToggle);
  $('cdReset')?.addEventListener('click', cdReset);
  $('cdCopy')?.addEventListener('click', () => {
    const label = $('cdLiveLabel').textContent;
    const target = $('cdTargetText').textContent.replace('Target: ', '');
    const left = $('cdDisplay').textContent;
    copyText(`${label} — ${left} remaining. (${target})`);
  });

  // DURATION
  let duTimer = null;
  let duPaused = false;
  let duRemainMs = 0;
  let duEndAt = 0;

  function duTick() {
    const now = Date.now();
    const ms = duPaused ? duRemainMs : Math.max(0, duEndAt - now);
    const formatted = formatDHMS(ms);

    $('duDisplay').textContent = fmtDisplay(formatted);
    $('duRemainSec').textContent = formatted.totalSec.toLocaleString();

    const display = $('duDisplay');
    display.classList.remove('bad');

    if (ms === 0) {
      display.classList.add('bad');
      $('duStatus').textContent = 'Done';
      setStatus('Done');
      setSummary('Duration timer complete.');
      $('duPause').disabled = true;
      clearInterval(duTimer);
      duTimer = null;

      if ($('duEndSound').value === 'on') {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = 880;
          gain.gain.value = 0.08;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          setTimeout(() => {
            osc.stop();
            ctx.close();
          }, 220);
        } catch (_) {}
      }
      return;
    }

    setSummary('Duration timer is running.');
  }

  function duStart() {
    const h = Math.max(0, parseInt($('duHours').value || '0', 10));
    const m = Math.max(0, parseInt($('duMinutes').value || '0', 10));
    const s = Math.max(0, parseInt($('duSeconds').value || '0', 10));
    const total = ((h * 3600) + (m * 60) + s) * 1000;

    if (total <= 0) {
      toast('Set a duration');
      return;
    }

    clearInterval(duTimer);
    duPaused = false;
    duRemainMs = total;
    duEndAt = Date.now() + total;

    $('duOriginal').textContent = `Original: ${h}h ${m}m ${s}s`;
    $('duPause').disabled = false;
    $('duPause').textContent = 'Pause';
    $('duStatus').textContent = 'Running';
    setStatus('Running');
    duTick();
    duTimer = setInterval(duTick, 250);
  }

  function duPauseToggle() {
    if (!duPaused) {
      duRemainMs = Math.max(0, duEndAt - Date.now());
      duPaused = true;
      clearInterval(duTimer);
      duTimer = null;
      $('duPause').textContent = 'Resume';
      $('duStatus').textContent = 'Paused';
      setStatus('Paused');
      setSummary('Duration timer paused.');
      duTick();
    } else {
      duPaused = false;
      duEndAt = Date.now() + duRemainMs;
      $('duPause').textContent = 'Pause';
      $('duStatus').textContent = 'Running';
      setStatus('Running');
      duTick();
      duTimer = setInterval(duTick, 250);
    }
  }

  function duReset() {
    clearInterval(duTimer);
    duTimer = null;
    duPaused = false;
    duRemainMs = 0;
    duEndAt = 0;
    $('duPause').disabled = true;
    $('duPause').textContent = 'Pause';
    $('duOriginal').textContent = 'Original: —';
    $('duDisplay').textContent = '—';
    $('duRemainSec').textContent = '—';
    $('duStatus').textContent = 'Ready';
    setStatus('Ready');
    setSummary('Ready. Enter a duration and start the timer.');
  }

  $('duStart')?.addEventListener('click', duStart);
  $('duPause')?.addEventListener('click', duPauseToggle);
  $('duReset')?.addEventListener('click', duReset);
  $('duCopy')?.addEventListener('click', () => {
    copyText(`Duration timer — remaining: ${$('duDisplay').textContent}`);
  });

  // CALC
  function tcCompute() {
    const tzMode = $('tcTimezone').value === 'utc' ? 'utc' : 'local';
    const base = parseDateTime($('tcBaseDate').value, $('tcBaseTime').value, tzMode);

    if (!base) {
      toast('Set base date/time');
      return;
    }

    const mode = $('tcMode').value;
    const days = parseInt($('tcDays').value || '0', 10) || 0;
    const hrs = parseInt($('tcHours').value || '0', 10) || 0;
    const mins = parseInt($('tcMinutes').value || '0', 10) || 0;
    const secs = parseInt($('tcSeconds').value || '0', 10) || 0;

    const deltaMs = (((days * 24 + hrs) * 60 + mins) * 60 + secs) * 1000;
    const outMs = mode === 'sub' ? base.getTime() - deltaMs : base.getTime() + deltaMs;
    const out = new Date(outMs);

    const baseText = tzMode === 'utc'
      ? `${base.toISOString().replace('T', ' ').replace('Z', '')} UTC`
      : base.toLocaleString();

    const outText = tzMode === 'utc'
      ? `${out.toISOString().replace('T', ' ').replace('Z', '')} UTC`
      : out.toLocaleString();

    $('tcBaseText').textContent = `Base: ${baseText}`;
    $('tcResult').textContent = outText;
    $('tcUnix').textContent = Math.floor(outMs / 1000).toString();
    $('tcISO').textContent = out.toISOString();

    setStatus('Computed');
    setSummary('Time calculation complete.');
  }

  $('tcCompute')?.addEventListener('click', tcCompute);
  $('tcNow')?.addEventListener('click', () => {
    setInputsToNow('tcBaseDate', 'tcBaseTime');
    toast('Base set to now');
  });
  $('tcCopy')?.addEventListener('click', () => copyText($('tcResult').textContent));

  // BETWEEN
  function tbCompute() {
    const tzMode = $('tbTimezone').value === 'utc' ? 'utc' : 'local';
    const start = parseDateTime($('tbStartDate').value, $('tbStartTime').value, tzMode);
    const end = parseDateTime($('tbEndDate').value, $('tbEndTime').value, tzMode);

    if (!start || !end) {
      toast('Set start and end');
      return;
    }

    const diffMs = Math.abs(end.getTime() - start.getTime());
    const formatted = formatDHMS(diffMs);

    $('tbResult').textContent = fmtDisplay(formatted);
    $('tbSec').textContent = formatted.totalSec.toLocaleString();
    $('tbMin').textContent = (formatted.totalSec / 60).toFixed(2);
    $('tbHr').textContent = (formatted.totalSec / 3600).toFixed(2);
    $('tbDays').textContent = (formatted.totalSec / 86400).toFixed(4);

    const startText = tzMode === 'utc'
      ? `${start.toISOString().replace('T', ' ').replace('Z', '')} UTC`
      : start.toLocaleString();

    const endText = tzMode === 'utc'
      ? `${end.toISOString().replace('T', ' ').replace('Z', '')} UTC`
      : end.toLocaleString();

    $('tbMeta').textContent = `${startText} → ${endText}`;

    setStatus('Computed');
    setSummary('Time difference calculated.');
  }

  $('tbCompute')?.addEventListener('click', tbCompute);
  $('tbNowStart')?.addEventListener('click', () => {
    setInputsToNow('tbStartDate', 'tbStartTime');
    toast('Start set to now');
  });
  $('tbNowEnd')?.addEventListener('click', () => {
    setInputsToNow('tbEndDate', 'tbEndTime');
    toast('End set to now');
  });
  $('tbCopy')?.addEventListener('click', () => copyText(`Time between: ${$('tbResult').textContent}`));

  // Init
  showTab('countdown');
  setSummary('Ready. Choose a mode and enter your date, time, or duration values to begin.');
  setStatus('Ready');
});
