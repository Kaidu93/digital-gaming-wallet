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
