const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const element = (tagName) => ({
  tagName, children: [],
  append(...nodes) { this.children.push(...nodes); },
  replaceChildren() { this.children = []; },
  set textContent(value) { this.children = [{ text: value }]; }
});
const context = {
  window: {},
  document: { createElement: element, createTextNode: (text) => ({ text }) }
};
vm.runInNewContext(fs.readFileSync(__dirname + '/markdown.js', 'utf8'), context);
const root = element('div');
context.window.GatitaSearchMarkdown.render(root, '**>Paris<** is the **capital** of [France](https://example.com). <img onerror=bad>\n\n- First\n- Second\n\n```js\nconst x = 1;\n```');
assert.equal(root.children[0].tagName, 'p');
assert.equal(root.children[0].children[0].tagName, 'mark');
assert.equal(root.children[0].children[0].className, 'summary-answer');
assert.equal(root.children[0].children[0].children[0].text, 'Paris');
assert.ok(root.children[0].children.some((node) => node.tagName === 'strong'));
assert.equal(root.children[0].children.find((node) => node.tagName === 'a').href, 'https://example.com');
assert.ok(root.children[0].children.some((node) => node.text?.includes('<img onerror=bad>')));
assert.equal(root.children[1].tagName, 'ul');
assert.equal(root.children[1].children.length, 2);
assert.equal(root.children[2].tagName, 'pre');
assert.equal(root.children[2].children[0].children[0].text, 'const x = 1;');
context.window.GatitaSearchMarkdown.render(root, '**>Tarbes is a commune in France** [2].');
assert.equal(root.children[0].children[0].tagName, 'mark');
assert.equal(root.children[0].children[0].children[0].text, 'Tarbes is a commune in France');
assert.equal(root.children[0].children[1].text, ' [2].');
console.log('Search Markdown OK');
