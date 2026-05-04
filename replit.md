# Workspace

## Overview

Digital Meeting Minutes manager — a clean, professional web app for capturing, searching, and revisiting meeting records. Notion-meets-Linear feel, full CRUD, dashboard with summary stats, search/filter, tag breakdown, PDF export, and dark mode.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite, wouter, TanStack Query, Tailwind v4, Radix/shadcn UI, react-hook-form + zod
- **API framework**: Express 5
- **Database**: Firebase Firestore (via `firebase-admin`)
- **Validation**: Zod (`zod/v4`)
- **API codegen**: Orval (from OpenAPI spec → `lib/api-zod`, `lib/api-client-react`)
- **Build**: esbuild (ESM bundle)

## Artifacts

- `artifacts/minutes` — Meeting Minutes web app (`/`)
- `artifacts/api-server` — shared Express API (`/api`)
- `artifacts/mockup-sandbox` — design canvas (`/__mockup`)

## Shared Libraries

- `lib/api-spec` — OpenAPI spec (`openapi.yaml`); run `pnpm --filter @workspace/api-spec run codegen` to regenerate
- `lib/api-zod` — Generated Zod schemas from OpenAPI spec
- `lib/api-client-react` — Generated TanStack Query hooks from OpenAPI spec

## Firebase / Firestore

- Credentials are stored as secrets: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- Firebase initialisation + Firestore client: `artifacts/api-server/src/lib/firebase.ts`
- Meetings are stored in the `meetings` Firestore collection with numeric string document IDs (`"1"`, `"2"`, …)
- Auto-increment ID counter is stored in `_meta/idCounter` document

## Data Migration

- `scripts/src/migrate-to-firestore.ts` — one-time migration script; reads PostgreSQL (via `DATABASE_URL`) and writes to Firestore. Also falls back to seeding sample data if PostgreSQL is empty.
- Run: `pnpm --filter @workspace/scripts run migrate-to-firestore`

## API Endpoints

- `GET /api/healthz`
- `GET /api/meetings` (search, tag query params)
- `POST /api/meetings`
- `GET /api/meetings/:id`
- `PATCH /api/meetings/:id`
- `DELETE /api/meetings/:id`
- `GET /api/meetings/stats/summary`
- `GET /api/meetings/stats/recent`
- `GET /api/meetings/stats/tags`
- `GET /api/meetings/stats/upcoming`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
