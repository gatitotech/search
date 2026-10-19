(() => {
  function init({ apiFetch, search }) {
    const target = document.getElementById('spellingNotice');
    let sequence = 0, controller;
    const link = (label, query, options) => {
      const a = document.createElement('a'); a.textContent = label;
      const params = new URLSearchParams({ q: query });
      if (options.original) params.set('original', options.original);
      if (options.literal) params.set('literal', '1');
      a.href = `?${params}`;
      a.addEventListener('click', (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button) return;
        event.preventDefault(); search(query, true, options);
      });
      return a;
    };
    function reset(query, { original = '' } = {}) {
      sequence++; controller?.abort(); target.replaceChildren(); target.hidden = true;
      if (original && original.toLowerCase() !== query.toLowerCase()) {
        const strong = document.createElement('strong'); strong.textContent = query;
        target.append('Showing results for ', strong, '. ', link(`Search instead for ${original}`, original, { literal: true }));
        target.hidden = false;
      }
    }
    async function load(query) {
      const current = ++sequence; controller?.abort(); controller = new AbortController();
      try {
        const response = await apiFetch(`/spelling?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) return;
        const { correction } = await response.json();
        if (current !== sequence || typeof correction !== 'string' || !correction.trim() || correction.toLowerCase() === query.toLowerCase()) return;
        target.replaceChildren();
        target.append('Did you mean ', link(correction, correction, { original: query }), '? ', link(`Search instead for ${query}`, query, { literal: true }));
        target.hidden = false;
      } catch { /* Spelling suggestions never interrupt results. */ }
    }
    return { reset, load };
  }
  const literalQuery = (query) => {
    if (/\b(?:AND|OR|NOT|NEAR)\b|(?:^|\s)-\S/.test(query) || query.length > 160 || /["“”`:@/\\=+*^<>{}\[\]|]|\d/.test(query)) return query;
    return query.split(/\s+/).map((word) => /^[\p{L}'-]+$/u.test(word) ? `"${word}"` : word).join(' ');
  };
  window.GatitaSearchSpelling = { init, literalQuery };
})();
