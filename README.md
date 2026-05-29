# Digital Gaming Wallet

## Implementation notes

### Phase 1 — Foundation

#### Task 1.1 — Configure Tailwind v4 + Vite plugin

- **What:** Added `@tailwindcss/vite` plugin to [vite.config.ts](vite.config.ts); added `@import "tailwindcss";` to [src/index.css](src/index.css); added a `bg-red-500` test class to [src/App.tsx](src/App.tsx).
- **Why:** Tailwind v4 ships as a Vite-native plugin — no PostCSS config or `tailwind.config.js` required. All packages (`tailwindcss`, `@tailwindcss/vite`, `cva`, `clsx`, `tailwind-merge`) were already installed; this task wired them into the build pipeline.
- **How:** The plugin is placed before `react()` in the Vite plugin array so CSS transforms run first.
