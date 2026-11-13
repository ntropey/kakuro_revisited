---
last_mapped_commit: 4dd4a23b554989c1e83afd63cd832527fc490ffc
last_mapped_at: 2026-11-03
---
# Coding Conventions

**Analysis Date:** 2026-11-03

## Naming Patterns

**Files:**
- camelCase for most source files: `game.ts`, `store.ts`, `solverApi.ts`, `board.ts`, `partitions.ts`
- PascalCase for React components and classes: `components/TopBar.tsx`, `components/BottomSheet.tsx`, `core/src/solver.ts` (exports `KakuroSolver`)
- `useX` prefix for React hooks: `hooks/useSolverTools.ts`, `hooks/usePuzzleLoader.ts`, `hooks/useKeyboardPlay.ts`
- Test files mirror the module name with `.test` suffix: `test/game.test.ts`, `test/store.test.ts`, `test/render.test.tsx`

**Functions:**
- camelCase, verb-first: `placeDigit`, `createGame`, `buildBoard`, `recordSolve`, `formatElapsed`, `hasPerfectMatching`
- Named exports (not default). Core barrel re-exports everything via `export *` in `packages/core/src/index.ts`

**Variables:**
- camelCase: `selected`, `hintsUsed`, `elapsedMs`, `notesMode`
- SCREAMING_SNAKE_CASE for module-level constants: `CELL_COUNT`, `ALL_DIGITS_MASK`, `DEFAULT_SETTINGS`, `HISTORY_CAP`, `SETTINGS_KEY`, `GAME_KEY`

**Types:**
- PascalCase for interfaces, classes and type aliases: `GameState`, `SavedGame`, `PuzzleInfo`, `HintResult`, `Store`, `ThemeMode`
- Interfaces preferred over `type` for object shapes; `type` used for unions (`WorkerRequest`, `WorkerResponse`, `CopyFormat`, `HintLevel`) and aliases (`SeenBank`, `SolveInput`)
- Interface fields carry JSDoc on non-obvious ones (see `GameState` in `packages/app/src/game.ts`, `Settings` in `packages/app/src/ui.ts`)
- Discriminated unions use a string `kind`/`type` literal field: `WorkerRequest`, `WorkerResponse` in `packages/app/src/protocol.ts`

## Code Style

**Formatting:**
- 2-space indent, single quotes, semicolons (per `AGENTS.md`)
- No Prettier or ESLint config present in the repo — style is enforced by convention and manual review only
- Trailing commas in multi-line object/array literals and argument lists
- `strict` TypeScript (`tsconfig.base.json`), plus `noImplicitOverride`, `noFallthroughCasesInSwitch`, `isolatedModules`, `forceConsistentCasingInFileNames`

**Linting:**
- No ESLint/Biome/Prettier config detected. `pnpm typecheck` (`tsc --noEmit`) is the automated guard, plus `node --check` for the website's `.mjs` files

## Import Organization

**Order:**
1. External packages (`react`, `@kakuro/core`, `vitest`)
2. Type-only imports (`import type { ... }`) — grouped with or adjacent to value imports
3. Relative local imports (`../src/game`, `./protocol`, `./ui`)

**Path Aliases:**
- `@kakuro/core` resolves to `packages/core` via pnpm workspace (`"@kakuro/core": "workspace:*"` in `packages/app/package.json`). The app imports engine types and functions through it, never by relative path into `packages/core`
- No `paths` aliases configured in any `tsconfig.json` beyond the workspace package

**Example** (`packages/app/src/solverApi.ts`):
```typescript
import {
  CELL_COUNT,
  KakuroBoard,
  ...
  type CopyFormat,
  type SolutionStep,
} from '@kakuro/core';
import { buildCoachStages, buildProofStages } from './aiCoach';
import type { HintLevel, HintResult, ProofResult, PuzzleInfo } from './protocol';
```

## Error Handling

