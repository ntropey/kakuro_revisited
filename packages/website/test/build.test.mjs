/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * Builds the site, then asserts on the output: pages, links, diagrams, consent, sitemap and spelling.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
execFileSync('node', ['src/build.mjs'], { cwd: root, env: { ...process.env, SITE_URL: 'https://example.org/' } });
const dist = join(root, 'dist');
const { TECHNIQUES } = await import(pathToFileURL(join(root, 'src/techniques.mjs')).href);
const { allPartitions } = await import(pathToFileURL(join(root, 'src/combinations.mjs')).href);

const html = (path) => readFileSync(join(dist, path), 'utf8');

/** Every .html file under dist, relative to dist and slash-separated. */
const allPages = () =>
  readdirSync(dist, { recursive: true })
    .map((p) => String(p).replaceAll('\\', '/'))
    .filter((p) => p.endsWith('.html') && !p.startsWith('play/'));

test('every technique has a page, listed on the index', () => {
  const index = html('techniques/index.html');
  for (const t of TECHNIQUES) {
    assert.ok(existsSync(join(dist, `techniques/${t.slug}.html`)), t.slug);
    assert.ok(index.includes(`href="${t.slug}.html"`), t.slug);
  }
  assert.equal(new Set(TECHNIQUES.map((t) => t.slug)).size, TECHNIQUES.length, 'duplicate slug');
});

test('every technique page has a diagram and a pager', () => {
  for (const t of TECHNIQUES) {
    const page = html(`techniques/${t.slug}.html`);
    assert.match(page, /<svg class="dg"/, t.slug);
    assert.match(page, /<figcaption>/, t.slug);
    assert.match(page, /TechArticle/, t.slug);
  }
});

test('internal links resolve', () => {
  const walk = (d) =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? (e.name === 'play' ? [] : walk(join(d, e.name))) : [join(d, e.name)],
    );
  const bad = [];
  for (const file of walk(dist)) {
    if (!file.endsWith('.html')) continue;
    const page = readFileSync(file, 'utf8');
    for (const m of page.matchAll(/href="([^"]+)"/g)) {
      const href = m[1];
      if (/^(https?:|mailto:|#|data:)/.test(href)) continue;
      const [pathPart] = href.split(/[?#]/);
      if (!pathPart) continue;
      const target = join(dirname(file), decodeURIComponent(pathPart));
      const candidates = [target, `${target}.html`, join(target, 'index.html')];
      if (!candidates.some((c) => existsSync(c) && statSync(c).isFile())) bad.push(`${file}: ${href}`);
    }
  }
  assert.deepEqual(bad, [], 'broken internal links');
});

test('every page carries the consent loader and the AdSense gate', () => {
  for (const page of [...allPages(), 'play/index.html']) {
    const text = html(page);
    assert.ok(text.includes('kakuro-consent'), `${page} has no consent script`);
    const charsetAt = text.toLowerCase().indexOf('<meta charset');
    assert.ok(charsetAt > 0 && charsetAt < 1024, `${page}: the charset meta must be in the first 1024 bytes`);
    assert.ok(charsetAt < text.indexOf('kakuro-consent'), `${page}: the consent script must follow the charset`);
  }
  assert.ok(html('index.html').includes('kakuro-consent-settings'), 'no cookie settings button in the footer');
  const ads = readFileSync(join(dist, 'ads.txt'), 'utf8');
  assert.match(ads, /^google\.com, pub-\d+, DIRECT, [0-9a-f]{16}$/m);
});

test('the sitemap and robots file list the pages', () => {
  const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
  assert.ok(sitemap.includes('<loc>https://example.org/index.html</loc>'));
  assert.ok(sitemap.includes('<loc>https://example.org/techniques/magic-blocks.html</loc>'));
  assert.ok(!sitemap.includes('404.html'), '404 must not be indexed');
  const robots = readFileSync(join(dist, 'robots.txt'), 'utf8');
  assert.match(robots, /Sitemap: https:\/\/example\.org\/sitemap\.xml/);
  assert.ok(existsSync(join(dist, 'CNAME')));
});

test('the cheat sheet lists every partition', () => {
  const page = html('combinations.html');
  const table = allPartitions();
  let checked = 0;
  for (const [key, list] of table) {
    const [length, sum] = key.split(':').map(Number);
    if (length < 2 || sum < 3) continue; // no one-cell runs are shown
    for (const digits of list) {
      assert.ok(page.includes(digits.join('+')), `${sum} in ${length}: ${digits.join('+')}`);
      checked++;
    }
  }
  assert.ok(checked > 300, `only ${checked} partitions were checked`);
  // the classic Magic Blocks are marked
  assert.ok(page.includes('<li><strong>2 cells:</strong> 3 = 1+2, 4 = 1+3, 16 = 7+9, 17 = 8+9</li>'));
});

test('the app is copied under /play/', () => {
  assert.ok(existsSync(join(dist, 'play/index.html')), 'play/index.html missing');
  assert.ok(existsSync(join(dist, 'play/manifest.webmanifest')), 'play manifest missing');
});

test('the app registers its service worker next to itself, so it works under /play/', () => {
  assert.ok(existsSync(join(dist, 'play/sw.js')), 'play/sw.js missing');
  const assets = join(dist, 'play/assets');
  const bundle = readdirSync(assets).find((f) => /^index-.*\.js$/.test(f));
  assert.ok(bundle, 'the app bundle is missing');
  const code = readFileSync(join(assets, bundle), 'utf8');
  assert.ok(code.includes('register(`./sw.js`)') || code.includes('register("./sw.js")') || code.includes("register('./sw.js')"), 'sw.js is not registered relative to the page');
  assert.ok(!/register\(["'`]\/sw\.js/.test(code), 'sw.js is registered at the site root');
});

test('user-facing text and docs use American spelling', () => {
  const repo = join(root, '..', '..');
  const roots = ['packages/app/src', 'packages/website/src', 'README.md', 'AGENTS.md'];
  const skip = /node_modules|\/dist\/|site\.css/;
  const British =
    /colour|practis(e|ing)|behaviour|\bcentre\b|labell(ed|ing)|\bhonour\b|\bgrey\b|organis(e|ation)|recognis(e|ing)|\bfavour/i;
  const walk = (p) => (statSync(p).isDirectory() ? readdirSync(p).flatMap((n) => walk(join(p, n))) : [p]);
  const bad = [];
  for (const r of roots) {
    const start = join(repo, r);
    if (!existsSync(start)) continue;
    for (const f of walk(start).map((p) => p.replaceAll('\\', '/'))) {
      if (skip.test(f) || !/\.(ts|tsx|mjs|md|css)$/.test(f)) continue;
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (British.test(line)) bad.push(`${f}:${i + 1}: ${line.trim().slice(0, 90)}`);
        });
    }
  }
  assert.deepEqual(bad, [], 'British spellings found');
});
