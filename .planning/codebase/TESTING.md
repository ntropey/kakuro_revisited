---
last_mapped_commit: 6f27ac6b5c2e53f3844ba48313278bff6194d486
last_mapped_at: 2026-11-03
---
# Testing Patterns

**Analysis Date:** 2026-11-03

## Test Framework

**Runner:**
- **Vitest** `^5.0.5` for `@kakuro/core` and `@kakuro/app` (devDependency in each `package.json`)
- **Node built-in test runner** (`node:test`, `node:assert/strict`) for `@kakuro/website` — no external test deps there

**Config:**
- Core: `packages/core/vitest.config.ts` — `include: ['test/**/*.test.ts']`, `testTimeout: 120_000`, `hookTimeout: 120_000`
- App: no dedicated Vitest config; uses the defaults from `packages/app/vite.config.ts`
- Website: no config; `node --test test/build.test.mjs`

**Assertion Library:**
- Vitest `expect` (core/app)
- `node:assert/strict` (website)

**Run Commands:**
```bash
pnpm test                                             # every package
pnpm --filter @kakuro/core test                       # vitest run
pnpm --filter @kakuro/app test                        # vitest run --passWithNoTests
pnpm --filter @kakuro/website test                    # pretest builds the app, then node --test
```

## Test File Organization

**Location:**
- Separate `test/` directory per package, NOT co-located with source:
  - `packages/core/test/core.test.ts`
  - `packages/app/test/{game,store,ui,share,solverApi}.test.ts` and `render.test.tsx`
  - `packages/website/test/build.test.mjs`

**Naming:**
- `*.test.ts` / `*.test.tsx` / `*.test.mjs`, matching the module under test (`game.ts` → `game.test.ts`)

**Structure:**
```
packages/core/test/core.test.ts
packages/app/test/
├── game.test.ts
├── render.test.tsx
├── share.test.ts
├── solverApi.test.ts
├── store.test.ts
└── ui.test.ts
packages/website/test/build.test.mjs
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it } from 'vitest';
import { parseKakuro } from '@kakuro/core';

const SOLUTION_GRID = [
  '#########',
  '#91######',
  // ...
].join('');

function sampleGame() {
  return createGame(samplePuzzle());
}

describe('Game state', () => {
  it('starts empty and unsolved', () => {
    const game = sampleGame();
    expect(game.values).toHaveLength(CELL_COUNT);
    expect(game.values.every((v) => v === 0)).toBe(true);
  });
});
```

**Patterns:**
- `describe` groups by subject area ("Game state", "Board helpers", "Saved game", "Generator"); `it` states behavior in plain English ("starts empty and unsolved", "reports a wrong digit against the solution")
- One assertion concept per test; multiple `expect` calls per test are common and acceptable
- Arrange → Act → Assert ordering, with inline comments noting *why* a value is expected

## Mocking

**Framework:** None — no `vi.mock`, no mocking library.

**Patterns:**
- **Stub the storage boundary by hand.** `store.test.ts` and `share.test.ts` define a `memoryStore()` returning a `Store` backed by a `Map`, so tests never touch real `localStorage`:
```typescript
function memoryStore(): Store & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}
```
- **Inject pure logic directly.** The `Store` interface (`getItem`/`setItem`) is passed into helpers so no globals need stubbing. This is the key design: `store.ts` declares `interface Store` and never reads `localStorage` itself.
- **Component smoke tests avoid a DOM.** `render.test.tsx` uses `renderToStaticMarkup` from `react-dom/server` with a shared `noop = () => {}` callback instead of a test renderer or `@testing-library`.

**What to Mock:** external/global I/O boundaries — `localStorage`, the DOM, the worker. Only via hand-written stubs.

**What NOT to Mock:** pure engine functions, solver, generator, board — exercised for real (`new KakuroSolver()`, `new KakuroGenerator()`).

## Fixtures and Factories

**Test Data:**
- A shared `SOLUTION_GRID` string constant (9-row Kakuro grid joined) appears in nearly every app test file as the canonical fixture; parsed with `parseKakuro(...)`
- Factory helpers build the domain object once and let each test mutate its own copy:
```typescript
function samplePuzzle(): PuzzleInfo {
  const { givens } = parseKakuro(SOLUTION_GRID);
  return { puzzle: givens, solution: [...SOLUTION_GRID].map((ch) => (ch === '#' ? 0 : Number(ch))), level: 2, score: 520, path: [] };
}
function sampleGame() {
  return createGame(samplePuzzle());
}
```
- Small builder with `Partial` overrides for inputs with many fields: `solve(overrides: Partial<SolveInput> = {})` in `store.test.ts`

**Location:**
- Inline at the top of each test file — no shared `fixtures/` directory

## Coverage

**Requirements:** None enforced. No coverage thresholds, no `--coverage` script, no coverage provider configured.

**View Coverage:**
```bash
# none configured — run per package manually
pnpm --filter @kakuro/core exec vitest run --coverage   # only if a provider is added
```

## Test Types

**Unit Tests:**
- Primary focus. Pure functions and classes tested in isolation: sum partitions, bitmask utilities, board parsing, game state mutations, store round-trips, share card text, formatting helpers

**Integration Tests:**
- Cross-module behavior tested at the package level: `solverApi.test.ts` exercises the worker API against the real solver, `core.test.ts` runs the full generator→solver pipeline and asserts uniqueness (`solveExact(...).count === 1`)

**E2E / browser tests:**
- Not used. The closest analogue is the website's build-time assertion suite (`build.test.mjs`), which runs `node src/build.mjs`, then asserts on the emitted HTML/sitemap/assets

## Common Patterns

**Async Testing:** minimal — most logic is synchronous and pure. Async is confined to hooks (not directly unit-tested) and the worker client.

**Error Testing:**
- Robustness against malformed input is tested by feeding bad data and asserting the fallback, e.g. `store.test.ts` "ignores a stored game that does not fit the board" (sets `'not json'`, `''`, wrong-length arrays) and "survives broken JSON" in `share.test.ts`
- Core error paths are asserted through their throw messages indirectly via `validateLayout(...).ok === false`

**Determinism Testing:**
- The generator is verified deterministic: `generate(3, 90210)` called twice yields identical `puzzle`/`level`; `generateDaily('2026-10-21', 2)` is stable across calls

**Website build test conventions** (`packages/website/test/build.test.mjs`):
- Builds first, then asserts with `node:assert/strict` and `test(...)` from `node:test`
- Uses `assert.deepEqual(bad, [], ...)` with accumulated error lists for link/spelling sweeps
- Includes a British-spelling lint sweep over `packages/app/src`, `packages/website/src`, `README.md`, `AGENTS.md` — new code must use American spelling or this test fails

---

*Testing analysis: 2026-11-03*
