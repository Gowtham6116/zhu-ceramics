(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const chapters = [
    { id: 'home', path: '/', title: 'Home', kicker: '01 / 10', selectors: ['#hero', '.kinetic-strip', '#xp', '#tn', '#guide'], intro: 'A tile is the beginning of a space.', copy: 'The Kani opening journey now moves from first impression to material detail to the collection in one cinematic Home experience.' },
    { id: 'catalogue', path: '/catalogue', title: 'Tile Catalogue', kicker: '02 / 10', selectors: ['#catalogue'], intro: 'Choose a surface.', copy: 'Browse the supplied collection by look, search by name, and open a product conversation without checkout.' },
    { id: 'bathroom', path: '/bathroom-living', title: 'Bathroom & Living', kicker: '03 / 10', selectors: ['#bathroom'], intro: 'Build the whole space.', copy: 'See how surfaces meet light, fittings, timber, and the everyday rituals of a room.' },
    { id: 'visualizer', path: '/visualizer', title: 'Room Visualiser', kicker: '04 / 10', selectors: ['#visualizer'], intro: 'See your tile at home.', copy: 'Make a considered room direction with a tile, a palette, and a surface placement.' },
    { id: 'combinations', path: '/curated-combinations', title: 'Curated Combinations', kicker: '05 / 10', selectors: ['#recommended'], intro: 'Good together.', copy: 'Three room edits for starting a conversation between surface, light, and mood.' },
    { id: 'enquiry', path: '/enquiry', title: 'Enquiry', kicker: '06 / 10', selectors: ['#enquire'], intro: 'Let’s find your tile.', copy: 'Tell us what caught your eye. We will help confirm the material, the room, and the next useful question.' },
    { id: 'story', path: '/story', title: 'Our Story', kicker: '07 / 10', selectors: ['#story'], intro: 'Good spaces start with good choices.', copy: 'Kani is a material-first way to think about everyday spaces: tactile, considered, and made for living.' },
    { id: 'how', path: '/how-it-works', title: 'How It Works', kicker: '08 / 10', selectors: ['#how-it-works'], intro: 'From browsing to beautiful.', copy: 'A simple route from feeling to material to a useful showroom conversation.' },
    { id: 'faqs', path: '/faqs', title: 'FAQs', kicker: '09 / 10', selectors: ['#help'], intro: 'The little details.', copy: 'Practical answers for moving from inspiration to a confident material choice.' },
    { id: 'visit', path: '/visit', title: 'Visit Showroom', kicker: '10 / 10', selectors: ['#visit'], intro: 'A sample tells the story.', copy: 'Bring the feeling into the room at Madukkarai. See the surface, the scale, and the light in person.' }
  ];
  const byId = Object.fromEntries(chapters.map((chapter) => [chapter.id, chapter]));
  const aliases = { '/material-philosophy': 'home', '/collections': 'home', '/bathroom': 'bathroom', '/contact': 'enquiry', '/visit-showroom': 'visit', '/guide': 'home' };
  let current = 'home';

  const toast = (message) => {
    const node = $('#siteToast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('is-visible');
    clearTimeout(window.__kaniToastTimer);
    window.__kaniToastTimer = setTimeout(() => node.classList.remove('is-visible'), 2600);
  };
  window.kaniToast = toast;

  const routeForLocation = () => {
    const path = location.pathname.replace(/\/$/, '') || '/';
    if (aliases[path]) return aliases[path];
    const direct = chapters.find((chapter) => chapter.path.replace(/\/$/, '') === path);
    if (direct) return direct.id;
    const hash = location.hash.replace('#', '');
    const hashMap = { top: 'home', hero: 'home', xp: 'material', tn: 'collections', catalogue: 'catalogue', bathroom: 'bathroom', visualizer: 'visualizer', recommended: 'combinations', enquire: 'enquiry', story: 'story', 'how-it-works': 'how', help: 'faqs', visit: 'visit', guide: 'home' };
    return hashMap[hash] || 'home';
  };

  const chapterTemplate = (chapter) => `<div class="chapter-intro"><div><p class="lab">${chapter.kicker} · KANI CERAMICS</p><h1 class="serif">${chapter.intro}</h1></div><p>${chapter.copy}</p></div>`;
  const ensureIntros = () => chapters.forEach((chapter) => {
    chapter.selectors.filter((selector) => selector.startsWith('#')).forEach((selector) => {
      const node = $(selector);
      if (!node || node.id === 'hero' || node.querySelector(':scope > .chapter-intro')) return;
      node.insertAdjacentHTML('afterbegin', chapterTemplate(chapter));
    });
  });

  const ensureVisitTiles = () => {
    const grid = $('#visitTileGrid');
    if (!grid || grid.dataset.ready) return;
    const cards = $$('#grid .card').slice(0, 4);
    cards.forEach((card) => {
      const swatch = card.querySelector('.sw');
      const name = card.querySelector('h3')?.textContent || 'Kani surface';
      const tile = document.createElement('article');
      tile.className = 'visit-tile-card';
      tile.innerHTML = `<button class="visit-tile-swatch" type="button" aria-label="Enquire about ${name}"></button><div><p class="lab">KANI SURFACE</p><h4 class="serif">${name}</h4><button class="link" type="button">Enquire about this tile →</button></div>`;
      const visual = tile.querySelector('.visit-tile-swatch');
      visual.style.backgroundImage = swatch?.style.backgroundImage || 'linear-gradient(135deg,#d8c8b0,#8d7a67)';
      const openEnquiry = () => { const field = $('#productInterest'); if (field) field.value = name; const note = $('#ms'); if (note) note.value = `I’m interested in: ${name}`; navigateToChapter('enquiry'); };
      tile.querySelectorAll('button').forEach((button) => button.addEventListener('click', openEnquiry));
      grid.appendChild(tile);
    });
    grid.dataset.ready = 'true';
  };

  const ensureChrome = () => {
    if ($('#chapterChrome')) return;
    const node = document.createElement('div');
    node.id = 'chapterChrome';
    node.innerHTML = `<div class="chapter-chrome-meta"><span class="lab" id="chapterKicker"></span><strong id="chapterTitle"></strong></div><div class="chapter-chrome-actions"><button id="chapterPrev" type="button" aria-label="Previous page">←</button><span id="chapterCounter">01 / 12</span><button id="chapterNext" type="button" aria-label="Next page">→</button></div>`;
    document.body.appendChild(node);
    const menu = document.createElement('button');
    menu.id = 'chapterMenuButton';
    menu.type = 'button';
    menu.textContent = 'Chapters';
    menu.setAttribute('aria-expanded', 'false');
    document.body.appendChild(menu);
    const drawer = document.createElement('aside');
    drawer.id = 'chapterMenu';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = `<div class="chapter-menu-panel"><div class="chapter-menu-head"><p class="lab">KANI CERAMICS</p><button type="button" id="chapterMenuClose" aria-label="Close chapters">×</button></div><h2 class="serif">12 chapters<br><em>of material.</em></h2><nav aria-label="Chapter menu">${chapters.map((chapter) => `<a href="${chapter.path}" data-chapter-link="${chapter.id}"><span>${chapter.kicker}</span><strong>${chapter.title}</strong></a>`).join('')}</nav></div>`;
    document.body.appendChild(drawer);
    $('#chapterPrev').addEventListener('click', () => navigateToChapter(chapters[Math.max(0, chapters.findIndex((item) => item.id === current) - 1)].id));
    $('#chapterNext').addEventListener('click', () => navigateToChapter(chapters[Math.min(chapters.length - 1, chapters.findIndex((item) => item.id === current) + 1)].id));
    menu.addEventListener('click', () => { drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); menu.setAttribute('aria-expanded', 'true'); });
    $('#chapterMenuClose').addEventListener('click', closeChapterMenu);
    drawer.addEventListener('click', (event) => { if (event.target === drawer) closeChapterMenu(); });
  };
  const closeChapterMenu = () => { const drawer = $('#chapterMenu'); if (!drawer) return; drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); $('#chapterMenuButton')?.setAttribute('aria-expanded', 'false'); };

  const renderChapter = (id, { push = true } = {}) => {
    const chapter = byId[id] || byId.home;
    current = chapter.id;
    document.body.dataset.chapter = chapter.id;
    document.documentElement.dataset.kaniRoute = chapter.id === 'home' ? '' : chapter.id;
    const allowed = new Set(chapter.selectors);
    $$('#main-content > *').forEach((node) => {
      const isDialog = node.tagName === 'DIALOG';
      const visible = isDialog || [...allowed].some((selector) => node.matches(selector));
      node.classList.toggle('chapter-hidden', !visible);
    });
    ensureChrome();
    const index = chapters.findIndex((item) => item.id === chapter.id);
    $('#chapterKicker').textContent = chapter.kicker;
    $('#chapterTitle').textContent = chapter.title;
    $('#chapterCounter').textContent = `${String(index + 1).padStart(2, '0')} / ${String(chapters.length).padStart(2, '0')}`;
    $('#chapterPrev').disabled = index === 0;
    $('#chapterNext').disabled = index === chapters.length - 1;
    $$('#chapterMenu [data-chapter-link]').forEach((link) => link.classList.toggle('is-current', link.dataset.chapterLink === chapter.id));
    document.title = `${chapter.title} — Kani Ceramics`;
    closeChapterMenu();
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    if (push) history.pushState({}, '', chapter.path);
    window.dispatchEvent(new CustomEvent('chapterchange', { detail: chapter }));
  };
  function navigateToChapter(id) { renderChapter(id); }
  window.navigateToChapter = navigateToChapter;

  const navigateFromLink = (event, link) => {
    const id = link.dataset.chapterLink || routeForHref(link.getAttribute('href'));
    if (!id || !byId[id]) return;
    event.preventDefault();
    navigateToChapter(id);
  };
  const routeForHref = (href = '') => {
    if (href.startsWith('#')) {
      const hashMap = { top: 'home', hero: 'home', xp: 'material', tn: 'collections', catalogue: 'catalogue', bathroom: 'bathroom', visualizer: 'visualizer', recommended: 'combinations', enquire: 'enquiry', story: 'story', 'how-it-works': 'how', help: 'faqs', visit: 'visit', guide: 'home' };
      return hashMap[href.slice(1)];
    }
    const match = chapters.find((chapter) => chapter.path === href);
    return match?.id || aliases[href];
  };

  const drawer = $('#mobileDrawer');
  const trigger = $('#mobileMenuTrigger');
  let menuReturnFocus = trigger;
  const closeDrawer = () => { if (!drawer) return; drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); trigger?.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; menuReturnFocus?.focus(); };
  trigger?.addEventListener('click', () => { menuReturnFocus = trigger; drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); trigger.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; $('.mobile-drawer-close')?.focus(); });
  $('.mobile-drawer-close')?.addEventListener('click', closeDrawer);
  drawer?.addEventListener('click', (event) => { if (event.target === drawer) closeDrawer(); });

  const searchInput = $('#tileSearch');
  const searchCount = $('#searchCount');
  const noResults = $('#noResults');
  const applySearch = () => {
    if (!searchInput || !$('#grid')) return;
    const query = searchInput.value.trim().toLowerCase();
    const cards = $$('.card', $('#grid'));
    let visible = 0;
    cards.forEach((card) => { const match = !query || card.textContent.toLowerCase().includes(query); card.hidden = !match; if (match) visible += 1; });
    if (searchCount) searchCount.textContent = query ? `${visible} ${visible === 1 ? 'match' : 'matches'}` : `${cards.length} surfaces shown`;
    noResults?.classList.toggle('is-visible', !!query && visible === 0);
  };
  searchInput?.addEventListener('input', applySearch);
  $('#grid')?.addEventListener('click', () => setTimeout(applySearch, 30));
  if ($('#grid')) new MutationObserver(() => setTimeout(applySearch, 0)).observe($('#grid'), { childList: true });

  const setContactLinks = () => {
    const message = encodeURIComponent("Hello Kani Ceramics, I'd like help choosing a tile.");
    $('#wa')?.setAttribute('href', `https://wa.me/919360913055?text=${message}`);
    $('#tel')?.setAttribute('href', 'tel:+919360913055');
    $('#mail')?.setAttribute('href', 'mailto:kaniceramicscbe@gmail.com');
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-chapter-link], a[href^="/"], a[href^="#"]');
    if (link) navigateFromLink(event, link);
    if (event.target.closest('[data-q]')) setTimeout(() => toast('Enquiry context ready — add your details on the next page.'), 40);
    if (event.target.closest('#enquireVisual')) setTimeout(() => toast('Room direction ready — add your details to enquire.'), 40);
  });
  window.addEventListener('popstate', () => renderChapter(routeForLocation(), { push: false }));
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input,textarea,select,[contenteditable="true"]')) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') navigateToChapter(chapters[Math.min(chapters.length - 1, chapters.findIndex((item) => item.id === current) + 1)].id);
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') navigateToChapter(chapters[Math.max(0, chapters.findIndex((item) => item.id === current) - 1)].id);
    if (event.key === 'Escape') { closeChapterMenu(); closeDrawer(); }
  });
  let swipeStart = null;
  document.addEventListener('touchstart', (event) => { swipeStart = event.changedTouches[0]; }, { passive: true });
  document.addEventListener('touchend', (event) => { if (!swipeStart) return; const dx = event.changedTouches[0].clientX - swipeStart.clientX; const dy = event.changedTouches[0].clientY - swipeStart.clientY; swipeStart = null; if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy)) return; const index = chapters.findIndex((item) => item.id === current); navigateToChapter(chapters[dx < 0 ? Math.min(chapters.length - 1, index + 1) : Math.max(0, index - 1)].id); });

  ensureIntros();
  ensureVisitTiles();
  ensureChrome();
  setContactLinks();
  renderChapter(routeForLocation(), { push: false });
})();
