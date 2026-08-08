# 02 — Folder Structure

---

## Root

| Path | Purpose |
|------|---------|
| `src/` | Application source |
| `supabase/migrations/` | Ordered SQL migrations (source of truth for schema) |
| `messages/` | `ar.json` / `en.json` i18n catalogs |
| `public/` | Static assets + `sw.js` (Web Push service worker) |
| `docs/engineering/` | This documentation pack |
| `.cursorrules` | Non-negotiable product/architecture rules for agents |
| `AGENTS.md` | Next.js version caveat for AI agents |
| `PROJECT_HANDOFF_REPORT.md` | Earlier full handoff (broader than this pack) |

---

## `src/app/`

**Purpose:** Next.js App Router — routes, layouts, metadata.  
**Responsibility:** Compose pages; call data loaders; enforce layout-level auth.  
**Must not:** Heavy business logic, direct service-role usage, large forms (delegate to `components/`).

| Area | Notes |
|------|-------|
| `app/layout.tsx`, `globals.css` | Root HTML shell, CSS variables |
| `app/[locale]/` | All user-facing routes; locale always prefixed |
| `app/[locale]/login/actions.ts` | Login Server Action (colocated; exception to `src/actions/`) |
| `dashboard/` | Tenant workspace |
| `super-admin/` | SaaS control plane |

---

## `src/actions/`

**Purpose:** Server Actions — mutations and some authenticated reads.  
**Responsibility:** Zod validation, auth checks, DB writes, side effects.  
**Dependencies:** `lib/supabase/*`, `types/*`, `lib/data` rarely, push/notifications.  
**Files:** `property`, `property-status`, `request`, `auth`, `admin-users`, `companies`, `company-settings`, `packages`, `settings`, `notifications`, `push-subscriptions`, `reports`, `analytics`.

---

## `src/lib/`

| Subfolder | Purpose | Business logic? |
|-----------|---------|-----------------|
| `lib/data/` | Read models for RSC/pages | Query shaping only |
| `lib/auth/` | Super-admin guards, company active check, username→email | Auth helpers |
| `lib/supabase/` | Clients + storage uploads | Infra |
| `lib/constants/` | Property types, Eastern cities | Domain constants |
| `lib/push/` | Browser subscribe + server broadcast | Push domain |
| Root utils | `cn`, listing date, property labels, quota, nav | Shared helpers |

**Should not contain:** JSX pages, raw SQL migrations.

---

## `src/components/`

| Subfolder | Purpose |
|-----------|---------|
| `ui/` | shadcn/Radix primitives — **no domain logic** |
| `dashboard/` | Tenant shell + forms + analytics |
| `properties/` | Cards + search filters |
| `requests/` | Request dialog/card |
| `admin/` | Team management UI |
| `super-admin/` | Platform UI |
| `landing/` | Marketing sections |
| `auth/` | Login form |
| Root | Notifications, push manager, theme, language |

**Prefer:** Presentational components that receive data/props and call actions.

---

## `src/types/`

Zod schemas + inferred TS types. Some schemas import `lib/constants` for refinements (known coupling — see smells).

---

## `src/hooks/`

Currently only `use-property-labels.ts` (i18n wrappers for type/offer/status/price).

---

## `src/i18n/`

`routing.ts`, `request.ts`, `navigation.ts` (locale Link/router), `server-redirect.ts`.

---

## `src/middleware.ts`

Single middleware entry: session + i18n + route/role/company gates. Matcher excludes `sw.js`.

---

## `supabase/`

| Path | Purpose |
|------|---------|
| `migrations/` | Chronological SQL — **never edit old files; add new** |
| `config.toml` | Local Supabase CLI config |

---

## `messages/`

Parallel namespaces for AR/EN. Do not invent ad-hoc UI strings in components when a key exists.

---

## `public/`

Static files. `sw.js` must be served as JavaScript (middleware exclusion is mandatory).

---

## Folders that must never hold business logic

1. `src/components/ui/`
2. `public/` (except SW event handlers for push display)
3. `messages/` (copy only)
4. Empty/legacy migration stubs (do not resurrect)

---

## Dependency direction (allowed)

```
app → components → hooks/types/lib
app → actions → types/lib
app → lib/data → lib/supabase
actions → lib/supabase/admin (server only)
```

Avoid: `lib/constants` importing `types`, `data` importing `actions`, `ui` importing domain actions.
