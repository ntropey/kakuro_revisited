---
last_mapped_commit: 4dd4a23b554989c1e83afd63cd832527fc490ffc
last_mapped_at: 2026-11-03
---
# Codebase Concerns

**Analysis Date:** 2026-11-03

## Tech Debt

**Dead / incomplete password gate:**
- Issue: The deploy workflow advertises a "temporary password gate" (`gate` boolean input) that requires the `SITE_PASSWORD` repository secret, but the site generator never consumes it. `build.mjs` reads `process.env.SITE_URL` and never reads `SITE_PASSWORD`; the file `gate.mjs` referenced in `AGENTS.md` (line 64) does not exist anywhere in the repo. Triggering the gate builds a completely ungated site while the workflow thinks it gated it.
- Files: `C:\dev\kakuro_revisited\.github\workflows\pages.yml`, `C:\dev\kakuro_revisited\packages\website\src\build.mjs`, `C:\dev\kakuro_revisited\AGENTS.md`
- Impact: Feature silently does nothing; wasted CI secret plumbing; a documented capability that is false.
- Fix approach: Either implement the gate (read `SITE_PASSWORD`, hash it, inject a client-side unlock script) or remove the `gate` input, the `SITE_PASSWORD` secret check, and the `gate.mjs` mention from `AGENTS.md`.

**Untyped Digital Goods / PaymentRequest access (`window as any`):**
- Issue: `monetization.ts` reaches the Google Play Digital Goods API and the PaymentRequest API through `(window as any)` casts, and every store call is wrapped in `catch (err: any)` that discards error detail into a single `lastError` string.
- Files: `C:\dev\kakuro_revisited\packages\app\src\monetization\monetization.ts` (lines 163, 204, 213, 245, 284, 315)
- Impact: No compile-time safety on a browser API that changes between Chromium versions; failures are reported to users as a single generic message, making support hard.
- Fix approach: Declare narrow ambient types for `getDigitalGoodsService` / `PaymentRequest`, and log the underlying error while keeping a user-facing message.

**`AdBanner` never renders an actual ad:**
- Issue: `AdBanner.tsx` declares an AdSense `slotId` prop and renders an "Ad" badge, but the component body only shows a "Support Revisited Labs" upsell and a "Remove ads" button. Real ads are injected by `consent.mjs` / `adsbygoogle.js` on the marketing pages, not by this component. The `slotId` prop is unused.
- Files: `C:\dev\kakuro_revisited\packages\app\src\monetization\AdBanner.tsx`
- Impact: Misleading component naming and dead code; if the app pages under `/play/` are expected to show real ads, they currently do not.
- Fix approach: Either wire real AdSense slot rendering into the component or drop the `slotId` prop and rename the component to reflect that it is a purchase upsell, not an ad banner.

**`consent.mjs` banner built with `innerHTML` string concatenation:**
- Issue: The consent banner is injected with `box.innerHTML = '<div ...>'` where the interpolated values are only the path-depth `root` and hardcoded constants (`CONSENT_KEY`, `ADSENSE_CLIENT`, `BANNER_CSS`). It is currently safe, but the pattern is fragile if any user-controlled text is ever added.
- Files: `C:\dev\kakuro_revisited\packages\website\src\consent.mjs` (line 78)
- Impact: Latent XSS risk if the banner copy is ever made dynamic.
- Fix approach: Build the DOM with `createElement` / `textContent` instead of an `innerHTML` literal, or add a comment asserting the invariant that no dynamic content may be interpolated.

**Service-worker cache name hardcoded:**
- Issue: `CACHE = 'kakuro-v1'` is a literal that is never bumped, and `install` does `c.addAll(SHELL)` including un-hashed `manifest.webmanifest` and `icon.svg`. The `activate` handler deletes every cache not equal to `CACHE`, so once a `kakuro-v1` cache exists it is never invalidated across deploys.
- Files: `C:\dev\kakuro_revisited\packages\app\public\sw.js` (lines 6-21)
- Impact: Changes to the manifest or icon can be served stale to returning visitors; future SW logic changes have no automatic cache invalidation path.
- Fix approach: Derive the cache name from a build-time version (e.g. import a version constant) or append a hash, and bump it with each release.

**`localStorage` parsing has no schema validation or migration layer:**
- Issue: `loadJson` casts `JSON.parse(raw) as T` with no shape check. `loadHistory` assumes the parsed value is an array, `loadStats` assumes `byLevel` is an object, `addHistory` calls `.slice` on whatever it loads. Only `loadGame` validates array lengths (not element types). This contradicts `AGENTS.md`'s note that "stored values are a contract … do not rename stored keys without a migration" — there is no migration mechanism at all.
- Files: `C:\dev\kakuro_revisited\packages\app\src\store.ts` (lines 25-46, 151-175), `C:\dev\kakuro_revisited\packages\app\src\ui.ts` (lines 41-46)
- Impact: A hand-edited or corrupted `localStorage` value can crash the app on load with an uncaught exception, with no recovery.
- Fix approach: Add runtime guards per loader (verify `Array.isArray`, coerce/fallback on bad shapes) and a versioned schema with a migration hook before expanding the stored keys further.

