---
last_mapped_commit: 4dd4a23b554989c1e83afd63cd832527fc490ffc
last_mapped_at: 2026-11-03
---
<!-- refreshed: 2026-11-03 -->
# Architecture

**Analysis Date:** 2026-11-03

## System Overview

Kakuro Revisited is a pnpm workspace of three packages. The **engine** is pure TypeScript (no DOM, no Node APIs); the **app** is a React PWA that runs the engine in a Web Worker; the **website** is a dependency-free static site generator that wraps the app under `/play/`.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        packages/website  (static site)                  │
│  build.mjs  →  techniques.mjs / combinations.mjs / learn.mjs / manual.mjs│
│  consent.mjs / diagram.mjs    →  writes dist/, copies app build to /play/│
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │  copies dist → /play/
┌───────────────────────────────────▼─────────────────────────────────────┐
│                        packages/app  (React 19 PWA)                     │
│  components/ (view) · hooks/ (state) · game.ts store.ts ui.ts (pure)     │
│  solverClient.ts ──► worker.ts ──► solverApi.ts ──► aiCoach.ts           │
│  monetization/ (ads + IAP)                                             │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │  Web Worker (postMessage)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        packages/core  (pure engine)                     │
│  board.ts · partitions.ts · matching.ts · runs.ts · stepFinder.ts        │
│  solver.ts · generator.ts · templates.ts · bank.ts                       │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Board model | 9×9 grid, run extraction, candidates, serialization | `C:\dev\kakuro_revisited\packages\core\src\board.ts` |
| Partitions | Sum-partition tables + bitmask utils | `C:\dev\kakuro_revisited\packages\core\src\partitions.ts` |
| Matching | Bipartite assignment, feasible digits, sum bounds | `C:\dev\kakuro_revisited\packages\core\src\matching.ts` |
| Runs | Run-level partition analysis | `C:\dev\kakuro_revisited\packages\core\src\runs.ts` |
| Step finder | 14 human deduction techniques | `C:\dev\kakuro_revisited\packages\core\src\stepFinder.ts` |
| Solver | Human-step solve, difficulty rating, exact solver, candidate proof | `C:\dev\kakuro_revisited\packages\core\src\solver.ts` |
| Generator | Deterministic puzzle generation + Daily seed | `C:\dev\kakuro_revisited\packages\core\src\generator.ts` |
| Templates | Built-in board layouts | `C:\dev\kakuro_revisited\packages\core\src\templates.ts` |
| Bank | Pre-seeded puzzle bank (on-demand cache) | `C:\dev\kakuro_revisited\packages\core\src\bank.ts` |
| Solver client | Typed promise API over the worker | `C:\dev\kakuro_revisited\packages\app\src\solverClient.ts` |
| Worker | Message router | `C:\dev\kakuro_revisited\packages\app\src\worker.ts` |
| Solver API | Pure worker-side API (data in/out, no DOM) | `C:\dev\kakuro_revisited\packages\app\src\solverApi.ts` |
| Protocol | Request/response + result shapes | `C:\dev\kakuro_revisited\packages\app\src\protocol.ts` |
| Game state | Pure values/notes/undo/history | `C:\dev\kakuro_revisited\packages\app\src\game.ts` |
| Store | Pure localStorage helpers | `C:\dev\kakuro_revisited\packages\app\src\store.ts` |
| AI Coach | Socratic walkthrough + contradiction proof builder | `C:\dev\kakuro_revisited\packages\app\src\aiCoach.ts` |
| Site generator | Emits every page as string literals | `C:\dev\kakuro_revisited\packages\website\src\build.mjs` |

## Pattern Overview

**Overall:** Layered monorepo — a pure functional core, a state-driven React app with a worker boundary, and a generated static site.

**Key Characteristics:**
- **Pure core.** `packages/core` has zero runtime dependencies, imports only itself, and is platform-neutral (`"type": "module"`, `main`/`types` point at `src/index.ts`). Every algorithm is deterministic.
- **Worker isolation.** Heavy solve/generate work runs off the main thread via `SolverClient → worker.ts → solverApi.ts`. `solverApi.ts` is pure (data in, data out) so it is unit-testable without a browser; message shapes live in `protocol.ts`.
- **Pure game logic.** `game.ts` and `store.ts` never touch React/DOM/solver; `store.ts` takes a `Store` interface so it is testable with a stub `localStorage`.
- **Generated site.** `build.mjs` writes every page from string literals, inlines scripts, and emits no separate JS assets (the app under `/play/` is the only exception, copied verbatim from `packages/app/dist`).
- **Stored values are a contract.** All persistence uses fixed localStorage keys defined in `ui.ts`; renaming requires a migration.

