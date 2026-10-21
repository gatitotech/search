const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(`${__dirname}/appearance.js`, 'utf8'), context);
const { normalize } = context.window.GatitaSearchAppearance;

test('existing appearance preferences migrate without losing backdrop or reading choices', () => {
  const prefs = normalize({ background: 'custom', blur: 8, dim: 25, size: 17, spacing: 'relaxed', radius: 24, motion: 'reduced' });
  assert.equal(prefs.background, 'custom');
  assert.equal(prefs.dim, 25);
  assert.equal(prefs.size, 17);
  assert.equal(prefs.motion, 'reduced');
  assert.equal(prefs.topbarOpacity, 100);
  assert.equal(prefs.footerOpacity, 92);
  assert.equal(prefs.showNews, true);
});

test('surface settings preserve zero opacity and validate saved values', () => {
  const prefs = normalize({ topbarOpacity: 0, topbarBlur: 100, footerOpacity: -20, footerBlur: 'bad', searchOpacity: 0, footerPosition: 'pinned', showBrand: false, showNews: 'false', newsColumns: '3', homePosition: 'injected' });
  assert.equal(prefs.topbarOpacity, 0);
  assert.equal(prefs.topbarBlur, 40);
  assert.equal(prefs.footerOpacity, 0);
  assert.equal(prefs.footerBlur, 16);
  assert.equal(prefs.searchOpacity, 20);
  assert.equal(prefs.footerPosition, 'pinned');
  assert.equal(prefs.showBrand, false);
  assert.equal(prefs.showNews, true);
  assert.equal(prefs.newsColumns, '3');
  assert.equal(prefs.homePosition, 'balanced');
});

test('malformed stored data recovers to usable defaults', () => {
  for (const data of [null, [], false, 'broken']) {
    assert.equal(normalize(data).topbarOpacity, 100);
    assert.equal(normalize(data).background, 'none');
    assert.equal(normalize(data).showNews, true);
  }
});
