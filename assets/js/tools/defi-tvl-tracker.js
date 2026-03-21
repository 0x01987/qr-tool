document.addEventListener("DOMContentLoaded", () => {
  const DATA_SOURCES = {
    protocols: [
      "/api/defi/protocols",
      "https://api.llama.fi/protocols",
      "https://api.llama.fi/lite/protocols"
    ],
    chains: [
      "/api/defi/chains",
      "https://api.llama.fi/v2/chains",
      "https://api.llama.fi/chains"
    ],
    protocolDetail: [
      (slug) => "/api/defi/protocol/" + encodeURIComponent(slug),
      (slug) => "https://api.llama.fi/protocol/" + encodeURIComponent(slug)
    ]
  };

  const CACHE_TTL_MS = 5 * 60 * 1000;
  const FETCH_TIMEOUT_MS = 9000;

  const STATE = {
    mode: "protocols",
    protocols: [],
    chains: [],
    filtered: [],
    fresh: false,
    usingStale: false,
    lastUpdatedISO: "",
    activeDetail: null,
    activeChartPoints: []
  };

  const $ = (id) => document.getElementById(id);

  const els = {
    years: [$("yearFooter")].filter(Boolean),

    summaryText: $("summaryText"),
    apiStatus: $("apiStatus"),
    apiStatusSide: $("apiStatusSide"),
    cacheState: $("cacheState"),
    cacheStateSide: $("cacheStateSide"),
    cacheSub: $("cacheSub"),
    cacheSubSide: $("cacheSubSide"),
    lastUpdated: $("lastUpdated"),

    tabProtocols: $("tabProtocols"),
    tabChains: $("tabChains"),

    searchInput: $("searchInput"),
    categoryFilter: $("categoryFilter"),
    chainFilter: $("chainFilter"),
    sortBy: $("sortBy"),
    limitSelect: $("limitSelect"),

    resetBtn: $("resetBtn"),
    refreshBtn: $("refreshBtn"),
    jumpTableBtn: $("jumpTableBtn"),

    tracker: $("tracker"),
    trendingGrid: $("trendingGrid"),
    trendingMeta: $("trendingMeta"),

    statTracked: $("statTracked"),
    statTvl: $("statTvl"),
    statMedian: $("statMedian"),
    statChange: $("statChange"),

    modeLabel: $("modeLabel"),
    modeLabelSide: $("modeLabelSide"),

    detailModal: $("detailModal"),
    closeModalBtn: $("closeModalBtn"),
    detailTitle: $("detailTitle"),
    detailLoading: $("detailLoading"),
    detailError: $("detailError"),
    detailContent: $("detailContent"),
    detailTvl: $("detailTvl"),
    detailCategory: $("detailCategory"),
    detail1d: $("detail1d"),
    detail7d: $("detail7d"),
    detailDescription: $("detailDescription"),
    detailChains: $("detailChains"),
    detailLinks: $("detailLinks"),
    chartMeta: $("chartMeta"),
    tvlChart: $("tvlChart")
  };

  els.years.forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  function setText(el, value) {
    if (el) el.textContent = value;
  }

  function fmtMoney(n) {
    if (!isFinite(Number(n))) return "—";
    const v = Number(n);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: v >= 1e9 ? "compact" : "standard",
      maximumFractionDigits: v >= 1e9 ? 2 : 0
    }).format(v);
  }

  function fmtCompact(n) {
    if (!isFinite(Number(n))) return "—";
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 2
    }).format(Number(n));
  }

  function fmtPct(n) {
    if (!isFinite(Number(n))) return "—";
    const v = Number(n);
    const sign = v > 0 ? "+" : "";
    return sign + v.toFixed(2) + "%";
  }

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function updateSummary(text) {
    setText(els.summaryText, text);
  }

  function setStatus(status, sub) {
    setText(els.apiStatus, status);
    setText(els.apiStatusSide, status);
    if (sub) {
      setText(els.cacheSub, sub);
      setText(els.cacheSubSide, sub);
    }
  }

  function setCacheState(label, sub) {
    setText(els.cacheState, label);
    setText(els.cacheStateSide, label);
    if (sub) {
      setText(els.cacheSub, sub);
      setText(els.cacheSubSide, sub);
    }
  }

  function lastUpdatedLabel(iso) {
    if (!iso) return "Last updated: —";
    const d = new Date(iso);
    return `Last updated: ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }

  function cacheGet(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.timestamp !== "number" || !("data" in parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function cacheSet(key, data) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          timestamp: Date.now(),
          data
        })
      );
    } catch {}
  }

  async function fetchJsonWithTimeout(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { accept: "application/json" },
        signal: controller.signal,
        cache: "no-store"
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchFirstWorking(urls) {
    let lastErr = null;

    for (const url of urls) {
      try {
        const json = await fetchJsonWithTimeout(url);
        return { ok: true, url, data: json };
      } catch (err) {
        lastErr = err;
      }
    }

    return { ok: false, error: lastErr || new Error("All endpoints failed") };
  }

  async function getDataset(name, urls) {
    const key = "defi-tvl-tracker:" + name;
    const cached = cacheGet(key);
    const freshEnough = cached && Date.now() - cached.timestamp < CACHE_TTL_MS;

    if (freshEnough) {
      STATE.fresh = false;
      STATE.usingStale = false;
      setCacheState("Cached", "Serving fresh local cache");
      return { data: cached.data, fromCache: true, stale: false };
    }

    const live = await fetchFirstWorking(urls);

    if (live.ok) {
      cacheSet(key, live.data);
      STATE.fresh = true;
      STATE.usingStale = false;
      setCacheState("Live", "Fresh data loaded successfully");
      return { data: live.data, fromCache: false, stale: false };
    }

    if (cached) {
      STATE.fresh = false;
      STATE.usingStale = true;
      setCacheState("Stale", "Live fetch failed, serving saved data");
      return { data: cached.data, fromCache: true, stale: true };
    }

    throw live.error || new Error("Unable to load data");
  }

  function normalizeProtocols(data) {
    if (!Array.isArray(data)) return [];

    return data
      .map((p) => {
        const currentTvl =
          Number(p.tvl) ||
          Number(
            p.currentChainTvls &&
              Object.values(p.currentChainTvls).reduce((a, b) => a + Number(b || 0), 0)
          ) ||
          0;

        const chainList = Array.isArray(p.chains) ? p.chains : p.chain ? [p.chain] : [];

        return {
          type: "protocol",
          id: p.id || p.slug || p.name,
          slug: p.slug || (p.name || "").toLowerCase().replace(/\s+/g, "-"),
          name: p.name || "Unknown",
          symbol: p.symbol || "",
          category: p.category || "Unknown",
          chains: chainList,
          chainLabel: chainList.join(", "),
          tvl: currentTvl,
          change_1d: Number(p.change_1d ?? p.change1d ?? NaN),
          change_7d: Number(p.change_7d ?? p.change7d ?? NaN),
          mcap: Number(p.mcap ?? NaN),
          logo: p.logo || "",
          url: p.url || "",
          description: p.description || ""
        };
      })
      .filter((x) => x.name);
  }

  function normalizeChains(data) {
    if (!Array.isArray(data)) return [];
    return data.map((c) => ({
      type: "chain",
      id: c.name || c.gecko_id || c.chainId,
      slug: "",
      name: c.name || c.gecko_id || "Unknown",
      symbol: c.tokenSymbol || "",
      category: "Chain",
      chains: [c.name || "Unknown"],
      chainLabel: c.name || "Unknown",
      tvl: Number(c.tvl ?? 0),
      change_1d: Number(c.change_1d ?? c.change1d ?? NaN),
      change_7d: Number(c.change_7d ?? c.change7d ?? NaN),
      mcap: Number(c.mcap ?? NaN),
      chainId: c.chainId ?? "",
      gecko_id: c.gecko_id || ""
    }));
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  }

  function fillFilters() {
    const protocols = STATE.protocols;
    const categories = uniqueSorted(protocols.map((p) => p.category));
    const chains = uniqueSorted(protocols.flatMap((p) => p.chains || []));

    if (els.categoryFilter) {
      els.categoryFilter.innerHTML =
        '<option value="">All</option>' +
        categories
          .map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`)
          .join("");
    }

    if (els.chainFilter) {
      els.chainFilter.innerHTML =
        '<option value="">All</option>' +
        chains
          .map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`)
          .join("");
    }
  }

  function getCurrentData() {
    return STATE.mode === "protocols" ? STATE.protocols : STATE.chains;
  }

  function median(nums) {
    const arr = nums.filter((n) => isFinite(n)).sort((a, b) => a - b);
    if (!arr.length) return NaN;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  }

  function avg(nums) {
    const arr = nums.filter((n) => isFinite(n));
    if (!arr.length) return NaN;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function valueCellPct(value) {
    if (!isFinite(value)) return '<span class="defi-trend-neutral">—</span>';
    const cls =
      value > 0 ? "defi-trend-pos" : value < 0 ? "defi-trend-neg" : "defi-trend-neutral";
    return `<span class="${cls}">${fmtPct(value)}</span>`;
  }

  function renderTrending(sourceRows) {
    if (!els.trendingGrid) return;

    const source =
      Array.isArray(sourceRows) && sourceRows.length
        ? sourceRows
        : STATE.mode === "protocols"
          ? STATE.protocols
          : STATE.chains;

    if (!source.length) {
      els.trendingGrid.innerHTML =
        '<div class="defi-loading">No trending data available yet.</div>';
      setText(els.trendingMeta, "Waiting for data");
      return;
    }

    const movers = source
      .filter((item) => isFinite(Number(item.change_1d)) && Number(item.tvl) > 0)
      .sort((a, b) => Number(b.change_1d) - Number(a.change_1d))
      .slice(0, 4);

    if (!movers.length) {
      els.trendingGrid.innerHTML =
        '<div class="defi-loading">No top gainers available from the current dataset.</div>';
      setText(els.trendingMeta, "No 24h change data found");
      return;
    }

    els.trendingGrid.innerHTML = movers
      .map((item, index) => {
        const chainsLabel =
          STATE.mode === "protocols"
            ? escapeHtml((item.chains || []).slice(0, 2).join(", ") || "—")
            : escapeHtml(item.symbol || "—");

        return `
          <article class="defi-trending-item">
            <div class="defi-trending-top">
              <span class="defi-rank">#${index + 1}</span>
              <span class="defi-trending-change ${
                Number(item.change_1d) > 0
                  ? "defi-trend-pos"
                  : Number(item.change_1d) < 0
                    ? "defi-trend-neg"
                    : "defi-trend-neutral"
              }">
                ${fmtPct(Number(item.change_1d))}
              </span>
            </div>

            <div class="defi-trending-name">${escapeHtml(item.name || "Unknown")}</div>
            <div class="defi-trending-meta">${
              STATE.mode === "protocols"
                ? escapeHtml(item.category || "Unknown")
                : "Chain TVL"
            }</div>
            <div class="defi-trending-meta">${chainsLabel}</div>

            <div class="defi-trending-actions">
              <div class="defi-trending-tvl">${fmtMoney(item.tvl)}</div>
              ${
                STATE.mode === "protocols"
                  ? `<button class="defi-link-btn" type="button" data-trending-slug="${escapeHtml(
                      item.slug || ""
                    )}" data-trending-name="${escapeHtml(item.name || "")}">Open</button>`
                  : `<span class="defi-tiny">Top gainer</span>`
              }
            </div>
          </article>
        `;
      })
      .join("");

    setText(
      els.trendingMeta,
      STATE.mode === "protocols" ? "Top 24h protocol movers" : "Top 24h chain movers"
    );

    els.trendingGrid.querySelectorAll("[data-trending-slug]").forEach((btn) => {
      btn.addEventListener("click", () => {
        openProtocolDetail(btn.dataset.trendingSlug, btn.dataset.trendingName);
      });
    });
  }

  function renderStats(allVisibleRows) {
    const tvls = allVisibleRows.map((r) => Number(r.tvl || 0));
    const sum = tvls.reduce((a, b) => a + b, 0);
    const med = median(tvls);
    const avg1d = avg(allVisibleRows.map((r) => Number(r.change_1d)));

    setText(els.statTracked, fmtCompact(allVisibleRows.length));
    setText(els.statTvl, fmtMoney(sum));
    setText(els.statMedian, fmtMoney(med));

    if (els.statChange) {
      if (isFinite(avg1d)) {
        els.statChange.textContent = fmtPct(avg1d);
        els.statChange.className =
          "v " +
          (avg1d > 0 ? "defi-trend-pos" : avg1d < 0 ? "defi-trend-neg" : "defi-trend-neutral");
      } else {
        els.statChange.textContent = "—";
        els.statChange.className = "v defi-trend-neutral";
      }
    }

    const modeText = STATE.mode === "protocols" ? "Protocols" : "Chains";
    setText(els.modeLabel, modeText);
    setText(els.modeLabelSide, modeText);
  }

  function buildProtocolsTable(rows) {
    return `
      <table aria-label="DeFi protocols TVL table">
        <thead>
          <tr>
            <th>#</th>
            <th>Protocol</th>
            <th>Category</th>
            <th>Chains</th>
            <th>TVL</th>
            <th>24h</th>
            <th>7d</th>
            <th>MCap</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r, i) => `
            <tr>
              <td data-label="#"><span class="defi-rank-badge">${i + 1}</span></td>
              <td data-label="Protocol">
                <div class="defi-proto">
                  <img class="defi-proto-icon" src="${escapeHtml(
                    r.logo || "/assets/instantqr-logo.svg"
                  )}" alt="" loading="lazy" onerror="this.src='/assets/instantqr-logo.svg'">
                  <div>
                    <div class="defi-proto-name">${escapeHtml(r.name)}</div>
                    <div class="defi-proto-meta">${escapeHtml(r.symbol || "—")}</div>
                  </div>
                </div>
              </td>
              <td data-label="Category"><span class="defi-tag">${escapeHtml(
                r.category || "Unknown"
              )}</span></td>
              <td data-label="Chains"><span class="defi-trend-neutral">${escapeHtml(
                r.chains?.slice(0, 3).join(", ") || "—"
              )}${(r.chains?.length || 0) > 3 ? " +" + (r.chains.length - 3) : ""}</span></td>
              <td data-label="TVL">${fmtMoney(r.tvl)}</td>
              <td data-label="24h">${valueCellPct(r.change_1d)}</td>
              <td data-label="7d">${valueCellPct(r.change_7d)}</td>
              <td data-label="MCap">${
                isFinite(r.mcap) ? fmtMoney(r.mcap) : '<span class="defi-trend-neutral">—</span>'
              }</td>
              <td data-label="Details"><button class="defi-link-btn" type="button" data-slug="${escapeHtml(
                r.slug || ""
              )}" data-name="${escapeHtml(r.name)}">Open</button></td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  function buildChainsTable(rows) {
    return `
      <table aria-label="DeFi chains TVL table">
        <thead>
          <tr>
            <th>#</th>
            <th>Chain</th>
            <th>Token</th>
            <th>TVL</th>
            <th>24h</th>
            <th>7d</th>
            <th>Chain ID</th>
            <th>Reference</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r, i) => `
            <tr>
              <td data-label="#"><span class="defi-rank-badge">${i + 1}</span></td>
              <td data-label="Chain">
                <div class="defi-proto">
                  <img class="defi-proto-icon" src="/assets/instantqr-logo.svg" alt="" loading="lazy">
                  <div>
                    <div class="defi-proto-name">${escapeHtml(r.name)}</div>
                    <div class="defi-proto-meta">${escapeHtml(r.gecko_id || "chain")}</div>
                  </div>
                </div>
              </td>
              <td data-label="Token">${escapeHtml(r.symbol || "—")}</td>
              <td data-label="TVL">${fmtMoney(r.tvl)}</td>
              <td data-label="24h">${valueCellPct(r.change_1d)}</td>
              <td data-label="7d">${valueCellPct(r.change_7d)}</td>
              <td data-label="Chain ID">${
                r.chainId
                  ? escapeHtml(String(r.chainId))
                  : '<span class="defi-trend-neutral">—</span>'
              }</td>
              <td data-label="Reference"><span class="defi-tag">Chain TVL</span></td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  function renderTable(rows) {
    if (!els.tracker) return;

    if (!rows.length) {
      els.tracker.innerHTML =
        '<div class="defi-empty">No matching results found. Try a broader search or clear filters.</div>';
      updateSummary("No matching results found for the current filter set.");
      return;
    }

    els.tracker.innerHTML =
      STATE.mode === "protocols" ? buildProtocolsTable(rows) : buildChainsTable(rows);

    if (STATE.mode === "protocols") {
      els.tracker.querySelectorAll("[data-slug]").forEach((btn) => {
        btn.addEventListener("click", () => openProtocolDetail(btn.dataset.slug, btn.dataset.name));
      });
    }

    updateSummary(
      STATE.mode === "protocols"
        ? "Showing live DeFi protocol TVL data with filters, sorting, top gainers, and protocol detail support."
        : "Showing live chain TVL data with filters, sorting, and top 24h chain gainers."
    );
  }

  function resetFilters() {
    if (els.searchInput) els.searchInput.value = "";
    if (els.categoryFilter) els.categoryFilter.value = "";
    if (els.chainFilter) els.chainFilter.value = "";
    if (els.sortBy) els.sortBy.value = "tvl-desc";
    if (els.limitSelect) els.limitSelect.value = "50";
    applyFilters();
  }

  function applyFilters() {
    const q = (els.searchInput?.value || "").trim().toLowerCase();
    const category = els.categoryFilter?.value || "";
    const chain = els.chainFilter?.value || "";
    const sort = els.sortBy?.value || "tvl-desc";
    const limit = Number(els.limitSelect?.value || 50);

    let rows = [...getCurrentData()];

    if (q) {
      rows = rows.filter((r) => {
        const hay = [r.name, r.symbol, r.category, r.chainLabel, ...(r.chains || [])]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    if (STATE.mode === "protocols" && category) {
      rows = rows.filter((r) => r.category === category);
    }

    if (chain) {
      rows = rows.filter((r) => (r.chains || []).includes(chain) || r.name === chain);
    }

    rows.sort((a, b) => {
      switch (sort) {
        case "tvl-asc":
          return (a.tvl || 0) - (b.tvl || 0);
        case "tvl-desc":
          return (b.tvl || 0) - (a.tvl || 0);
        case "change1d-asc":
          return (a.change_1d || -999999) - (b.change_1d || -999999);
        case "change1d-desc":
          return (b.change_1d || -999999) - (a.change_1d || -999999);
        case "change7d-asc":
          return (a.change_7d || -999999) - (b.change_7d || -999999);
        case "change7d-desc":
          return (b.change_7d || -999999) - (a.change_7d || -999999);
        case "name-desc":
          return String(b.name).localeCompare(String(a.name));
        case "name-asc":
        default:
          return String(a.name).localeCompare(String(b.name));
      }
    });

    STATE.filtered = rows.slice(0, limit);
    renderTrending(STATE.filtered.length ? STATE.filtered : rows);
    renderStats(rows);
    renderTable(STATE.filtered);
  }

  function setMode(mode) {
    STATE.mode = mode;

    if (els.tabProtocols) {
      els.tabProtocols.classList.toggle("active", mode === "protocols");
      els.tabProtocols.setAttribute("aria-selected", String(mode === "protocols"));
    }

    if (els.tabChains) {
      els.tabChains.classList.toggle("active", mode === "chains");
      els.tabChains.setAttribute("aria-selected", String(mode === "chains"));
    }

    if (els.categoryFilter) {
      els.categoryFilter.disabled = mode !== "protocols";
    }

    applyFilters();
  }

  async function loadAllData(force) {
    if (els.tracker) {
      els.tracker.innerHTML = '<div class="defi-loading">Loading DeFi TVL data…</div>';
    }

    setStatus("Loading", "Fetching protocols and chains");

    if (force) {
      try {
        localStorage.removeItem("defi-tvl-tracker:protocols");
        localStorage.removeItem("defi-tvl-tracker:chains");
      } catch {}
    }

    try {
      const [protocolsRes, chainsRes] = await Promise.all([
        getDataset("protocols", DATA_SOURCES.protocols),
        getDataset("chains", DATA_SOURCES.chains)
      ]);

      STATE.protocols = normalizeProtocols(protocolsRes.data);
      STATE.chains = normalizeChains(chainsRes.data);
      STATE.lastUpdatedISO = new Date().toISOString();

      setText(els.lastUpdated, lastUpdatedLabel(STATE.lastUpdatedISO));

      fillFilters();
      setStatus(
        STATE.usingStale ? "Stale Data" : STATE.fresh ? "Live Data" : "Cached Data"
      );

      applyFilters();
    } catch (err) {
      console.error(err);
      setStatus("Offline", "No live or cached data available");

      if (els.tracker) {
        els.tracker.innerHTML = `
          <div class="defi-error">
            Unable to load TVL data right now.<br>
            <span class="defi-tiny">Try again in a moment. Cached fallback support is enabled when data is available.</span>
          </div>`;
      }

      updateSummary("Unable to load TVL data right now. Try again shortly.");
    }
  }

  async function fetchProtocolDetail(slug) {
    const urls = DATA_SOURCES.protocolDetail.map((fn) => fn(slug));
    return await fetchFirstWorking(urls);
  }

  function protocolLinkChip(href, text) {
    if (!href) return "";
    return `<a class="defi-tag" href="${escapeHtml(
      href
    )}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
  }

  function normalizeHistory(detail) {
    const direct = Array.isArray(detail?.tvl) ? detail.tvl : [];
    const fromDirect = direct
      .map((x) => ({
        date: Number(x.date || x.timestamp),
        tvl: Number(x.totalLiquidityUSD ?? x.totalLiquidityUsd ?? x.tvl ?? x.totalLiquidity ?? 0)
      }))
      .filter((x) => isFinite(x.date) && isFinite(x.tvl));

    if (fromDirect.length) return fromDirect;

    const chainTvls = detail?.chainTvls || {};
    const aggregate = new Map();

    Object.values(chainTvls).forEach((val) => {
      const arr = Array.isArray(val?.tvl) ? val.tvl : [];
      arr.forEach((point) => {
        const date = Number(point.date || point.timestamp);
        const tvl = Number(point.totalLiquidityUSD ?? point.totalLiquidityUsd ?? point.tvl ?? 0);
        if (!isFinite(date) || !isFinite(tvl)) return;
        aggregate.set(date, (aggregate.get(date) || 0) + tvl);
      });
    });

    return [...aggregate.entries()]
      .map(([date, tvl]) => ({ date, tvl }))
      .sort((a, b) => a.date - b.date);
  }

  function drawChart(points) {
    if (!els.tvlChart) return;

    STATE.activeChartPoints = Array.isArray(points) ? points : [];
    const canvas = els.tvlChart;
    const ctx = canvas.getContext("2d");
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const cssW = canvas.clientWidth || 760;
    const cssH = 320;

    canvas.width = Math.floor(cssW * ratio);
    canvas.height = Math.floor(cssH * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const pad = { top: 18, right: 16, bottom: 26, left: 56 };
    const w = cssW - pad.left - pad.right;
    const h = cssH - pad.top - pad.bottom;

    if (!points || points.length < 2) {
      ctx.fillStyle = "#9db0d3";
      ctx.font = "14px Inter, sans-serif";
      ctx.fillText("Historical TVL unavailable.", 18, 28);
      return;
    }

    const values = points.map((p) => p.tvl);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 1);
    const xStep = w / (points.length - 1);

    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (h / 4) * i;
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + w, y);
    }
    ctx.stroke();

    ctx.fillStyle = "#9db0d3";
    ctx.font = "12px Inter, sans-serif";
    for (let i = 0; i <= 4; i++) {
      const val = max - (range / 4) * i;
      const y = pad.top + (h / 4) * i;
      ctx.fillText(fmtMoney(val), 6, y + 4);
    }

    ctx.beginPath();
    points.forEach((p, i) => {
      const x = pad.left + i * xStep;
      const y = pad.top + h - ((p.tvl - min) / range) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + w, pad.top + h);
    ctx.lineTo(pad.left, pad.top + h);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + h);
    gradient.addColorStop(0, "rgba(96,165,250,.35)");
    gradient.addColorStop(1, "rgba(96,165,250,.03)");
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    points.forEach((p, i) => {
      const x = pad.left + i * xStep;
      const y = pad.top + h - ((p.tvl - min) / range) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const first = points[0];
    const last = points[points.length - 1];

    [[first, 0], [last, points.length - 1]].forEach(([p, i]) => {
      const x = pad.left + i * xStep;
      const y = pad.top + h - ((p.tvl - min) / range) * h;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#22c55e";
      ctx.fill();
    });

    const firstDate = new Date(first.date * 1000);
    const lastDate = new Date(last.date * 1000);

    ctx.fillStyle = "#9db0d3";
    ctx.fillText(
      firstDate.toLocaleDateString([], { month: "short", year: "2-digit" }),
      pad.left,
      cssH - 6
    );

    const lastText = lastDate.toLocaleDateString([], { month: "short", year: "2-digit" });
    const width = ctx.measureText(lastText).width;
    ctx.fillText(lastText, pad.left + w - width, cssH - 6);
  }

  async function openProtocolDetail(slug, name) {
    if (!els.detailModal) return;

    STATE.activeDetail = { slug, name };
    els.detailModal.classList.add("open");
    els.detailModal.setAttribute("aria-hidden", "false");

    setText(els.detailTitle, name || "Protocol");
    if (els.detailLoading) els.detailLoading.classList.remove("defi-hidden");
    if (els.detailError) els.detailError.classList.add("defi-hidden");
    if (els.detailContent) els.detailContent.classList.add("defi-hidden");
    drawChart([]);

    try {
      const res = await fetchProtocolDetail(slug);
      if (!res.ok) throw res.error || new Error("Detail fetch failed");

      const d = res.data || {};
      const current = STATE.protocols.find((p) => p.slug === slug || p.name === name) || {};

      setText(els.detailTitle, d.name || current.name || name || "Protocol");

      const currentTvl = Number(
        d.currentChainTvls
          ? Object.values(d.currentChainTvls).reduce((a, b) => a + Number(b || 0), 0)
          : d.tvl?.[d.tvl.length - 1]?.totalLiquidityUSD ?? current.tvl ?? 0
      );

      setText(els.detailTvl, fmtMoney(currentTvl));
      setText(els.detailCategory, d.category || current.category || "Unknown");
      if (els.detail1d) els.detail1d.innerHTML = valueCellPct(Number(d.change_1d ?? current.change_1d));
      if (els.detail7d) els.detail7d.innerHTML = valueCellPct(Number(d.change_7d ?? current.change_7d));
      setText(
        els.detailDescription,
        d.description || current.description || "No description available from source."
      );

      const chains = Array.isArray(d.chains) ? d.chains : current.chains || [];
      if (els.detailChains) {
        els.detailChains.innerHTML = chains.length
          ? chains.map((c) => `<span class="defi-tag">${escapeHtml(c)}</span>`).join("")
          : '<span class="defi-trend-neutral">No chain data available</span>';
      }

      if (els.detailLinks) {
        els.detailLinks.innerHTML =
          [
            protocolLinkChip(d.url || current.url, "Website"),
            d.twitter
              ? protocolLinkChip(
                  "https://x.com/" + String(d.twitter).replace(/^@/, ""),
                  "X / Twitter"
                )
              : ""
          ]
            .filter(Boolean)
            .join("") || '<span class="defi-trend-neutral">No external links provided</span>';
      }

      const history = normalizeHistory(d);
      drawChart(history);

      setText(
        els.chartMeta,
        history.length
          ? `${history.length} historical data points loaded`
          : "Historical TVL unavailable from current source response."
      );

      if (els.detailLoading) els.detailLoading.classList.add("defi-hidden");
      if (els.detailContent) els.detailContent.classList.remove("defi-hidden");
    } catch (err) {
      console.error(err);
      if (els.detailLoading) els.detailLoading.classList.add("defi-hidden");
      if (els.detailError) {
        els.detailError.classList.remove("defi-hidden");
        els.detailError.textContent = "Unable to load protocol detail right now.";
      }
    }
  }

  function closeModal() {
    if (!els.detailModal) return;
    els.detailModal.classList.remove("open");
    els.detailModal.setAttribute("aria-hidden", "true");
  }

  function bindEvents() {
    els.tabProtocols?.addEventListener("click", () => setMode("protocols"));
    els.tabChains?.addEventListener("click", () => setMode("chains"));

    els.searchInput?.addEventListener("input", applyFilters);
    els.categoryFilter?.addEventListener("change", applyFilters);
    els.chainFilter?.addEventListener("change", applyFilters);
    els.sortBy?.addEventListener("change", applyFilters);
    els.limitSelect?.addEventListener("change", applyFilters);

    els.resetBtn?.addEventListener("click", resetFilters);
    els.refreshBtn?.addEventListener("click", () => loadAllData(true));
    els.jumpTableBtn?.addEventListener("click", () => {
      els.tracker?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    els.closeModalBtn?.addEventListener("click", closeModal);
    els.detailModal?.addEventListener("click", (e) => {
      if (e.target === els.detailModal) closeModal();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    window.addEventListener("resize", () => {
      if (
        els.detailModal?.classList.contains("open") &&
        !els.detailContent?.classList.contains("defi-hidden")
      ) {
        drawChart(STATE.activeChartPoints);
      }
    });
  }

  bindEvents();
  loadAllData(false);
});
