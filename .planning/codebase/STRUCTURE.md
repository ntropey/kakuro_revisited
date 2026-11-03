---
last_mapped_commit: 6f27ac6b5c2e53f3844ba48313278bff6194d486
last_mapped_at: 2026-11-03
---
# Codebase Structure

**Analysis Date:** 2026-11-03

## Directory Layout

```
kakuro_revisited/
├── .github/workflows/       # CI + deploy
│   ├── ci.yml               # typecheck + test + build on push/PR
│   └── pages.yml            # build site, deploy to Cloudflare Pages on main
├── .planning/               # GSD planning state (codebase/, graphs/, phases/)
├── docs/                    # PORT-PLAN.md (porting notes)
├── packages/
│   ├── core/                # the pure engine
│   │   ├── src/             # board, partitions, matching, runs, stepFinder, solver, generator, templates, bank, index
│   │   ├── test/            # core.test.ts (vitest)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   ├── app/                 # the PWA
│   │   ├── public/          # icons, manifest, sw.js (copied verbatim)
│   │   ├── src/
│   │   │   ├── components/  # presentational React components
│   │   │   ├── hooks/       # React state owners
│   │   │   ├── monetization/# ads + in-app purchase
│   │   │   ├── App.tsx      # app shell (wires hooks to screen)
│   │   │   ├── main.tsx     # entry point
│   │   │   ├── game.ts      # pure game state + board helpers
│   │   │   ├── store.ts     # pure localStorage helpers
│   │   │   ├── ui.ts        # settings + shared types + formatters
│   │   │   ├── share.ts     # share card
│   │   │   ├── aiCoach.ts   # symbolic coach + proof builder
│   │   │   ├── protocol.ts  # worker message shapes
│   │   │   ├── solverClient.ts # typed worker client
│   │   │   ├── worker.ts    # worker message router
│   │   │   ├── solverApi.ts # pure worker-side API
│   │   │   └── styles.css   # all app styling
│   │   ├── test/            # vitest + React tests
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   └── website/             # static site generator
│       ├── src/             # build.mjs + content modules
│       ├── test/            # build.test.mjs (node --test)
│       └── package.json
├── AGENTS.md                # repo guidance (read first)
├── package.json             # workspace root scripts (test, typecheck)
├── pnpm-workspace.yaml      # packages/* glob
├── tsconfig.base.json       # shared strict TS config
├── pnpm-lock.yaml
├── LICENSE                  # GPL-3.0-or-later
├── CNAME
├── README.md
└── .gitignore
```

## Directory Purposes

**`packages/core/src`:**
- Purpose: The engine. Board model, sum-partition tables, human-step solver, difficulty rater, deterministic generator, daily seed, puzzle bank, text formats.
- Contains: 9 TypeScript modules + `index.ts` (barrel).
- Key files: `C:\dev\kakuro_revisited\packages\core\src\board.ts`, `solver.ts`, `stepFinder.ts`, `generator.ts`.

**`packages/app/src/components`:**
- Purpose: Presentational UI. Top bar, board, digit pad, panels, dialogs, bottom sheet.
- Contains: 15 `.tsx` files (Board, TopBar, DigitPad, PanelHost, IdlePanel, CoachPanel, HintsPanel, PathPanel, ProofPanel, StatsPanel, SettingsSheet, CombinationHelper, DailyShare, SolvedDialog, BottomSheet).
- Key files: `C:\dev\kakuro_revisited\packages\app\src\components\PanelHost.tsx` (panel router), `Board.tsx` (board render).

**`packages/app/src/hooks`:**
- Purpose: Own all React state and side effects; keep `App.tsx` a pure wiring layer.
- Contains: 13 hooks.
- Key files: `C:\dev\kakuro_revisited\packages\app\src\hooks\useGameSession.ts`, `useSolverTools.ts`, `useMoves.ts`.

