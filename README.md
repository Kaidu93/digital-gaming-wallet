# Digital Gaming Wallet

## Implementation notes

### Phase 1 — Foundation

#### Task 1.1 — Configure Tailwind v4 + Vite plugin

- **What:** Added `@tailwindcss/vite` plugin to [vite.config.ts](vite.config.ts); added `@import "tailwindcss";` to [src/index.css](src/index.css); added a `bg-red-500` test class to [src/App.tsx](src/App.tsx).
- **Why:** Tailwind v4 ships as a Vite-native plugin — no PostCSS config or `tailwind.config.js` required. All packages (`tailwindcss`, `@tailwindcss/vite`, `cva`, `clsx`, `tailwind-merge`) were already installed; this task wired them into the build pipeline.
- **How:** The plugin is placed before `react()` in the Vite plugin array so CSS transforms run first.

#### Task 1.2 — Establish folder structure

- **What:** Created stub `index.ts` files in [src/routes/](src/routes/), [src/components/](src/components/), [src/components/ui/](src/components/ui/), [src/lib/](src/lib/), [src/hooks/](src/hooks/), [src/stores/](src/stores/), [src/i18n/](src/i18n/), [src/types/](src/types/), [src/features/auth/](src/features/auth/), [src/features/wallet/](src/features/wallet/), [src/features/bets/](src/features/bets/).
- **Why:** Locks in the co-location convention — feature code lives under `features/<feature>/`; cross-feature primitives under top-level `components/`.
- **How:** Added `"paths": { "@/*": ["./src/*"] }` to [tsconfig.app.json](tsconfig.app.json) (with `baseUrl: "."` + `ignoreDeprecations: "6.0"` for TS 6 compatibility) and a matching `resolve.alias` in [vite.config.ts](vite.config.ts) via `path.resolve(__dirname, 'src')`.

#### Task 1.3 — Environment variables

- **What:** Created [.env.example](.env.example) and [.env](.env) with `VITE_API_BASE_URL=/api` and `VITE_WS_URL=`; added [src/lib/env.ts](src/lib/env.ts) exporting `env.API_BASE_URL` and `env.WS_URL`.
- **Why:** Centralises all runtime config. The Zod schema (`z.object({ VITE_API_BASE_URL: z.string().min(1), VITE_WS_URL: z.string() })`) validates `import.meta.env` at module load time — a missing required var throws immediately at boot rather than failing silently at first use.
- **How:** `safeParse` at module boundary; on failure a descriptive error names every missing key. `.env` is gitignored explicitly; `.env.example` is committed as the canonical config reference (copy it with `cp .env.example .env`).

#### Task 1.4 — Vite dev proxy for mock API (CORS)

- **What:** Added `server.proxy` to [vite.config.ts](vite.config.ts): `/api/*` requests from `:5173` are forwarded to `http://localhost:3000` with the `/api` prefix stripped.
- **Why:** The mock API at `:3000` does not configure `cors()`, so the browser blocks cross-origin requests from `:5173` directly. The proxy makes both origins the same from the browser's perspective, eliminating the CORS problem without touching the upstream repo.
- **How:** `rewrite: (path) => path.replace(/^\/api/, '')` strips the prefix so `/api/login` becomes `/login` on the target. In production, pointing `VITE_API_BASE_URL` at a CORS-enabled origin removes the need for a proxy entirely — no app-code changes required.

### Phase 2 — Core Infrastructure

#### Task 2.1 — Auth store (Zustand)

- **What:** Installed `zustand`; created [src/stores/auth.ts](src/stores/auth.ts) exporting `useAuth` with state `{ token, user: { id, name }, balance, currency }` and actions `login`, `logout`, `setBalance`.
- **Why:** Chosen over React Context to avoid whole-tree re-renders on every balance update (balance changes on every bet). Per [docs/assessment.md](docs/assessment.md), balance is client-only — no GET endpoint exists; it is seeded by login and updated from each mutation response.
- **How:** `persist` middleware (key `dgw-auth`) serialises `token`, `user`, `balance`, and `currency` to `localStorage` via `partialize` so the header is never blank on refresh. `logout()` resets all fields and the middleware clears the storage entry.

#### Task 2.2 — `fetch` wrapper with bearer auth

- **What:** Created [src/lib/api.ts](src/lib/api.ts) exporting `api` (`{ get, post, delete }` built on native `fetch`) and `ApiError { status, message }` interface with `isApiError` type guard.
- **Why:** Centralises auth injection and error normalisation so every feature's API module gets consistent behaviour for free. The 401 interceptor enforces the single-logout rule from [docs/prd.md](docs/prd.md) without each call site needing to handle it.
- **How:** Request interceptor reads `useAuth.getState().token` at call time (not module load) to stay current after login. Response error interceptor extracts `response.data.message` when present, falls back to `error.message`, and rejects with `ApiError`. On 401 it calls `useAuth.getState().logout()`; the router's `_authenticated` `beforeLoad` guard handles the redirect — no router import needed here (avoids circular deps).