## Layers

**Engine (`packages/core/src`):**
- Purpose: Kakuro model, sum partitions, human-step solver, difficulty rater, deterministic generator, text formats.
- Location: `C:\dev\kakuro_revisited\packages\core\src\`
- Contains: `board.ts`, `partitions.ts`, `matching.ts`, `runs.ts`, `stepFinder.ts`, `solver.ts`, `generator.ts`, `templates.ts`, `bank.ts`, `index.ts`.
- Depends on: nothing external (stdlib only).
- Used by: `@kakuro/app` (via `solverApi.ts`, `game.ts`, `share.ts`, components) and indirectly by the website (technique figures use a sample grid from `techniques.mjs`).

**App state layer (`packages/app/src/hooks`):**
- Purpose: Own all React state and side effects; `App.tsx` only wires hooks to components.
- Location: `C:\dev\kakuro_revisited\packages\app\src\hooks\`
- Contains: `useGameSession.ts` (session owner), `useSolverClient.ts` (worker singleton), `usePuzzleLoader.ts`, `useMoves.ts`, `useBoardView.ts`, `useSolverTools.ts`, `useRecords.ts`, `useSettings.ts`, `usePanel.ts`, `useGameClock.ts`, `useGamePersistence.ts`, `useKeyboardPlay.ts`, `useMediaQuery.ts`.
- Depends on: `game.ts`, `store.ts`, `ui.ts`, `solverClient.ts`, `protocol.ts`.
- Used by: `App.tsx`.

**App pure logic layer (`packages/app/src`):**
- Purpose: Framework-free game rules, storage, settings, and share text.
- Location: `C:\dev\kakuro_revisited\packages\app\src\game.ts`, `store.ts`, `ui.ts`, `share.ts`.
- Depends on: `@kakuro/core`, `protocol.ts` (types only).
- Used by: hooks and components.

**App view layer (`packages/app/src/components`):**
- Purpose: Presentational React components only.
- Location: `C:\dev\kakuro_revisited\packages\app\src\components\`
- Depends on: `@kakuro/core` (types), `game.ts`, `ui.ts`, hook return types.
- Used by: `App.tsx` and `PanelHost.tsx`.

**Monetization layer (`packages/app/src/monetization`):**
- Purpose: Ad banner + one-time in-app purchase to remove ads.
- Location: `C:\dev\kakuro_revisited\packages\app\src\monetization\`
- Contains: `monetization.ts` (engine), `AdBanner.tsx`, `useMonetization.ts`.
- Depends on: Web Platform APIs (Digital Goods API, localStorage).

**Site layer (`packages/website/src`):**
- Purpose: Generate the marketing/learn/technique pages and bundle the app.
- Location: `C:\dev\kakuro_revisited\packages\website\src\`
- Contains: `build.mjs` (entry), `techniques.mjs`, `combinations.mjs`, `learn.mjs`, `manual.mjs`, `consent.mjs`, `diagram.mjs`.
- Depends on: Node `fs`/`path`/`url` only (dependency-free).
- Used by: CI/CD deploy (Cloudflare Pages).

## Data Flow

### Primary Request Path (solving a puzzle)

1. Player taps a digit → `useMoves.onDigit` (`C:\dev\kakuro_revisited\packages\app\src\hooks\useMoves.ts`)
2. `placeDigit`/`toggleNote` mutate a clone of `GameState` (`C:\dev\kakuro_revisited\packages\app\src\game.ts`)
3. `afterMove` checks `isSolved`; if not solved, `refreshNotes` calls `SolverClient.candidates` to refresh auto-notes
4. `update` sets the new state, React re-renders `Board` and `DigitPad` via `useBoardView`

### Puzzle Loading Path

1. `usePuzzleLoader.loadPuzzle('new' | 'daily' | 'bank')` (`C:\dev\kakuro_revisited\packages\app\src\hooks\usePuzzleLoader.ts`)
2. `SolverClient.generate/daily/fromBank` (`C:\dev\kakuro_revisited\packages\app\src\solverClient.ts`) → `worker.ts` → `solverApi.ts` → `KakuroGenerator` (`C:\dev\kakuro_revisited\packages\core\src\generator.ts`)
3. Result `PuzzleInfo` flows back, `startPuzzle` builds a `GameState` via `createGame`

### Solver/Hint Path

1. `useSolverTools.openCoach/openHints/runProve` (`C:\dev\kakuro_revisited\packages\app\src\hooks\useSolverTools.ts`)
2. `SolverClient.hint/allHints/prove` → worker → `solverApi.hint/allHints/prove`
3. `KakuroStepFinder` / `KakuroSolver` produce `SolutionStep` with `StepMarks`
4. `aiCoach.buildCoachStages` / `buildProofStages` turn it into `CoachStage[]`
5. Marks render on `Board`; `applyMarks` writes the step into the board

**State Management:**
- Single source of truth: `GameState` (a mutable plain object) held by `useGameSession`. Updates always clone via `cloneGame` and mutate the clone, so React sees a new reference. A `gameRef` holds the latest state for event handlers. Settings/history/stats live in localStorage, mirrored into hook state (`useSettings`, `useRecords`).

## Key Abstractions

**`KakuroBoard`:**
- Purpose: Immutable 81-cell grid plus derived run index, candidate bitmasks, and peer lists. `values[i]` and `cands[i]` are parallel arrays; block cells marked by `KakuroCellDef.kind`.
- Examples: `C:\dev\kakuro_revisited\packages\core\src\board.ts`
- Pattern: Class with readonly fields, `clone()` for branching, `setCell`/`setCandidate` for mutation, `runState`/`isSolved` for queries.

**`StepMarks`:**
- Purpose: The cross-cutting "what to draw" shape — `key`, `fins`, `elim`, `place`, `colors`, `tint`, `chains`, `digits`. Produced by the step finder, consumed by `Board` and the coach.
- Examples: `C:\dev\kakuro_revisited\packages\core\src\board.ts` (definition), `stepFinder.ts` (producer), `aiCoach.ts` (consumer).

**`SolutionStep` / `StepConfig`:**
- Purpose: One human deduction: `type`, `name`, `level`, `score`, `slug`, prose `text`/`summary`, `notation`, and `marks`.
- Examples: `C:\dev\kakuro_revisited\packages\core\src\stepFinder.ts` (`STEP_CONFIGS`, `STEP_CONFIG_MAP`)

**`SolverClient`:**
- Purpose: Typed promise facade over the worker with id-based correlation and cancellation (`cancel()` terminates the worker and rejects pending calls with `CancelledError`).
- Examples: `C:\dev\kakuro_revisited\packages\app\src\solverClient.ts`

**`GameState`:**
- Purpose: Player-facing state (values, notes, cands, solution, selection, undo `past`/`future`, clock, hints used).
- Examples: `C:\dev\kakuro_revisited\packages\app\src\game.ts`

**`WorkerRequest` / `WorkerResponse`:**
- Purpose: Discriminated-union message contract between UI and worker.
- Examples: `C:\dev\kakuro_revisited\packages\app\src\protocol.ts`

## Entry Points

**Core public API:**
- Location: `C:\dev\kakuro_revisited\packages\core\src\index.ts`
- Triggers: imported as `@kakuro/core`
- Responsibilities: Re-export all engine modules (`partitions`, `matching`, `runs`, `board`, `templates`, `stepFinder`, `solver`, `generator`, `bank`).

**App:**
- Location: `C:\dev\kakuro_revisited\packages\app\src\main.tsx`
- Triggers: browser load (`index.html` → Vite bundle)
- Responsibilities: Mount `App`, load fonts, register `./sw.js` service worker.

**App shell:**
- Location: `C:\dev\kakuro_revisited\packages\app\src\App.tsx`
- Triggers: `main.tsx`
- Responsibilities: Compose hooks (`useSolverClient`, `useSettings`, `useGameSession`, `useSolverTools`, `useRecords`, `useBoardView`, `useKeyboardPlay`, `usePanel`) and wire them to components.

**Worker:**
- Location: `C:\dev\kakuro_revisited\packages\app\src\worker.ts`
- Triggers: `SolverClient` (`new Worker(new URL('./worker.ts', import.meta.url))`)
- Responsibilities: Route `WorkerRequest` to `solverApi.ts` functions and post back `WorkerResponse` (including `kind: 'error'`).

**Website:**
- Location: `C:\dev\kakuro_revisited\packages\website\src\build.mjs`
- Triggers: `pnpm --filter @kakuro/website build`
- Responsibilities: Generate `dist/` (home, techniques index + 14 guides, combinations cheat sheet, learn/manual pages, about/privacy/404, `site.css`, manifest, `ads.txt`, `sitemap.xml`, `robots.txt`, `assetlinks.json`), then copy `packages/app/dist` to `dist/play/` and apply the consent banner.

## Architectural Constraints

- **Threading:** Single-threaded React main thread; all solver/generator work runs in a dedicated Web Worker (`worker.ts`). `SolverClient` lazily spawns and re-spawns the worker on error.
- **Global state:** Module-level singletons in the worker: `const solver = new KakuroSolver()`, `const finder = new KakuroStepFinder()` in `C:\dev\kakuro_revisited\packages\app\src\solverApi.ts`. Also `BANK_CACHE` map in `C:\dev\kakuro_revisited\packages\core\src\bank.ts`, and precomputed partition tables in `C:\dev\kakuro_revisited\packages\core\src\partitions.ts` (module init). The `SolverClient` worker instance is a module-scope singleton via `useSolverClient` ref.
- **Circular imports:** Not detected. `core` modules import one another acyclically (`partitions ← matching ← runs ← stepFinder ← solver`); `app` imports `core` but `core` never imports `app`.
- **Pure/dirty boundary:** `packages/core` and `packages/app/src/{game,store,ui,share}.ts` and `solverApi.ts` are DOM-free by convention (stated in file headers). `window`/`document` only appear in hooks, components, `main.tsx`, `monetization.ts`, and `worker.ts`.

## Anti-Patterns

### Reaching for the solver from a component

**What happens:** Components/hooks would import `@kakuro/core` solve functions directly and run them on the main thread.
**Why it's wrong:** Solving and generation are CPU-heavy and would block the UI; there is no way to cancel mid-solve.
**Do this instead:** Add a method to `SolverClient` (`C:\dev\kakuro_revisited\packages\app\src\solverClient.ts`), a request/response case to `protocol.ts`, a `solverApi.ts` function, and a `worker.ts` switch arm — in that order.

### Putting new React state in `App.tsx`

**What happens:** A developer adds `useState`/`useEffect` directly in `App.tsx`.
**Why it's wrong:** `App.tsx` is meant to only wire hooks to the screen; logic there is hard to test and bloats the shell.
**Do this instead:** Put state in a new hook under `C:\dev\kakuro_revisited\packages\app\src\hooks\` and compose it in `App.tsx`.

### Mutating `GameState` without cloning

**What happens:** Code mutates `game` fields returned from `useGameSession` in place.
**Why it's wrong:** React relies on reference change; in-place mutation also corrupts the undo history snapshots.
**Do this instead:** Use `update(fn)` (which clones via `cloneGame` then mutates the copy), or call the pure helpers in `game.ts` against a clone.

### Renaming a stored key or changing its shape

**What happens:** Changing a key in `ui.ts` (`SETTINGS_KEY`, `GAME_KEY`, `HISTORY_KEY`, `STATS_KEY`, `SEEN_KEY`) or the `SavedGame` shape.
**Why it's wrong:** Persisted data in users' browsers would be lost or unreadable.
**Do this instead:** Keep the key; add optional fields with defaults in `restoreGame`/`loadSettings` (`C:\dev\kakuro_revisited\packages\app\src\store.ts`), or add an explicit migration.

## Error Handling

**Strategy:** Fail-soft at the UI boundary, throw at the pure boundary.

**Patterns:**
- Worker wraps every request in `try/catch` and returns `{ kind: 'error', message }` (`C:\dev\kakuro_revisited\packages\app\src\worker.ts`); `SolverClient` rejects the promise with `Error(message)`.
- Hooks catch and either ignore (`CancelledError` via `isCancelled`) or surface a status message via `setStatus`.
- `store.ts` swallows `localStorage` errors (private mode / quota) — data is "just not remembered".
- Pure functions throw descriptive `Error`s (`parseKakuro`, `buildCellsFromSolutionGrid`, generator exhaustion).
- `fromBank` falls back to `generate` when the bank path throws (`C:\dev\kakuro_revisited\packages\app\src\solverApi.ts`).

## Cross-Cutting Concerns

**Logging:** No structured logger; `console.warn` only in the site build for missing assets (`C:\dev\kakuro_revisited\packages\website\src\build.mjs`). Runtime code does not log.

**Validation:** Input strings validated in `parseKakuro` (4 accepted formats, throws on bad tokens) and `validateLayout` (`C:\dev\kakuro_revisited\packages\core\src\board.ts`, `templates.ts`). Generator enforces three gates (unique solution, human-solvable, structural validity) before returning (`generator.ts`).

**Authentication:** None — no account, no server. State is local; ads are consent-gated client-side via `consent.mjs` (Google Consent Mode v2).

---

*Architecture analysis: 2026-11-03*
