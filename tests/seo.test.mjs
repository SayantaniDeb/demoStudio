import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seoPlugin } from '../build/seo.mjs';
test('public canonical, structured data and sitemap agree', () => {
  const plugin = seoPlugin('https://example.test/path'),
    assets = [];
  const result = plugin.transformIndexHtml('<html></html>');
  assert.equal(result.tags.find((t) => t.tag === 'link').attrs.href, 'https://example.test/');
  assert.equal(JSON.parse(result.tags[0].children).url, 'https://example.test/');
  plugin.generateBundle.call({ emitFile: (a) => assets.push(a) });
  assert.ok(
    assets
      .find((a) => a.fileName === 'sitemap.xml')
      .source.includes('<loc>https://example.test/</loc>'),
  );
  assert.ok(
    assets
      .find((a) => a.fileName === 'robots.txt')
      .source.includes('Sitemap: https://example.test/sitemap.xml'),
  );
});
test('no invented domain appears when public URL is not configured', () => {
  const plugin = seoPlugin(),
    assets = [];
  assert.equal(plugin.transformIndexHtml('').tags.length, 1);
  plugin.generateBundle.call({ emitFile: (a) => assets.push(a) });
  assert.equal(assets.length, 1);
  assert.ok(!assets[0].source.includes('Sitemap:'));
  assert.throws(() => seoPlugin('http://localhost:5173'));
});