**Patterns:**
- **Storage/JSON:** fail-open with `try/catch` returning a fallback. `loadJson` and `saveJson` in `packages/app/src/store.ts` swallow parse/write failures and return the fallback; `saveJson` silently drops data when localStorage is full or blocked
- **Invariant violations in the engine:** `throw new Error(...)` with a descriptive message. See `packages/core/src/board.ts` (e.g. `Expected 81 cells in solution grid, got ...`, `Unrecognized Kakuro cell token "..."`), `packages/core/src/generator.ts`
- **Worker boundary:** the `worker.ts` `onmessage` wraps the whole dispatch in `try/catch` and converts any thrown error into a `{ id, kind: 'error', message }` response (`packages/app/src/worker.ts`)
- **Async hook errors:** hooks catch, distinguish cancellation via `isCancelled(e)`, and surface the message through `setStatus` (see `useSolverTools.ts`, `usePuzzleLoader.ts`, `useMoves.ts`)
- **Recoverable branch:** `fromBank` in `packages/app/src/solverApi.ts` falls back to `generate(level)` if `pickFromBank` throws

**Do NOT throw for recoverable/expected conditions** in the app layer; reserve `throw` for programmer errors and malformed input in the engine. Return `null`/fallback otherwise (e.g. `hint(...)` returns `HintResult | null`).

## Logging

**Framework:** None — no logging library. Plain `console` only.

**Patterns:**
- `console.warn`/`console.error` for background failures: `[Monetization] ...` in `packages/app/src/monetization/monetization.ts` and `useMonetization.ts`, `font missing: ...` in `packages/website/src/build.mjs`
- `console.log` for build-time progress only: `packages/website/src/build.mjs` (`pages written to`, `consent banner added to`)
- App runtime and core are otherwise silent — no `console` in `packages/core` or app game/hook logic

## Comments

**When to Comment:**
- Every source file opens with a header block: `/* Kakuro Revisited [PWA]. GPL-3.0-or-later; see LICENSE.` followed by a one-line purpose (see `packages/core/src/partitions.ts`, `packages/app/src/game.ts`)
- Comments explain *why*, not *what*. Purposeful only — no noise comments. Example from `store.ts`: `/* private mode or full: the data just isn't remembered */`

**JSDoc/TSDoc:**
- JSDoc (`/** ... */`) on every exported function and on non-obvious interface fields. Examples: `saveGame`, `recordSolve`, `moveSelection`, `hint`, `prove`
- Inline `//` comments for non-obvious steps within a function (bitmask logic, streaks, format reasoning)

## Function Design

**Size:** Small and single-purpose. Engine files can be large (`generator.ts` ~547 lines, `board.ts` ~505 lines) but individual exported functions stay focused

**Parameters:**
- Positional for required data, an options object for optional/knobs: `hint(puzzle, values, cands, level, disabled = [])`, `generateDaily(date, level)`, `fillLayout(layout, rng, strategy, budget)`
- Default parameters over `??`/`if` guards where possible (`saveGame(store, game, elapsedMs = game.elapsedMs)`)

**Return Values:**
- Prefer explicit return types on public API, discriminated results for outcome+data: `SolveRecord`, `SolveReport`, `WorkerResponse`
- Return `null` for "no result" (`hint`, `loadGame`, `moveSelection` returns `-1`), empty array for "no items" (`path`, `allowedDigits`), never `undefined` for a missing result

## Module Design

**Exports:**
- Named exports everywhere; no `export default` in `packages/core` or `packages/app`
- `packages/core/src/index.ts` is the single barrel re-exporting every public symbol (`export * from './partitions'`, etc.)

**Barrel Files:**
- Core uses one barrel (`index.ts`). The app does not use barrel files for components — components are imported individually from `../components/X`. Hooks are imported individually from `../hooks/useX`

**File header:** every `.ts`/`.tsx`/`.mjs` source file starts with the GPL header block. Follow it in any new file.

## Pure Logic vs UI Boundary

**Keep pure code out of React.** State mutations live in `game.ts`, persistence in `store.ts`, worker API in `solverApi.ts`. React hooks own state and orchestration; components render. New React state goes in a hook under `packages/app/src/hooks/`, never in `App.tsx`. New solver/generator logic goes in `packages/core` (no DOM, no Node APIs).

---

*Convention analysis: 2026-11-03*
