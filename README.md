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

#### Task 3.6 — `_authenticated` layout route + `beforeLoad` guard

- **What:** Created [src/routes/_authenticated.tsx](src/routes/_authenticated.tsx) (pathless layout route); moved the root index placeholder to [src/routes/_authenticated/index.tsx](src/routes/_authenticated/index.tsx); created [src/components/AppShell.tsx](src/components/AppShell.tsx) as a minimal `<Outlet />` wrapper (fleshed out in task 4.1).
- **Why:** All authenticated routes must be unreachable without a valid token. A single layout-level `beforeLoad` enforces this in one place — no per-route guard duplication. The `?redirect=` param threads the original destination through to the login page so users land where they intended after signing in.
- **How:** `beforeLoad` reads `useAuth.getState().token` (outside the React tree, which is why Zustand was chosen over Context in task 2.1). If absent, it throws `redirect({ to: '/login', search: { redirect: location.href } })`. The root `index.tsx` was moved into `_authenticated/` because `/` is an authenticated route in this app — having both `_authenticated.tsx` and `index.tsx` at the same directory level caused a TanStack Router generator conflict.

### Phase 4 — Wallet

#### Task 4.1 — Balance display in the app shell

- **What:** Implemented [src/components/AppShell.tsx](src/components/AppShell.tsx) with a sticky header showing the logged-in user's name, formatted balance (`formatEuro(balance)`), and a logout button.
- **Why:** The header is the persistent balance display required by [docs/prd.md](docs/prd.md). Because `balance` is client-only state (no GET endpoint), the header must subscribe directly to the Zustand store so it reflects every mutation instantly — no query needed.
- **How:** Each piece of header state is selected individually from `useAuth` (`user`, `balance`, `logout`) so unrelated store changes don't trigger a re-render. `logout()` clears the store and `router.navigate({ to: '/login' })` redirects immediately; the `_authenticated` `beforeLoad` guard would also catch the cleared token on any subsequent navigation.

#### Task 4.2 — Transactions Zod schemas + API

- **What:** Created [src/features/wallet/schemas.ts](src/features/wallet/schemas.ts) (`transactionTypeSchema`, `transactionSchema`, `transactionsResponseSchema`, `transactionFilterSchema` + inferred types) and [src/features/wallet/api.ts](src/features/wallet/api.ts) exporting `getTransactions(filters)`.
- **Why:** The `GET /my-transactions` endpoint accepts `type`, `id`, `page`, and `limit` query params. Defining `transactionFilterSchema` means invalid filter values (e.g. `type: "prize"`) are caught before the request is made. The schema enum `['bet', 'win', 'cancel']` matches the mock API's literal values exactly — the "Prize" display label in the UI is a rendering choice (task 4.3/7.2), not a wire-format value.
- **How:** `createdAt` uses `z.coerce.date()` because the API returns ISO strings; query params are serialised to strings via `URLSearchParams` so `page` and `limit` numbers round-trip correctly.

#### Task 4.3 — Transactions list page

- **What:** Created [src/routes/_authenticated/transactions.tsx](src/routes/_authenticated/transactions.tsx) — the `/transactions` authenticated route with URL-bound filters, a TanStack Query fetch, a desktop table + mobile card list, and inline pagination.
- **Why:** Binds all filter and pagination state to URL search params via `validateSearch` so deep links, browser back/forward, and page refreshes restore the exact view. TanStack Query key includes the full search object so any filter change triggers a fresh fetch automatically.
- **How:** A route-local `transactionSearchSchema` (`z.coerce.number().default(...)` for `page`/`limit`) is used for `validateSearch` instead of `transactionFilterSchema` directly — URL params arrive as strings and the coerce variants handle the conversion. The ID filter updates the URL only on form submit (Enter / Search button) to avoid a fetch per keystroke; the type select updates immediately. Rows and cards are wrapped in `memo()` per the task spec. `isApiError()` from `api.ts` is used to extract the message from the plain-object `ApiError` shape (not an `Error` instance).

#### Task 4.4 — Pagination component

