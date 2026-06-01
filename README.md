# Digital Gaming Wallet

A single-page React application for managing a gaming wallet — place bets, track transactions, view bet history, and cancel pending bets. Built against the provided mock API with a focus on type safety, accessibility, and clean UX.

---

## Prerequisites

- **Node.js 20+**
- **npm 10+** (ships with Node 20)
- The [mock API](https://github.com/MantasBuga/mock-api) running locally on port `3000`

---

## Setup

### 1 — Start the mock API

```bash
git clone https://github.com/MantasBuga/mock-api.git
cd mock-api
npm install
node api.js          # listens on http://localhost:3000
```

The mock API stores all data in memory. Data is lost when the process stops.

### 2 — Configure the frontend

```bash
cd digital-gaming-wallet
cp .env.example .env
```

The defaults in `.env.example` work out of the box with the mock API on `:3000` — no edits required for local development.

### 3 — Install and run

```bash
npm install
npm run dev          # Vite dev server at http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) and register an account to get started.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | Base path for all API requests. The Vite dev proxy strips `/api` and forwards to `http://localhost:3000`. In production, point this at a CORS-enabled API origin — no app-code changes required. |

Both variables are validated at app startup via a Zod schema in `src/lib/env.ts`. A missing required variable throws a descriptive error before any component mounts.

---

## Features

### Core requirements

- [x] **User registration** — name, email, password (min 8 chars), confirm password. Inline field validation via Zod. Auto-login after successful registration.
- [x] **User login** — email + password; session token persisted to `localStorage`.
- [x] **Balance display** — shown in the header at all times; updates immediately after every bet or cancellation. Persisted across refresh via the auth store.
- [x] **Place a bet** — amount input with inline validation (min €1, max current balance). Inline win/loss result banner on response. No page reload.
- [x] **Bet history** — paginated table (desktop) / card list (mobile) with status badges. Filter by status and bet ID via URL search params.
- [x] **Cancel a bet** — confirmation dialog; balance updates immediately on success. Cancel button disabled for already-cancelled bets.
- [x] **Transaction history** — paginated list with type badges and amount column. Filter by type and transaction ID.
- [x] **Dashboard** — balance card, place-bet form, recent bets (top 5), recent transactions (top 5) on a single screen.
- [x] **Persistent auth** — token + user info survive page refresh; unauthenticated routes redirect to `/login`.
- [x] **Inline error messages** — API errors rendered adjacent to the form/button that triggered them; 401 responses log the user out silently.
- [x] **Responsive layout** — no horizontal scroll at 360px; tables convert to card lists on mobile.
- [x] **Loading and empty states** — skeleton loaders on all lists; empty-state guidance with CTA for new accounts; unified query error card with retry.

### Bonus features

- [x] **Dark / light theme** — toggleable via header button; persists to `localStorage`; respects `prefers-color-scheme` on first visit; no flash-of-wrong-theme (inline script in `index.html` applies the class before React mounts).
- [x] **Internationalisation (EN / LT)** — full Lithuanian translation across all routes; language switcher in the header; detected from browser language on first visit; `formatEuro` and date formatting follow the active locale.
- [x] **Framer Motion animations** — route transition fade, balance count-up tween, win/loss result reveal (spring scale / shake), staggered list-item enters. All disabled when `prefers-reduced-motion: reduce` is set.
- [ ] **WebSocket real-time balance** — not implemented. The mock API is a plain Express application with no WebSocket support; the upgrade handshake fails at the browser. See [Known limitations](#known-limitations) and `README-implementation.md` (task 7.4) for full details and what both sides would need.

---

## Technical decisions

### Zustand over React Context for auth state

`logout()` must be callable inside the `fetch` wrapper (`src/lib/api.ts`) on every 401 response — outside the React component tree. `useContext` cannot be called outside a component; Zustand's `useAuth.getState()` can. Replacing Zustand here would require a workaround (event emitter, singleton ref, or threaded callback) that is more complex, not less. A secondary benefit: balance updates (which fire on every bet) only re-render components subscribed to `balance`, not the entire tree.

### `localStorage` token storage

Simpler than `httpOnly` cookies for a development/assessment context. Acknowledged tradeoff: `localStorage` is accessible to JavaScript and therefore vulnerable to XSS. In production, prefer `httpOnly` session cookies managed by the server.

### Client-only balance state

No `GET /balance` endpoint exists in the mock API. Balance is seeded by the `POST /login` response and updated from every `POST /bet` and `DELETE /my-bet/:id` response. No polling is required; the Zustand store is the single source of truth, updated directly on each mutation response.

### WebSocket not implemented

The mock API (`api.js`) is a plain Express application with no `ws` dependency and no HTTP upgrade handler. A `new WebSocket('ws://localhost:3000')` attempt from the browser would fail at the handshake. Since modifying the mock API was out of scope, a functional WebSocket integration was not possible. Balance remains accurate via the mutation-response update mechanism described above. See `README-implementation.md` (task 7.4) for the exact changes each side would need.

### File-based routing with a single `beforeLoad` guard

TanStack Router's file-based routing places `_authenticated.tsx` as a pathless layout route. A single `beforeLoad` in that file enforces authentication for every child route (`/`, `/bets`, `/transactions`). No per-route guard duplication; adding a new authenticated route is just adding a file under `_authenticated/`.

### Zod at every API boundary

Every API response is schema-parsed via `src/lib/zodFetch.ts` before touching application state. Contract drift (wrong type, missing field, renamed enum value) surfaces immediately as a `ZodParseError` rather than propagating silently as `undefined` or causing a runtime crash downstream.

---

## Commands

```bash
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # TypeScript check + production build
npm test         # Vitest unit tests
npm run lint     # ESLint
npm run preview  # Preview production build locally
```

---

## Known limitations

- **Mock API in-memory store** — all registered users, bets, and transactions are lost when the `node api.js` process stops.
- **Stale balance on refresh** — balance is restored from `localStorage` on page load. It reflects the last mutation response, not the live server value, until the next bet or cancellation.
- **No token expiry or refresh** — a 401 response immediately logs the user out. There is no silent token refresh.
- **WebSocket real-time balance not implemented** — the mock API does not support WebSocket connections. See above and `README-implementation.md` task 7.4 for the full rationale.
- **CORS via dev proxy** — the mock API has no CORS headers, so direct browser requests from `:5173` to `:3000` are blocked. The Vite proxy (`/api` → `http://localhost:3000`) resolves this for local development. Production deployment requires a CORS-enabled API origin or a reverse proxy — no app-code changes are needed.

---

## Implementation log

Per-task implementation notes (what was built, why, and how) are in [README-implementation.md](README-implementation.md).