**`packages/app/src/monetization`:**
- Purpose: Ad banner and one-time in-app purchase ($2.99 lifetime ad-free).
- Contains: `monetization.ts` (engine), `useMonetization.ts` (hook), `AdBanner.tsx`.
- Key files: `C:\dev\kakuro_revisited\packages\app\src\monetization\monetization.ts`.

**`packages/website/src`:**
- Purpose: Static site generation, no dependencies.
- Contains: `build.mjs` (entry) + content modules (`techniques.mjs`, `combinations.mjs`, `learn.mjs`, `manual.mjs`, `consent.mjs`, `diagram.mjs`).
- Key files: `C:\dev\kakuro_revisited\packages\website\src\build.mjs`.

**`packages/app/public`:**
- Purpose: Static assets copied verbatim to the build output and to the site root; the service worker.
- Contains: PWA icons, `manifest.webmanifest`, `og-image.png`, `sw.js`.
- Key files: `C:\dev\kakuro_revisited\packages\app\public\sw.js`.

**`.github/workflows`:**
- Purpose: CI (typecheck/test/build) and deploy to Cloudflare Pages.
- Key files: `C:\dev\kakuro_revisited\.github\workflows\ci.yml`, `pages.yml`.

## Key File Locations

**Entry Points:**
- `C:\dev\kakuro_revisited\packages\core\src\index.ts`: public API of `@kakuro/core`
- `C:\dev\kakuro_revisited\packages\app\src\main.tsx`: app bootstrap
- `C:\dev\kakuro_revisited\packages\app\src\App.tsx`: app shell
- `C:\dev\kakuro_revisited\packages\app\src\worker.ts`: worker entry
- `C:\dev\kakuro_revisited\packages\website\src\build.mjs`: site build entry

**Configuration:**
- `C:\dev\kakuro_revisited\tsconfig.base.json`: shared strict TS options (strict, ESM, ES2022)
- `C:\dev\kakuro_revisited\packages\app\vite.config.ts`: Vite (base `./`, React plugin, es worker, es2022 target)
- `C:\dev\kakuro_revisited\packages\app\index.html`: app HTML shell
- `C:\dev\kakuro_revisited\pnpm-workspace.yaml`: workspace glob

**Core Logic:**
- `C:\dev\kakuro_revisited\packages\core\src\board.ts`: model + serialization
- `C:\dev\kakuro_revisited\packages\core\src\solver.ts`: solver/rater/exact/proof
- `C:\dev\kakuro_revisited\packages\core\src\generator.ts`: generator + daily seed
- `C:\dev\kakuro_revisited\packages\app\src\game.ts`: game state
- `C:\dev\kakuro_revisited\packages\app\src\store.ts`: persistence
- `C:\dev\kakuro_revisited\packages\app\src\solverApi.ts`: worker-side pure API
- `C:\dev\kakuro_revisited\packages\app\src\aiCoach.ts`: coach/proof narration

