# Digital Gaming Wallet

## Implementation notes

### Phase 1 — Foundation

#### Task 1.1 — Configure Tailwind v4 + Vite plugin

- **What:** Added `@tailwindcss/vite` plugin to [vite.config.ts](vite.config.ts); added `@import "tailwindcss";` to [src/index.css](src/index.css); added a `bg-red-500` test class to [src/App.tsx](src/App.tsx).
- **Why:** Tailwind v4 ships as a Vite-native plugin — no PostCSS config or `tailwind.config.js` required. All packages (`tailwindcss`, `@tailwindcss/vite`, `clsx`, `tailwind-merge`) were already installed; this task wired them into the build pipeline and added the `cn()` utility in [src/lib/utils.ts](src/lib/utils.ts) (`clsx` + `tailwind-merge` combined) for conditional class merging throughout the app.
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
- **Why:** Chosen over React Context because the fetch wrapper (`src/lib/api.ts`) must call `logout()` on every 401 response — outside the React component tree. `useContext` cannot be called outside a component; Zustand's `getState()` can. Replacing Zustand here would require a workaround (event emitter, singleton ref, or threaded callback) that is more complex, not less. A secondary benefit: balance updates (which happen on every bet) only re-render components subscribed to `balance`, not the entire tree. Per [docs/assessment.md](docs/assessment.md), balance is client-only — no GET endpoint exists; it is seeded by login and updated from each mutation response.
- **How:** `persist` middleware (key `dgw-auth`) serialises `token`, `user`, `balance`, and `currency` to `localStorage` via `partialize` so the header is never blank on refresh. `logout()` resets all fields and the middleware clears the storage entry.

#### Task 2.2 — `fetch` wrapper with bearer auth

- **What:** Created [src/lib/api.ts](src/lib/api.ts) exporting `api` (`{ get, post, delete }` built on native `fetch`) and `ApiError { status, message }` interface with `isApiError` type guard.
- **Why:** Centralises auth injection and error normalisation so every feature's API module gets consistent behaviour for free. The 401 interceptor enforces the single-logout rule from [docs/prd.md](docs/prd.md) without each call site needing to handle it.
- **How:** Request interceptor reads `useAuth.getState().token` at call time (not module load) to stay current after login. Response error interceptor extracts `response.data.message` when present, falls back to `error.message`, and rejects with `ApiError`. On 401 it calls `useAuth.getState().logout()`; the router's `_authenticated` `beforeLoad` guard handles the redirect — no router import needed here (avoids circular deps).

#### Task 2.3 — TanStack Query client

- **What:** Installed `@tanstack/react-query-devtools`; created [src/lib/queryClient.ts](src/lib/queryClient.ts) exporting a singleton `QueryClient`; wrapped the app in `QueryClientProvider` in [src/main.tsx](src/main.tsx); mounted `<ReactQueryDevtools>` behind `import.meta.env.DEV`.
- **Why:** All server-state fetching (bets, transactions) runs through TanStack Query — caching, background revalidation, and cache invalidation after mutations. A shared singleton client is required so cache invalidation from one feature (e.g. placing a bet) reaches queries in another (e.g. the transactions list).
- **How:** `staleTime: 30_000` avoids redundant refetches within 30 s of a successful fetch; `retry: 1` retries once on transient network errors without hammering the API; `refetchOnWindowFocus: true` keeps lists fresh after the user switches tabs.

#### Task 2.4 — TanStack Router (file-based)

- **What:** Installed `@tanstack/react-router`, `@tanstack/router-plugin`, `@tanstack/router-devtools`; added `tanstackRouter()` plugin to [vite.config.ts](vite.config.ts) (before `react()`); created [src/routes/__root.tsx](src/routes/__root.tsx) with `<Outlet />` and `<TanStackRouterDevtools>` (dev-only); added [src/routes/index.tsx](src/routes/index.tsx) as the `/` placeholder; router created in [src/App.tsx](src/App.tsx) from the generated [src/routeTree.gen.ts](src/routeTree.gen.ts); `<RouterProvider>` wraps the app via `App`.
- **Why:** File-based routing is the TanStack Router recommended approach — route modules are co-located with their guards and loaders, and `routeTree.gen.ts` is regenerated automatically on every file change under `src/routes/`, keeping the route tree in sync without manual registration.
- **How:** The router plugin runs before `react()` so it can transform route files before JSX compilation. The `Register` augmentation in [src/App.tsx](src/App.tsx) infers all route paths and search params globally, enabling fully type-safe `<Link>` and `router.navigate()` calls throughout the app.

#### Task 2.5 — Euro formatting utility

- **What:** Created [src/lib/format.ts](src/lib/format.ts) exporting `formatEuro(amount, locale?)` using `Intl.NumberFormat`; installed `vitest` and added a `test` script (`vitest run`) to [package.json](package.json); Vitest configured in [vitest.config.ts](vitest.config.ts); 4 unit tests in [src/lib/format.test.ts](src/lib/format.test.ts) cover positive, zero, negative, and custom-locale values.
- **Why:** A single formatting function prevents scattered `Intl.NumberFormat` calls diverging in locale or options. Defaulting to `en-IE` gives stable test output and matches the Euro-using English convention; Phase 7 callers will pass the i18n-detected locale.
- **How:** Vitest v4 no longer merges its types via `/// <reference types="vitest" />` into Vite's `defineConfig`. A separate [vitest.config.ts](vitest.config.ts) uses `mergeConfig` from `vitest/config` to extend the Vite config, keeping `vite.config.ts` free of test-only concerns.

#### Task 2.6 — Zod-validated API client wrappers

