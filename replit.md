# CSC Smart Toolkit

An offline-first toolkit for CSC (Common Service Centre) & Cyber Cafe workers. Offers photo tools, PDF utilities, QR/barcode generation, Aadhaar/PAN document services, and more — all running 100% offline.

## Architecture

This is a **pnpm monorepo** located under `Offline-Smart-Toolkit/`.

| Package | Path | Description |
|---|---|---|
| `@workspace/mobile` | `artifacts/mobile` | Expo React Native app (iOS/Android/Web) |
| `@workspace/api-server` | `artifacts/api-server` | Express 5 API server (pre-compiled to `dist/`) |
| `@workspace/mockup-sandbox` | `artifacts/mockup-sandbox` | Vite UI component sandbox |
| `@workspace/api-client-react` | `lib/api-client-react` | Shared API client with React Query |
| `@workspace/api-zod` | `lib/api-zod` | Shared Zod schemas |
| `@workspace/db` | `lib/db` | Drizzle ORM database layer (PostgreSQL) |

## How to Run

**Development (web preview):**
```
cd Offline-Smart-Toolkit/artifacts/mobile
pnpm exec expo start --web --port 5000
```
This is configured as the default "Start application" workflow.

**API server** (needs `DATABASE_URL`):
```
cd Offline-Smart-Toolkit/artifacts/api-server
node dist/index.mjs
```

**Mockup sandbox:**
```
cd Offline-Smart-Toolkit/artifacts/mockup-sandbox
pnpm run dev
```

## Package Manager

**pnpm** (v10). Always run commands from within `Offline-Smart-Toolkit/` or use the `--filter` flag:
```
cd Offline-Smart-Toolkit && pnpm install
```

## Restored Files

When imported from zip, these files were missing and were reconstructed:

- `package.json` files for all workspace packages
- `artifacts/mobile/app.json` — Expo config
- `artifacts/mobile/tsconfig.json` — TypeScript config
- `artifacts/mobile/babel.config.js` — Babel config
- `artifacts/mobile/app/_layout.tsx` — Root Expo Router layout
- `artifacts/mobile/app/(tabs)/_layout.tsx` — Tab bar layout
- `artifacts/mobile/context/ThemeContext.tsx` — Dark/light theme
- `artifacts/mobile/context/DrawerContext.tsx` — Side drawer
- `artifacts/mobile/hooks/useColors.ts` — Design tokens
- `artifacts/mobile/components/StatCard.tsx`
- `artifacts/mobile/components/QuickAccessCard.tsx`
- `artifacts/mobile/components/ToolCard.tsx`
- `artifacts/mobile/components/SectionTitle.tsx`
- `lib/api-client-react/src/index.ts`
- `lib/api-zod/src/index.ts`
- `lib/db/src/index.ts`

## User Preferences

- Keep existing project structure — do not rename or move source files
- Use pnpm as the package manager for all installs
