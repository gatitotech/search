(() => {
  const KEY = 'gatita-search-appearance';
  const defaults = {
    background: 'none', blur: 12, dim: 0, size: 14, spacing: 'comfortable', radius: 18, motion: 'system',
    topbarOpacity: 100, topbarBlur: 18, searchOpacity: 100, topbarPosition: 'sticky', topbarDensity: 'comfortable', showBrand: true,
    footerOpacity: 92, footerBlur: 16, footerPosition: 'auto', footerAlignment: 'spread', footerCompact: true, footerBorder: true,
    homePosition: 'balanced', newsColumns: 'auto', showNews: true, showNewsImages: true
  };
  const gradients = {
    aurora: 'radial-gradient(ellipse at 15% 25%, #27485f 0%, transparent 55%), radial-gradient(ellipse at 85% 70%, #563c68 0%, transparent 55%), linear-gradient(140deg,#07131d,#13101f)',
    dusk: 'radial-gradient(ellipse at 70% 25%, #a85e42 0%, transparent 55%), radial-gradient(ellipse at 10% 75%, #363d62 0%, transparent 55%), linear-gradient(155deg,#2d1822,#111527)'
  };
  const clamp = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
  const numbers = { topbarOpacity: [0, 100], topbarBlur: [0, 40], searchOpacity: [20, 100], footerOpacity: [0, 100], footerBlur: [0, 40] };
  const choices = { topbarPosition: ['sticky', 'scroll'], topbarDensity: ['comfortable', 'compact', 'roomy'], footerPosition: ['auto', 'flow', 'pinned'], footerAlignment: ['spread', 'center'], homePosition: ['balanced', 'high', 'low'], newsColumns: ['auto', '2', '3'] };
  const flags = ['showBrand', 'footerCompact', 'footerBorder', 'showNews', 'showNewsImages'];
  const sections = { topbar: ['topbarOpacity', 'topbarBlur', 'searchOpacity', 'topbarPosition', 'topbarDensity', 'showBrand'], footer: ['footerOpacity', 'footerBlur', 'footerPosition', 'footerAlignment', 'footerCompact', 'footerBorder'], backdrop: ['background', 'blur', 'dim'], reading: ['size', 'spacing', 'radius', 'motion', 'homePosition', 'newsColumns', 'showNews', 'showNewsImages'] };
  function normalize(value = {}) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) value = {};
    const extra = {};
    for (const [key, [min, max]] of Object.entries(numbers)) extra[key] = value[key] == null ? defaults[key] : clamp(value[key], min, max, defaults[key]);
    for (const [key, options] of Object.entries(choices)) extra[key] = options.includes(value[key]) ? value[key] : defaults[key];
    for (const key of flags) extra[key] = typeof value[key] === 'boolean' ? value[key] : defaults[key];
    return { ...extra, background: ['none', 'aurora', 'dusk', 'custom'].includes(value.background) ? value.background : defaults.background,
      blur: clamp(value.blur, 0, 40, 12), dim: clamp(value.dim, 0, 85, defaults.dim), size: clamp(value.size, 12, 18, 14),
      radius: clamp(value.radius, 4, 28, 18), spacing: ['comfortable', 'compact', 'relaxed'].includes(value.spacing) ? value.spacing : defaults.spacing,
      motion: value.motion === 'reduced' ? 'reduced' : 'system' };
  }
  function init({ canStore }) {
    const $ = (id) => document.getElementById(id);
    let prefs = { ...defaults }, imageUrl = '', fileGeneration = 0, dbPromise;
    const openDB = () => dbPromise ||= new Promise((resolve, reject) => {
      const request = indexedDB.open('gatita-search-appearance', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('assets');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { dbPromise = null; reject(request.error); };
      request.onblocked = () => { dbPromise = null; reject(new Error('Storage blocked')); };
    });
    const asset = async (operation, value) => {
      if (!canStore()) throw new Error('Storage unavailable');
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('assets', operation === 'get' ? 'readonly' : 'readwrite');
        const store = tx.objectStore('assets');
        const request = operation === 'put' ? store.put(value, 'background') : operation === 'delete' ? store.delete('background') : store.get('background');
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    };
    const surfacePresets = { solid: [100, 0], soft: [72, 24], clear: [0, 0] };
    const save = () => {
      let saved = false;
      if (canStore()) try { localStorage.setItem(KEY, JSON.stringify(prefs)); saved = true; } catch {}
      document.querySelectorAll('.customize-bottom>span').forEach((note) => { note.textContent = saved ? 'Saved on this device' : 'Applied for this session'; });
    };
    function apply() {
      const root = document.documentElement;
      root.style.setProperty('--background-blur', `${prefs.blur}px`);
      root.style.setProperty('--background-dim', prefs.dim / 100);
      root.style.setProperty('--reading-size', `${prefs.size}px`);
      root.style.setProperty('--corner-radius', `${prefs.radius}px`);
      root.style.setProperty('--result-gap', `${prefs.spacing === 'compact' ? 20 : prefs.spacing === 'relaxed' ? 48 : 32}px`);
      document.body.classList.toggle('topbar-customized', prefs.topbarOpacity !== defaults.topbarOpacity || prefs.topbarBlur !== defaults.topbarBlur);
      document.body.classList.toggle('reduce-motion', prefs.motion === 'reduced');
      const background = prefs.background === 'custom' && imageUrl ? `url("${imageUrl}")` : gradients[prefs.background] || '';
      $('backgroundLayer').style.backgroundImage = background;
      document.body.classList.toggle('has-background', Boolean(background));
      $('backgroundStyle').value = prefs.background;
      $('resultSpacing').value = prefs.spacing;
      $('motionPreference').value = prefs.motion;
      for (const [id, key, suffix] of [['backgroundBlur', 'blur', ' px'], ['backgroundDim', 'dim', '%'], ['textSize', 'size', ' px'], ['cornerRadius', 'radius', ' px']]) {
        $(id).value = prefs[key];
        $(`${id}Value`).value = prefs[key] + suffix;
      }
      $('removeBackground').hidden = !imageUrl;
      for (const key of Object.keys(numbers)) {
        root.style.setProperty(`--${key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`, key.endsWith('Blur') ? `${prefs[key]}px` : `${prefs[key]}%`);
        $(key).value = prefs[key];
        $(`${key}Value`).value = prefs[key] + (key.endsWith('Blur') ? ' px' : '%');
      }
      for (const key of Object.keys(choices)) { document.body.dataset[key] = prefs[key]; $(key).value = prefs[key]; }
      for (const key of flags) { document.body.classList.toggle(`hide-${key}`, !prefs[key]); $(key).checked = prefs[key]; }
      document.querySelectorAll('[data-surface-preset]').forEach((button) => {
        const [area, style] = button.dataset.surfacePreset.split(':');
        const [opacity, blur] = surfacePresets[style];
        button.setAttribute('aria-pressed', String(prefs[`${area}Opacity`] === opacity && prefs[`${area}Blur`] === blur));
      });
    }
    async function restore() {
      if (!canStore()) return;
      const current = fileGeneration;
      try { prefs = normalize(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { prefs = { ...defaults }; }
      apply();
      if (prefs.background === 'custom') {
        try {
          const blob = await asset('get');
          if (current !== fileGeneration) return;
          if (!(blob instanceof Blob) || !blob.type.startsWith('image/')) throw new Error('No saved image');
          if (imageUrl) URL.revokeObjectURL(imageUrl);
          imageUrl = URL.createObjectURL(blob); apply();
        } catch { if (current === fileGeneration) { prefs.background = 'none'; apply(); $('backgroundStatus').textContent = 'Saved image unavailable. Choose it again.'; } }
      }
    }
    for (const [id, key] of [['backgroundBlur', 'blur'], ['backgroundDim', 'dim'], ['textSize', 'size'], ['cornerRadius', 'radius']]) {
      $(id).addEventListener('input', () => { prefs[key] = Number($(id).value); apply(); save(); });
    }
    for (const [id, key] of [['backgroundStyle', 'background'], ['resultSpacing', 'spacing'], ['motionPreference', 'motion']]) {
      $(id).addEventListener('change', () => {
        prefs[key] = $(id).value;
        if (key === 'background' && prefs.background === 'custom' && !imageUrl) $('backgroundFile').click();
        apply(); save();
      });
    }
    $('backgroundFile').addEventListener('change', async () => {
      const file = $('backgroundFile').files[0];
      if (!file) return;
      const current = ++fileGeneration;
      if (!/^image\/(?:jpeg|png|webp|avif)$/.test(file.type) || file.size > 12 * 1024 * 1024) {
        $('backgroundStatus').textContent = 'Choose a JPG, PNG, WebP or AVIF image under 12 MB.'; return;
      }
      $('backgroundStatus').textContent = 'Preparing your image…';
      let source;
      try {
        source = URL.createObjectURL(file);
        const image = new Image(); image.src = source; await image.decode();
        if (current !== fileGeneration) return;
        if (image.naturalWidth > 20000 || image.naturalHeight > 20000) throw new Error('Image too large');
        const scale = Math.min(1, 2560 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', .86));
        if (!blob || current !== fileGeneration) return;
        const oldUrl = imageUrl; imageUrl = URL.createObjectURL(blob); prefs.background = 'custom'; apply();
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        try { await asset('put', blob); if (current === fileGeneration) { save(); $('backgroundStatus').textContent = 'Saved in this browser. Your image is never uploaded.'; } }
        catch { if (current === fileGeneration) $('backgroundStatus').textContent = 'Applied for this session. Browser storage is unavailable.'; }
      } catch { if (current === fileGeneration) $('backgroundStatus').textContent = 'Couldn’t open this image. Try another file.'; }
      finally { if (source) URL.revokeObjectURL(source); $('backgroundFile').value = ''; }
    });
    async function removeImage() {
      fileGeneration++;
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageUrl = ''; if (prefs.background === 'custom') prefs.background = 'none';
      apply(); save();
      try { await asset('delete'); $('backgroundStatus').textContent = 'Image removed from this browser.'; }
      catch { $('backgroundStatus').textContent = 'Image removed for this session. Browser storage is unavailable.'; }
    }
    $('removeBackground').addEventListener('click', removeImage);
    let activePanel = null, returnFocus = null;
    function closePanel(focus = true) {
      if (!activePanel) return;
      activePanel.hidden = true; activePanel = null;
      document.querySelectorAll('[data-customize]').forEach((button) => button.setAttribute('aria-expanded', 'false'));
      if (focus) returnFocus?.focus();
    }
    function closeDock() {
      $('customizeDock').hidden = true;
      $('customizeButton').setAttribute('aria-expanded', 'false');
      document.body.classList.remove('customizing');
    }
    $('customizeButton').addEventListener('click', () => {
      const open = $('customizeDock').hidden;
      closePanel(false);
      $('customizeDock').hidden = !open;
      $('customizeButton').setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('customizing', open);
      if (open) document.dispatchEvent(new Event('gatita:customize'));
    });
    document.querySelectorAll('[data-customize]').forEach((button) => button.addEventListener('click', () => {
      const panel = $(`customize-${button.dataset.customize}`), wasOpen = activePanel === panel;
      closePanel(false);
      if (wasOpen) return;
      document.dispatchEvent(new Event('gatita:customize'));
      returnFocus = button; activePanel = panel; panel.hidden = false;
      document.querySelectorAll(`[data-customize="${button.dataset.customize}"]`).forEach((trigger) => trigger.setAttribute('aria-expanded', 'true'));
      panel.querySelector('[data-close-customize]').focus();
    }));
    document.querySelectorAll('[data-close-customize]').forEach((button) => button.addEventListener('click', () => closePanel()));
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (activePanel) { event.stopImmediatePropagation(); closePanel(); }
      else if (!$('customizeDock').hidden) { closeDock(); $('customizeButton').focus(); }
    });
    document.addEventListener('click', (event) => {
      if (event.target.closest('.customize-panel, .customize-dock, [data-customize], #customizeButton')) return;
      closePanel(false); closeDock();
    });
    document.querySelectorAll('[data-appearance]').forEach((input) => input.addEventListener(input.type === 'range' ? 'input' : 'change', () => {
      prefs[input.dataset.appearance] = input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value;
      apply(); save();
    }));
    document.querySelectorAll('[data-surface-preset]').forEach((button) => button.addEventListener('click', () => {
      const [area, style] = button.dataset.surfacePreset.split(':');
      [prefs[`${area}Opacity`], prefs[`${area}Blur`]] = surfacePresets[style]; apply(); save();
    }));
    document.querySelectorAll('[data-reset-section]').forEach((button) => button.addEventListener('click', async () => {
      const section = button.dataset.resetSection;
      for (const key of sections[section]) prefs[key] = defaults[key];
      if (section === 'backdrop') await removeImage();
      else { apply(); save(); }
    }));
    window.addEventListener('pagehide', (event) => { if (!event.persisted && imageUrl) URL.revokeObjectURL(imageUrl); });
    apply();
    return { restore };
  }
  window.GatitaSearchAppearance = { init, normalize };
})();
