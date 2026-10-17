(() => {
  const make = (tag, className, text) => {
    const el = document.createElement(tag); if (className) el.className = className;
    if (text) el.textContent = text; return el;
  };
  function safeUrl(value) {
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
  }
  const relativeTime = (value, now = Date.now()) => {
    const date = Date.parse(value);
    if (!Number.isFinite(date)) return '';
    const minutes = Math.max(0, Math.floor((now - date) / 60000));
    if (minutes < 1) return 'Just published';
    return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-(minutes < 60 ? minutes : minutes < 1440 ? Math.floor(minutes / 60) : Math.floor(minutes / 1440)), minutes < 60 ? 'minute' : minutes < 1440 ? 'hour' : 'day');
  };
  function init({ apiFetch, search, canUse, canSummarize }) {
    const $ = (id) => document.getElementById(id);
    const home = { started: false, loading: false, next: null, snapshot: '', seen: new Set(), stories: [], generation: 0, briefAttempted: false };
    let searchGeneration = 0, searchController, briefController;
    const isHome = () => !$('content').hidden ? false : !document.body.classList.contains('has-results');
    function card(story, index, compact = false) {
      const href = safeUrl(story.url);
      if (!href || !story.title || !Number.isFinite(Date.parse(story.published))) return null;
      const article = make('article', 'news-card');
      if (!compact && index % 7 === 0) article.classList.add('is-wide');
      if (!compact && index % 7 === 4) article.classList.add('is-tall');
      if (!compact && index % 7 === 6) article.classList.add('is-short');
      const imageUrl = safeUrl(story.image);
      if (imageUrl) {
        const image = make('img', 'news-image'); image.src = imageUrl; image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer';
        image.addEventListener('error', () => { image.remove(); article.classList.remove('has-image'); });
        article.append(image); article.classList.add('has-image');
      }
      const body = make('div', 'news-card-body');
      const metadata = make('div', 'news-card-meta');
      const time = make('time', '', relativeTime(story.published)); time.dateTime = story.published; time.title = new Date(story.published).toLocaleString();
      metadata.append(make('span', '', story.source), time);
      const heading = make('h3'), link = make('a', '', story.title);
      link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; heading.append(link);
      body.append(metadata, heading);
      if (story.description) body.append(make('p', 'news-description', story.description.slice(0, 200)));
      const explore = make('button', 'news-explore', 'Explore story'); explore.type = 'button';
      explore.insertAdjacentHTML('beforeend', ' <svg class="icon-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>');
      explore.setAttribute('aria-label', `Search for ${story.title}`); explore.addEventListener('click', () => search(story.title));
      body.append(explore); article.append(body); return article;
    }
    function homeStatus(message, retry = false) {
      $('homeNewsStatus').replaceChildren(document.createTextNode(message));
      if (retry) {
        const button = make('button', 'text-button', 'Try again'); button.type = 'button';
        button.addEventListener('click', () => loadHome()); $('homeNewsStatus').append(' ', button);
      }
    }
    async function loadHome(reset = false) {
      if (!canUse() || !isHome() || (home.loading && !reset) || (!reset && home.started && !home.next)) return;
      if (reset) {
        home.generation++; home.started = false; home.next = null; home.seen.clear(); home.stories = []; home.briefAttempted = false;
        briefController?.abort(); $('newsBriefing').hidden = true; $('briefingText').replaceChildren(); $('briefingSources').replaceChildren();
        $('homeSuggestions').replaceChildren();
      }
      const current = home.generation; home.loading = true; $('moreNews').hidden = true;
      homeStatus(home.started ? 'Loading more stories…' : 'Loading news…');
      try {
        const response = await apiFetch(`/news${home.next ? `?cursor=${encodeURIComponent(home.next)}` : reset ? '?refresh=1' : ''}`);
        const data = await response.json();
        if (current !== home.generation) return;
        if (!response.ok) {
          if (response.status === 409) { home.next = null; homeStatus('This feed has been updated. Refresh to see the latest stories.'); return; }
          throw new Error(data.error || 'News unavailable.');
        }
        home.snapshot = data.snapshot; home.next = data.next || null; home.started = true;
        for (const story of data.stories || []) {
          if (home.seen.has(story.url)) continue;
          const item = card(story, home.stories.length);
          if (!item) continue;
          home.seen.add(story.url); home.stories.push(story); $('homeSuggestions').append(item);
        }
        homeStatus(home.next ? '' : 'You’re caught up. Refresh for new stories.');
        $('moreNews').hidden = !home.next;
        considerBriefing();
        // The sentinel can stay in view after a short page: keep filling it.
        if (home.next && $('homeNewsSentinel').getBoundingClientRect().top < innerHeight + 300) requestAnimationFrame(() => loadHome());
      } catch { if (current === home.generation) homeStatus('News is unavailable right now.', true); }
      finally { if (current === home.generation) { home.loading = false; $('moreNews').hidden = !home.next; } }
    }
    async function considerBriefing(force = false) {
      if (!canUse() || !canSummarize() || !isHome() || window.scrollY < 60 || home.stories.length < 3 || (home.briefAttempted && !force)) return;
      const current = home.generation; home.briefAttempted = true;
      briefController?.abort(); briefController = new AbortController();
      const controller = briefController;
      $('newsBriefing').hidden = false; $('briefingStatus').textContent = 'Summarizing the latest headlines…';
      try {
        const response = await apiFetch(`/news/briefing?snapshot=${encodeURIComponent(home.snapshot)}`, { signal: briefController.signal });
        const data = await response.json();
        if (current !== home.generation || !canSummarize()) return;
        if (!response.ok) throw new Error(data.error);
        window.GatitaSearchMarkdown.render($('briefingText'), data.summary);
        $('briefingStatus').textContent = `Based on reports available ${new Date(data.asOf).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
        $('briefingSources').replaceChildren();
        (data.sources || []).forEach((source, i) => {
          const href = safeUrl(source.url); if (!href) return;
          const link = make('a', '', `[${i + 1}] ${source.title}`); link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer';
          $('briefingSources').append(link);
        });
      } catch (error) {
        if (current !== home.generation || controller.signal.aborted) return;
        $('briefingStatus').replaceChildren(document.createTextNode('The summary is unavailable. '));
        const retry = make('button', 'text-button', 'Try again'); retry.type = 'button'; retry.addEventListener('click', () => considerBriefing(true)); $('briefingStatus').append(retry);
      }
    }
    $('briefingToggle').addEventListener('click', () => {
      const expanded = $('briefingBody').hidden;
      $('briefingBody').hidden = !expanded; $('briefingToggle').setAttribute('aria-expanded', String(expanded)); $('briefingToggle').textContent = expanded ? 'Hide' : 'Show';
    });
    function resetSearch() {
      searchGeneration++; searchController?.abort(); briefController?.abort();
      $('searchNewsPanel').hidden = true; $('searchNewsTrack').replaceChildren(); $('content').classList.remove('has-news');
    }
    async function loadSearch(query) {
      const current = ++searchGeneration; searchController?.abort(); searchController = new AbortController();
      $('searchNewsPanel').hidden = false; $('content').classList.add('has-news');
      $('searchNewsStatus').textContent = 'Finding recent coverage…'; $('searchNewsTrack').replaceChildren();
      try {
        const response = await apiFetch(`/news?q=${encodeURIComponent(query)}`, { signal: searchController.signal });
        const data = await response.json();
        if (current !== searchGeneration) return;
        if (!response.ok) throw new Error(data.error);
        (data.stories || []).forEach((story, i) => { const item = card(story, i, true); if (item) $('searchNewsTrack').append(item); });
        if (!$('searchNewsTrack').children.length) { $('searchNewsPanel').hidden = true; $('content').classList.remove('has-news'); }
        $('searchNewsStatus').textContent = '';
        updateScrollButtons();
      } catch {
        if (current !== searchGeneration) return;
        $('searchNewsStatus').replaceChildren(document.createTextNode('Recent coverage is unavailable. '));
        const retry = make('button', 'text-button', 'Try again'); retry.type = 'button'; retry.addEventListener('click', () => loadSearch(query)); $('searchNewsStatus').append(retry);
      }
    }
    function updateScrollButtons() {
      const track = $('searchNewsTrack');
      $('newsPrevious').disabled = track.scrollLeft <= 2;
      $('newsNext').disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    }
    const scrollTrack = (direction) => {
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('reduce-motion');
      $('searchNewsTrack').scrollBy({ left: direction * Math.max(260, $('searchNewsTrack').clientWidth * .8), behavior: reduced ? 'instant' : 'smooth' });
    };
    $('newsPrevious').addEventListener('click', () => scrollTrack(-1)); $('newsNext').addEventListener('click', () => scrollTrack(1));
    $('searchNewsTrack').addEventListener('scroll', updateScrollButtons, { passive: true });
    $('searchNewsTrack').addEventListener('keydown', (event) => {
      if (event.target !== $('searchNewsTrack') || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault(); scrollTrack(event.key === 'ArrowLeft' ? -1 : 1);
    });
    $('moreNews').addEventListener('click', () => loadHome()); $('refreshNews').addEventListener('click', () => loadHome(true));
    const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting && home.started) loadHome(); }, { rootMargin: '450px' });
    observer.observe($('homeNewsSentinel'));
    window.addEventListener('scroll', () => considerBriefing(), { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    const timer = setInterval(() => document.querySelectorAll('.news-card time').forEach((time) => { time.textContent = relativeTime(time.dateTime); }), 60000);
    window.addEventListener('pagehide', (event) => { if (!event.persisted) clearInterval(timer); });
    return { startHome: () => loadHome(), resetSearch, loadSearch, considerBriefing, pauseBriefing: () => { briefController?.abort(); $('newsBriefing').hidden = true; } };
  }
  window.GatitaSearchNews = { init, relativeTime };
})();
