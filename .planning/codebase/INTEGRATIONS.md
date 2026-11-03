---
last_mapped_commit: 6f27ac6b5c2e53f3844ba48313278bff6194d486
last_mapped_at: 2026-11-03
---
# External Integrations

**Analysis Date:** 2026-11-03

## APIs & External Services

**Advertising:**
- Google AdSense - display ads on the marketing site and the app under `/play/`
  - Client: `adsbygoogle.js` loaded from `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6409516653999633` (`packages/website/src/consent.mjs` line 63)
  - Publisher ID: `ca-pub-6409516653999633` (`ADSENSE_CLIENT` in `packages/website/src/consent.mjs` line 19; reused to write `ads.txt` in `packages/website/src/build.mjs` line 840)
  - Consent: Google Consent Mode v2 + IAB TCF v2.2 CMP defaults set before the ad script loads

**In-App Purchasing:**
- Google Play Digital Goods API - one-time lifetime "Remove Ads" purchase (`$2.99` USD)
  - Client: browser `getDigitalGoodsService()` + `PaymentRequest` API with `supportedMethods: 'https://play.google.com/billing'` (`packages/app/src/monetization/monetization.ts` lines 164-168, 250-269)
  - SKU: `remove_ads` (`REMOVE_ADS_SKU`)
  - Entitlement cached in `localStorage` under key `revisited_ad_free_v1`

**No other runtime APIs.** The solver and coach are fully deterministic and local — no LLM/AI backend, no remote puzzle service. (`packages/core/src/solver.ts`, `packages/app/src/aiCoach.ts`, `packages/app/src/solverApi.ts`)

## Data Storage

**Databases:**
- None. No server-side database; all state is client-side.

**File Storage:**
- Local filesystem only (static site output under `packages/website/dist`, app build under `packages/app/dist`)

**Caching:**
- Browser `localStorage` - settings, saved games, library, game mode, consent choice (`kakuro-consent`), and ad-free entitlement (`revisited_ad_free_v1`) via `packages/app/src/store.ts` and `packages/app/src/monetization/monetization.ts`
- Service Worker Cache Storage - app shell + runtime cache (`packages/app/public/sw.js`, cache name `kakuro-v1`, 150-entry cap)
- No server/CDN cache layer

## Authentication & Identity

**Auth Provider:**
- None. No user accounts, login, or session management.

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry/error reporting SDK)

**Logs:**
- `console.error` / `console.warn` only (e.g. `[Monetization] Listener error:`, `[useMonetization] Background sync error:`). No logging service.
- The privacy policy explicitly states: "This site does not run a separate analytics product" (`packages/website/src/build.mjs` line 592)

## CI/CD & Deployment

**Hosting:**
- Cloudflare Pages - project `kakuro-revisited`, deployed from `packages/website/dist` (`.github/workflows/pages.yml`)
- Custom domain: `kakurorevisited.com` (`CNAME`)

**CI Pipeline:**
- GitHub Actions
  - `ci.yml` - runs on push + PR: typecheck, test, build app + website, website tests (pnpm 10, Node 22, ubuntu-latest)
  - `pages.yml` - on `main` push and manual dispatch: builds site and deploys via `cloudflare/wrangler-action@v3`

**Secrets (GitHub repository secrets, existence only — never read):**
- `CLOUDFLARE_API_TOKEN` - Cloudflare Pages deploy token
- `SITE_PASSWORD` - optional temporary site password gate

## Environment Configuration

**Required env vars:**
- `SITE_URL` - required in CI for `sitemap.xml` + `robots.txt` (set to `https://kakurorevisited.com/`)

**Optional env vars:**
- `SITE_PASSWORD` - enables a temporary password gate on the deployed site

**Secrets location:**
- GitHub repository secrets (CI). No `.env` files in the repo.

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None. The only runtime network requests are the consent-gated `adsbygoogle.js` load and the service worker's same-origin fetch (`.github/workflows/pages.yml` deployment is build-time only).

## Third-Party Links (non-runtime, marketing/site content)

Referenced in generated site pages (`packages/website/src/build.mjs`) and app meta (`packages/app/index.html`):
- Revisited Labs brand: `https://revisitedlabs.com`
- Sister sites: `hodokurevisited.com`, `logisimrevisited.com`, `nonogramrevisited.com`, `dolcecolore.com`
- Source repo: `https://github.com/ntropey/kakuro_revisited`
- Distribution: Microsoft Store (`https://apps.microsoft.com/detail/9P9NXJ6MFLJQ`)
- Google policy pages: `https://policies.google.com/technologies/partner-sites`, `https://myadssettings.google.com`
- Structured data / OG / schema.org URLs in page metadata

---

*Integration audit: 2026-11-03*
