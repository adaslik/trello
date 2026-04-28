# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint via next lint
```

No test suite is configured.

## Architecture

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase · dnd-kit · react-hot-toast

### Supabase client split

Two separate Supabase client factories exist to satisfy Next.js App Router constraints:

- `src/lib/supabase.ts` — `createBrowserClient()` for Client Components and hooks
- `src/lib/supabase-server.ts` — `createServerClient()` for Server Components, `createRouteClient()` for route handlers (has `'server-only'` guard)

Always use `createBrowserClient()` inside `'use client'` files; never import `supabase-server` from client code.

### Auth flow

`AuthProvider` (`src/hooks/useAuth.tsx`) is mounted at the root layout and exposes `{ user, profile, session, loading, signOut }` via context. It fetches the Supabase `profiles` row after auth resolves. `src/app/page.tsx` gates the whole app — unauthenticated users see `LoginPage`, authenticated users see `Dashboard`.

OAuth callback is handled at `src/app/auth/callback/route.ts` which exchanges the code for a session and redirects to `/`.

New user profiles are auto-created by the `handle_new_user` Postgres trigger in `supabase/migrations/001_initial_schema.sql`.

### Data hooks

All data fetching is encapsulated in three hooks (all `'use client'`):

- `useWorkspaces` — fetches workspaces the current user can access, manages per-workspace label seeding (10 default labels seeded on first load if none exist)
- `useTasks(workspaceId)` — fetches tasks for the active workspace and maintains a **Supabase Realtime** subscription (`tasks:{workspaceId}` channel) for INSERT/UPDATE/DELETE events; shows toast on foreign inserts
- `useAuth` — described above

### Role & access model

Five roles: `yk_baskani` · `yk_uyesi` · `komisyon_baskani` · `calisan` · `temsilci`

Access is enforced at two layers:
1. **Client** — `canAccessWorkspace` / `canEditWorkspace` helpers in `src/lib/constants.ts`
2. **Database** — Row Level Security policies on all tables via the `can_access_workspace(ws_id)` Postgres function; `yk_baskani` has unrestricted access

`yk_baskani` is the only role that can delete workspaces. `yk_baskani`/`yk_uyesi` can insert/update workspaces.

### Views

The Dashboard (`src/views/Dashboard.tsx`) renders one of three views depending on the selected mode:

- **Kanban** (`src/components/Board/KanbanBoard.tsx`) — columns map to `TaskStatus` values; drag-and-drop via dnd-kit
- **Gantt** (`src/components/Gantt/GanttView.tsx`) — timeline based on `start_date`/`end_date`
- **Calendar** (`src/components/Calendar/CalendarView.tsx`) — tasks plotted by date

### Domain language (Turkish)

All status and priority values are stored in Turkish slugs — use the constants, never hardcode strings:

- `TaskStatus`: `bekleyen` · `devam_ediyor` · `incelemede` · `tamamlandi`
- `Priority`: `dusuk` · `orta` · `yuksek` · `acil`
- Display labels are in `STATUS_LABELS` / `PRIORITY_LABELS` / `ROLE_LABELS` in `src/lib/constants.ts`

### Database schema

Single migration file: `supabase/migrations/001_initial_schema.sql`. Tables: `profiles`, `workspaces`, `labels`, `tasks`, `notifications`. Realtime is enabled on `tasks`, `notifications`, `workspaces`. To apply: paste into Supabase SQL Editor → Run.

To seed default workspaces, uncomment the `SEED` block at the bottom of the migration and replace `<ADMIN_USER_ID>` with the admin user's UUID.

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Copy `.env.local.example` → `.env.local` and fill in values from Supabase Dashboard → Settings → API.