**Worker `switch` lacks a default branch and the client trusts response shapes:**
- Issue: `worker.ts`'s `onmessage` switch has no `default` case, so an unknown `kind` leaves `res` unassigned and `postMessage(res)` sends `undefined`. On the client, `SolverClient` casts responses with `as { kind: 'puzzle'; info }` with no runtime check of `kind`.
- Files: `C:\dev\kakuro_revisited\packages\app\src\worker.ts` (lines 18-62), `C:\dev\kakuro_revisited\packages\app\src\solverClient.ts` (lines 83-149)
- Impact: A protocol mismatch between `protocol.ts` and either side throws a `TypeError` inside `onmessage`/consumer code rather than a clean error.
- Fix approach: Add a `default` branch returning an `error` response, and validate `res.kind` at the call sites (or use a discriminated-union narrowing helper).

## Known Bugs

**Password gate does nothing:**
- Symptoms: Building with `gate` checked (and a valid `SITE_PASSWORD`) produces an identical, fully public site.
- Files: `C:\dev\kakuro_revisited\.github\workflows\pages.yml`, `C:\dev\kakuro_revisited\packages\website\src\build.mjs`
- Trigger: Run the `Deploy site` workflow with the `gate` input enabled.
- Workaround: None; there is no gate to trigger.

**`generate()` throws after exhausting attempts, with no fallback:**
- Symptoms: A Daily Puzzle or generated puzzle request fails with an `error` response ("Could not generate a level N Kakuro puzzle after 240 attempts…"). `daily()` and `generate()` in `solverApi.ts` do not catch this; only `fromBank()` wraps generation in a `try/catch` fallback.
- Files: `C:\dev\kakuro_revisited\packages\core\src\generator.ts` (lines 561-565), `C:\dev\kakuro_revisited\packages\app\src\solverApi.ts` (lines 69-87)
- Trigger: A `level`/`seed` combination whose `avoid`-partition fill and repair loop fail 240 attempts (most likely on the hard/`avoid` layouts with a specific deterministic seed).
- Workaround: `fromBank` falls back to `generate` on throw; `daily`/`generate` surface the raw error to the status bar.

**Monetization `initPromise` never re-evaluates:**
- Symptoms: If `init()` runs before the Digital Goods service is available (or errors), `isLoading` resets but `initPromise` stays set; later calls await the same resolved promise and never re-detect the store.
- Files: `C:\dev\kakuro_revisited\packages\app\src\monetization\monetization.ts` (lines 150-223)
- Trigger: First load in a non-TWA context, then opening the app inside the TWA without a full reload.
- Workaround: A full page reload re-runs `init()`.

## Security Considerations

**Client-only ad-free entitlement is trivially spoofable:**
- Risk: The lifetime "Remove ads" entitlement is persisted as `localStorage['revisited_ad_free_v1'] = '1'` with no server-side verification. A user can run `localStorage.setItem('revisited_ad_free_v1','1')` in devtools to unlock ad-free without paying.
- Files: `C:\dev\kakuro_revisited\packages\app\src\monetization\monetization.ts` (lines 16, 93-119, 277-279)
- Current mitigation: None — this is a purely client-side app with no backend to validate a purchase token.
- Recommendations: At minimum document the limitation; if revenue matters, verify the Google Play purchase token server-side (Play Developer API) or accept that ad-free is best-effort on the web build.

**Consent banner via `innerHTML`:**
- Risk: See Tech Debt — currently low because all interpolated values are constants or path depth.
- Files: `C:\dev\kakuro_revisited\packages\website\src\consent.mjs` (line 78)
- Current mitigation: Only `root` (derived from directory depth) and compile-time constants are interpolated.
- Recommendations: Switch to DOM construction or keep a comment forbidding dynamic interpolation.

**Consent Mode hardcodes `analytics_storage` to `denied`:**
- Risk: `syncConsent` always sends `analytics_storage:'denied'` even when the user accepts, and the default region maps analytics to `denied` unconditionally. Analytics are therefore always suppressed regardless of consent choice.
- Files: `C:\dev\kakuro_revisited\packages\website\src\consent.mjs` (lines 49-58)
- Current mitigation: None (this also affects the regional defaults).
- Recommendations: Wire `analytics_storage` to the user's choice if analytics is ever enabled.

