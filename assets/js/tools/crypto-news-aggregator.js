(function () {
  "use strict";

  const FEEDS = [
    {
      id: "coindesk",
      name: "CoinDesk",
      url: "https://www.coindesk.com/arc/outboundfeeds/rss/"
    },
    {
      id: "cointelegraph",
      name: "Cointelegraph",
      url: "https://cointelegraph.com/rss"
    },
    {
      id: "decrypt",
      name: "Decrypt",
      url: "https://decrypt.co/feed"
    },
    {
      id: "bitcoinmagazine",
      name: "Bitcoin Magazine",
      url: "https://bitcoinmagazine.com/.rss/full/"
    },
    {
      id: "theblock",
      name: "The Block",
      url: "https://www.theblock.co/rss.xml"
    }
  ];

  const RSS2JSON_ENDPOINT = "https://api.rss2json.com/v1/api.json?rss_url=";
  const ALLORIGINS_ENDPOINT = "https://api.allorigins.win/raw?url=";

  const SAVE_KEY = "instantqr_crypto_news_saved_v1";
  const CACHE_KEY = "instantqr_crypto_news_cache_v1";
  const CACHE_TTL_MS = 5 * 60 * 1000;

  const CATEGORY_RULES = {
    bitcoin: ["bitcoin", "btc", "satoshi"],
    ethereum: ["ethereum", "eth", "ether", "eip"],
    solana: ["solana", "sol", "jupiter", "raydium"],
    defi: ["defi", "dex", "yield", "liquidity", "staking", "lending", "amm", "bridge", "swap"],
    nft: ["nft", "nfts", "collectible", "opensea"],
    regulation: ["sec", "cftc", "regulation", "regulatory", "law", "lawsuit", "etf", "compliance", "court"],
    security: ["hack", "exploit", "scam", "phishing", "breach", "stolen", "drainer", "vulnerability", "malware", "attack"],
    exchange: ["exchange", "binance", "coinbase", "kraken", "bybit", "okx", "bitfinex"],
    stablecoin: ["stablecoin", "usdt", "usdc", "dai", "fdusd", "peg"],
    layer2: ["layer 2", "layer2", "l2", "rollup", "arbitrum", "optimism", "base", "zk", "zksync", "starknet"],
    ai: ["ai", "artificial intelligence", "agent", "agents"]
  };

  const state = {
    items: [],
    filtered: [],
    search: "",
    sort: "latest",
    category: "all",
    source: "all",
    view: "all",
    savedIds: loadSavedIds(),
    lastUpdated: null
  };

  const els = {
    searchInput: document.getElementById("searchInput"),
    sortSelect: document.getElementById("sortSelect"),
    categoryChips: document.getElementById("categoryChips"),
    sourceChips: document.getElementById("sourceChips"),
    viewChips: document.getElementById("viewChips"),
    refreshBtn: document.getElementById("refreshBtn"),
    clearBtn: document.getElementById("clearBtn"),
    loadingState: document.getElementById("loadingState"),
    emptyState: document.getElementById("emptyState"),
    newsGrid: document.getElementById("newsGrid"),
    statusDot: document.getElementById("statusDot"),
    statusText: document.getElementById("statusText"),
    countVisible: document.getElementById("countVisible"),
    countTotal: document.getElementById("countTotal"),
    countSaved: document.getElementById("countSaved")
  };

  function init() {
    bindEvents();
    renderSourceChips();
    renderCounts();
    const cached = readCache();
    if (cached && Array.isArray(cached.items) && cached.items.length) {
      state.items = cached.items;
      state.lastUpdated = cached.lastUpdated || null;
      applyFiltersAndRender();
      setStatus("Showing recent cached headlines while refreshing…", "loading");
      refreshNews(false);
    } else {
      refreshNews(true);
    }
  }

  function bindEvents() {
    els.searchInput.addEventListener("input", debounce((e) => {
      state.search = String(e.target.value || "").trim().toLowerCase();
      applyFiltersAndRender();
    }, 140));

    els.sortSelect.addEventListener("change", (e) => {
      state.sort = e.target.value || "latest";
      applyFiltersAndRender();
    });

    els.categoryChips.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-category]");
      if (!btn) return;
      state.category = btn.dataset.category || "all";
      setActiveChip(els.categoryChips, btn, "[data-category]");
      applyFiltersAndRender();
    });

    els.sourceChips.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-source]");
      if (!btn) return;
      state.source = btn.dataset.source || "all";
      setActiveChip(els.sourceChips, btn, "[data-source]");
      applyFiltersAndRender();
    });

    els.viewChips.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-view]");
      if (!btn) return;
      state.view = btn.dataset.view || "all";
      setActiveChip(els.viewChips, btn, "[data-view]");
      applyFiltersAndRender();
    });

    els.refreshBtn.addEventListener("click", () => refreshNews(true));

    els.clearBtn.addEventListener("click", () => {
      state.search = "";
      state.sort = "latest";
      state.category = "all";
      state.source = "all";
      state.view = "all";

      els.searchInput.value = "";
      els.sortSelect.value = "latest";

      resetChipGroup(els.categoryChips, "[data-category]", "all");
      resetChipGroup(els.sourceChips, "[data-source]", "all");
      resetChipGroup(els.viewChips, "[data-view]", "all");

      applyFiltersAndRender();
    });

    els.newsGrid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-save-id]");
      if (!btn) return;

      const id = btn.dataset.saveId;
      if (!id) return;

      toggleSaved(id);
      updateSaveButton(btn, id);
      renderCounts();

      if (state.view === "saved") {
        applyFiltersAndRender();
      }
    });
  }

  async function refreshNews(showLoadingCard) {
    if (showLoadingCard) {
      els.loadingState.hidden = false;
      els.newsGrid.hidden = true;
      els.emptyState.hidden = true;
    }

    setStatus("Loading crypto news…", "loading");

    const results = await Promise.allSettled(FEEDS.map(fetchFeedItems));

    const successItems = [];
    const failedSources = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        successItems.push(...result.value);
      } else {
        failedSources.push(result.reason?.sourceName || "Unknown source");
      }
    }

    const normalized = dedupeItems(successItems)
      .sort((a, b) => (b.publishedAtTs || 0) - (a.publishedAtTs || 0));

    state.items = normalized;
    state.lastUpdated = Date.now();

    writeCache({
      items: normalized,
      lastUpdated: state.lastUpdated
    });

    renderSourceChips();
    applyFiltersAndRender();

    if (normalized.length && failedSources.length) {
      setStatus(
        `Loaded ${normalized.length} stories. Some sources were unavailable: ${failedSources.join(", ")}.`,
        "warning"
      );
    } else if (normalized.length) {
      setStatus(
        `Loaded ${normalized.length} stories${state.lastUpdated ? ` • Updated ${formatRelativeTime(state.lastUpdated)}` : ""}.`,
        "ok"
      );
    } else {
      setStatus("Unable to load crypto news right now. Please try again.", "error");
      els.loadingState.hidden = true;
      els.newsGrid.hidden = true;
      els.emptyState.hidden = false;
      els.emptyState.textContent = "No news could be loaded right now. Please refresh in a moment.";
    }
  }

  async function fetchFeedItems(feed) {
    try {
      const items = await fetchViaRss2Json(feed);
      return items.map(item => normalizeItem(item, feed));
    } catch (err1) {
      try {
        const items = await fetchViaAllOrigins(feed);
        return items.map(item => normalizeItem(item, feed));
      } catch (err2) {
        const error = new Error(`Failed to load ${feed.name}`);
        error.sourceName = feed.name;
        throw error;
      }
    }
  }

  async function fetchViaRss2Json(feed) {
    const url = `${RSS2JSON_ENDPOINT}${encodeURIComponent(feed.url)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`rss2json failed for ${feed.name}`);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.items)) {
      throw new Error(`Invalid rss2json payload for ${feed.name}`);
    }

    return data.items;
  }

  async function fetchViaAllOrigins(feed) {
    const response = await fetch(`${ALLORIGINS_ENDPOINT}${encodeURIComponent(feed.url)}`, {
      method: "GET",
      headers: {
        "Accept": "application/xml,text/xml,*/*"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`AllOrigins failed for ${feed.name}`);
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");

    const parserError = xml.querySelector("parsererror");
    if (parserError) {
      throw new Error(`XML parse failed for ${feed.name}`);
    }

    const itemNodes = Array.from(xml.querySelectorAll("channel > item, feed > entry"));
    return itemNodes.map(node => parseXmlItem(node));
  }

  function parseXmlItem(node) {
    const getText = (selectors) => {
      const list = Array.isArray(selectors) ? selectors : [selectors];
      for (const sel of list) {
        const el = node.querySelector(sel);
        if (el && el.textContent) return el.textContent.trim();
      }
      return "";
    };

    let link = "";
    const linkEl = node.querySelector("link");
    if (linkEl) {
      link = linkEl.getAttribute("href") || linkEl.textContent.trim() || "";
    }

    return {
      title: getText(["title"]),
      link,
      pubDate: getText(["pubDate", "published", "updated"]),
      author: getText(["author", "dc\\:creator"]),
      description: getText(["description", "summary", "content"]),
      thumbnail: ""
    };
  }

  function normalizeItem(raw, feed) {
    const title = cleanText(raw.title || "Untitled story");
    const link = sanitizeUrl(raw.link || "");
    const description = cleanExcerpt(raw.description || raw.summary || raw.content || "");
    const publishedRaw = raw.pubDate || raw.published || raw.updated || "";
    const publishedAtTs = parseDateSafe(publishedRaw);
    const author = cleanText(raw.author || "");
    const category = detectCategories(`${title} ${description}`);
    const id = buildId(link || `${feed.id}-${title}-${publishedAtTs}`);

    return {
      id,
      title,
      link,
      description,
      author,
      sourceId: feed.id,
      sourceName: feed.name,
      publishedAtRaw: publishedRaw,
      publishedAtTs,
      categories: category,
      searchable: `${title} ${description} ${author} ${feed.name} ${category.join(" ")}`.toLowerCase()
    };
  }

  function detectCategories(text) {
    const hay = String(text || "").toLowerCase();
    const matches = [];

    Object.entries(CATEGORY_RULES).forEach(([category, keywords]) => {
      if (keywords.some(keyword => hay.includes(keyword))) {
        matches.push(category);
      }
    });

    return matches.length ? matches : ["general"];
  }

  function applyFiltersAndRender() {
    const search = state.search;
    const category = state.category;
    const source = state.source;
    const view = state.view;

    let items = [...state.items];

    if (search) {
      items = items.filter(item => item.searchable.includes(search));
    }

    if (category !== "all") {
      items = items.filter(item => item.categories.includes(category));
    }

    if (source !== "all") {
      items = items.filter(item => item.sourceId === source);
    }

    if (view === "saved") {
      items = items.filter(item => state.savedIds.includes(item.id));
    }

    items = sortItems(items, state.sort);
    state.filtered = items;

    renderNews(items);
    renderCounts();
  }

  function sortItems(items, sortType) {
    const list = [...items];

    switch (sortType) {
      case "oldest":
        return list.sort((a, b) => (a.publishedAtTs || 0) - (b.publishedAtTs || 0));
      case "source":
        return list.sort((a, b) => a.sourceName.localeCompare(b.sourceName) || (b.publishedAtTs || 0) - (a.publishedAtTs || 0));
      case "title":
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case "latest":
      default:
        return list.sort((a, b) => (b.publishedAtTs || 0) - (a.publishedAtTs || 0));
    }
  }

  function renderNews(items) {
    els.loadingState.hidden = true;

    if (!items.length) {
      els.newsGrid.hidden = true;
      els.emptyState.hidden = false;
      return;
    }

    els.emptyState.hidden = true;
    els.newsGrid.hidden = false;

    const html = items.map(item => {
      const tags = [
        item.sourceName,
        ...item.categories.slice(0, 3).map(formatCategoryLabel)
      ];

      return `
        <article class="news-card">
          <div class="news-head">
            <span class="source-badge">${escapeHtml(item.sourceName)}</span>
            <span class="time-badge">${escapeHtml(formatRelativeTime(item.publishedAtTs || item.publishedAtRaw))}</span>
          </div>

          <h3 class="news-title">
            <a href="${escapeAttribute(item.link || "#")}" target="_blank" rel="noopener noreferrer nofollow">
              ${escapeHtml(item.title)}
            </a>
          </h3>

          <p class="news-desc">${escapeHtml(item.description || "Open the story to read the full article from the publisher.")}</p>

          <div class="tags">
            ${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
          </div>

          <div class="card-actions">
            <a class="card-link" href="${escapeAttribute(item.link || "#")}" target="_blank" rel="noopener noreferrer nofollow">Open article</a>
            <button
              class="save-btn ${state.savedIds.includes(item.id) ? "saved" : ""}"
              type="button"
              data-save-id="${escapeAttribute(item.id)}"
            >
              ${state.savedIds.includes(item.id) ? "Saved" : "Save story"}
            </button>
          </div>
        </article>
      `;
    }).join("");

    els.newsGrid.innerHTML = html;
  }

  function renderSourceChips() {
    const sourceMap = new Map();
    state.items.forEach(item => {
      if (!sourceMap.has(item.sourceId)) {
        sourceMap.set(item.sourceId, item.sourceName);
      }
    });

    const dynamic = Array.from(sourceMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => {
        const active = state.source === id ? "active" : "";
        return `<button class="chip ${active}" type="button" data-source="${escapeAttribute(id)}">${escapeHtml(name)}</button>`;
      })
      .join("");

    els.sourceChips.innerHTML = `
      <button class="chip ${state.source === "all" ? "active" : ""}" type="button" data-source="all">All sources</button>
      ${dynamic}
    `;
  }

  function renderCounts() {
    els.countVisible.textContent = String(state.filtered.length || 0);
    els.countTotal.textContent = String(state.items.length || 0);
    els.countSaved.textContent = String(state.savedIds.length || 0);
  }

  function toggleSaved(id) {
    const idx = state.savedIds.indexOf(id);
    if (idx >= 0) {
      state.savedIds.splice(idx, 1);
    } else {
      state.savedIds.unshift(id);
    }

    state.savedIds = Array.from(new Set(state.savedIds));
    localStorage.setItem(SAVE_KEY, JSON.stringify(state.savedIds));
  }

  function updateSaveButton(btn, id) {
    const isSaved = state.savedIds.includes(id);
    btn.classList.toggle("saved", isSaved);
    btn.textContent = isSaved ? "Saved" : "Save story";
  }

  function setActiveChip(container, activeButton, selector) {
    container.querySelectorAll(selector).forEach(btn => btn.classList.remove("active"));
    activeButton.classList.add("active");
  }

  function resetChipGroup(container, selector, value) {
    const target = container.querySelector(`${selector}[data-category="${value}"], ${selector}[data-source="${value}"], ${selector}[data-view="${value}"]`);
    container.querySelectorAll(selector).forEach(btn => btn.classList.remove("active"));
    if (target) target.classList.add("active");
  }

  function setStatus(message, type) {
    els.statusText.textContent = message || "";
    els.statusDot.classList.remove("loading", "error");

    if (type === "loading" || type === "warning") {
      els.statusDot.classList.add("loading");
    } else if (type === "error") {
      els.statusDot.classList.add("error");
    }
  }

  function dedupeItems(items) {
    const seen = new Set();
    const deduped = [];

    for (const item of items) {
      const key = item.link
        ? item.link.toLowerCase().replace(/\/+$/, "")
        : `${item.sourceId}:${item.title.toLowerCase()}`;

      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }

    return deduped;
  }

  function loadSavedIds() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.lastUpdated || !Array.isArray(parsed.items)) return null;

      if ((Date.now() - parsed.lastUpdated) > CACHE_TTL_MS) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      // ignore localStorage quota errors
    }
  }

  function parseDateSafe(value) {
    const ts = Date.parse(value);
    return Number.isFinite(ts) ? ts : 0;
  }

  function formatRelativeTime(input) {
    const ts = typeof input === "number" ? input : parseDateSafe(input);
    if (!ts) return "Date unavailable";

    const diffMs = Date.now() - ts;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 30) return `${diffDay}d ago`;

    return new Date(ts).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function formatCategoryLabel(category) {
    const map = {
      bitcoin: "Bitcoin",
      ethereum: "Ethereum",
      solana: "Solana",
      defi: "DeFi",
      nft: "NFT",
      regulation: "Regulation",
      security: "Security",
      exchange: "Exchange",
      stablecoin: "Stablecoin",
      layer2: "Layer 2",
      ai: "AI",
      general: "General"
    };
    return map[category] || category;
  }

  function buildId(seed) {
    let hash = 0;
    const str = String(seed || "");
    for (let i = 0; i < str.length; i += 1) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return `news_${Math.abs(hash)}`;
  }

  function cleanExcerpt(html) {
    const text = cleanText(html);
    if (!text) return "";
    return text.length > 190 ? `${text.slice(0, 187).trim()}…` : text;
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, "\"")
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  function sanitizeUrl(value) {
    try {
      const url = new URL(value, window.location.origin);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.href;
      }
      return "";
    } catch {
      return "";
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function debounce(fn, wait) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  document.addEventListener("DOMContentLoaded", init);
})();