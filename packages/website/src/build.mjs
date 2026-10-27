/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * Static site generator: no dependencies. Run `pnpm --filter @kakuro/app build` first to include the app
 * under /play/. Set SITE_URL (e.g. https://example.org/) to also write sitemap.xml and robots.txt.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { combinationsBody } from './combinations.mjs';
import { ADSENSE_CLIENT, applyConsent } from './consent.mjs';
import { kakuroDiagram, legend } from './diagram.mjs';
import { LEARN } from './learn.mjs';
import { MANUAL } from './manual.mjs';
import { GROUPS, SAMPLE_GRID, TECHNIQUES, TECHNIQUE_GROUPS, solverValues } from './techniques.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'dist');
const appDist = join(here, '..', '..', 'app', 'dist');
const appPublic = join(here, '..', '..', 'app', 'public');

const SITE = 'Kakuro Revisited';
const SITE_URL = (process.env.SITE_URL ?? '').replace(/\/+$/, '');
const REPO = 'https://github.com/ntropey/kakuro_revisited';
const PUB_ID = ADSENSE_CLIENT.replace(/^ca-/, '');

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const jsonld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

const NAV = [
  ['learn/', 'Learn'],
  ['techniques/', 'Techniques'],
  ['combinations.html', 'Sums'],
  ['manual/', 'Manual'],
  ['about.html', 'About'],
];

/** The depth of a page path, for the relative links back to the site root. */
const rootOf = (path) => '../'.repeat(path.split('/').length - 1);

/** The public URL path of a page: a directory index loses its `index.html`, so the home page is ``. */
const publicPath = (path) => (path === 'index.html' ? '' : path.replace(/(^|\/)index\.html$/, '$1'));

/** One page of the site. `body` is already HTML. */
function page({ path, title, description, body, extraHead = '', noindex = false, json = [] }) {
  const root = rootOf(path);
  const canonical = SITE_URL ? `${SITE_URL}/${publicPath(path)}` : '';
  const full = title;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#f5f2ea" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#15171b" media="(prefers-color-scheme: dark)">
${noindex ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index, follow">'}
${canonical ? `<link rel="canonical" href="${canonical}">` : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
${canonical ? `<meta property="og:url" content="${canonical}">` : ''}
<meta property="og:image" content="${SITE_URL || 'https://kakurorevisited.com'}/icon-512.png">
<meta property="og:image:width" content="512">
<meta property="og:image:height" content="512">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(full)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE_URL || 'https://kakurorevisited.com'}/icon-512.png">
<link rel="icon" href="${root}favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${root}apple-touch-icon.png">
<link rel="manifest" href="${root}site.webmanifest">
<link rel="stylesheet" href="${root}site.css">
${json.map(jsonld).join('\n')}
${extraHead}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <a class="brand" href="${root}"><span class="mark" aria-hidden="true">▦</span> ${SITE}</a>
  <nav aria-label="Main">
    ${NAV.map(([href, label]) => `<a href="${root}${href}">${label}</a>`).join('\n    ')}
    <a class="cta" href="${root}play/">Play</a>
  </nav>
</header>
<main id="main" class="wrap">
${body}
</main>
<footer>
  <div class="wrap foot">
    <p><strong>${SITE}</strong> is a free, open-source Kakuro (Cross Sums) solver, trainer and coach. Licensed GPL-3.0-or-later.</p>
    <p class="foot-links">
      <a href="${root}learn/">Learn</a>
      <a href="${root}techniques/">Techniques</a>
      <a href="${root}combinations.html">Sum combinations</a>
      <a href="${root}manual/">Manual</a>
      <a href="${root}about.html">About</a>
      <a href="${root}privacy.html">Privacy</a>
      <a href="${REPO}">Source</a>
    </p>
    <p class="foot-links" style="font-size:.75rem;margin-top:8px">
      More tools:
      <a href="https://hodokurevisited.com/" target="_blank" rel="noopener noreferrer">Hodoku Revisited</a> ·
      <a href="https://kakurorevisited.com/" target="_blank" rel="noopener noreferrer">Kakuro Revisited</a> ·
      <a href="https://nonogramrevisited.com/" target="_blank" rel="noopener noreferrer">Nonogram Revisited</a> ·
      <a href="https://logisimrevisited.com/" target="_blank" rel="noopener noreferrer">Logisim Revisited</a>
    </p>
    <p class="small">Kakuro puzzles are generated and solved in your browser. This site uses Google AdSense; see the <a href="${root}privacy.html">privacy policy</a> for details and for the cookie choice.</p>
  </div>
</footer>
</body>
</html>
`;
}

const pages = [];
const add = (path, content) => pages.push([path, content]);

// ---------------------------------------------------------------- home

const homeFaq = [
  [
    'Is Kakuro the same as Cross Sums?',
    'Yes. Kakuro is also called Cross Sums, Cross Addition or Kakuro, and the rules are the same everywhere: every run of white cells adds up to the clue, digits are 1 to 9 and no digit repeats in a run.',
  ],
  [
    'Is Kakuro Revisited free?',
    'Yes. The app is free, needs no account, and the source code is on GitHub under GPL-3.0-or-later. It runs in your browser and stores your games and settings on your own device.',
  ],
  [
    'Does it work offline?',
    'Yes. Kakuro Revisited is a progressive web app. After the first visit you can install it and keep playing with no connection, because the generator and the solver run in the browser.',
  ],
  [
    'Do I ever have to guess?',
    'No. Every published puzzle is generated with one solution and a complete human solve path. The solver only uses techniques a person can follow, and it never places a digit that is not proven.',
  ],
  [
    'What is the AI Coach?',
    'The coach takes the next logical step and explains it in four stages: where to look, the pattern, the logic and the conclusion. You can stop at any stage and try yourself first.',
  ],
  [
    'What does the "Why not?" button do?',
    'It places a candidate you choose on a copy of the board, follows the forced moves, and shows the exact conflict that proves the candidate wrong. If the candidate is possible, it says that too.',
  ],
  [
    'Is there a daily puzzle?',
    'Yes. The Daily Puzzle is generated from the date, so everyone who plays on the same day gets the same grid, and there is a share card for the result.',
  ],
];

const homeBody = `<section class="hero">
  <div class="hero-copy">
    <p class="eyebrow">Kakuro &middot; Cross Sums</p>
    <h1>A Kakuro trainer that explains every step.</h1>
    <p class="lede">Kakuro Revisited generates puzzles that never need a guess, then walks you to the next deduction in plain words. Ask for a hint, or ask why a digit cannot be there and see the proof.</p>
    <p class="hero-actions">
      <a class="btn primary" href="play/">Play a puzzle</a>
      <a class="btn" href="play/?daily=1">Daily puzzle</a>
      <a class="btn ghost" href="learn/how-to-solve-kakuro.html">Learn the rules</a>
    </p>
    <p class="small">Free, no account, works offline. Licensed GPL-3.0-or-later.</p>
  </div>
  <figure class="fig hero-fig">
    <div class="dgwrap">${kakuroDiagram(SAMPLE_GRID, {
      values: solverValues([29, 30]),
      cands: (() => {
        const c = new Array(81).fill(0);
        c[29] = (1 << 8) | (1 << 9);
        c[30] = (1 << 8) | (1 << 9);
        return c;
      })(),
      marks: {
        tint: [{ cells: [29, 30], tone: 'a' }],
        key: [
          { cell: 29, digit: 8 },
          { cell: 30, digit: 9 },
        ],
        place: [],
        elim: [],
      },
      label: 'A Kakuro board with the across run of 17 highlighted',
    })}</div>
    <figcaption>Across 17 in two cells can only be 8 + 9. The run is forced before you place a single digit.</figcaption>
  </figure>
</section>

<section class="features">
  <h2>Why play here</h2>
  <div class="cards">
    <a class="card" href="manual/hints.html">
      <h3>Coach me, in four stages</h3>
      <p>The next step is broken into where to look, the pattern, the logic and the answer. Learn the technique instead of copying it.</p>
    </a>
    <a class="card" href="manual/hints.html">
      <h3>"Why not?" proofs</h3>
      <p>Choose a candidate and the app follows the forced chain to the exact conflict. Nothing is asserted without a reason.</p>
    </a>
    <a class="card" href="combinations.html">
      <h3>Every sum, every length</h3>
      <p>A complete, interactive Sum Combinations Cheat Sheet, from 3 in two cells to 45 in nine.</p>
    </a>
    <a class="card" href="learn/kakuro-difficulty-levels.html">
      <h3>Five honest levels</h3>
      <p>Trivial to Extreme. A puzzle is only labeled Easy when the solver reaches it with Easy techniques.</p>
    </a>
    <a class="card" href="manual/daily.html">
      <h3>A Daily Puzzle</h3>
      <p>One date-seeded puzzle a day, the same for everyone, with a share card for the result.</p>
    </a>
    <a class="card" href="play/">
      <h3>Installs and works offline</h3>
      <p>A progressive web app. After one visit it runs from your device, with no server and no account.</p>
    </a>
  </div>
</section>

<section class="split">
  <div>
    <h2>No guessing, ever</h2>
    <p>The generator builds a layout, fills it, and keeps a puzzle only when two things are true: it has exactly one solution, and the human solver finishes it using only the techniques in the guides. If a puzzle needs a guess, it is thrown away and another is built.</p>
    <p>That is why the difficulty levels mean something. The level comes from the hardest technique the puzzle needs and the length of the solve path, not from how it looks.</p>
    <p><a href="techniques/">See the twelve techniques</a> the solver uses, in the order it tries them.</p>
  </div>
  <figure class="fig">
    <div class="dgwrap">${kakuroDiagram(SAMPLE_GRID, {
      values: solverValues([10, 11, 19]),
      cands: (() => {
        const c = new Array(81).fill(0);
        c[10] = (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 6) | (1 << 7) | (1 << 9);
        return c;
      })(),
      marks: {
        tint: [
          { cells: [10, 11], tone: 'a' },
          { cells: [10, 19], tone: 'b' },
        ],
        key: [{ cell: 10, digit: 9 }],
        place: [],
        elim: [],
      },
      label: 'A cross-run intersection: the across run of 10 and the down run of 17 meet at one cell',
    })}</div>
    <figcaption>Across 10 allows 1, 2, 3, 4, 6, 7 and 9. Down 17 allows 8 and 9. Only 9 is in both, so r2c2 = 9.</figcaption>
  </figure>
</section>

<section class="split">
  <figure class="fig">
    <div class="dgwrap">${kakuroDiagram(SAMPLE_GRID, {
      values: solverValues([67, 76, 77, 78]),
      cands: (() => {
        const c = new Array(81).fill(0);
        c[76] = (1 << 1) | (1 << 3);
        c[77] = (1 << 1) | (1 << 3);
        c[78] = (1 << 1) | (1 << 3) | (1 << 8);
        return c;
      })(),
      marks: {
        tint: [{ cells: [76, 77, 78], tone: 'a' }],
        key: [
          { cell: 76, digit: 1 },
          { cell: 76, digit: 3 },
          { cell: 77, digit: 1 },
          { cell: 77, digit: 3 },
        ],
        place: [{ cell: 78, digit: 8 }],
        elim: [
          { cell: 78, digit: 1 },
          { cell: 78, digit: 3 },
        ],
      },
      label: 'A naked pair in a run',
    })}</div>
    <figcaption>Two cells that can only hold 1 and 3 use both digits up, so the third cell must be 8.</figcaption>
  </figure>
  <div>
    <h2>Tools that teach the technique</h2>
    <p>Pencil marks keep themselves up to date. The Hints panel lists every technique that is available on the board right now, with a count of how many steps each one gives.</p>
    <p>The coach caps itself at the hint level you choose, so an Easy puzzle stays Easy even when you ask for help.</p>
    <p><a href="manual/hints.html">Read about hints and proofs</a>.</p>
  </div>
</section>

<section class="faq">
  <h2>Questions</h2>
  ${homeFaq
    .map(
      ([q, a]) => `<details>
    <summary>${esc(q)}</summary>
    <p>${esc(a)}</p>
  </details>`,
    )
    .join('\n  ')}
</section>

<section class="callout">
  <h2>Start with a puzzle</h2>
  <p>Pick a level, or take the Daily Puzzle. The board works on a phone, a tablet and a desktop, and the coach is one tap away.</p>
  <p><a class="btn primary" href="play/">Open the app</a></p>
</section>`;

add(
  'index.html',
  page({
    path: 'index.html',
    title: 'Kakuro Solver, Trainer & Daily Puzzle | Kakuro Revisited',
    description:
      'Free Kakuro (Cross Sums) solver with step-by-step coaching, contradiction proofs, five difficulty levels, a sum-combination cheat sheet, and a daily puzzle.',
    body: homeBody,
    json: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE,
        url: SITE_URL || 'https://kakurorevisited.com/',
        description: 'A free Kakuro (Cross Sums) generator, trainer and coach.',
        inLanguage: 'en',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: SITE,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Any',
        url: `${SITE_URL || 'https://kakurorevisited.com'}/play/`,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        license: 'https://www.gnu.org/licenses/gpl-3.0.html',
        description:
          'A Kakuro (Cross Sums) app with a deterministic human-step solver, a four-stage coach and a contradiction prover.',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: homeFaq.map(([q, a]) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  }),
);

// ---------------------------------------------------------------- techniques

const techHref = (root, slug) => `${root}techniques/${slug}.html`;

const figFor = (ex, label) => {
  const marks = {
    key: ex.marks.key ?? [],
    place: ex.marks.place ?? [],
    elim: ex.marks.elim ?? [],
    tint: ex.marks.tint ?? [],
  };
  return `<figure class="fig">
    <div class="dgwrap">${kakuroDiagram(SAMPLE_GRID, {
      values: ex.values,
      cands: ex.cands,
      marks,
      label,
    })}</div>
    <figcaption>${esc(ex.text)}</figcaption>
    ${legend(marks)}
  </figure>`;
};

const techIndexBody = `<h1>Kakuro techniques</h1>
<p class="lede">Twelve techniques, in the order the solver tries them. Each guide has a worked board, a plain explanation and the exact steps to look for. The slugs match the hints in the app, so a hint can link straight to its guide.</p>
${TECHNIQUE_GROUPS.map(
  (g) => `<section class="group">
  <h2>${g.num} &middot; ${esc(g.name)}</h2>
  <div class="cards">
    ${g.items
      .map(
        (t) => `<a class="card" href="${t.slug}.html">
      <p class="card-kicker">Level ${t.level}</p>
      <h3>${esc(t.name)}</h3>
      <p>${esc(t.summary)}</p>
    </a>`,
      )
      .join('\n    ')}
  </div>
</section>`,
).join('\n')}
<section class="callout">
  <h2>Learn them in order</h2>
  <p>If you are new, read <a href="../learn/how-to-solve-kakuro.html">How to solve Kakuro</a> first, then keep the <a href="../combinations.html">sum cheat sheet</a> open while you play.</p>
</section>`;

add(
  'techniques/index.html',
  page({
    path: 'techniques/index.html',
    title: 'Kakuro techniques: twelve guides from basics to contradiction',
    description:
      'Every Kakuro solving technique with a worked example: last cell in a run, naked single, magic blocks, intersections, sum bounds, subsets in a run, forced combinations and contradiction forcing.',
    body: techIndexBody,
    json: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Kakuro techniques',
        url: `${SITE_URL}/techniques/`,
        hasPart: TECHNIQUES.map((t) => ({
          '@type': 'TechArticle',
          name: t.name,
          url: `${SITE_URL}/techniques/${t.slug}.html`,
        })),
      },
    ],
  }),
);

for (let i = 0; i < TECHNIQUES.length; i++) {
  const t = TECHNIQUES[i];
  const prev = TECHNIQUES[i - 1];
  const next = TECHNIQUES[i + 1];
  const body = `<nav class="crumbs" aria-label="Breadcrumb"><a href="../techniques/">Techniques</a> / <span>${esc(t.name)}</span></nav>
<h1>${esc(t.name)}</h1>
<p class="lede">${esc(t.summary)}</p>
<p class="meta-row"><span class="tag">Level ${t.level}</span> <span class="tag subtle">${esc(t.group)}</span> <span class="tag subtle">Technique ${t.num}</span></p>
${figFor(t.example, t.name)}
<h2>Why it works</h2>
${t.why.map((p) => `<p>${esc(p)}</p>`).join('\n')}
<h2>How to spot it</h2>
<ol>
${t.how.map((s) => `  <li>${esc(s)}</li>`).join('\n')}
</ol>
<h2>Practice it</h2>
<p>Open <a href="../play/">the app</a>, choose a level that uses this technique, and ask the coach for the next step. Every hint links back to this guide.</p>
<nav class="pager" aria-label="More techniques">
  ${prev ? `<a class="btn" href="${prev.slug}.html">&larr; ${esc(prev.name)}</a>` : '<span></span>'}
  ${next ? `<a class="btn" href="${next.slug}.html">${esc(next.name)} &rarr;</a>` : '<span></span>'}
</nav>`;
  add(
    `techniques/${t.slug}.html`,
    page({
      path: `techniques/${t.slug}.html`,
      title: `${t.name}: Kakuro technique guide`,
      description: `${t.summary} A worked Kakuro example, the reasoning, and the steps to spot it. Level ${t.level}.`,
      body,
      json: [
        {
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: `${t.name}: Kakuro technique`,
          description: t.summary,
          url: `${SITE_URL}/techniques/${t.slug}.html`,
          proficiencyLevel: `Level ${t.level}`,
          inLanguage: 'en',
          author: { '@type': 'Organization', name: SITE },
          publisher: { '@type': 'Organization', name: SITE },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Techniques', item: `${SITE_URL}/techniques/` },
            { '@type': 'ListItem', position: 2, name: t.name },
          ],
        },
      ],
    }),
  );
}

// ---------------------------------------------------------------- combinations

add(
  'combinations.html',
  page({
    path: 'combinations.html',
    title: 'Kakuro Sum Combinations Cheat Sheet: every sum, every length',
    description:
      'The complete Kakuro sum combinations table: every way to make every clue sum with 2, 3, 4, 5, 6, 7, 8 or 9 cells, with the Magic Blocks marked.',
    body: combinationsBody(),
    extraHead: '<meta name="keywords" content="kakuro combinations, kakuro cheat sheet, cross sums combinations, magic blocks">',
    json: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Kakuro Sum Combinations Cheat Sheet',
        description: 'Every partition of every Kakuro run length and sum.',
        url: `${SITE_URL}/combinations.html`,
        inLanguage: 'en',
      },
    ],
  }),
);

// ---------------------------------------------------------------- learn and manual

for (const entry of [...LEARN, ...MANUAL]) {
  const root = rootOf(entry.path);
  const section = entry.path.startsWith('learn/') ? 'Learn' : 'Manual';
  const sectionHref = `${root}${section.toLowerCase()}/`;
  add(
    entry.path,
    page({
      path: entry.path,
      title: entry.title,
      description: entry.description,
      body: `<nav class="crumbs" aria-label="Breadcrumb"><a href="${sectionHref}">${section}</a> / <span>${esc(
        entry.title.split(':')[0],
      )}</span></nav>
${entry.body(root)}`,
      json: [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: entry.title,
          description: entry.description,
          url: `${SITE_URL}/${entry.path}`,
          inLanguage: 'en',
          author: { '@type': 'Organization', name: SITE },
        },
      ],
    }),
  );
}

// ---------------------------------------------------------------- about and privacy

add(
  'about.html',
  page({
    path: 'about.html',
    title: 'About Kakuro Revisited',
    description:
      'Why Kakuro Revisited exists, how it is built, and the classic open-source Kakuro tools that inspired it.',
    body: `<h1>About ${SITE}</h1>
<p class="lede">A Kakuro (Cross Sums) puzzle generator, human-style solver, difficulty rater, trainer and coach, modelled on its sister project <a href="https://hodokurevisited.com/">Hodoku Revisited</a>.</p>

<h2>What it is</h2>
<p>Kakuro Revisited is a free, open-source progressive web app. It runs entirely in your browser: the generator, the solver, the difficulty rater and the coach all live in the page. No account, no server, and after the first visit it works offline.</p>

<h2>How the engine works</h2>
<ul>
  <li><strong>Sum partitions.</strong> Every sum and run length has a fixed table of digit sets. The solver works with those tables, not with brute force.</li>
  <li><strong>A human solver.</strong> Twelve techniques, from the last cell in a run to contradiction forcing. Every step is sound: the solver never places or removes a digit without a proof.</li>
  <li><strong>A deterministic generator.</strong> A puzzle is kept only when it has exactly one solution and the human solver finishes it. Otherwise it is discarded. Ambiguous fills are repaired, not shipped.</li>
  <li><strong>A difficulty rater.</strong> The level comes from the hardest technique the puzzle needs and the length of the solve path.</li>
  <li><strong>Exact tools where they matter.</strong> Assigning a known set of digits to the cells of a run is a bipartite matching problem, solved exactly in polynomial time.</li>
</ul>

<h2>Inspired by</h2>
<p>The design owes a debt to the classic open-source Java Kakuro tools <em>crozzsum</em>, <em>kakurohelper</em> and <em>jkakuro</em>, and to the human-technique approach of Hodoku for Sudoku. The goal is the same: show the reasoning, not just the answer.</p>

<h2>Open source</h2>
<p>The source code is on <a href="${REPO}">GitHub</a> under GPL-3.0-or-later. Bug reports and pull requests are welcome.</p>

<h2>Contact</h2>
<p>Email <a href="mailto:support@revisitedlabs.com">support@revisitedlabs.com</a> or open an issue on <a href="${REPO}/issues">GitHub</a>. There is no mailing list and no account system.</p>`,
  }),
);

add(
  'privacy.html',
  page({
    path: 'privacy.html',
    title: 'Privacy policy',
    description:
      'What Kakuro Revisited stores, what the advertising cookies do, and how to change your consent at any time.',
    body: `<h1>Privacy policy</h1>
<p class="lede">Short version: the app keeps your games and settings in your own browser. The marketing pages load Google AdSense for visitors who consent. There is no account and no server that stores your puzzles.</p>

<h2>What the app stores</h2>
<p>Kakuro Revisited stores the following in your browser's localStorage, on your device only:</p>
<ul>
  <li>Your settings: theme, timer, pencil-mark behavior, hint level and puzzle level.</li>
  <li>Your current game, so a reload does not lose it.</li>
  <li>Your solve history and your Daily Puzzle streak.</li>
  <li>Which bank puzzles you have already seen, so they are not repeated.</li>
</ul>
<p>None of this is sent anywhere. Clearing your browser data removes it.</p>

<h2 id="cookies">Cookies and advertising</h2>
<p>This website shows ads through Google AdSense (publisher ${esc(PUB_ID)}). Google and its partners may use cookies and similar technologies to serve ads, measure them and, where you consent, personalize them.</p>
<p>Google Consent Mode v2 is used. Visitors in the European Economic Area, the United Kingdom and Switzerland see a consent message from Google's certified consent management platform before any advertising cookie is set, and advertising storage and personalization stay denied until they agree. Visitors elsewhere can reject advertising cookies with the Cookie settings button in the footer.</p>
<p>You can change your choice at any time with the <strong>Cookie settings</strong> button in the footer. You can also manage Google's use of your data at <a href="https://myadssettings.google.com/">My Ad Center</a>, and read Google's practices at <a href="https://policies.google.com/technologies/partner-sites">How Google uses information from sites that use its services</a>.</p>
<p>The app under <a href="play/">/play/</a> is served from the same domain and the same consent script applies to it. The app itself sets no advertising cookies and makes no network requests after it has loaded, except to fetch its own files.</p>

<h2>Analytics</h2>
<p>This site does not run a separate analytics product. Advertising measurement is covered by the consent choice above.</p>

<h2>Children</h2>
<p>Kakuro Revisited is a puzzle game suitable for all ages and collects no personal information from anyone.</p>

<h2>Contact</h2>
<p>Questions or requests can be sent to <a href="mailto:support@revisitedlabs.com">support@revisitedlabs.com</a> or filed on <a href="${REPO}/issues">GitHub</a>.</p>

<h2>Changes</h2>
<p>If this policy changes, the date below changes with it.</p>
<p class="small">Last updated: 21 October 2026.</p>`,
  }),
);

add(
  '404.html',
  page({
    path: '404.html',
    title: 'Page not found',
    description: 'That page does not exist. Play a Kakuro puzzle instead.',
    noindex: true,
    body: `<h1>Page not found</h1>
<p class="lede">That address is not a page on this site. The puzzle is still here.</p>
<p><a class="btn primary" href="play/">Play Kakuro</a> <a class="btn" href="">Home</a></p>`,
  }),
);

// ---------------------------------------------------------------- css

const FONTS = [
  ['newsreader', 'newsreader', '500'],
  ['newsreader', 'newsreader', '600'],
  ['ibm-plex-sans', 'ibm-plex-sans', '400'],
  ['ibm-plex-sans', 'ibm-plex-sans', '500'],
  ['ibm-plex-sans', 'ibm-plex-sans', '600'],
  ['ibm-plex-mono', 'ibm-plex-mono', '400'],
];

const fontFaces = FONTS.map(([, id, w]) => {
  const family = id === 'newsreader' ? 'Newsreader' : id === 'ibm-plex-sans' ? 'IBM Plex Sans' : 'IBM Plex Mono';
  return `@font-face{font-family:'${family}';font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/${id}-latin-${w}-normal.woff2) format('woff2')}`;
}).join('\n');

const css = `${fontFaces}

:root{
  --bg:#f5f2ea;--card:#fffdf8;--fg:#1c1b18;--muted:#55524a;--line:#d9d3c5;--thick:#1c1b18;
  --accent:#2b4ea2;--accent-soft:#e3e8f5;--surface-2:#eae5d8;
  --tint-a:#eef2fb;--tint-b:#fbf3e2;--elim:#a8321f;--elim-bg:#f6d3ca;--place:#d5ebdc;--place-ring:#2e7d4f;
  --font-display:'Newsreader',Georgia,serif;--font-ui:'IBM Plex Sans',system-ui,sans-serif;--font-mono:'IBM Plex Mono',ui-monospace,monospace;
  --radius:10px;--max:1080px;
}
@media (prefers-color-scheme:dark){:root{
  --bg:#15171b;--card:#1d2026;--fg:#ece8df;--muted:#a9a498;--line:#3a3e47;--thick:#ece8df;
  --accent:#9db4f5;--accent-soft:#22384f;--surface-2:#23262d;
  --tint-a:#1d2733;--tint-b:#322c22;--elim:#ff9a85;--elim-bg:#3a2622;--place:#23402f;--place-ring:#7fd3a3;
}}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--fg);font:400 17px/1.6 var(--font-ui);-webkit-text-size-adjust:100%}
a{color:var(--accent);text-underline-offset:2px}
h1,h2,h3{font-family:var(--font-display);font-weight:600;line-height:1.2;margin:1.6em 0 .5em}
h1{font-size:clamp(2rem,4.4vw,3rem);margin-top:.4em;letter-spacing:-.01em}
h2{font-size:clamp(1.35rem,2.4vw,1.7rem)}
h3{font-size:1.15rem;margin-top:0}
p{margin:0 0 1em}
ul,ol{margin:0 0 1em;padding-left:1.4em}
li{margin:.2em 0}
code{font-family:var(--font-mono);font-size:.86em;background:var(--surface-2);border-radius:4px;padding:.08em .3em}
.wrap{max-width:var(--max);margin:0 auto;padding:0 20px}
.skip{position:absolute;left:-9999px}
.skip:focus{left:8px;top:8px;background:var(--card);padding:8px;z-index:99;border-radius:6px}
.small{font-size:.84rem;color:var(--muted)}
.lede{font-size:1.12rem;color:var(--muted);max-width:62ch}
.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:.75rem;font-weight:600;color:var(--accent);margin:0 0 .4em}