## Performance Bottlenecks

**`solveExact` recursion has no explicit node budget:**
- Problem: The exact uniqueness solver in `solver.ts` recurses through `search()` with only MRV + partition pruning to bound it, unlike `fillLayout` (`maxNodes = 20000`) and `runSolve` (600 iterations) which have explicit budgets.
- Files: `C:\dev\kakuro_revisited\packages\core\src\solver.ts` (lines 307-398)
- Cause: A pathological board (or a corrupted puzzle string) could in principle explore a large subtree before pruning closes branches.
- Improvement path: Add a node/step counter and abort gracefully, matching the guardrails used elsewhere in the engine.

**Step-finder `analysisCache` flushes entirely at 20,000 entries:**
- Problem: `runAnalysis` caches per-run analysis keyed by run state, but when `analysisCache.size > 20000` it calls `.clear()` and drops the whole cache at once.
- Files: `C:\dev\kakuro_revisited\packages\core\src\stepFinder.ts` (lines 116-135)
- Cause: A full flush on a long solve causes a cold-start recompute of every subsequent run analysis, producing a latency cliff.
- Improvement path: Use bounded eviction (LRU) instead of a full clear.

**`useGameClock` interval runs unconditionally:**
- Problem: A 1-second `setInterval` re-renders via `setNow(Date.now())` for the lifetime of the app, even when there is no game or the puzzle is solved.
- Files: `C:\dev\kakuro_revisited\packages\app\src\hooks\useGameClock.ts` (lines 12-15)
- Cause: The clock is always mounted at `App.tsx` top level.
- Improvement path: Start/stop the interval only while a game is active and unsolved.

**Auto-notes refresh can race across rapid moves:**
- Problem: `refreshNotes` fires an async `candidates()` call after each move and applies the result to whatever the current state is; rapid typing can apply a stale candidate result after a newer move.
- Files: `C:\dev\kakuro_revisited\packages\app\src\hooks\useMoves.ts` (lines 39-59)
- Cause: The worker replies are not ordered against the move that produced them.
- Improvement path: Tag the request with the game generation and discard responses for an older generation.

## Fragile Areas

**`localStorage` contract (`store.ts` / `ui.ts`):**
- Files: `C:\dev\kakuro_revisited\packages\app\src\store.ts`, `C:\dev\kakuro_revisited\packages\app\src\ui.ts`
- Why fragile: The six stored keys (`settings`, `game`, `history`, `stats`, `seen`, plus `revisited_ad_free_v1` in `monetization.ts`) are parsed with unchecked casts; a shape change breaks silently. See Tech Debt.
- Safe modification: Keep keys stable, add runtime validation, and never rename a key without a migration.
- Test coverage: `store.test.ts` covers round-trip, cap, and broken-JSON fallback, but not corrupted shapes (e.g. history stored as an object).

**Worker protocol sync (`protocol.ts` ↔ `worker.ts` ↔ `solverClient.ts`):**
- Files: `C:\dev\kakuro_revisited\packages\app\src\protocol.ts`, `C:\dev\kakuro_revisited\packages\app\src\worker.ts`, `C:\dev\kakuro_revisited\packages\app\src\solverClient.ts`
- Why fragile: The three files must stay in sync manually; no compile-time link between request kind and response kind, and no runtime response validation (see Tech Debt).
- Safe modification: Change all three together; add a `default` branch and response-kind assertions.
- Test coverage: No direct tests for `worker.ts` or `solverClient.ts`.

**Monetization entitlement state machine:**
- Files: `C:\dev\kakuro_revisited\packages\app\src\monetization\monetization.ts`
- Why fragile: Ad-free state can be set from three places (cached `'1'`, `listPurchases()`, and the `PaymentRequest` success path) with no single source of truth, and errors are collapsed to one `lastError` string.
- Safe modification: Keep `isAdFree` derived from a single `persistState` path and unit-test each transition.
- Test coverage: None — `MonetizationManager._resetForTesting()` exists but no `monetization.test.ts` file exists.

## Scaling Limits

**Puzzle generation:**
- Current capacity: 240 attempts × (20,000-node fill + exact-solve + repair) per `generate()` call, plus a 16-repair budget per attempt.
- Limit: `generate()` throws when all attempts fail; the Daily Puzzle (`generateDaily`) and plain `generate()` have no fallback or retry, so a hard deterministic seed can hard-fail.
- Scaling path: Add a fallback (retry with a different layout order or `mode`) and/or cache successful daily/bank puzzles so a transient failure does not block the daily puzzle.

