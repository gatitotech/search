(() => {
  const inline = (target, source) => {
    const pattern = /\*\*>\s*([^\n<>]+?)\s*<?\*\*|`([^`\n]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|~~([^~\n]+)~~/g;
    let start = 0;
    for (const match of String(source).matchAll(pattern)) {
      if (match.index > start) target.append(document.createTextNode(source.slice(start, match.index)));
      const kind = match[1] ? 'mark' : match[2] ? 'code' : match[3] ? 'a' : match[5] ? 'strong' : match[6] ? 'em' : 'del';
      const node = document.createElement(kind);
      node.textContent = match[1] || match[2] || match[3] || match[5] || match[6] || match[7];
      if (kind === 'mark') node.className = 'summary-answer';
      if (kind === 'a') {
        node.href = match[4];
        node.target = '_blank';
        node.rel = 'noopener noreferrer';
      }
      target.append(node);
      start = match.index + match[0].length;
    }
    if (start < source.length) target.append(document.createTextNode(source.slice(start)));
  };

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

  window.GatitaSearchMarkdown = { render };
})();