/* header */
.top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:20px;flex-wrap:wrap;
  padding:10px 20px;background:color-mix(in srgb,var(--card) 92%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.brand{font-family:var(--font-display);font-size:1.12rem;font-weight:600;color:var(--fg);text-decoration:none;display:flex;align-items:center;gap:.4rem}
.brand .mark{color:var(--accent)}
.top nav{display:flex;gap:16px;flex-wrap:wrap;margin-left:auto;align-items:center}
.top nav a{color:var(--muted);text-decoration:none;font-size:.92rem}
.top nav a:hover{color:var(--accent)}
.top nav .cta{background:var(--accent);color:var(--card);padding:6px 14px;border-radius:999px;font-weight:500}
.top nav .cta:hover{color:var(--card);filter:brightness(1.08)}

main.wrap{padding-top:28px;padding-bottom:56px}

/* hero */
.hero{display:grid;grid-template-columns:1.1fr .9fr;gap:36px;align-items:center;margin:12px 0 48px}
.hero-copy h1{margin-top:0}
.hero-actions{display:flex;gap:10px;flex-wrap:wrap;margin:1.2em 0 .8em}
.btn{display:inline-block;font:500 .95rem var(--font-ui);color:var(--fg);background:var(--card);
  border:1px solid var(--line);border-radius:var(--radius);padding:10px 18px;text-decoration:none;cursor:pointer}
.btn:hover{border-color:var(--accent);color:var(--accent)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--card)}
.btn.primary:hover{color:var(--card);filter:brightness(1.08)}
.btn.ghost{background:transparent}