- **What:** Created [src/components/ui/pagination.tsx](src/components/ui/pagination.tsx) exporting `Pagination`; registered in [src/components/ui/index.ts](src/components/ui/index.ts); replaced the inline pagination in [src/routes/_authenticated/transactions.tsx](src/routes/_authenticated/transactions.tsx).
- **Why:** The inline `Pagination` in task 4.3 lacked a page-size selector, which is required here and will be needed again in the bets list (task 5.3). Extracting it as a shared primitive avoids duplication and gives both pages the same change-page-size UX.
- **How:** Accepts `{ total, page, limit, onChange }` — the component derives `totalPages = ceil(total / limit)` internally so callers don't need to pre-calculate it. The page-size `<select>` resets `page` to 1 on change (a single `onChange({ page: 1, limit })` call) so the user never lands on a page that no longer exists after shrinking page size. Both prev/next buttons use `disabled` (which also triggers the `disabled:pointer-events-none` class from `Button`) and carry `aria-label` text. The `<span>` displaying current page carries `aria-live="polite" aria-atomic="true"` so screen readers announce page changes.

### Phase 5 — Betting

#### Task 5.1 — Bets Zod schemas + API

- **What:** Created [src/features/bets/schemas.ts](src/features/bets/schemas.ts) (`betStatusSchema`, `betSchema`, `betsResponseSchema`, `placeBetSchema`, `placeBetResponseSchema`, `cancelBetResponseSchema`, `betFilterSchema` + inferred types) and [src/features/bets/api.ts](src/features/bets/api.ts) exporting `placeBet`, `getBets`, `cancelBet`.
- **Why:** Mirrors the wallet feature pattern — every API boundary is schema-validated via `zodFetch` so contract drift (wrong types, missing fields, renamed enums) surfaces immediately as a `ZodParseError` rather than a silent runtime bug. `betStatusSchema = z.enum(['win','lost','canceled'])` locks in the American single-L spelling per [docs/assessment.md](docs/assessment.md) §6.
- **How:** `winAmount` in `betSchema` and `placeBetResponseSchema` is `z.number().nullable()` — the API returns `null` on a loss and a positive number on a win. `placeBetSchema` uses `z.coerce.number().min(1)` so HTML string inputs are coerced before validation; `0.5` is rejected because it is below 1. The `cancelBet` response (`{ transactionId, balance, currency }`) is distinct from the place-bet response — each has its own schema to avoid accidental shape coupling.

#### Task 5.2 — Place-bet form

- **What:** Created [src/features/bets/components/PlaceBetForm.tsx](src/features/bets/components/PlaceBetForm.tsx) with an amount input, inline validation, and an inline win/loss result banner below the submit button.
- **Why:** The core betting UX. The form is a standalone component (not a page) so task 5.5 can embed it in the dashboard alongside other widgets. An inline banner was chosen over a floating notification because the user is actively watching the form when the result arrives — the banner is more visible and stays until the next bet or input change.
- **How:** The Zod schema is built inline on each submit — `placeBetSchema.extend({ amount: z.coerce.number().min(1).max(balance) })` — so the `max` always reflects the current balance without stale closure capture. Outcome is inferred from `winAmount !== null && winAmount > 0` per the API contract (no `status` field in the place-bet response). On success, `setBalance(response.balance)` updates the header instantly; `queryClient.invalidateQueries` ensures `my-bets` and `my-transactions` lists refetch on next render.

#### Task 5.3 — Bets list page

- **What:** Created [src/routes/_authenticated/bets.tsx](src/routes/_authenticated/bets.tsx) — the `/bets` authenticated route with URL-bound status + ID filters, TanStack Query fetch, desktop table + mobile card list, pagination, and a Cancel button stub per row.
- **Why:** The bets list is a core requirement from [docs/prd.md](docs/prd.md). URL-bound filters mirror the transactions page pattern so deep links and back/forward restore the exact view. The Cancel button is rendered here with `disabled={status === 'canceled'}` per the spec; the confirmation dialog and API call land in task 5.4.
- **How:** A route-local `betSearchSchema` uses `z.coerce.number().default(...)` for page/limit (URL params arrive as strings) and `betStatusSchema.optional()` for the status filter. The query key includes the full search object so any filter change triggers a refetch. `StatusBadge` maps `win → green`, `lost → red`, `canceled → gray`. Prize column renders `formatEuro(winAmount)` when non-null, otherwise `—`.

