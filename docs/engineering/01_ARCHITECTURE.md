# 01 — Architecture

**Project:** DEERAH / Real Estate CRM  
**Stack:** Next.js 16 App Router · React 19 · Supabase · next-intl · Zod · Tailwind 4  
**Audience:** Senior engineers joining the codebase

---

## Overall architecture

This is a **multi-tenant B2B SaaS** for Saudi real-estate agencies.

```
┌─────────────┐     HTTPS      ┌──────────────────────────────┐
│ Browser     │◄──────────────►│ Vercel (Next.js App Router)  │
│ + SW /sw.js │                │  RSC · Server Actions · MW   │
└─────────────┘                └──────────────┬───────────────┘
                                              │
                     ┌────────────────────────┼────────────────────────┐
                     ▼                        ▼                        ▼
              Supabase Auth            Supabase Postgres         Supabase Storage
              (sessions)               (RLS + private_schema)    (property_media,
                                                                  company_logos)
                                              │
                                              ▼
                                       Web Push (VAPID)
```

There are **no REST Route Handlers** under `src/app/api`. Mutations and most reads used by interactive UI go through **Server Actions** (`"use server"`). Pages are primarily **React Server Components** that call `src/lib/data/*`.

Three runtime personas:

| Role | Surface |
|------|---------|
| `super_admin` | `/[locale]/super-admin/*` — SaaS control plane |
| `admin` | Tenant dashboard + admin/reports/settings |
| `agent` | Tenant dashboard (listings, search, requests) |

---

## Why this structure

1. **Tenant isolation is a product requirement** — every core table has `company_id`; RLS helpers live in `private_schema` as `SECURITY DEFINER` functions to avoid recursive policy checks on `users`.
2. **Confidential owner PII must not leak into market search** — `properties` (public listing) is strictly separated from `property_owners` (confidential). Workspace rule and UI both enforce this.
3. **Arabic-first product** — `next-intl` with `localePrefix: "always"` and default locale `ar`.
4. **Schema changes are migration-first** — app code must not invent columns without SQL.
5. **Server Actions over API routes** — colocated with forms, typed with Zod, cookie session via `@supabase/ssr`.

---

## Folder philosophy

| Layer | Location | May contain business rules? |
|-------|----------|----------------------------|
| Routes / layouts | `src/app/` | Thin: auth gates, data fetch, compose UI |
| Mutations | `src/actions/` | Yes — validation, quotas, side effects |
| Read models | `src/lib/data/` | Query shaping only; ACL usually at caller |
| Domain constants | `src/lib/constants/` | Canonical keys, city lists, field visibility |
| Schemas/types | `src/types/` | Zod + TS; some refinements call constants |
| Presentational UI | `src/components/` | Prefer presentational; call actions from clients |
| Primitives | `src/components/ui/` | Design system only — no domain logic |

---

## Runtime flow

### Request (page load)

1. Edge/middleware (`src/middleware.ts`): refresh Supabase session cookies → next-intl locale routing → protect dashboard/super-admin → inactive company sign-out → role redirects.
2. Root / locale layouts: fonts, theme, i18n messages.
3. Segment layouts: `getCurrentUser()`, bounce wrong roles.
4. Page RSC: call `lib/data/*` → render server HTML → hydrate client islands (forms, charts, cards).

### Mutation (example: add property)

1. Client form validates with Zod (RHF).
2. Client may upload images via browser Supabase client + compression.
3. Server Action re-validates, checks auth + quota, inserts `properties` then `property_owners`, fans out notifications/push, `revalidatePath`, redirects.
4. Never swallow `redirect()` — rethrow `isRedirectError`.

### Auth session

- Browser / Server / Middleware clients all use `@supabase/ssr`.
- Service role (`createAdminClient`) bypasses RLS for onboarding, notification fan-out, push subscription queries, some logo updates, public packages.

---

## Client vs Server responsibilities

### Server (RSC + Actions + Middleware)

- Session verification (`getUser`)
- Tenant/role gates
- Writes to Postgres under RLS (or service role when intentional)
- Fan-out notifications / Web Push send
- Path revalidation
- Redirects

### Client

- Interactive forms (RHF)
- Image compression & upload to Storage
- Push subscription UX + Service Worker registration
- Charts, dialogs, filters (URL search params)
- Toasts (`sonner`)

### Must never run on the client

- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PRIVATE_KEY`
- Modules under `src/lib/supabase/admin.ts` and push senders that use private VAPID

---

## Data-flow diagram (conceptual)

```
UI Form / Page
    │
    ├─(read)──► lib/data/* ──► createClient(server) ──► Postgres (RLS)
    │
    └─(write)─► actions/* ──► Zod
                    │
                    ├─► Postgres (user JWT)
                    ├─► createAdminClient (fan-out / platform)
                    ├─► web-push
                    └─► revalidatePath / redirectTo
```

---

## Related docs

- Folder details → `02_FOLDER_STRUCTURE.md`
- Schema/RLS → `03_DATABASE.md`
- Actions inventory → `04_SERVER_ACTIONS.md`
- Decision history → `11_ARCHITECTURE_DECISIONS.md`
