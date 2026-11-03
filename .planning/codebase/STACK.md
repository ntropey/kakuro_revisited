---
last_mapped_commit: 6f27ac6b5c2e53f3844ba48313278bff6194d486
last_mapped_at: 2026-11-03
---
# Technology Stack

**Analysis Date:** 2026-11-03

## Languages

**Primary:**
- TypeScript 5.6.3 - entire engine, app, and tests (`packages/core/src/*.ts`, `packages/app/src/*.{ts,tsx}`, `packages/*/test/*.ts`)
- JavaScript (ESM `.mjs`) - the static site generator and inlined site scripts (`packages/website/src/*.mjs`, `packages/app/public/sw.js`)

**Secondary:**
- HTML/CSS - app shell (`packages/app/index.html`) and generated site pages
- SVG - board diagrams (`packages/website/src/diagram.mjs`) and icons

## Runtime

**Environment:**
- Node.js >= 20 (root `package.json` `engines.node`); CI and deploy use Node 22 (`.github/workflows/ci.yml`, `.github/workflows/pages.yml`)
- Browser runtime for the app — React 19 PWA served as a static Vite build

**Package Manager:**
- pnpm 10 (CI pins `version: 10` via `pnpm/action-setup@v6`)
- Workspace: pnpm workspaces (`pnpm-workspace.yaml` → `packages/*`)
- Lockfile: `pnpm-lock.yaml` present (CI installs with `--frozen-lockfile`)

## Frameworks

**Core:**
- React 19.3.1 - app UI (`packages/app/src/App.tsx`, components, hooks)
- React DOM 19.3.1 - rendering (`packages/app/src/main.tsx`)
- Vite 8.3.4 - app dev server, bundler, and build (`packages/app/vite.config.ts`, base `'./'`, worker format `es`, build target `es2022`)
- `@vitejs/plugin-react` 6.1.2 - JSX/React fast refresh

**Testing:**
- Vitest 5.0.5 - unit tests for `core` and `app` (`packages/core/vitest.config.ts`, `packages/app` `test` script)
- Node built-in test runner (`node --test`) - website output assertions (`packages/website/test/build.test.mjs`)

**Build/Dev:**
- esbuild 0.28.2 - transitive bundler under Vite/Vitest (root devDependency)
- TypeScript compiler (`tsc --noEmit`) - type checking across packages

## Key Dependencies

**Critical:**
- `@kakuro/core` (`workspace:*`) - the puzzle engine consumed by the app (`packages/app/package.json`)
- `@fontsource/ibm-plex-mono` 5.3.0, `@fontsource/ibm-plex-sans` 5.3.0, `@fontsource/newsreader` 5.3.0 - self-hosted fonts (no external font CDN)
- `react` / `react-dom` 19.3.1

**Infrastructure:**
- `@types/node` 22.20.5 - Node type defs for `core` (transitively for Vitest)
- `@types/react` / `@types/react-dom` 19.3.x - app type defs

**Zero-runtime-dependency package:**
- `@kakuro/website` has no dependencies at all (`packages/website/package.json` — `node` build script only, no `dependencies`/`devDependencies` block)

## Configuration

**Environment:**
- `SITE_URL=https://kakurorevisited.com/` - set only in CI/deploy to enable `sitemap.xml` + `robots.txt` generation (`packages/website/src/build.mjs`)
- `SITE_PASSWORD` - optional GitHub secret that adds a temporary password gate when the Pages deploy is run with the `gate` input (`.github/workflows/pages.yml`)
- No `.env` files present in the repo (not detected)

**Build:**
- `tsconfig.base.json` - shared strict TS config: `target ES2022`, `module ESNext`, `moduleResolution Bundler`, `strict: true`, `esModuleInterop`, `isolatedModules`, `forceConsistentCasingInFileNames`
- `packages/app/tsconfig.json` - adds `DOM`, `DOM.Iterable`, `WebWorker` libs, `jsx: react-jsx`, `vite/client` types
- `packages/core/tsconfig.json` - adds `node` types, `noEmit`
- `packages/app/vite.config.ts` - `base: './'`, `plugins: [react()]`, `worker: { format: 'es' }`, `build.target: 'es2022'`
- `packages/core/vitest.config.ts` - `include: ['test/**/*.test.ts']`, `testTimeout: 120_000`, `hookTimeout: 120_000`
- Website has no TS config; typecheck is `node --check` over each `.mjs` source file

## Platform Requirements

**Development:**
- Node.js >= 20 (Node 22 recommended to match CI)
- pnpm 10
- No native modules; pure JS/TS toolchain

**Production:**
- Static site hosted on **Cloudflare Pages** (`kakuro-revisited` project), deployed from `packages/website/dist` via `cloudflare/wrangler-action@v3` (`.github/workflows/pages.yml`)
- Custom domain `kakurorevisited.com` (`CNAME`)
- App shipped as PWA (`packages/app/public/manifest.webmanifest`) with service worker offline caching (`packages/app/public/sw.js`)
- Distribution also via Microsoft Store (`https://apps.microsoft.com/detail/9P9NXJ6MFLJQ`)

---

*Stack analysis: 2026-11-03*