**Worker lifetime:**
- Current capacity: A single Web Worker handles all solver/generator calls; `cancel()` terminates and lazily recreates it.
- Limit: Terminate/recreate on cancel is coarse — it also aborts unrelated in-flight requests (there is only ever one at a time today, so this is acceptable now).
- Scaling path: If multiple concurrent solver calls are ever needed, replace terminate-on-cancel with per-request cancellation tokens.

## Dependencies at Risk

**Recent major versions:**
- Risk: `react` ^19.3.1, `vite` ^8.3.4, `vitest` ^5.0.5, and `@vitejs/plugin-react` ^6.1.2 are bleeding-edge majors. `typescript` is pinned `~5.6.3`.
- Files: `C:\dev\kakuro_revisited\packages\app\package.json`, `C:\dev\kakuro_revisited\packages\core\package.json`, `C:\dev\kakuro_revisited\package.json`
- Impact: Behavior shifts or breaking changes in a minor release can break the build without a code change; Vite 8 + Vitest 5 have a smaller ecosystem of compatible plugins.
- Migration plan: Keep them lockfile-pinned via `pnpm-lock.yaml` (already frozen in CI), and upgrade deliberately with a changelog review.

**Node version drift (local vs CI):**
- Risk: Root `engines` says `node >= 20`, but both workflows use Node 22 (`actions/setup-node` `node-version: 22`) and pnpm 10.
- Files: `C:\dev\kakuro_revisited\package.json` (lines 7-9), `C:\dev\kakuro_revisited\.github\workflows\ci.yml` (line 20), `C:\dev\kakuro_revisited\.github\workflows\pages.yml` (line 26)
- Impact: A developer on Node 20 may hit behavior not seen in CI (or vice versa); the `engines` range is wider than what is actually tested.
- Migration plan: Either widen/narrow `engines` to match CI, or add a Node 20 matrix job.

## Missing Critical Features

**Password gate (advertised but absent):**
- Problem: The deploy workflow exposes a `gate` toggle and the repo references `gate.mjs`, but no gating code exists.
- Blocks: Temporarily password-protecting a pre-release site for review (a documented workflow in `AGENTS.md`).

**Real in-app advertising:**
- Problem: `AdBanner` presents itself as an ad slot but renders no ad; the only visible "ad" is the self-promotional remove-ads upsell. If app-side ads are intended, they are not implemented.
- Blocks: Generating ad revenue from the `/play/` pages themselves (marketing pages do load AdSense via `consent.mjs`).

## Test Coverage Gaps

**`monetization.ts` (MonetizationManager):**
- What's not tested: Entitlement persistence, `init()` store detection, `purchaseRemoveAds()` success/abort paths, `restorePurchases()`.
- Files: `C:\dev\kakuro_revisited\packages\app\src\monetization\monetization.ts`, `C:\dev\kakuro_revisited\packages\app\src\monetization\useMonetization.ts`, `C:\dev\kakuro_revisited\packages\app\src\monetization\AdBanner.tsx`
- Risk: The one revenue-bearing subsystem has zero tests despite a `_resetForTesting()` hook being present for exactly that purpose.
- Priority: High

**`aiCoach.ts` (buildCoachStages / buildProofStages):**
- What's not tested: Direct stage text/mark generation for each of the 14 technique types and the proof chain; only indirectly via `solverApi.test.ts` "gives every listed technique a coach walkthrough".
- Files: `C:\dev\kakuro_revisited\packages\app\src\aiCoach.ts`
- Risk: Coach copy regressions (wrong cell labels, wrong conclusions) go unnoticed.
- Priority: Medium

**`worker.ts` and `solverClient.ts`:**
- What's not tested: Message routing, error propagation, cancel/terminate behavior, worker error recovery.
- Files: `C:\dev\kakuro_revisited\packages\app\src\worker.ts`, `C:\dev\kakuro_revisited\packages\app\src\solverClient.ts`
- Risk: A protocol desync or worker crash surfaces only as a silent `TypeError` at runtime.
- Priority: Medium

**`consent.mjs` and `sw.js`:**
- What's not tested: Consent banner injection/choice persistence (only presence is asserted in `build.test.mjs`), service-worker caching/fetch behavior.
- Files: `C:\dev\kakuro_revisited\packages\website\src\consent.mjs`, `C:\dev\kakuro_revisited\packages\app\public\sw.js`
- Risk: Consent-mode misconfiguration (e.g. the `analytics_storage` gap) and stale-cache bugs go undetected.
- Priority: Low

**`store.ts` corrupted-shape handling:**
- What's not tested: Loading a history/stats value of the wrong shape (e.g. an object where an array is expected).
- Files: `C:\dev\kakuro_revisited\packages\app\test\store.test.ts`
- Risk: A corrupted `localStorage` crashes the app on load with no recovery path.
- Priority: Medium

---

*Concerns audit: 2026-11-03*
