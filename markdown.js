(() => {
  const mathPattern = /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]{1,400}\$/;
  const inline = (target, source) => {
    const pattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]{1,400}\$)|\*\*>\s*([^\n<>]+?)\s*<\*\*|>\s*([^\n<>]+?)\s*<|\*\*>\s*([^\n<>]+?)\s*\*\*|`([^`\n]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|~~([^~\n]+)~~/g;
    let start = 0;
    for (const match of String(source).matchAll(pattern)) {
      if (match.index > start) target.append(document.createTextNode(source.slice(start, match.index)));
      if (match[1]) {
        target.append(document.createTextNode(match[1]));
        start = match.index + match[0].length;
        continue;
      }
      const answer = match[2] || match[3] || match[4];
      const kind = answer ? 'mark' : match[5] ? 'code' : match[6] ? 'a' : match[8] ? 'strong' : match[9] ? 'em' : 'del';
      const node = document.createElement(kind);
      node.textContent = answer || match[5] || match[6] || match[8] || match[9] || match[10];
      if (kind === 'mark') node.className = 'summary-answer';
      if (kind === 'a') {
        node.href = match[7];
        node.target = '_blank';
        node.rel = 'noopener noreferrer';
      }
      target.append(node);
      start = match.index + match[0].length;
    }
    if (start < source.length) target.append(document.createTextNode(source.slice(start)));
  };

  let loading;
  let typesetting = Promise.resolve();
  const typeset = (target) => {
    if (!mathPattern.test(target.textContent)) return Promise.resolve();
    if (!loading) {
      if (window.MathJax?.typesetPromise) loading = Promise.resolve();
      else {
        window.MathJax = {
          tex: { inlineMath: [['$', '$'], ['\\(', '\\)']], displayMath: [['$$', '$$'], ['\\[', '\\]']], processEscapes: true },
          options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] },
          startup: { typeset: false }
        };
        loading = new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.append(script);
        });
      }
    }
    const source = target.textContent;
    return loading.then(async () => {
      await window.MathJax.startup?.promise;
      typesetting = typesetting.then(() => source === target.textContent ? window.MathJax.typesetPromise([target]) : undefined).catch(() => {});
      return typesetting;
    }).catch(() => {});
  };
  const clearMath = (target) => window.MathJax?.typesetClear?.([target]);

  const render = (target, source) => {
    target.replaceChildren();
    const lines = String(source || '').replace(/\r\n/g, '\n').split('\n');
    let paragraph = [];
    let list = null;
    const flush = () => {
      if (paragraph.length) {
        const node = document.createElement('p');
        inline(node, paragraph.join(' '));
        target.append(node);
        paragraph = [];
      }
    };
    // ponytail: Common summary Markdown only. Use a full parser if nested lists or tables become necessary.
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index].trim();
      if (!line) { flush(); list = null; continue; }
      if (line.startsWith('```')) {
        flush(); list = null;
        const code = [];
        while (++index < lines.length && !lines[index].trim().startsWith('```')) code.push(lines[index]);
        const pre = document.createElement('pre');
        const element = document.createElement('code');
        element.textContent = code.join('\n');
        pre.append(element);
        target.append(pre);
        continue;
      }
      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      const bullet = line.match(/^[-*+]\s+(.+)$/);
      const numbered = line.match(/^\d+\.\s+(.+)$/);
      const quote = line.match(/^>\s+(.+)$/);
      if (heading || bullet || numbered || quote) {
        flush();
        if (bullet || numbered) {
          const type = bullet ? 'ul' : 'ol';
          if (!list || list.tagName.toLowerCase() !== type) {
            list = document.createElement(type);
            target.append(list);
          }
          const item = document.createElement('li');
          inline(item, (bullet || numbered)[1]);
          list.append(item);
        } else {
          list = null;
          const node = document.createElement(heading ? `h${heading[1].length}` : 'blockquote');
          inline(node, (heading || quote)[2] || quote?.[1]);
          target.append(node);
        }
      } else {
        list = null;
        paragraph.push(line);
      }
    }
    flush();
  };

  window.GatitaSearchMarkdown = { render, typeset, clearMath };
})();