- **What:** Created [src/lib/zodFetch.ts](src/lib/zodFetch.ts) exporting `zodFetch` (`{ get, post, delete }`) and `ZodParseError`.
- **Why:** Guarantees every API response is type-narrowed at the boundary. Without this layer, TypeScript types are assertions (`as T`) that the runtime never enforces — a mismatched field (wrong type, missing key, renamed enum value) would propagate silently until it caused a runtime crash downstream. See [docs/assessment.md](docs/assessment.md) §API contract gaps.
- **How:** Each method calls the underlying `api` method with `unknown` as the generic, then runs `.safeParse()` on the raw response. On failure it logs the Zod issues and received payload to the console (developer visibility) and throws `ZodParseError` so the caller's error boundary or TanStack Query `onError` can surface it. On success it returns the narrowed `T`.

### Phase 3 — Authentication

#### Task 3.1 — Auth Zod schemas + types

- **What:** Created [src/features/auth/schemas.ts](src/features/auth/schemas.ts) with `loginSchema`, `registerSchema`, `loginResponseSchema`, `registerResponseSchema`, and their inferred TypeScript types (`LoginInput`, `RegisterInput`, `LoginResponse`, `RegisterResponse`).
- **Why:** Centralises all auth-related validation shapes so every call site (`login()`, `register()`, form `.safeParse()`) shares one source of truth. Zod schemas double as runtime validators and static type definitions — no parallel interface declarations needed.
- **How:** `registerSchema` uses `.refine()` targeting `path: ['confirmPassword']` so field errors land on the correct form field. Per [docs/assessment.md](docs/assessment.md) §11, the server has no password complexity rules, so the 8-character minimum and match check are enforced only on the frontend. `loginResponseSchema` captures `{ id, name, balance, currency, accessToken }` — the raw mock API shape; the `login()` function in task 3.2 maps this to the store's `{ token, user, balance, currency }` before writing. `registerResponseSchema` captures only `{ id, name }` per the mock API's response shape (no token; task 3.2 chains a login call immediately after).

#### Task 3.2 — Auth API functions

- **What:** Created [src/features/auth/api.ts](src/features/auth/api.ts) exporting `login(payload)` and `register(payload)`.
- **Why:** Decouples the network call from the UI layer. Components call `login()` or `register()` and receive typed results; all Zod validation and store mutation happens inside these functions. Each function uses `zodFetch.post` to ensure the response is schema-validated before any state is written.
- **How:** `login()` calls `zodFetch.post('/login', loginResponseSchema, payload)` then maps the raw response (`accessToken`, top-level `id`/`name`) to the store's shape (`token`, nested `user`) before calling `useAuth.getState().login(...)` — decoupling the API wire format from the internal state shape. `register()` forwards the full `RegisterInput` including `confirmPassword` because the mock API performs a server-side `password !== confirmPassword` check and returns 400 if the field is absent.

#### Task 3.3 — UI primitives: Input, Label, Button

- **What:** Created [src/components/ui/button.tsx](src/components/ui/button.tsx), [src/components/ui/input.tsx](src/components/ui/input.tsx), [src/components/ui/label.tsx](src/components/ui/label.tsx); updated [src/components/ui/index.ts](src/components/ui/index.ts) with barrel exports.
- **Why:** Shared primitive components prevent duplicated Tailwind class strings across forms and ensure consistent focus rings, error states, and disabled styles in one place. All auth and bet forms in Phases 3–5 consume these.
- **How:** `Button` maps a `variant` prop (`primary | secondary | ghost | destructive`) to a static class string via a record — no `cva`, just `cn()`. `Input` uses `forwardRef` and an `error?: string` prop that renders an inline `<p role="alert">` and flips border + ring to red via `aria-invalid`. `Label` wraps `<label>` and renders a red asterisk when `required` is set.

#### Task 3.4 — Login page

- **What:** Created [src/routes/login.tsx](src/routes/login.tsx) — the `/login` route with field state, Zod validation, API call, and redirect.
- **Why:** Entry point for authenticated users. The `beforeLoad` guard short-circuits to `/` for already-authenticated sessions so logged-in users are never shown the form. The `?redirect=` search param threads through from the `_authenticated` guard (task 3.6) to return users to their intended destination after login.
- **How:** `loginSchema.safeParse()` runs on submit; `result.error.flatten().fieldErrors` maps directly onto per-field error state consumed by `<Input error={...} />`. The API error is shown above the form in a red alert box. `validateSearch` with a Zod schema types the `redirect` and `prefillEmail` search params so `Route.useSearch()` is fully typed.
- **Testing `/login` after registration:** because registration auto-logs you in, visiting `/login` immediately redirects to `/`. To test the login form independently with the credentials you just registered, clear the session from the browser console: `localStorage.removeItem('dgw-auth')` then navigate to `/login`. The mock API retains the registered user in memory for the lifetime of its process, so the credentials remain valid.

#### Task 3.5 — Registration page

- **What:** Created [src/routes/register.tsx](src/routes/register.tsx) — the `/register` route with four-field form (name, email, password, confirm password), Zod validation, and an auto-login chain on success.
- **Why:** The API's `POST /register` returns `{ id, name }` only — no token. A raw redirect to `/login` would force the user to re-enter credentials, so the page immediately calls `login()` with the same credentials to seed the auth store and land on `/` in one step.
- **How:** `registerSchema.safeParse()` runs on submit; errors are distributed per-field via `result.error.flatten().fieldErrors`. On `register()` success, `login()` is called in a nested try/catch — if auto-login fails (network race or API change), the fallback redirects to `/login?prefillEmail=...` so the user can complete sign-in without re-typing their email. The `beforeLoad` guard mirrors the login route: already-authenticated users are bounced to `/`.
