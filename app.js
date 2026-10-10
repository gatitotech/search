(() => {
  const $ = (id) => document.getElementById(id);
  const consent = window.GatitaSearchConsent;
  let legalVersion = consent.LEGAL_VERSION;
  let legalAccepted = false;
  let pendingSearch = '';
  try { legalAccepted = consent.hasAccepted(localStorage); } catch {}

  function showLegalGate() {
    document.body.classList.add('consent-locked');
    $('legalCheckbox').checked = false;
    $('legalAccept').disabled = true;
    if (!$('legalGate').open) $('legalGate').showModal();
  }

  async function apiFetch(path, options = {}) {
    if (!legalAccepted) throw new Error('Accept the terms and privacy policy to continue.');
    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        ...options,
        credentials: 'include',
        headers: { 'X-Gatita-Legal-Version': legalVersion, ...options.headers }
      });
    } catch {
      throw new Error('Couldn’t reach Gatita Search. Please try again in a moment.');
    }
    if (!(response.headers.get('content-type') || '').includes('application/json') && !path.startsWith('/favicon?')) {
      throw new Error('Gatita Search is temporarily unavailable. Please try again in a moment.');
    }
    if (response.status === 428) {
      const data = await response.json();
      legalAccepted = false;
      legalVersion = data.legalVersion || consent.LEGAL_VERSION;
      pendingSearch = $('searchInput').value;
      showLegalGate();
      throw new Error(data.error);
    }
    return response;
  }
  const API_BASE_OVERRIDE = (() => {
    try {
      const fromQuery = new URLSearchParams(location.search).get('api');
      if (fromQuery) {
        localStorage.setItem('gatita-search-api-base', fromQuery);
        return fromQuery;
      }
      return localStorage.getItem('gatita-search-api-base') || '';
    } catch { return ''; }
  })();
  const API_BASE = String(
    window.GATITA_SEARCH_API_BASE ||
    API_BASE_OVERRIDE ||
    'https://api.clankr.tech/search/api'
  ).replace(/\/+$/, '');
  const presets = {
    gatita: { bg: '#000000', surface: '#0f0f0f', text: '#ececec', primary: '#ff6600', secondary: '#b8b8b8' },
    light: { bg: '#f7f7f5', surface: '#ffffff', text: '#171717', primary: '#d65700', secondary: '#646464' },
    midnight: { bg: '#090e1c', surface: '#111a2c', text: '#f4f6fc', primary: '#ff8a3d', secondary: '#9eabc2' }
  };
  let theme;
  try { theme = { ...presets.gatita, ...JSON.parse(localStorage.getItem('gatita-search-theme') || '{}') }; }
  catch { theme = { ...presets.gatita }; }

  function rgb(hex) { return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); }
  function light(hex) {
    const values = rgb(hex).map((v) => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
    return values[0] * .2126 + values[1] * .7152 + values[2] * .0722 > .35;
  }
  function applyTheme() {
    for (const [key, color] of Object.entries(theme)) {
      document.documentElement.style.setProperty(`--${key}`, color);
      const input = $(`theme${key[0].toUpperCase()}${key.slice(1)}`);
      if (input) input.value = color;
    }
    const isLight = light(theme.bg);
    document.documentElement.style.setProperty('--line', isLight ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.12)');
    document.documentElement.style.setProperty('color-scheme', isLight ? 'light' : 'dark');
    document.querySelector('meta[name="theme-color"]').content = theme.bg;
    $('brandLogo').style.filter = isLight ? 'brightness(0)' : 'none';
    $('heroLogo').style.filter = isLight ? 'brightness(0)' : 'none';
    $('summaryLogo').style.filter = isLight ? 'brightness(0)' : 'none';
    document.querySelectorAll('[data-preset]').forEach((button) => {
      button.classList.toggle('active', JSON.stringify(theme) === JSON.stringify(presets[button.dataset.preset]));
    });
    if (legalAccepted) {
      try { localStorage.setItem('gatita-search-theme', JSON.stringify(theme)); } catch {}
    }
  }
  applyTheme();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const splashStarted = performance.now();
  const logoReady = $('heroLogo').decode?.().catch(() => {}) || Promise.resolve();
  logoReady.then(() => {
    setTimeout(() => $('splash').classList.add('is-done'), reducedMotion.matches ? 0 : Math.max(0, 720 - (performance.now() - splashStarted)));
  });
  document.querySelectorAll('[data-preset]').forEach((button) => button.addEventListener('click', () => { theme = { ...presets[button.dataset.preset] }; applyTheme(); }));
  for (const key of Object.keys(presets.gatita)) {
    $(`theme${key[0].toUpperCase()}${key.slice(1)}`).addEventListener('input', (event) => { theme[key] = event.target.value; applyTheme(); });
  }
  $('resetTheme').addEventListener('click', () => { theme = { ...presets.gatita }; applyTheme(); });
  function toggleTheme(open) { $('themePanel').hidden = !open; $('appearanceButton').setAttribute('aria-expanded', String(open)); }
  function toggleSettings(open) {
    $('settingsPanel').hidden = !open;
    $('settingsButton').setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('settings-open', open);
    if (open) {
      refreshAccount();
      $('closeSettings').focus();
    } else {
      if ($('settingsPanel').contains(document.activeElement)) $('settingsButton').focus();
      toggleTheme(false);
    }
  }
  $('settingsButton').addEventListener('click', () => toggleSettings($('settingsPanel').hidden));
  $('closeSettings').addEventListener('click', () => toggleSettings(false));
  $('appearanceButton').addEventListener('click', () => toggleTheme($('themePanel').hidden));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') toggleSettings(false); });
  document.addEventListener('click', (event) => {
    if (!$('settingsPanel').hidden && !$('settingsPanel').contains(event.target) && !$('settingsButton').contains(event.target)) toggleSettings(false);
  });

  let accountRequest = null;
  let avatarGeneration = 0;
  function readGatitaAccount() {
    return new Promise((resolve, reject) => {
      const frame = document.createElement('iframe');
      frame.hidden = true;
      frame.title = 'Gatita account status';
      frame.sandbox = 'allow-scripts allow-same-origin';
      const finish = (error, user) => {
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        frame.remove();
        if (error) reject(error);
        else resolve(user);
      };
      const onMessage = (event) => {
        if (event.origin !== 'https://gatita.tech' || event.source !== frame.contentWindow || event.data?.type !== 'gatita-account') return;
        finish(event.data.error ? new Error('Account unavailable') : null, event.data.user || null);
      };
      const timer = setTimeout(() => finish(new Error('Account unavailable')), 10000);
      window.addEventListener('message', onMessage);
      frame.src = 'https://gatita.tech/session-bridge.html';
      document.body.append(frame);
    });
  }
  async function setAccountAvatar(user) {
    const generation = ++avatarGeneration;
    const initial = String(user?.displayName || user?.email || 'G').trim().charAt(0).toUpperCase() || 'G';
    const avatars = [$('accountTriggerAvatar'), $('accountPanelAvatar')];
    avatars.forEach((avatar) => { avatar.textContent = initial; });
    $('settingsButton').setAttribute('aria-label', user ? `Account settings for ${user.displayName || user.email}` : 'Settings');
    if (!user?.email || !window.crypto?.subtle) return;
    try {
      const bytes = new TextEncoder().encode(String(user.email).trim().toLowerCase());
      const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
        .map((byte) => byte.toString(16).padStart(2, '0')).join('');
      if (generation !== avatarGeneration) return;
      avatars.forEach((avatar) => {
        const image = document.createElement('img');
        image.alt = '';
        image.src = `https://www.gravatar.com/avatar/${hash}?d=404`;
        image.onerror = () => image.remove();
        avatar.append(image);
      });
    } catch {}
  }
  async function refreshAccount() {
    if (!legalAccepted) return;
    if (accountRequest) return accountRequest;
    const target = new URL('https://search.gatita.tech/');
    const currentQuery = new URLSearchParams(location.search).get('q');
    if (currentQuery) target.searchParams.set('q', currentQuery);
    const login = new URL('https://gatita.tech/');
    login.searchParams.set('login', '1');
    login.searchParams.set('redirect', target.href);
    accountRequest = (async () => {
      try {
        const user = await readGatitaAccount();
        setAccountAvatar(user);
        $('accountName').textContent = user ? user.displayName || user.email : 'You’re browsing as a guest';
        $('accountDetail').textContent = user ? user.email : 'Use your existing Gatita account.';
        $('accountLinkLabel').textContent = user ? 'Manage Gatita account' : 'Sign in to Gatita';
        $('accountLink').href = user ? 'https://gatita.tech/' : login.href;
      } catch {
        setAccountAvatar(null);
        $('accountName').textContent = 'Account status unavailable';
        $('accountDetail').textContent = 'You can still search or sign in through Gatita.';
        $('accountLinkLabel').textContent = 'Sign in to Gatita';
        $('accountLink').href = login.href;
      } finally { accountRequest = null; }
    })();
    return accountRequest;
  }
  $('refreshAccount').addEventListener('click', refreshAccount);
  window.addEventListener('focus', refreshAccount);

  async function loadWorldEvents() {
    if (!legalAccepted) return;
    try {
      const response = await apiFetch('/trending');
      if (!response.ok) throw new Error('Current events unavailable');
      const { events } = await response.json();
      const list = $('homeSuggestions');
      list.replaceChildren();
      for (const event of events) {
        const row = document.createElement('div');
        row.className = 'event-row';
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = event.title;
        button.addEventListener('click', () => search(event.title));
        const source = document.createElement('a');
        source.href = event.url;
        source.target = '_blank';
        source.rel = 'noopener noreferrer';
        source.textContent = event.source;
        source.insertAdjacentHTML('beforeend', '<svg class="icon-external" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>');
        source.setAttribute('aria-label', `Read on ${event.source}: ${event.title}`);
        row.append(button, source);
        list.append(row);
      }
      if (!events.length) throw new Error('Current events unavailable');
    } catch {
      $('homeSuggestions').replaceChildren();
      const status = document.createElement('p');
      status.className = 'events-status';
      status.textContent = 'Current events are unavailable right now.';
      $('homeSuggestions').append(status);
    }
  }

  let suggestTimer;
  let suggestRequest = 0;
  let activeSuggestion = -1;
  function closeSuggestions() {
    $('searchSuggestions').hidden = true;
    $('searchInput').setAttribute('aria-expanded', 'false');
    $('searchInput').removeAttribute('aria-activedescendant');
    activeSuggestion = -1;
  }
  function renderSuggestions(titles) {
    const list = $('searchSuggestions');
    list.replaceChildren();
    activeSuggestion = -1;
    titles.forEach((title, index) => {
      const option = document.createElement('div');
      option.id = `search-suggestion-${index}`;
      option.className = 'autocomplete-option';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.textContent = title;
      option.addEventListener('mousedown', (event) => event.preventDefault());
      option.addEventListener('click', () => search(title));
      list.append(option);
    });
    list.hidden = !titles.length;
    $('searchInput').setAttribute('aria-expanded', String(Boolean(titles.length)));
  }
  $('searchInput').addEventListener('input', () => {
    clearTimeout(suggestTimer);
    const current = ++suggestRequest;
    const value = $('searchInput').value.trim();
    closeSuggestions();
    if (!legalAccepted || value.length < 2) return;
    suggestTimer = setTimeout(async () => {
      try {
        const response = await apiFetch(`/suggest?q=${encodeURIComponent(value)}`);
        if (!response.ok) return;
        const { suggestions } = await response.json();
        if (current === suggestRequest && document.activeElement === $('searchInput')) renderSuggestions(suggestions);
      } catch {}
    }, 350);
  });
  $('searchInput').addEventListener('keydown', (event) => {
    const options = [...$('searchSuggestions').children];
    if (event.key === 'Escape') { closeSuggestions(); return; }
    if ($('searchSuggestions').hidden || !options.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      activeSuggestion = (activeSuggestion + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      options.forEach((option, index) => option.setAttribute('aria-selected', String(index === activeSuggestion)));
      $('searchInput').setAttribute('aria-activedescendant', options[activeSuggestion].id);
    } else if (event.key === 'Enter' && activeSuggestion >= 0) {
      event.preventDefault();
      search(options[activeSuggestion].textContent);
    }
  });
  document.addEventListener('click', (event) => {
    if (!$('topbar').contains(event.target)) closeSuggestions();
  });

  let query = '';
  let page = 0;
  let hasMore = false;
  let loading = false;
  let generation = 0;
  let searchStarted = 0;
  const seen = new Set();
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore && !loading) loadPage();
  }, { rootMargin: '500px' });
  observer.observe($('sentinel'));

  let summaryText = '';
  let renderedSummary = null;
  let summaryExpanded = false;
  let summaryLoading = false;
  let followupHistory = [];
  function renderSummary() {
    const target = $('summaryText');
    if (renderedSummary !== summaryText) {
      window.GatitaSearchMarkdown.clearMath(target);
      window.GatitaSearchMarkdown.render(target, summaryText);
      renderedSummary = summaryText;
      window.GatitaSearchMarkdown.typeset(target).then(() => {
        if (renderedSummary === summaryText) updateSummaryOverflow();
      });
    }
    target.classList.toggle('is-collapsed', !summaryExpanded);
    updateSummaryOverflow();
    $('summaryFollowup').hidden = !summaryExpanded;
  }
  function updateSummaryOverflow() {
    const target = $('summaryText');
    const overflows = target.scrollHeight > target.clientHeight + 1;
    $('summaryBody').classList.toggle('is-faded', !summaryExpanded && overflows);
    $('summaryToggle').hidden = !summaryExpanded && !overflows;
    $('summaryToggleLabel').textContent = summaryExpanded ? 'View less' : 'View more';
    $('summaryToggle').setAttribute('aria-expanded', String(summaryExpanded));
  }
  $('summaryToggle').addEventListener('click', () => {
    summaryExpanded = !summaryExpanded;
    renderSummary();
  });
  window.addEventListener('resize', () => { if (summaryText && !summaryExpanded) renderSummary(); });
  async function loadSummary(currentGeneration) {
    if (summaryLoading || currentGeneration !== generation) return;
    summaryLoading = true;
    $('summaryPanel').hidden = false;
    $('summaryStatus').hidden = false;
    $('summaryStatus').textContent = 'Reading the search results…';
    try {
      const response = await apiFetch(`/summary?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (currentGeneration !== generation) return;
      if (!response.ok) throw new Error(data.error || 'Summary unavailable.');
      summaryText = data.summary || '';
      if (!summaryText) { $('summaryPanel').hidden = true; return; }
      $('summaryStatus').hidden = true;
      renderSummary();
      $('summarySources').replaceChildren();
      (data.sources || []).forEach((source, index) => {
        let url;
        try { url = new URL(source.url); } catch { return; }
        if (!['https:', 'http:'].includes(url.protocol)) return;
        const link = document.createElement('a');
        link.href = url.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = `[${index + 1}] ${url.hostname.replace(/^www\./, '')}`;
        link.title = source.title;
        $('summarySources').append(link);
      });
    } catch (error) {
      if (currentGeneration !== generation) return;
      $('summaryStatus').textContent = error.message || 'Summary unavailable.';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Try again';
      retry.addEventListener('click', () => loadSummary(currentGeneration));
      $('summaryStatus').append(' ', retry);
    } finally {
      if (currentGeneration === generation) summaryLoading = false;
    }
  }

  $('followupForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const question = $('followupInput').value.trim();
    if (!question || $('followupSubmit').disabled) return;
    const currentGeneration = generation;
    $('followupSubmit').disabled = true;
    $('followupStatus').textContent = 'Checking the search results…';
    try {
      const response = await apiFetch('/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, question, history: followupHistory.slice(-3) })
      });
      const data = await response.json();
      if (currentGeneration !== generation) return;
      if (!response.ok) throw new Error(data.error || 'Follow-up unavailable.');
      const item = document.createElement('div');
      item.className = 'followup-answer';
      const heading = document.createElement('strong');
      heading.textContent = question;
      const answer = document.createElement('div');
      answer.className = 'markdown-body';
      window.GatitaSearchMarkdown.render(answer, data.answer);
      item.append(heading, answer);
      const links = document.createElement('nav');
      links.setAttribute('aria-label', 'Follow-up sources');
      (data.sources || []).forEach((source, index) => {
        let url;
        try { url = new URL(source.url); } catch { return; }
        if (!['https:', 'http:'].includes(url.protocol)) return;
        const link = document.createElement('a');
        link.href = url.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = `[${index + 1}] ${url.hostname.replace(/^www\./, '')}`;
        link.title = source.title;
        links.append(link);
      });
      item.append(links);
      $('followupAnswers').append(item);
      window.GatitaSearchMarkdown.typeset(answer);
      followupHistory.push({ question, answer: data.answer });
      $('followupInput').value = '';
      $('followupStatus').textContent = '';
    } catch (error) {
      if (currentGeneration === generation) $('followupStatus').textContent = error.message || 'Follow-up unavailable.';
    } finally {
      if (currentGeneration === generation) $('followupSubmit').disabled = false;
    }
  });

  function setState(message, retry = false) {
    $('loadState').replaceChildren();
    $('loadState').append(document.createTextNode(message));
    if (retry) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = ' Try again';
      button.addEventListener('click', loadPage);
      $('loadState').append(button);
    }
  }
  const faviconRequests = new Map();
  function loadFavicon(host, icon) {
    if (!faviconRequests.has(host)) {
      faviconRequests.set(host, (async () => {
        const response = await apiFetch(`/favicon?domain=${encodeURIComponent(host)}`);
        if (!response.ok) throw new Error('Favicon unavailable');
        return URL.createObjectURL(await response.blob());
      })().catch(() => null));
    }
    faviconRequests.get(host).then((url) => { if (url && icon.isConnected) icon.src = url; });
  }
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    for (const request of faviconRequests.values()) request.then((url) => { if (url) URL.revokeObjectURL(url); });
    faviconRequests.clear();
  });
  function addResult(item) {
    if (seen.has(item.url)) return;
    seen.add(item.url);
    const row = document.createElement('article');
    row.className = 'result';
    row.style.setProperty('--result-delay', `${Math.min((seen.size - 1) % 10, 5) * 45}ms`);
    const source = document.createElement('div');
    source.className = 'result-source';
    const icon = document.createElement('img');
    icon.className = 'result-favicon';
    icon.alt = '';
    icon.width = 18;
    icon.height = 18;
    icon.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>');
    const domain = document.createElement('span');
    domain.className = 'result-url';
    let host;
    try { const url = new URL(item.url); host = url.hostname; domain.textContent = host + url.pathname; } catch { domain.textContent = item.url; }
    source.append(icon, domain);
    const heading = document.createElement('div');
    heading.className = 'result-title-row';
    const title = document.createElement('a');
    title.className = 'result-title';
    title.href = item.url;
    title.target = '_blank';
    title.rel = 'noopener noreferrer';
    title.textContent = item.title;
    heading.append(title);
    if (item.officialSource) {
      const badge = document.createElement('span');
      badge.className = 'official-source';
      badge.title = `Official domain: ${item.officialSource.name}`;
      badge.setAttribute('role', 'img');
      badge.setAttribute('aria-label', badge.title);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      const seal = document.createElementNS(svg.namespaceURI, 'path');
      seal.setAttribute('d', 'M12 1.5 15 3l3.3.3 1.4 3 2.2 2.5-.7 3.2.7 3.2-2.2 2.5-1.4 3L15 21l-3 1.5L9 21l-3.3-.3-1.4-3L2.1 15.2l.7-3.2-.7-3.2L4.3 6.3l1.4-3L9 3Z');
      seal.setAttribute('fill', 'currentColor');
      const check = document.createElementNS(svg.namespaceURI, 'path');
      check.setAttribute('d', 'm7.5 12 3 3 6-6');
      check.setAttribute('fill', 'none');
      check.setAttribute('stroke', 'var(--bg)');
      check.setAttribute('stroke-width', '2');
      check.setAttribute('stroke-linecap', 'round');
      check.setAttribute('stroke-linejoin', 'round');
      svg.append(seal, check);
      badge.append(svg);
      heading.append(document.createTextNode(' '), badge);
    }
    const snippet = document.createElement('p');
    snippet.className = 'result-snippet';
    snippet.textContent = item.snippet;
    row.append(source, heading, snippet);
    $('results').append(row);
    if (host) loadFavicon(host, icon);
  }
  async function loadPage() {
    if (!legalAccepted || loading || (page > 0 && !hasMore)) return;
    loading = true;
    const currentGeneration = generation;
    const firstPage = page === 0;
    if (firstPage) {
      $('searchProgress').hidden = false;
      document.body.classList.add('is-searching');
    }
    setState(firstPage ? '' : 'Loading more results…');
    try {
      const response = await apiFetch(`/search?q=${encodeURIComponent(query)}&page=${page}`);
      const data = await response.json();
      if (firstPage && !reducedMotion.matches) {
        await new Promise((resolve) => setTimeout(resolve, Math.max(0, 560 - (performance.now() - searchStarted))));
      }
      if (currentGeneration !== generation) return;
      if (!response.ok) throw new Error(data.error || 'Search unavailable.');
      data.results.forEach(addResult);
      if (firstPage && data.results.length) loadSummary(currentGeneration);
      page += 1;
      hasMore = Boolean(data.hasMore);
      $('resultCount').textContent = `${seen.size} result${seen.size === 1 ? '' : 's'}${hasMore ? ' and counting' : ''}`;
      setState(hasMore ? '' : seen.size ? 'You’re all caught up.' : 'No results found.');
      if (hasMore && document.documentElement.scrollHeight <= window.innerHeight + 500) setTimeout(() => { if (!loading) loadPage(); }, 50);
    } catch (error) {
      if (currentGeneration === generation) {
        setState(error.message || 'Search unavailable.', true);
      }
    } finally {
      if (currentGeneration === generation) {
        loading = false;
        $('searchProgress').hidden = true;
        document.body.classList.remove('is-searching');
      }
    }
  }
  function search(value, updateUrl = true) {
    const next = value.trim().slice(0, 300);
    if (!next) return;
    if (!legalAccepted) {
      pendingSearch = next;
      showLegalGate();
      return;
    }
    clearTimeout(suggestTimer);
    suggestRequest++;
    closeSuggestions();
    query = next;
    page = 0;
    hasMore = true;
    loading = false;
    generation += 1;
    summaryText = '';
    renderedSummary = null;
    summaryExpanded = false;
    summaryLoading = false;
    followupHistory = [];
    $('summaryPanel').hidden = true;
    window.GatitaSearchMarkdown.clearMath($('summaryText'));
    $('summaryText').replaceChildren();
    $('summarySources').replaceChildren();
    $('summaryToggle').hidden = true;
    $('summaryFollowup').hidden = true;
    window.GatitaSearchMarkdown.clearMath($('followupAnswers'));
    $('followupAnswers').replaceChildren();
    $('followupInput').value = '';
    $('followupStatus').textContent = '';
    searchStarted = performance.now();
    seen.clear();
    $('results').replaceChildren();
    $('resultCount').textContent = '';
    $('searchInput').value = query;
    $('content').hidden = false;
    document.body.classList.add('has-results');
    document.querySelector('.home-intro').setAttribute('inert', '');
    $('hero').setAttribute('inert', '');
    $('hero').setAttribute('aria-hidden', 'true');
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (updateUrl) history.pushState({ q: query }, '', `?q=${encodeURIComponent(query)}`);
    loadPage();
  }
  $('searchForm').addEventListener('submit', (event) => { event.preventDefault(); search($('searchInput').value); });
  window.addEventListener('popstate', () => { const q = new URLSearchParams(location.search).get('q'); if (q) search(q, false); else location.reload(); });
  const initial = new URLSearchParams(location.search).get('q');
  $('legalGate').addEventListener('cancel', (event) => event.preventDefault());
  $('legalGate').addEventListener('close', () => {
    if (!legalAccepted) showLegalGate();
  });
  document.addEventListener('keydown', (event) => {
    if (!legalAccepted && $('legalGate').open && event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  $('legalCheckbox').addEventListener('change', () => { $('legalAccept').disabled = !$('legalCheckbox').checked; });
  $('legalAccept').addEventListener('click', () => {
    if (!$('legalCheckbox').checked) return;
    legalAccepted = true;
    try { consent.recordAcceptance(localStorage, legalVersion); } catch {}
    $('legalGate').close();
    document.body.classList.remove('consent-locked');
    refreshAccount();
    loadWorldEvents();
    const value = pendingSearch || initial;
    pendingSearch = '';
    if (value) search(value, false);
    else $('searchInput').focus();
  });
  if (!legalAccepted) {
    pendingSearch = initial || '';
    showLegalGate();
  } else {
    refreshAccount();
    loadWorldEvents();
    if (initial) search(initial, false);
  }
})();
