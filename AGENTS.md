# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository. Read this before making
changes.

## What this is

Kakuro Revisited is a modern TypeScript Kakuro (Cross Sums) puzzle generator, human-style logical
solver, difficulty rater, trainer and symbolic AI Coach inspired by classic open-source Java Kakuro
tools (`crozzsum`, `kakurohelper`, `jkakuro`) and modeled on its sister project
[Hodoku Revisited](https://hodokurevisited.com/). Licensed **GPL-3.0-or-later**.

## Repository layout

pnpm workspace, Node >= 20 (CI and the site build use Node 22), TypeScript, ESM throughout.

- `packages/core` — the engine. Pure TypeScript: **no DOM, no Node APIs.** Board model, sum partition
  tables, human-step solver, difficulty rater, deterministic generator, daily puzzle seed, and text
  formats.
- `packages/app` — the PWA (React 19 + Vite 8). The app UI; runs the solver/generator in a Web Worker.
  `src/components/` holds the UI pieces (top bar, digit pad, side panel, sum combination helper,
  dialogs), `game.ts` the pure game state, `store.ts` the localStorage helpers, `ui.ts` settings and
  shared types, `public/sw.js` the service worker.
- `packages/website` — a dependency-free static site generator (plain `.mjs`). Pages: home, the
  technique guides (`techniques.mjs`), the interactive Sum Combinations Cheat Sheet
  (`combinations.mjs`), the Learn pages (`learn.mjs`), the manual (`manual.mjs`), about/privacy, and
  the app copied to `/play/`.

## Common commands

Run from the repository root:

```sh
pnpm install
pnpm typecheck                                    # tsc across packages; node --check for the website
pnpm test                                         # every package
pnpm --filter @kakuro/core test
pnpm --filter @kakuro/app test
pnpm --filter @kakuro/app dev                     # dev server
pnpm --filter @kakuro/app build                   # tsc + vite build -> packages/app/dist
pnpm --filter @kakuro/website build               # site, including the app -> packages/website/dist
pnpm --filter @kakuro/website test                # builds the app and the site, then asserts on the output
```

`SITE_URL=https://kakurorevisited.com/` is set in CI for the website build (it writes `sitemap.xml`
and `robots.txt`).

Before finishing a change, run `pnpm typecheck` and `pnpm test`, and the affected package's `build`.

## Architecture notes

- **100% deterministic human-step solver.** `packages/core` solves Kakuro grids step by step using
  human deduction techniques (Unique Sum Partitions / Magic Blocks, Full Run / Single Empty Cell,
  Cross-Run Intersections, Naked & Hidden Singles, Minimum/Maximum Sum Bounds, Mandatory Digits in
  Valid Partitions, Naked & Hidden Pairs/Triples in a Run, and Locked Sum Residuals).
- **App/worker split.** The app talks to the solver through `packages/app/src/solverClient.ts` →
  `worker.ts` → `solverApi.ts`. Keep `solverApi.ts` pure and testable; keep the message shapes in
  `protocol.ts` in sync across all three.
- **App UI split.** `App.tsx` is a thin shell: game session state lives in `hooks/useGameSession.ts`,
  panel state in `hooks/usePanel.ts`, solver tools in `hooks/useSolverTools.ts`, and rendering of the
  open panel in `components/PanelHost.tsx`. Keep game logic in `game.ts` and storage in `store.ts`.
- **Game logic is pure.** `packages/app/src/game.ts` is pure and unit-tested; keep UI concerns out of
  it.
- **The website is generated.** `packages/website/src/build.mjs` writes every page from string
  literals and emits no separate JS assets (scripts are inlined, e.g. `gate.mjs`, `consent.mjs`).
  `/play/` is the app's own Vite build copied verbatim.
- **Stored values are a contract.** Settings, saved games, the library and the game mode live in the
  browser's localStorage. Do not rename stored keys without a migration.
- **Ads load only after consent.** `consent.mjs` adds the banner and regional Google Consent Mode v2
  defaults to every site page.

## Coding conventions

- TypeScript `strict` (see `tsconfig.base.json`). Prefer named exports.
- Style: **2-space indent, single quotes, semicolons.** Match the surrounding code, and keep comments
  purposeful.
- No new runtime dependencies without a clear reason; the website is deliberately dependency-free.
- UI text is plain English in **American spelling** (color, practicing, behavior). A website test
  fails if British spellings appear in the app, website, docs or README.

## Git and pull requests

- **`main` deploys and is protected.** Never commit or push directly to `main`; always use a feature
  branch and pull request.
- Commit subjects read `Area: summary`, lowercase after the colon (e.g. `Core: …`, `App: …`,
  `Website: …`, `Docs: …`).
