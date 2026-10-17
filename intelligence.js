(() => {
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  function safeUrl(value, image = false) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password && (!image || url.hostname === 'upload.wikimedia.org') ? url.href : null;
    } catch { return null; }
  }
  function link(label, url, className) {
    const href = safeUrl(url);
    if (!href) return null;
    const element = node('a', className, label);
    element.href = href;
    element.target = '_blank';
    element.rel = 'noopener noreferrer';
    return element;
  }
  function render(target, card, search) {
    target.replaceChildren();
    target.hidden = !card;
    if (!card) return;
    const references = (parent, ids) => {
      for (const id of ids || []) {
        const source = card.sources?.[id - 1];
        if (!source) continue;
        const reference = link(`[${id}]`, source.url, 'intelligence-ref');
        if (reference) {
          reference.setAttribute('aria-label', `Source ${id}: ${source.title}`);
          parent.append(' ', reference);
        }
      }
    };
    if (card.images?.length) {
      const gallery = node('div', 'intelligence-gallery');
      for (const item of card.images.slice(0, 3)) {
        const src = safeUrl(item.src, true);
        const anchor = link('', item.url, 'intelligence-photo');
        if (!src || !anchor) continue;
        const img = node('img');
        img.src = src;
        img.alt = item.alt || card.title;
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        img.addEventListener('error', () => anchor.remove());
        anchor.title = `${item.credit} · ${item.license} · View image source`;
        anchor.append(img);
        gallery.append(anchor);
      }
      if (gallery.childElementCount) {
        target.append(gallery, node('p', 'intelligence-image-note', 'From the Wikipedia article'));
      }
    }
    target.append(node('h2', 'intelligence-title', card.title));
    if (card.subtitle) target.append(node('p', 'intelligence-subtitle', card.subtitle));
    const answer = node('p', `intelligence-answer${card.calculated ? ' is-calculated' : ''}`, card.answer);
    references(answer, card.answerSources);
    target.append(answer);
    if (card.facts?.length) {
      const facts = node('dl', 'intelligence-facts');
      for (const fact of card.facts) {
        const row = node('div');
        const value = node('dd', '', fact.value);
        references(value, fact.sources);
        row.append(node('dt', '', fact.label), value);
        facts.append(row);
      }
      target.append(facts);
    }
    if (card.steps?.length) {
      const details = node('details', 'intelligence-steps');
      details.open = true;
      details.append(node('summary', '', card.kind === 'conversion' ? 'How it converts' : 'Work it out'));
      const steps = node('ol');
      card.steps.forEach((step) => steps.append(node('li', '', step)));
      details.append(steps);
      target.append(details);
    }
    if (card.actions?.length) {
      const actions = node('div', 'intelligence-actions');
      card.actions.forEach((action) => {
        const a = link(action.label, action.url);
        if (a) { a.insertAdjacentHTML('beforeend', ' <svg class="icon-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>'); actions.append(a); }
      });
      target.append(actions);
    }
    if (card.related?.length) {
      const related = node('div', 'intelligence-related');
      related.append(node('p', '', 'Keep exploring'));
      card.related.forEach((query) => {
        const button = node('button', '', query);
        button.type = 'button';
        button.insertAdjacentHTML('beforeend', ' <svg class="icon-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>');
        button.addEventListener('click', () => search(query));
        related.append(button);
      });
      target.append(related);
    }
    const sources = node('div', 'intelligence-sources');
    sources.append(node('p', '', card.calculated ? 'Calculated locally' : card.attribution || 'Sources'));
    for (const [index, source] of (card.sources || []).entries()) {
      const a = link(`[${index + 1}] ${source.title}`, source.url);
      if (a) sources.append(a);
    }
    if (card.images?.length) {
      const credits = node('details', 'intelligence-credits');
      credits.append(node('summary', '', 'Image credits & licenses'));
      card.images.forEach((img) => {
        const a = link(`${img.credit} · ${img.license}`, img.url);
        if (a) credits.append(a);
      });
      sources.append(credits);
    }
    target.append(sources);
  }
  window.GatitaSearchIntelligence = { render };
})();