#### Task 5.4 — Cancel bet action + confirmation dialog

- **What:** Added `CancelBetButton` component in [src/routes/_authenticated/bets.tsx](src/routes/_authenticated/bets.tsx) — wraps a native `<dialog>` (controlled via `useRef` + `showModal()`/`close()`), a `useMutation` cancel call, and inline error rendering inside the dialog.
- **Why:** Destructive actions require a confirmation step per the UX brief. The `<dialog>` element is chosen per the implementation plan — it provides native modal semantics (focus trap, Esc-to-close, `backdrop::` styling) with no third-party dependency.
- **How:** `isOpen` drives `dialogRef.current.showModal()` / `.close()` via `useEffect`. The native `cancel` event (fired by Esc) syncs `isOpen` back to `false` so state stays consistent. On confirm, `cancelBet(id)` is called; on success `setBalance(response.balance)` updates the header immediately and `queryClient.invalidateQueries` on `my-bets` + `my-transactions` keeps lists fresh. API errors render inside the dialog as `<p role="alert">` — the dialog stays open so the user can dismiss or retry. Cancel button is `disabled` + `aria-disabled` only when `status === 'canceled'`; `'lost'` bets remain cancellable per the spec note (API refunds the stake).

#### Task 5.5 — Index route — dashboard

- **What:** Created [src/routes/_authenticated/index.tsx](src/routes/_authenticated/index.tsx) — the `/` dashboard with a balance card, the place-bet form, a "recent bets" summary (top 5), and a "recent transactions" summary (top 5), linked to the full list pages.
- **Why:** The landing page after login, as required by [docs/prd.md](docs/prd.md). Combining balance, betting, and recent activity in one view gives users a complete picture without navigating away.
- **How:** `RecentBets` and `RecentTransactions` query with `queryKey: ['my-bets', { page: 1, limit: 5 }]` / `['my-transactions', { page: 1, limit: 5 }]`. Because `PlaceBetForm` calls `queryClient.invalidateQueries({ queryKey: ['my-bets'] })` on success (partial key match), both summary queries are automatically invalidated and refetched after every bet — no wiring needed. Layout is a two-column grid on desktop (`md:grid-cols-2` for the top row, `lg:grid-cols-2` for summaries) and stacked on mobile.

### Phase 6 — Polish & Validation

#### Task 6.1 — Global API error surface

- **What:** Audited all mutation surfaces and applied consistent inline error rendering. The two surfaces needing changes were [src/features/bets/components/PlaceBetForm.tsx](src/features/bets/components/PlaceBetForm.tsx) and `CancelBetButton` in [src/routes/_authenticated/bets.tsx](src/routes/_authenticated/bets.tsx).
- **Why:** The spec requires every mutation surface to show API errors inline as `<p role="alert">` — either above the relevant form or below the relevant button. More importantly, 401 responses must not render a stray error message: `api.ts` calls `logout()` on 401, which causes the `_authenticated` guard to redirect, so surfacing the error string too would flash a confusing red message before the redirect clears the page.
- **How:** Added an `isApiError(err) && err.status === 401` guard to both handlers — early-return without setting error state on 401s. Moved the `apiError` `<p role="alert">` in `PlaceBetForm` from between the input and the submit button to below the submit button (satisfying "below the relevant button"). `CancelBetButton`'s error already rendered inside the dialog above the action buttons — retained that position as the natural placement for dialog-level feedback. Login and register forms deliberately do NOT filter 401 — a 401 from `POST /login` means invalid credentials and must be shown.

#### Task 6.3 — Loading + empty states