**Testing:**
- `C:\dev\kakuro_revisited\packages\core\test\core.test.ts`
- `C:\dev\kakuro_revisited\packages\app\test\` (game, store, share, solverApi, ui, render)
- `C:\dev\kakuro_revisited\packages\website\test\build.test.mjs`

## Naming Conventions

**Files:**
- TypeScript modules: `camelCase.ts` (`board.ts`, `stepFinder.ts`, `solverClient.ts`).
- React components: `PascalCase.tsx` (`Board.tsx`, `TopBar.tsx`, `PanelHost.tsx`).
- Hooks: `useCamelCase.ts` (`useGameSession.ts`, `useSolverTools.ts`).
- Website modules: `lowercase.mjs` (`build.mjs`, `techniques.mjs`).
- Test files: `<name>.test.ts` / `.test.tsx` / `.test.mjs`.

**Directories:**
- `lowercase` or `camelCase` (`src`, `hooks`, `components`, `monetization`, `test`).

**Package names:**
- Scoped `@kakuro/*`: `@kakuro/core`, `@kakuro/app`, `@kakuro/website`.

**Symbols:**
- Exported functions/classes: `PascalCase` classes (`KakuroBoard`, `KakuroSolver`, `KakuroGenerator`), `camelCase` functions (`parseKakuro`, `buildCellsFromSolutionGrid`, `createGame`).
- Constants: `UPPER_SNAKE_CASE` (`ALL_DIGITS_MASK`, `CELL_COUNT`, `GRID_SIZE`, `STEP_CONFIGS`, `SETTINGS_KEY`).
- Union/type members: `UPPER_SNAKE_CASE` (`FULL_RUN`, `MAGIC_BLOCK`, `NAKED_SINGLE`, `SUM_BOUNDS`).
- Interfaces/types: `PascalCase` (`KakuroBoard` types, `GameState`, `Settings`, `WorkerRequest`).

## Where to Add New Code

**New solver technique:**
- Add a `SolutionType` member + `StepConfig` entry in `C:\dev\kakuro_revisited\packages\core\src\stepFinder.ts`.
- Implement a `find*` method on `KakuroStepFinder` and register it in `findNextStep`/`findAllSteps`.
- Add a coach narration branch in `C:\dev\kakuro_revisited\packages\app\src\aiCoach.ts` (`buildCoachStages` switch).
- Add a guide entry in `C:\dev\kakuro_revisited\packages\website\src\techniques.mjs`.
- Tests: `C:\dev\kakuro_revisited\packages\core\test\core.test.ts`.

**New worker operation:**
- Add a request/response union case in `C:\dev\kakuro_revisited\packages\app\src\protocol.ts`.
- Add a `SolverClient` method in `C:\dev\kakuro_revisited\packages\app\src\solverClient.ts`.
- Add a pure function in `C:\dev\kakuro_revisited\packages\app\src\solverApi.ts`.
- Add a `worker.ts` switch arm in `C:\dev\kakuro_revisited\packages\app\src\worker.ts`.

**New UI feature / state:**
- State: new hook in `C:\dev\kakuro_revisited\packages\app\src\hooks\`.
- View: new component in `C:\dev\kakuro_revisited\packages\app\src\components\`.
- Pure helpers: `C:\dev\kakuro_revisited\packages\app\src\game.ts` (board) or `store.ts` (persistence).
- Wire everything in `C:\dev\kakuro_revisited\packages\app\src\App.tsx` (and `PanelHost.tsx` if it is a panel).
- Tests: `C:\dev\kakuro_revisited\packages\app\test\`.

**New engine capability:**
- New module in `C:\dev\kakuro_revisited\packages\core\src\`, re-export from `index.ts`.
- Keep it DOM/Node-free and deterministic.

**New site page:**
- Add a content module in `C:\dev\kakuro_revisited\packages\website\src\`, or extend `build.mjs` with a new `page({...})` call.
- Keep it dependency-free.

**Utilities:**
- Shared formatters/types: `C:\dev\kakuro_revisited\packages\app\src\ui.ts`.
- Shared settings/keys: `C:\dev\kakuro_revisited\packages\app\src\ui.ts`.

## Special Directories

**`packages/app/dist`:**
- Purpose: Vite build output of the app.
- Generated: Yes (`pnpm --filter @kakuro/app build`).
- Committed: No (gitignored).

**`packages/website/dist`:**
- Purpose: Generated site output (deployed to Cloudflare Pages).
- Generated: Yes (`pnpm --filter @kakuro/website build`).
- Committed: No (gitignored).

**`node_modules`:**
- Purpose: Installed dependencies.
- Generated: Yes (`pnpm install`).
- Committed: No.

**`.planning`:**
- Purpose: GSD planning state (codebase map, graphs, phases).
- Generated: Yes (GSD tooling).
- Committed: Yes (part of the GSD workflow).

**`docs`:**
- Purpose: Hand-written notes; currently `PORT-PLAN.md`.
- Generated: No.
- Committed: Yes.

---

*Structure analysis: 2026-11-03*