/* figures */
.fig{margin:0 0 20px}
.dgwrap{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:10px;max-width:460px}
.fig figcaption{font-size:.86rem;color:var(--muted);margin-top:.6em;max-width:46ch}
.legend{display:flex;gap:12px;font-size:.78rem;color:var(--muted);margin:.3em 0 0}
.lg::before{content:'';display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px;border:1px solid var(--line)}
.lg.place::before{background:var(--place);border-color:var(--place-ring)}
.lg.key::before{background:var(--accent-soft);border-color:var(--accent)}
.lg.elim::before{background:var(--elim-bg);border-color:var(--elim)}

svg.dg{display:block;width:100%;height:auto}
svg.dg .bg{fill:var(--card)}
svg.dg .blk{fill:var(--surface-2)}
svg.dg .wht{fill:var(--card)}
svg.dg .diag{stroke:var(--line);stroke-width:1.4}
svg.dg .thin{stroke:var(--line);stroke-width:1}
svg.dg .thick{stroke:var(--thick);stroke-width:2.4}
svg.dg .clue{font-family:var(--font-mono);font-size:15px;font-weight:600;fill:var(--fg)}
svg.dg .clue.across{text-anchor:end}
svg.dg .val{font-family:var(--font-display);font-size:26px;font-weight:600;fill:var(--accent);text-anchor:middle;dominant-baseline:central}
svg.dg .val.placed{fill:var(--place-ring)}
svg.dg .cand{font-family:var(--font-mono);font-size:12px;fill:var(--muted);text-anchor:middle;dominant-baseline:central}
svg.dg .cand.key{fill:var(--accent);font-weight:600}
svg.dg .cand.elim{fill:var(--elim)}
svg.dg .strike{stroke:var(--elim);stroke-width:1.4}
svg.dg .tint-a{fill:var(--tint-a)}
svg.dg .tint-b{fill:var(--tint-b)}
svg.dg .keyring{fill:none;stroke:var(--accent);stroke-width:2}
svg.dg .placebg{fill:var(--place);stroke:var(--place-ring);stroke-width:2}