- **What:** Created [src/components/ui/QueryErrorCard.tsx](src/components/ui/QueryErrorCard.tsx) — a unified error card component with an icon, message, and optional "Try again" retry button. Replaced the private inline `ErrorState`/`SectionError` components in [bets.tsx](src/routes/_authenticated/bets.tsx), [transactions.tsx](src/routes/_authenticated/transactions.tsx), and [index.tsx](src/routes/_authenticated/index.tsx) with `QueryErrorCard`, wiring in the `refetch` function from `useQuery` as the retry handler. Updated `SkeletonRows` in both list pages to render a real table skeleton on `md+` (`hidden md:block`) and a card skeleton on mobile (`md:hidden`), matching the actual responsive layout. Updated all empty states: the bets and transactions list pages now distinguish between "no data at all" (shows a coin/clipboard icon, heading, subtext, and a "Place a bet" CTA link to `/`) and "no results matching active filters" (shows a minimal "No X match your filters." message). Dashboard section empty states are updated with friendlier copy referencing the form above.
- **Why:** Slow networks must never show a blank screen ([docs/prd.md](docs/prd.md)); new accounts must see actionable guidance instead of empty tables. The unified `QueryErrorCard` removes three copies of the same error-display pattern and adds a retry action the per-page inline versions lacked.
- **How:** The skeleton uses `hidden md:block` / `md:hidden` breakpoints matching the real table/card toggle so the loading state is visually consistent with the loaded state. `hasFilters` is computed from the search params (`status !== undefined || !!id` for bets; `type !== undefined || !!id` for transactions) to choose the right empty state variant. `refetch` from TanStack Query v5 is assignable to `() => void` (optional args, return value ignored) so it passes directly as `onRetry`.

#### Task 6.4 — A11y pass

- **What:** Applied accessibility fixes across [src/routes/_authenticated/bets.tsx](src/routes/_authenticated/bets.tsx), [src/components/AppShell.tsx](src/components/AppShell.tsx), [src/routes/_authenticated/transactions.tsx](src/routes/_authenticated/transactions.tsx), and [src/routes/_authenticated/index.tsx](src/routes/_authenticated/index.tsx).
- **Why:** Lighthouse a11y score target is ≥ 95 on every route. The two main failure categories were missing ARIA attributes on the cancel-bet dialog and color-contrast violations from `text-gray-400` (#9ca3af, 2.54:1 contrast) used for visible text content on white backgrounds — below WCAG AA's 4.5:1 threshold for small text.
- **How:**
  - **Dialog:** Added `aria-modal="true"` and `aria-labelledby` (pointing to a new `id` on the heading) to the `<dialog>` element in `CancelBetButton`. Added `autoFocus` to "Keep bet" so the initial focus lands inside the dialog immediately on open. Native `<dialog>` + `showModal()` already provides focus trapping; these attributes make the modal semantics visible to screen readers.
  - **Balance live region:** Added `aria-live="polite" aria-atomic="true"` to the balance span in `AppShell` so screen readers announce balance changes after bets and cancellations without interrupting the user.
  - **Color contrast:** Replaced `text-gray-400` with `text-gray-500` (#6b7280, 4.77:1) in all visible text: date labels in mobile cards (bets and transactions), "Balance" label in the dashboard balance card, and summary table header rows in `index.tsx`.

#### Task 6.2 — Responsive layout pass

- **What:** Responsive fixes across [src/components/AppShell.tsx](src/components/AppShell.tsx), [src/routes/_authenticated/index.tsx](src/routes/_authenticated/index.tsx), [src/routes/_authenticated/bets.tsx](src/routes/_authenticated/bets.tsx), and [src/routes/_authenticated/transactions.tsx](src/routes/_authenticated/transactions.tsx).
- **Why:** Audit at 360px surfaced three categories of overflow: long user names in the header, fixed-width skeleton rows exceeding the viewport, and multi-column summary tables on the dashboard that couldn't safely fit in ~296px of usable content width.
- **How:**
  - Header: `min-w-0 truncate` on the user name, `shrink-0` on the balance+logout cluster, "Balance:" label hidden below `sm` so the euro amount fits alongside Logout at 360px.
  - Dashboard recent sections (`RecentBets`, `RecentTransactions`): added `BetMiniCard` and `TxMiniCard` card components (shown `md:hidden`) alongside the existing `hidden md:block` tables, removing the horizontal scroll that `overflow-x-auto` masked on mobile.
  - Skeleton loaders: replaced fixed-width flex rows (aggregate ~450px) with a card-shaped skeleton using `flex-1` for the middle stripe — works at any viewport width.
  - Filter ID inputs on bets/transactions pages: changed from `w-52` (fixed 208px) to `flex-1 min-w-0 sm:w-52 sm:flex-none` so the input grows to fill the available row width on narrow screens.

