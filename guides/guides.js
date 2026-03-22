(() => {
  const q = document.getElementById('q');
  const clear = document.getElementById('clear');
  const sort = document.getElementById('sort');
  const chips = Array.from(document.querySelectorAll('.chip'));
  const categoryCards = Array.from(document.querySelectorAll('.category-card'));
  const guideItems = Array.from(document.querySelectorAll('.category-card .guide-item'));
  const popularGrid = document.getElementById('popularGrid');
  const popularCards = Array.from(popularGrid ? popularGrid.querySelectorAll('.featureCard') : []);
  const empty = document.getElementById('empty');
  const recommendList = document.getElementById('recommendList');
  const recommendedBox = document.getElementById('recommendedBox');

  let activeFilter = 'all';

  function norm(v) {
    return String(v || '').toLowerCase().trim();
  }

  function capitalize(v) {
    v = String(v || '');
    return v ? v.charAt(0).toUpperCase() + v.slice(1) : '';
  }

  function escapeHtml(str) {
    return String(str || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function scoreItem(el, term) {
    const title = norm(el.dataset.title);
    const tags = norm(el.dataset.tags);
    const cat = norm(el.dataset.cat);
    const popular = el.dataset.popular === '1' ? 2 : 0;
    const isNew = el.dataset.new === '1' ? 1 : 0;

    if (!term) return popular * 10 + isNew * 5;

    let score = 0;

    if (title.includes(term)) score += 10;
    if (tags.includes(term)) score += 6;

    const pieces = term.split(/\s+/).filter(Boolean);
    for (const p of pieces) {
      if (title.includes(p)) score += 4;
      if (tags.includes(p)) score += 2;
      if (cat.includes(p)) score += 1;
    }

    score += popular;
    return score;
  }

  function sortedItems(items, term) {
    const mode = sort ? sort.value : 'popular';
    const copy = [...items];

    copy.sort((a, b) => {
      if (mode === 'az') {
        return norm(a.dataset.title).localeCompare(norm(b.dataset.title));
      }

      if (mode === 'new') {
        const an = a.dataset.new === '1' ? 1 : 0;
        const bn = b.dataset.new === '1' ? 1 : 0;
        if (bn !== an) return bn - an;

        const ap = a.dataset.popular === '1' ? 1 : 0;
        const bp = b.dataset.popular === '1' ? 1 : 0;
        if (bp !== ap) return bp - ap;

        return norm(a.dataset.title).localeCompare(norm(b.dataset.title));
      }

      const sa = scoreItem(a, term);
      const sb = scoreItem(b, term);
      if (sb !== sa) return sb - sa;

      const ap = a.dataset.popular === '1' ? 1 : 0;
      const bp = b.dataset.popular === '1' ? 1 : 0;
      if (bp !== ap) return bp - ap;

      return norm(a.dataset.title).localeCompare(norm(b.dataset.title));
    });

    return copy;
  }

  function updateCounts() {
    const categories = ['qr', 'network', 'security', 'crypto', 'seo', 'dev'];

    categories.forEach(cat => {
      const countEl = document.querySelector(`[data-count-for="${cat}"]`);
      if (!countEl) return;

      const visibleInCat = guideItems.filter(item =>
        item.dataset.cat === cat && !item.classList.contains('hidden')
      ).length;

      countEl.textContent = `${visibleInCat} guide${visibleInCat === 1 ? '' : 's'}`;
    });

    const visibleTotal = guideItems.filter(item => !item.classList.contains('hidden')).length;
    const visiblePopular = guideItems.filter(item => !item.classList.contains('hidden') && item.dataset.popular === '1').length;
    const visibleNew = guideItems.filter(item => !item.classList.contains('hidden') && item.dataset.new === '1').length;

    const statTotal = document.getElementById('statTotal');
    const statPopular = document.getElementById('statPopular');
    const statNew = document.getElementById('statNew');

    if (statTotal) statTotal.textContent = String(visibleTotal);
    if (statPopular) statPopular.textContent = String(visiblePopular);
    if (statNew) statNew.textContent = String(visibleNew);
  }

  function reorderVisibleListItems() {
    const term = norm(q && q.value);

    categoryCards.forEach(card => {
      const list = card.querySelector('.list');
      if (!list) return;

      const items = Array.from(list.querySelectorAll('.guide-item'));
      const visible = items.filter(i => !i.classList.contains('hidden'));
      const hidden = items.filter(i => i.classList.contains('hidden'));
      const orderedVisible = sortedItems(visible, term);

      [...orderedVisible, ...hidden].forEach(item => list.appendChild(item));
    });
  }

  function updatePopularSection(term) {
    if (!popularGrid) return;

    let visibleCount = 0;
    const ordered = sortedItems(popularCards, term);

    ordered.forEach(card => popularGrid.appendChild(card));

    popularCards.forEach(card => {
      const cat = card.dataset.cat;
      const text = `${card.dataset.title} ${card.dataset.tags}`;
      const matchesFilter = activeFilter === 'all' || cat === activeFilter;
      const matchesSearch = !term || norm(text).includes(term);
      const visible = matchesFilter && matchesSearch;

      card.classList.toggle('hidden', !visible);
      if (visible) visibleCount++;
    });

    const section = popularGrid.parentElement;
    if (section) section.classList.toggle('hidden', visibleCount === 0);
  }

  function updateRecommendations(term) {
    if (!recommendList || !recommendedBox) return;

    const visible = guideItems.filter(item => !item.classList.contains('hidden'));
    const ordered = sortedItems(visible, term).slice(0, 3);

    recommendList.innerHTML = '';

    if (!ordered.length) {
      recommendedBox.classList.remove('show');
      return;
    }

    ordered.forEach(item => {
      const a = document.createElement('a');
      a.className = 'miniCard';
      a.href = item.querySelector('.guideTitle')?.getAttribute('href') || '#';

      if (term && scoreItem(item, term) >= 8) {
        const badge = document.createElement('div');
        badge.className = 'badges';
        badge.style.marginBottom = '8px';
        badge.innerHTML = '<span class="badge match">Strong match</span>';
        a.appendChild(badge);
      }

      const title = document.createElement('strong');
      title.textContent = item.dataset.title || 'Guide';

      const span = document.createElement('span');
      span.innerHTML = `Category: ${capitalize(item.dataset.cat || '')}<br>Pairs with: ${escapeHtml(item.dataset.toolname || 'Tool')}`;

      a.appendChild(title);
      a.appendChild(span);
      recommendList.appendChild(a);
    });

    recommendedBox.classList.add('show');
  }

  function apply() {
    const term = norm(q && q.value);
    let shown = 0;

    guideItems.forEach(item => {
      const cat = item.dataset.cat;
      const text = `${item.dataset.title} ${item.dataset.tags} ${item.textContent}`;
      const matchesFilter = activeFilter === 'all' || cat === activeFilter;
      const matchesSearch = !term || norm(text).includes(term);
      const visible = matchesFilter && matchesSearch;

      item.classList.toggle('hidden', !visible);
      if (visible) shown++;
    });

    categoryCards.forEach(card => {
      const visibleChildren = Array.from(card.querySelectorAll('.guide-item'))
        .filter(el => !el.classList.contains('hidden')).length;

      card.classList.toggle('hidden', visibleChildren === 0);
    });

    if (empty) {
      empty.style.display = shown === 0 ? 'block' : 'none';
    }

    reorderVisibleListItems();
    updatePopularSection(term);
    updateRecommendations(term);
    updateCounts();
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter || 'all';
      apply();
    });
  });

  if (q) {
    q.addEventListener('input', apply);
    q.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        apply();
      }
    });
  }

  if (sort) {
    sort.addEventListener('change', apply);
  }

  if (clear) {
    clear.addEventListener('click', () => {
      if (q) q.value = '';
      if (sort) sort.value = 'popular';

      activeFilter = 'all';

      chips.forEach(c => c.classList.remove('active'));
      const allChip = chips.find(c => c.dataset.filter === 'all');
      if (allChip) allChip.classList.add('active');

      apply();

      if (q) q.focus();
    });
  }

  const params = new URLSearchParams(location.search);
  const cat = params.get('cat');
  const term = params.get('q');
  const sortParam = params.get('sort');

  if (cat) {
    const target = chips.find(c => c.dataset.filter === cat);
    if (target) {
      chips.forEach(c => c.classList.remove('active'));
      target.classList.add('active');
      activeFilter = cat;
    }
  }

  if (term && q) {
    q.value = term;
  }

  if (sortParam && sort && ['popular', 'new', 'az'].includes(sortParam)) {
    sort.value = sortParam;
  }

  apply();
})();
