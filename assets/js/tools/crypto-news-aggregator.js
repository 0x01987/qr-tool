(() => {
  'use strict';

  const FEEDS = [
    { source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
    { source: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
    { source: 'Decrypt', url: 'https://decrypt.co/feed' },
    { source: 'Bitcoin Magazine', url: 'https://bitcoinmagazine.com/.rss/full/' },
    { source: 'The Block', url: 'https://www.theblock.co/rss.xml' }
  ];

  const CATEGORY_RULES = [
    { key: 'bitcoin', patterns: ['bitcoin', 'btc', 'satoshi'] },
    { key: 'ethereum', patterns: ['ethereum', 'ether', 'eth'] },
    { key: 'solana', patterns: ['solana', 'sol'] },
    { key: 'defi', patterns: ['defi', 'decentralized finance', 'liquidity', 'yield farming', 'lending protocol'] },
    { key: 'nft', patterns: ['nft', 'nfts', 'non-fungible'] },
    { key: 'regulation', patterns: ['sec', 'cftc', 'regulation', 'regulator', 'compliance', 'lawsuit', 'policy', 'etf approval', 'etf'] },
    { key: 'security', patterns: ['hack', 'exploit', 'breach', 'security', 'attack', 'wallet drain', 'phishing'] },
    { key: 'exchange', patterns: ['exchange', 'binance', 'coinbase', 'kraken', 'bybit', 'okx'] },
    { key: 'stablecoin', patterns: ['stablecoin', 'usdt', 'usdc', 'dai', 'tether', 'circle'] },
    { key: 'layer2', patterns: ['layer 2', 'layer2', 'arbitrum', 'optimism', 'base', 'zksync', 'starknet'] },
    { key: 'ai', patterns: ['ai', 'artificial intelligence', 'agent', 'machine learning'] }
  ];

  const STORAGE_KEYS = {
    saved: 'instantqr_crypto_news_saved',
    state: 'instantqr_crypto_news_state'
  };

  const els = {
    searchInput: document.getElementById('searchInput'),
    sortSelect: document.getElementById('sortSelect'),
    categoryChips: document.getElementById('categoryChips'),
    sourceChips: document.getElementById('sourceChips'),
    viewChips: document.getElementById('viewChips'),
    refreshBtn: document.getElementById('refreshBtn'),
    clearBtn: document.getElementById('clearBtn'),
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    loadingState: document.getElementById('loadingState'),
    emptyState: document.getElementById('emptyState'),
    newsGrid: document.getElementById('newsGrid'),
    countVisible: document.getElementById('countVisible'),
    countTotal: document.getElementById('countTotal'),
    countSaved: document.getElementById('countSaved')
  };

  const state = {
    articles: [],
    filtered: [],
    saved: new Set(),
    selectedCategory: 'all',
    selectedSource: 'all',
    selectedView: 'all',
    search: '',
    sort: 'latest'
  };

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.saved);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        state.saved = new Set(parsed);
      }
    } catch (err) {
      console.warn('Unable to load saved stories', err);
    }
  }

  function saveSaved() {
    try {
      localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify([...state.saved]));
    } catch (err) {
      console.warn('Unable to save stories', err);
    }
  }

  function loadUiState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.state);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      state.selectedCategory = parsed.selectedCategory || 'all';
      state.selectedSource = parsed.selectedSource || 'all';
      state.selectedView = parsed.selectedView || 'all';
      state.search = parsed.search || '';
      state.sort = parsed.sort || 'latest';
    } catch (err) {
      console.warn('Unable to load UI state', err);
    }
  }

  function saveUiState() {
    try {
      localStorage.setItem(STORAGE_KEYS.state, JSON.stringify({
        selectedCategory: state.selectedCategory,
        selectedSource: state.selectedSource,
        selectedView: state.selectedView,
        search: state.search,
        sort: state.sort
      }));
    } catch (err) {
      console.warn('Unable to save UI state', err);
    }
  }

  function setStatus(kind, message) {
    if (!els.statusText || !els.statusDot) return;
    els.statusText.textContent = message;
    els.statusDot.className = 'dot';
    if (kind === 'loading') els.statusDot.classList.add('loading');
    if (kind === 'error') els.statusDot.classList.add('error');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function shorten(text, max = 190) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return clean;
    return clean.slice(0, max - 1).trim() + '…';
  }

  function decodeHtml(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html || '';
    return txt.value;
  }

  function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return (div.textContent || div.innerText || '').trim();
  }

  function normalizeUrl(url) {
    try {
      return new URL(url).toString();
    } catch {
      return '';
    }
  }

  function buildId(article) {
    try {
      return btoa(unescape(encodeURIComponent(`${article.source}|${article.link}|${article.title}`))).slice(0, 120);
    } catch {
      return `${article.source}|${article.link}|${article.title}`.slice(0, 120);
    }
  }

  function detectCategories(text) {
    const hay = (text || '').toLowerCase();
    const found = [];

    for (const rule of CATEGORY_RULES) {
      if (rule.patterns.some((p) => hay.includes(p))) {
        found.push(rule.key);
      }
    }

    return found.length ? found : ['all'];
  }

  function timeAgo(dateString) {
    const ts = Date.parse(dateString);
    if (!Number.isFinite(ts)) return 'Unknown time';

    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;

    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;

    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;

    return new Date(ts).toLocaleDateString();
  }

  function normalizeItem(item, sourceName) {
    const title = decodeHtml(item.title || '').trim();
    const link = normalizeUrl(item.link || item.guid || item.url || '');
    const rawDesc = item.description || item.content || item.contentSnippet || item.summary || '';
    const description = shorten(stripHtml(rawDesc), 220);
    const published = item.pubDate || item.isoDate || item.published || item.created || item.updated || '';
    const source = sourceName || item.source || 'Unknown source';

    if (!title || !link) return null;

    const categories = detectCategories([
      title,
      description,
      Array.isArray(item.categories) ? item.categories.join(' ') : item.categories || ''
    ].join(' '));

    const article = {
      title,
      link,
      description,
      published,
      source,
      categories,
      id: ''
    };

    article.id = buildId(article);
    return article;
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        cache: 'no-store'
      });
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchViaRss2Json(feedUrl) {
    const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
    const res = await fetchWithTimeout(endpoint);
    if (!res.ok) throw new Error(`rss2json failed (${res.status})`);

    const data = await res.json();
    if (data.status && data.status !== 'ok') {
      throw new Error(data.message || 'rss2json returned an error');
    }

    return Array.isArray(data.items) ? data.items : [];
  }

  async function fetchViaRssJsonVercel(feedUrl) {
    const endpoint = `https://rssjson.vercel.app/api?url=${encodeURIComponent(feedUrl)}`;
    const res = await fetchWithTimeout(endpoint);
    if (!res.ok) throw new Error(`rssjson.vercel failed (${res.status})`);

    const data = await res.json();
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.feed?.items)) return data.feed.items;
    if (Array.isArray(data.data?.items)) return data.data.items;

    throw new Error('rssjson.vercel returned no items');
  }

  async function fetchViaAllOrigins(feedUrl) {
    const endpoint = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
    const res = await fetchWithTimeout(endpoint);
    if (!res.ok) throw new Error(`AllOrigins failed (${res.status})`);

    const xml = await res.text();
    if (!xml || (!xml.includes('<item') && !xml.includes('<entry'))) {
      throw new Error('AllOrigins returned invalid XML');
    }

    return parseRssXml(xml);
  }

  function parseRssXml(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');

    if (xml.querySelector('parsererror')) {
      throw new Error('Unable to parse RSS XML');
    }

    const items = [...xml.querySelectorAll('channel > item, feed > entry')];

    return items.map((item) => {
      const title = item.querySelector('title')?.textContent || '';
      const linkNode = item.querySelector('link');
      const link =
        linkNode?.getAttribute('href') ||
        linkNode?.textContent ||
        item.querySelector('guid')?.textContent ||
        '';

      const description =
        item.querySelector('description')?.textContent ||
        item.querySelector('content')?.textContent ||
        item.querySelector('summary')?.textContent ||
        '';

      const pubDate =
        item.querySelector('pubDate')?.textContent ||
        item.querySelector('published')?.textContent ||
        item.querySelector('updated')?.textContent ||
        '';

      const categories = [...item.querySelectorAll('category')].map((n) => n.textContent || '');

      return { title, link, description, pubDate, categories };
    });
  }

  async function fetchFeed(feed) {
    const strategies = [
      fetchViaRss2Json,
      fetchViaRssJsonVercel,
      fetchViaAllOrigins
    ];

    const errors = [];

    for (const strategy of strategies) {
      try {
        const items = await strategy(feed.url);
        return items
          .map((item) => normalizeItem(item, feed.source))
          .filter(Boolean);
      } catch (err) {
        errors.push(err?.message || 'Unknown fetch error');
      }
    }

    throw new Error(`${feed.source}: ${errors.join(' | ')}`);
  }

  function dedupeArticles(items) {
    const seen = new Set();
    const out = [];

    for (const item of items) {
      const key = `${item.link}|${item.title.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }

    return out;
  }

  function sortArticles(items) {
    const sorted = [...items];

    switch (state.sort) {
      case 'oldest':
        sorted.sort((a, b) => (Date.parse(a.published) || 0) - (Date.parse(b.published) || 0));
        break;
      case 'source':
        sorted.sort((a, b) => a.source.localeCompare(b.source) || a.title.localeCompare(b.title));
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'latest':
      default:
        sorted.sort((a, b) => (Date.parse(b.published) || 0) - (Date.parse(a.published) || 0));
        break;
    }

    return sorted;
  }

  function applyFilters() {
    const q = state.search.trim().toLowerCase();
    let items = [...state.articles];

    if (state.selectedCategory !== 'all') {
      items = items.filter((item) => item.categories.includes(state.selectedCategory));
    }

    if (state.selectedSource !== 'all') {
      items = items.filter((item) => item.source === state.selectedSource);
    }

    if (state.selectedView === 'saved') {
      items = items.filter((item) => state.saved.has(item.id));
    }

    if (q) {
      items = items.filter((item) => {
        const bag = [
          item.title,
          item.description,
          item.source,
          item.categories.join(' ')
        ].join(' ').toLowerCase();

        return bag.includes(q);
      });
    }

    state.filtered = sortArticles(items);
    renderArticles();
    updateStats();
    saveUiState();
  }

  function updateStats() {
    if (els.countVisible) els.countVisible.textContent = String(state.filtered.length);
    if (els.countTotal) els.countTotal.textContent = String(state.articles.length);
    if (els.countSaved) els.countSaved.textContent = String(state.saved.size);
  }

  function renderSourceChips() {
    if (!els.sourceChips) return;

    const sources = [...new Set(state.articles.map((a) => a.source))].sort((a, b) => a.localeCompare(b));

    const html = [
      `<button class="chip ${state.selectedSource === 'all' ? 'active' : ''}" type="button" data-source="all">All sources</button>`,
      ...sources.map((source) =>
        `<button class="chip ${state.selectedSource === source ? 'active' : ''}" type="button" data-source="${escapeHtml(source)}">${escapeHtml(source)}</button>`
      )
    ].join('');

    els.sourceChips.innerHTML = html;

    [...els.sourceChips.querySelectorAll('.chip')].forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedSource = btn.dataset.source || 'all';
        renderSourceChips();
        applyFilters();
      });
    });
  }

  function renderArticles() {
    if (!els.loadingState || !els.newsGrid || !els.emptyState) return;

    els.loadingState.hidden = true;

    if (!state.filtered.length) {
      els.newsGrid.hidden = true;
      els.emptyState.hidden = false;
      return;
    }

    els.emptyState.hidden = true;
    els.newsGrid.hidden = false;

    els.newsGrid.innerHTML = state.filtered.map((item) => {
      const isSaved = state.saved.has(item.id);
      const tags = item.categories
        .filter((c) => c !== 'all')
        .slice(0, 4)
        .map((c) => `<span class="tag">${escapeHtml(c)}</span>`)
        .join('');

      return `
        <article class="news-card">
          <div class="news-head">
            <span class="source-badge">${escapeHtml(item.source)}</span>
            <span class="time-badge">${escapeHtml(timeAgo(item.published))}</span>
          </div>

          <h3 class="news-title">
            <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
          </h3>

          <p class="news-desc">${escapeHtml(item.description || 'No summary available.')}</p>

          <div class="tags">${tags || '<span class="tag">crypto</span>'}</div>

          <div class="card-actions">
            <a class="card-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Read story</a>
            <button class="save-btn ${isSaved ? 'saved' : ''}" type="button" data-id="${escapeHtml(item.id)}">
              ${isSaved ? 'Saved' : 'Save'}
            </button>
          </div>
        </article>
      `;
    }).join('');

    [...els.newsGrid.querySelectorAll('.save-btn')].forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (!id) return;

        if (state.saved.has(id)) {
          state.saved.delete(id);
        } else {
          state.saved.add(id);
        }

        saveSaved();
        applyFilters();
      });
    });
  }

  function bindStaticControls() {
    if (!els.searchInput || !els.sortSelect || !els.categoryChips || !els.viewChips || !els.refreshBtn || !els.clearBtn) {
      console.warn('Crypto news aggregator: required DOM elements not found.');
      return;
    }

    els.searchInput.value = state.search;
    els.sortSelect.value = state.sort;

    [...els.categoryChips.querySelectorAll('.chip')].forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.category === state.selectedCategory);
      btn.addEventListener('click', () => {
        state.selectedCategory = btn.dataset.category || 'all';
        [...els.categoryChips.querySelectorAll('.chip')].forEach((n) => n.classList.remove('active'));
        btn.classList.add('active');
        applyFilters();
      });
    });

    [...els.viewChips.querySelectorAll('.chip')].forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === state.selectedView);
      btn.addEventListener('click', () => {
        state.selectedView = btn.dataset.view || 'all';
        [...els.viewChips.querySelectorAll('.chip')].forEach((n) => n.classList.remove('active'));
        btn.classList.add('active');
        applyFilters();
      });
    });

    els.searchInput.addEventListener('input', () => {
      state.search = els.searchInput.value || '';
      applyFilters();
    });

    els.sortSelect.addEventListener('change', () => {
      state.sort = els.sortSelect.value || 'latest';
      applyFilters();
    });

    els.refreshBtn.addEventListener('click', () => {
      loadAllFeeds(true);
    });

    els.clearBtn.addEventListener('click', () => {
      state.selectedCategory = 'all';
      state.selectedSource = 'all';
      state.selectedView = 'all';
      state.search = '';
      state.sort = 'latest';

      els.searchInput.value = '';
      els.sortSelect.value = 'latest';

      [...els.categoryChips.querySelectorAll('.chip')].forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.category === 'all');
      });

      [...els.viewChips.querySelectorAll('.chip')].forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.view === 'all');
      });

      renderSourceChips();
      applyFilters();
    });
  }

  async function loadAllFeeds(isManualRefresh = false) {
    if (!els.loadingState || !els.newsGrid || !els.emptyState) return;

    els.loadingState.hidden = false;
    els.newsGrid.hidden = true;
    els.emptyState.hidden = true;

    setStatus('loading', isManualRefresh ? 'Refreshing crypto news…' : 'Loading crypto news…');

    const results = await Promise.allSettled(FEEDS.map((feed) => fetchFeed(feed)));

    const good = [];
    const failures = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        good.push(...result.value);
      } else {
        failures.push(result.reason?.message || 'Unknown source error');
      }
    }

    state.articles = dedupeArticles(good);
    renderSourceChips();
    applyFilters();

    if (state.articles.length) {
      if (failures.length) {
        setStatus('loading', `Loaded ${state.articles.length} stories. Some sources failed, but partial results are available.`);
      } else {
        setStatus('ok', `Loaded ${state.articles.length} crypto stories from multiple sources.`);
      }
    } else {
      setStatus('error', 'Unable to load crypto news right now. All feed sources failed.');
      els.loadingState.hidden = true;
      els.newsGrid.hidden = true;
      els.emptyState.hidden = false;
      els.emptyState.textContent = 'Unable to fetch crypto news right now. Try Refresh news again in a moment.';
    }

    updateStats();

    if (failures.length) {
      console.warn('Feed failures:', failures);
    }
  }

  function init() {
    loadSaved();
    loadUiState();
    bindStaticControls();
    loadAllFeeds(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