/* cards */
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin:1em 0 2em}
.card{display:block;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:16px 18px;
  text-decoration:none;color:var(--fg);transition:border-color .15s}
.card:hover{border-color:var(--accent)}
.card p{margin:.3em 0 0;font-size:.92rem;color:var(--muted)}
.card-kicker{font-family:var(--font-mono);font-size:.72rem;color:var(--accent);text-transform:uppercase;letter-spacing:.06em;margin:0 0 .3em}

section{margin:0 0 40px}
.split{display:grid;grid-template-columns:1fr 1fr;gap:36px;align-items:center}
.group{margin-bottom:36px}

/* tables */
table{width:100%;border-collapse:collapse;margin:1em 0 1.6em;font-size:.94rem}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
thead th{font-family:var(--font-display);font-size:1rem;border-bottom:2px solid var(--thick)}
tbody th{font-family:var(--font-mono);font-weight:600;white-space:nowrap}
tr.magic{background:var(--accent-soft)}
.cheat-table .count{font-family:var(--font-mono);color:var(--muted);text-align:right;white-space:nowrap}
.cheat-table code{background:transparent;padding:0}

/* explorer */
.explorer{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:18px 20px;margin:2em 0}
.explorer-controls{display:flex;gap:18px;flex-wrap:wrap;align-items:center}
.explorer-controls label{display:flex;align-items:center;gap:8px;font-size:.9rem;color:var(--muted)}
.explorer-controls select{font:inherit;font-size:.92rem;color:var(--fg);background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:5px 8px}
.explorer-result{margin:1em 0 0;font-size:1rem}
.explorer-result .tag{background:var(--accent);color:var(--card);border-radius:999px;padding:1px 9px;font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
.magic-list li{margin:.35em 0}

/* misc */
.crumbs{font-size:.84rem;color:var(--muted);margin-bottom:.4em}
.crumbs a{color:var(--muted)}
.meta-row{display:flex;gap:8px;flex-wrap:wrap;margin:.4em 0 1.4em}
.tag{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;background:var(--accent);color:var(--card);border-radius:999px;padding:2px 10px}
.tag.subtle{background:var(--surface-2);color:var(--muted)}
.faq details{border-bottom:1px solid var(--line);padding:12px 0}
.faq summary{font-family:var(--font-display);font-size:1.1rem;cursor:pointer}
.faq details p{margin:.6em 0 0;color:var(--muted)}
.callout{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:var(--radius);padding:20px 24px;margin:2em 0}
.pager{display:flex;justify-content:space-between;gap:12px;margin:2.4em 0 0;flex-wrap:wrap}
.glossary{display:grid;grid-template-columns:max-content 1fr;gap:.5em 1.4em;margin:1em 0 2em}
.glossary dt{font-weight:600;font-family:var(--font-display);font-size:1.05rem}
.glossary dd{margin:0;color:var(--muted)}
.note{font-size:.9rem;color:var(--muted);max-width:72ch}
.level-list{list-style:none;padding:0;margin:1em 0 1.6em}
.level-list li{border-bottom:1px solid var(--line);padding:.45em 0}

footer{border-top:1px solid var(--line);background:var(--card);padding:28px 0 40px;font-size:.9rem;color:var(--muted)}
footer .foot{display:flex;flex-direction:column;gap:.6em}
footer p{margin:0}
.foot-links{display:flex;gap:16px;flex-wrap:wrap}
.foot-links a{color:var(--muted)}
footer .hc-settings{margin-top:6px}
footer > .hc-settings{display:block;width:100%;max-width:var(--max);margin:8px auto 0;padding:0 20px;text-align:left}

@media (max-width:820px){
  .hero{grid-template-columns:1fr;gap:24px}
  .split{grid-template-columns:1fr;gap:20px}
  .split .fig{order:2}
  .glossary{grid-template-columns:1fr;gap:.1em}
  .glossary dd{margin-bottom:.8em}
}
@media (max-width:560px){
  body{font-size:16px}
  .top{gap:10px;padding:8px 14px}
  .top nav{gap:11px;font-size:.9rem}
  .wrap{padding:0 14px}
  .explorer-controls{gap:12px}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media print{.top,footer,.pager,.btn{display:none}body{background:#fff;color:#000}}
`;

// ---------------------------------------------------------------- write

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const [path, content] of pages) {
  const file = join(out, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}
writeFileSync(join(out, 'site.css'), css);
writeFileSync(
  join(out, 'site.webmanifest'),
  JSON.stringify(
    {
      name: SITE,
      short_name: 'Kakuro',
      description: 'A Kakuro (Cross Sums) solver, trainer and coach.',
      start_url: '/play/',
      display: 'standalone',
      background_color: '#f5f2ea',
      theme_color: '#f5f2ea',
      icons: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
    },
    null,
    2,
  ),
);

for (const f of ['icon.svg', 'favicon.svg', 'apple-touch-icon.png', 'icon-512.png', 'icon-192.png']) {
  const src = join(appPublic, f);
  if (existsSync(src)) cpSync(src, join(out, f));
}
mkdirSync(join(out, 'fonts'), { recursive: true });
const fontSrc = join(here, '..', '..', 'app', 'node_modules', '@fontsource');
for (const [pkg, id, w] of FONTS) {
  const src = join(fontSrc, pkg, 'files', `${id}-latin-${w}-normal.woff2`);
  if (existsSync(src)) cpSync(src, join(out, 'fonts', `${id}-latin-${w}-normal.woff2`));
  else console.warn(`font missing: ${src}`);
}

if (existsSync(appDist)) cpSync(appDist, join(out, 'play'), { recursive: true });
else console.warn('packages/app/dist not found: the site is built without /play/');

// Consent banner + consent-gated AdSense on all pages, including /play/.
writeFileSync(join(out, 'ads.txt'), `google.com, ${PUB_ID}, DIRECT, f08c47fec0942fa0\n`);
const touched = applyConsent(out);
console.log(`consent banner added to ${touched} pages`);

if (SITE_URL) {
  const urls = pages
    .map(([p]) => p)
    .filter((p) => p !== '404.html')
    .map((p) => `  <url><loc>${SITE_URL}/${publicPath(p)}</loc><changefreq>${p === 'index.html' ? 'weekly' : 'monthly'}</changefreq><priority>${p === 'index.html' ? '1.0' : p.startsWith('techniques/') || p.startsWith('learn/') ? '0.8' : '0.6'}</priority></url>`);
  writeFileSync(
    join(out, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
  );
  writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  const host = new URL(SITE_URL).host;
  if (host && !host.endsWith('github.io')) writeFileSync(join(out, 'CNAME'), `${host}\n`);
}

const pageCount = readdirSync(out, { recursive: true }).filter((f) => String(f).endsWith('.html')).length;
console.log(`${SITE}: ${pageCount} pages written to ${out}`);
