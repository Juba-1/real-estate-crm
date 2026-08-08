# Real Estate CRM — Complete Technical Handoff Report

**Repository:** `real-estate-crm`  
**Remote (assumed from prior context):** `https://github.com/Juba-1/real-estate-crm`  
**Branch:** `main` (tracking `origin/main`)  
**Report generated for:** senior engineer / AI handoff who has never seen this codebase  
**Primary language of product UI:** Arabic (RTL-first), with English via `next-intl`  
**Default locale:** `ar` (`localePrefix: "always"` → URLs like `/ar/dashboard`)

> **Assumption labels:** Anything not proven by code is marked `ASSUMPTION:` or `UNKNOWN:`.  
> **Do not treat this as a summary.** This document is intended to be sufficient to continue development without opening the repo first — then verify against code.

---

# 1. Project Overview

## Purpose

Multi-tenant B2B SaaS CRM for Saudi real-estate agencies (مكاتب عقارية). Each tenant is a **company** (agency). Agents and office admins manage:

- Property listings (public specs vs confidential owner data)
- Internal client demand **requests** (wanted listings within the office)
- Team accounts, quotas, branding
- Reports and dashboards
- In-app notifications + browser Web Push

A **Super Admin** operates the SaaS control plane: onboard agencies, packages/quotas, activate/deactivate tenants, global settings.

## Business goals

- Replace informal WhatsApp / spreadsheet workflows for Eastern Province agencies.
- Strict **tenant isolation** (`company_id` on core tables).
- Separate **public listing data** from **confidential owner PII** (`properties` vs `property_owners`).
- Sell subscription packages with property/agent limits.
- Arabic-first luxury UI (Tajawal / navy-gold theme history; dark mode via `next-themes`).

## Target users

| Persona | Role in DB | Primary surfaces |
|---------|------------|------------------|
| Platform operator | `super_admin` | `/[locale]/super-admin/*` |
| Office manager | `admin` | Dashboard + admin/reports/settings |
| Real-estate agent | `agent` | Dashboard listings, requests, search |
| Anonymous visitor | — | Marketing landing `/[locale]` |

## Current development stage

- **Production-oriented SaaS** on Vercel + Supabase (from conversation/deploy history).
- Post–“Production Release” commit `2c5d631`, with follow-up fixes: ENUM flattening, platform growth chart, Web Push, intermediaries field, RLS hardening migration (untracked).
- **No automated request↔property matching engine** exists in code (despite “Matching” being a common CRM feature). Matching is human-driven via Internal Requests + Search.
- **No cron / background job runners** in-repo (no Inngest, no Supabase Edge Functions in repo, no `vercel.json` crons found). Request expiry is a **column** (`expires_at`) filtered at query time, not a scheduler.

---

# 2. Technology Stack

## Framework

| Layer | Choice |
|-------|--------|
| App framework | **Next.js `16.2.10`** (App Router, Turbopack build) |
| UI | **React `19.2.4`** |
| Language | TypeScript `^5` |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`), `tw-animate-css`, `tailwind-merge`, `class-variance-authority` |
| Components | shadcn-style + **Radix** (`radix-ui` package) |
| i18n | **next-intl `^4.13.1`** — locales `ar`, `en` |
| Forms | react-hook-form + `@hookform/resolvers` + **Zod `^4`** |
| Charts | **recharts** |
| Toasts | **sonner** |
| Themes | **next-themes** |
| Icons | **lucide-react** |
| Image compression | **browser-image-compression** (client-side) |
| Push | **web-push** + native Service Worker `public/sw.js` |
| Backend DB/Auth/Storage | **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) |

## Important libraries (behavioral notes)

- **No REST API routes** under `src/app/api` — mutations are **Server Actions** (`"use server"`).
- Supabase clients: browser (`createClient` from `lib/supabase/client`), server SSR cookies (`lib/supabase/server`), middleware session refresh (`lib/supabase/middleware`), service-role admin (`lib/supabase/admin` — never import in Client Components).
- Redirects must use project helper `redirectTo` from `@/i18n/server-redirect` and **rethrow** `isRedirectError` (workspace rule).

## Folder structure (high level)

```
real-estate-crm/
├── messages/                 # ar.json, en.json
├── public/                   # static assets + sw.js
├── src/
│   ├── actions/              # Server Actions
│   ├── app/                  # App Router (layouts, pages)
│   ├── components/           # UI by domain + shadcn ui/
│   ├── hooks/
│   ├── i18n/
│   ├── lib/                  # data, auth, supabase, push, constants
│   ├── middleware.ts
│   └── types/                # Zod schemas + TS types
├── supabase/
│   ├── config.toml
│   └── migrations/           # ordered SQL
├── package.json
├── next.config.ts
├── AGENTS.md / CLAUDE.md / .cursorrules
└── .env.local                # gitignored; local secrets
```

## Deployment

- **ASSUMPTION:** Production on **Vercel** (prior conversation confirms redeploys + env vars there).
- **ASSUMPTION:** Supabase hosted project for Auth, Postgres, Storage.
- Build command: `npm run build` / start: `npm start`.
- Next config is minimal: only `next-intl` plugin wrapping empty `NextConfig`.

## Environment variables (names only — never commit values)

| Variable | Where used | Purpose |
|----------|------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | client/server/middleware/admin | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | preferred public key | Anon/publishable |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | fallback if publishable missing | Legacy anon |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts` only | Bypass RLS (server) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | push client + server | Web Push public |
| `VAPID_PRIVATE_KEY` | `send-company-push.ts` | Web Push private |
| `VAPID_SUBJECT` | optional; default mailto | VAPID subject |

**No `.env.example` in repo** — new engineers must recreate from this table.

## External services

1. **Supabase Auth** — email/password; username mapped to synthetic email via `resolveAuthEmail`.
2. **Supabase Postgres** — multi-tenant schema + RLS.
3. **Supabase Storage** — buckets `property_media`, `company_logos` (both public read).
4. **Browser Push Services** (FCM / Mozilla / Apple via Web Push protocol) using VAPID.
5. **Vercel** (ASSUMPTION) — hosting + env + runtime logs for push debugging.

---

# 3. Complete Folder Structure

## Root docs / rules

| Path | Role |
|------|------|
| `.cursorrules` | Hard product rules: properties≠owners; RLS via `private_schema`; `company_id`; never swallow redirects; `@supabase/ssr`; migrations for schema |
| `AGENTS.md` | Next.js version differs from training data — read `node_modules/next/dist/docs/` |
| `CLAUDE.md` | `@AGENTS.md` |

## `src/app/`

| Path | Role |
|------|------|
| `layout.tsx` / `globals.css` / `favicon.ico` | Root shell, global CSS tokens |
| `[locale]/layout.tsx` | next-intl provider, fonts, theme |
| `[locale]/page.tsx` | Marketing landing; redirects logged-in users to dashboard/super-admin |
| `[locale]/login/` | Login page + `actions.ts` (`login`) |
| `[locale]/dashboard/` | Tenant workspace (agents + admins) |
| `[locale]/super-admin/` | SaaS control panel |

## `src/actions/`

All server mutations/reads exposed as Server Actions (see §7).

## `src/lib/`

| Path | Role |
|------|------|
| `supabase/*` | Clients + storage uploads |
| `auth/*` | super-admin guard, company active check, username→email |
| `data/*` | Read models for pages |
| `push/*` | Browser subscribe helpers + company broadcast |
| `constants/locations.ts` | Eastern Province cities + neighborhoods |
| `constants/property-types.ts` | Canonical English type keys + UI visibility helpers |
| `property-utils.ts` / `property-form-utils.ts` | Labels + edit form mapping |
| `quota.ts` | Quota exceeded sentinel |
| `dashboard-nav.ts` / `super-admin-nav.ts` | Nav item factories |
| `utils.ts` / `user-utils.ts` | `cn()`, initials |

## `src/components/`

Domain folders: `dashboard`, `properties`, `requests`, `admin`, `super-admin`, `landing`, `auth`, `ui` (primitives), plus global `notifications-dropdown`, `push-notification-manager`, `theme-*`, `language-switcher`.

## `src/types/`

Zod schemas and TS types for property, request, user, company, package, settings, reports, notifications, admin-user.

## `src/hooks/`

Only `use-property-labels.ts` — i18n wrappers for type/offer/status/price.

## `src/i18n/`

`routing.ts`, `request.ts`, `navigation.ts` (locale-aware Link/router), `server-redirect.ts`.

## `supabase/migrations/`

Ordered SQL history (see §4). **Untracked in git:** `20260711140000_scope_admin_rls_to_company.sql`.

## `public/sw.js`

Push service worker — must be served as JS (middleware matcher excludes `sw.js` to prevent next-intl HTML redirects).

## `messages/`

`ar.json`, `en.json` — parallel namespaces.

---

# 4. Database

## Schema design principles

1. Every core business table has `company_id`.
2. `properties` = public listing fields; `property_owners` = confidential owner PII (no join on public search cards).
3. RLS helpers live in schema **`private_schema`** as `SECURITY DEFINER` functions.
4. Most former Postgres ENUMs were **flattened to TEXT** (app validates with Zod). Remaining ENUM: **`user_role`**.

## `private_schema` functions

| Function | Returns | Behavior |
|----------|---------|----------|
| `get_auth_user()` | UUID | `auth.uid()` |
| `get_user_company_id()` | UUID | company of current user |
| `is_admin()` | boolean | role ∈ (`admin`,`super_admin`) |
| `is_super_admin()` | boolean | role = `super_admin` |
| `set_property_status_updated_at()` | trigger | bumps `status_updated_at` when `status` changes |

EXECUTE revoked from PUBLIC; granted to `authenticated`.

## Tables

### `companies`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT NOT NULL | |
| is_active | BOOLEAN DEFAULT true | Middleware signs out inactive tenants |
| created_at | TIMESTAMPTZ | Used by platform growth chart |
| max_properties | INTEGER NOT NULL DEFAULT 50 | Quota |
| max_agents | INTEGER NOT NULL DEFAULT 3 | Quota |
| package_id | UUID FK → packages ON DELETE SET NULL | |
| logo_url | TEXT | Public URL from `company_logos` |

**RLS:** view own company or super_admin; super_admin ALL; admins UPDATE branding for own company.

### `users`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | = `auth.users.id` |
| company_id | UUID NOT NULL FK | |
| role | user_role DEFAULT agent | |
| name | TEXT NOT NULL | |
| phone | TEXT | |
| created_at | TIMESTAMPTZ | |

**RLS:** colleagues same company (or super_admin); admins manage same-company users (or super_admin).

### `properties`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_id | UUID NOT NULL | |
| agent_id | UUID NOT NULL | Listing agent |
| type | TEXT NOT NULL | Canonical keys e.g. `villa` |
| offer_type | TEXT NOT NULL | `sale` \| `rent` |
| city, neighborhood | TEXT | neighborhood required |
| price, area | NUMERIC NOT NULL | |
| specs | JSONB DEFAULT `{}` | rooms, age, street_width, plan/plot, notes |
| images | TEXT[] | Public storage URLs |
| is_direct | BOOLEAN DEFAULT true | Direct with owner |
| status | TEXT DEFAULT available | available/pending/sold/rented |
| visibility | TEXT DEFAULT company_only | company_only \| global |
| general_notes | TEXT | Visible to company agents |
| created_at, status_updated_at | TIMESTAMPTZ | |
| custom_property_type | TEXT | When type=`other` |
| custom_neighborhood | TEXT | When neighborhood=`أخرى` |
| floors_count, apartments_count, shops_count | INTEGER CHECK >0 or null | Building types |
| has_annex | BOOLEAN | Villas |
| **intermediaries** | **TEXT** | **App writes this; migration may be missing — see §12** |

**Trigger:** `trg_property_status_updated_at`.

**RLS (intended final — after `20260711140000`):**
- SELECT: same company OR `visibility = 'global'`
- INSERT: same company AND agent = self
- ALL (update/delete): agent = self OR (**admin AND same company**)

### `property_owners`

Confidential. Columns: id, property_id, company_id, agent_id, owner_name, owner_phone, private_notes, created_at.

**RLS (intended final):** view/update/delete only agent-owner OR (admin AND same company); insert same company + agent self.

### `requests`

Internal demand posts. Columns: id, company_id, agent_id, type, offer_type, city, neighborhood (nullable), details, status (`active`/`executed`/`archived`), created_at, expires_at (default NOW()+14 days), custom_property_type, custom_neighborhood.

**RLS:** view same company; insert self; update/delete agent OR (admin AND same company).

### `packages`

SaaS plans: id, name, max_properties (>0), max_agents (>0), created_at. Seeded plans exist in migration. RLS: super_admin ALL only. Public landing reads via **admin client** (`getPublicPackages`).

### `notifications`

In-app bell feed: company_id, user_id, title, message, is_read, created_at. Indexes on user+created_at and unread. RLS: users SELECT/UPDATE own rows only. **INSERT via service role only** (`createCompanyNotification`).

### `system_settings`

key TEXT PK, value JSONB, updated_at. Seeds for platformName, supportEmail, defaultCurrency, maintenanceMode. RLS: super_admin ALL.

### `push_subscriptions`

id, user_id, company_id, endpoint, subscription JSONB, created_at, updated_at, UNIQUE(user_id, endpoint). RLS: manage own rows with matching company_id. Indexes on company_id and user_id.

## Storage (not SQL tables)

| Bucket | Public | Path convention |
|--------|--------|-----------------|
| `property_media` | yes | `{company_id}/{user_id}/{timestamp}-{file}` |
| `company_logos` | yes | `{company_id}/logo.{ext}` |

Policies were tightened in `20260704170000_secure_property_media_storage.sql`.

## Views

**None.**

## Indexes (explicit beyond PK/FK)

- notifications: `(user_id, created_at DESC)`, partial unread
- push_subscriptions: `company_id`, `user_id`

**No explicit indexes** on `properties(company_id)`, `properties(status)`, `requests(expires_at)` — performance concern (§15).

## Migration order (filenames)

1. Multiple early `init_real_estate_schema` variants exist in listing; canonical init used by later code is `20260702143817_init_real_estate_schema.sql` (earlier duplicates may be leftover — verify applied history on hosted DB).
2. Storage bucket + delete policy
3. Company quotas
4. Packages + package_id
5. Company logo + logos bucket
6. Expand property types (TEXT + Arabic remap historically)
7. Notifications
8. Secure property_media policies
9. System settings
10. Flatten enums → TEXT + normalize to English keys
11. Push subscriptions
12. **`20260711140000_scope_admin_rls_to_company.sql`** — company-scoped admin RLS (file present; **untracked in git**; must confirm applied on production)

---

# 5. Authentication

## Login flow

1. User submits email **or** username + password on `/[locale]/login`.
2. `resolveAuthEmail` (`lib/auth/username.ts`): if input lacks `@`, maps to `{username}@agency.local` (ASSUMPTION: this is the convention used when creating agents).
3. `supabase.auth.signInWithPassword`.
4. Load `users` profile; if company inactive → `signOut` + error `inactive_company`.
5. Redirect: `super_admin` → `/super-admin`, else `/dashboard`.
6. Catch: rethrow `isRedirectError`.

## Session handling

- Cookie-based SSR via `@supabase/ssr`.
- Middleware calls `updateSession` on matched routes to refresh cookies.
- Server Components/Actions use `createClient()` from `lib/supabase/server`.
- Browser uses `lib/supabase/client`.

## Roles

Stored in `public.users.role` as ENUM `user_role`: `super_admin` | `admin` | `agent`.

## Middleware (`src/middleware.ts`)

1. Skip heavy i18n for `/api` (session only).
2. Run next-intl routing.
3. Refresh Supabase session.
4. Protect `/dashboard`, `/super-admin`, `/admin` — unauthenticated → login.
5. Logged-in on login → post-login path.
6. Role fences between dashboard ↔ super-admin.
7. Inactive company on dashboard → sign out + login error.
8. Matcher **excludes** `sw.js` and static images (critical for Web Push).

## Logout

`actions/auth.ts` → `signOut` → `redirectTo("/login")`.

---

# 6. Authorization

## Matrix (application layer)

| Capability | super_admin | admin | agent |
|------------|-------------|-------|-------|
| SaaS overview / companies / packages / system settings | Yes | No | No |
| Tenant dashboard home | Redirected away | Yes | Yes |
| My properties / add / search / requests | No (wrong area) | Yes | Yes |
| Edit/delete own property | — | Yes | Yes |
| Edit/delete any company property | — | Yes (action + RLS after fix) | No |
| Change property status | — | **No via action** (agent_id scoped) | Own only |
| View confidential owners | — | Company-scoped (after RLS fix) | Own listings only |
| Admin panel (create users, roles, passwords) | Layout blocked | Yes | No |
| Reports export/print | No | Yes | No |
| Company logo settings | No | Yes | No |
| Manage requests UI buttons | — | Yes | Own only |
| `manageRequest` server ownership check | — | **Missing** (UI only) | **Missing** |

## Important nuances

- `is_admin()` DB helper includes **super_admin**. Super admins typically lack a normal tenant company context but may have `company_id` depending on how root was seeded — UNKNOWN for production seed.
- `requireCompanyAdmin` in admin-users allows admin|super_admin; `updateUserRole` and logo require **tenant admin only**.
- Property SELECT still allows `visibility = 'global'` across companies (product feature or latent cross-tenant read — intentional per init schema).

---

# 7. API Architecture

**There are no Next.js Route Handlers under `src/app/api`.** All mutations are Server Actions.

## Convention

- `"use server"` modules under `src/actions/` (+ login actions colocated).
- Prefer Zod `safeParse` at boundary.
- Return `{ error: string } | null` (or typed unions) for client toast handling.
- Use `revalidatePath` after mutations.
- Use `createAdminClient()` only when RLS cannot express the operation (onboarding, fan-out notifications, push subscription fan-out, logo update as coded, public packages).

## Inventory (condensed; full inputs/outputs in exploration)

### Auth / session
- `login` — FormData → redirect or error
- `logout` — redirect

### Properties
- `addProperty` — Zod insert; quota; owners insert; notification+push; redirect
- `updateProperty` — Zod update; owner/admin
- `deleteProperty` — owner/admin; notification
- `updatePropertyStatus` — agent-owned only; optional image purge

### Requests
- `addRequest` — Zod; notification+push
- `manageRequest` — renew/execute/archive (**auth only**)

### Tenant admin
- `createCompanyUser`, `deleteCompanyUser`, `updateUserPassword`, `updateUserRole`
- `updateCompanyLogo`

### Super admin
- `onboardNewTenant`, `updateCompany`, `resetTenantAdminPassword`, `deleteCompany`, `updateCompanyActiveStatus`
- `createPackage`, `updatePackage`, `deletePackage`
- `saveSystemSettings`

### Notifications / push
- `getUserNotifications`, `markNotificationAsRead`, `markAllAsRead`
- `createCompanyNotification` (internal; service role; swallows errors)
- `savePushSubscription`, `removePushSubscription`

### Analytics / reports
- `getTenantDashboardStats`
- `getAgentDetailedReports` (admin only)

## Security of actions

- Most rely on **Supabase session + RLS**.
- Several add **explicit company_id / role checks** in application code (property update/delete, admin users).
- Gaps: `manageRequest` lacks ownership; status action excludes admins; notification create is unauthenticated function but intended internal-only.

---

# 8. Business Logic

## Properties

- Create/update via `AddPropertyForm` (add + edit modes).
- Specs JSON for flexible fields; building/villa/land conditional UI via `property-types.ts` helpers.
- Status lifecycle: available → pending → sold/rented; sold may prompt image deletion to save storage.
- `is_direct`: when false, show `intermediaries` textarea.
- Images: client compress → upload → store public URLs in `images[]`.
- Quota: count company properties vs `companies.max_properties`.

## Owners

- Written to `property_owners` in same flow as property create/update.
- Shown only on **My Properties** card confidential section (agent) and edit form.
- Public search cards show **listing agent**, never owner.

## Requests

- Internal “wanted” posts with 14-day `expires_at`.
- List filters `status=active` and `expires_at > now()` in data layer.
- Renew extends +14 days and sets active; execute/archive update status.
- **No automatic matching** against properties.

## Matching

**Does not exist as an automated feature.** Agents manually browse Search and Requests.

## Notifications (in-app)

- Fan-out insert one row per company user on: new request, new property, property delete.
- Bell UI: `NotificationsDropdown` + mark read actions.

## Web Push

- User enables via header bell-ring button (`PushNotificationManager`).
- SW registered at `/sw.js`.
- Subscriptions stored in `push_subscriptions`.
- Broadcast: `sendCompanyPushNotification(companyId, excludeUserId, payload)` filters by company, excludes actor, uses web-push, prunes 410/404.
- Currently triggered from **addProperty** and **addRequest** only (not deleteProperty).

## Reports

- Admin-only page; `AgentReportsPanel` filters by agent; CSV export client-side; print/PDF via browser print CSS.

## Dashboard

- Agent vs admin cards: `agent-dashboard` / `admin-dashboard` / `tenant-analytics-dashboard`.
- Stats from `lib/data/analytics.ts` (type distribution, status distribution, agent performance).

## Packages & subscriptions

- Packages define max properties/agents.
- Onboarding copies limits onto company (custom overrides allowed in UI).
- Quotas enforced in create property / create agent actions.
- `is_active` is the subscription kill switch (not Stripe — **no payment provider in code**).

## Company onboarding

- Super admin dialog: create company + first admin auth user + profile; package selection; optional custom quotas; rollback on failure.

## Image upload / compression / storage

- `browser-image-compression`: max 0.5MB, max dimension 1920, web worker.
- Upload sequential with progress callback.
- Paths tenant-scoped; logo upsert at fixed path.

## Search & filters

- `SearchFilters` query params: city, type, offer_type, status.
- `getCompanyProperties` applies filters server-side; default status available.

## Exports

- Reports CSV only (client). No Excel library — CSV with Excel-friendly naming in UI copy.

---

# 9. Frontend

## Pages (`/[locale]/...`)

| Route | Audience | Content |
|-------|----------|---------|
| `/` | Public | Landing hero/features/pricing/footer |
| `/login` | Public | Login form |
| `/dashboard` | agent/admin | Role-specific analytics |
| `/dashboard/add` | agent/admin | Add property form |
| `/dashboard/my-properties` | agent/admin | Own listings + owners + status |
| `/dashboard/properties/[id]/edit` | agent/admin | Edit form (ownership not page-guarded tightly) |
| `/dashboard/search` | agent/admin | Company market search |
| `/dashboard/requests` | agent/admin | Internal requests |
| `/dashboard/admin` | admin | Team management |
| `/dashboard/reports` | admin | Detailed reports |
| `/dashboard/settings` | admin | Company logo |
| `/super-admin` | super_admin | Metrics + growth chart + recent tenants |
| `/super-admin/companies` | super_admin | Tenant CRUD |
| `/super-admin/packages` | super_admin | Package CRUD |
| `/super-admin/settings` | super_admin | System settings |

## Components (by domain)

- **Landing:** header/hero/features/pricing/footer
- **Dashboard shell:** header, sidebar, brand, theme toggle, language switcher, notifications, push manager
- **Properties:** form (large), property-card (confidential), public-property-card, search-filters
- **Requests:** dialog + card
- **Admin:** create agent dialog, team row actions
- **Super-admin:** company/package dialogs, toggles, charts, settings form
- **ui/**: shadcn primitives

## State management

- **No Redux/Zustand.** Server Components fetch data; Client Components use local `useState` + RHF.
- URL search params for filters.
- Theme via `next-themes`.

## Hooks

- `usePropertyLabels` — only shared domain hook.

## Forms & validation

- RHF + Zod schemas in `types/property.ts`, `types/request.ts`, company/package/admin schemas.
- Property types: **English keys** in Select `value`; Arabic/English labels via i18n.

## Translations

- `messages/ar.json`, `messages/en.json`.
- Namespaces: common, nav, fields, placeholders, properties.types, offers, status, addProperty, requests, admin, superAdmin, landing, pushNotifications, etc.

---

# 10. Backend

## Services / helpers

| Module | Responsibility |
|--------|----------------|
| `lib/supabase/admin.ts` | Service role client |
| `lib/push/send-company-push.ts` | Tenant-scoped Web Push broadcast |
| `lib/data/*` | Read aggregations |
| `lib/auth/*` | Guards |
| `actions/notifications.ts` | Fan-out in-app notifications |
| `lib/supabase/storage.ts` | Client upload (called from browser forms) |

## Cron / background jobs

**None in repository.**  
Request expiry is soft (filter by `expires_at`). Maintenance mode setting exists but **enforcement is UNKNOWN / incomplete** beyond storing the flag (middleware does not appear to block tenants on maintenanceMode — verify if needed).

## Server actions

See §7 — this is the entire “API”.

---

# 11. Security

## RLS

- Core pattern: helpers in `private_schema`.
- Critical fix migration scopes admin branches with `company_id = get_user_company_id()`.
- Historical bug: admin could act cross-tenant on properties/owners/requests before fix.
- Notifications have no authenticated INSERT (good).
- Packages/system_settings locked to super_admin.

## Middleware

Auth + role + inactive company + SW exclusion.

## Auth

Supabase Auth; synthetic emails for usernames; service role for admin user provisioning.

## Validation

Zod on most writes; TEXT columns no longer DB-enum constrained (app must stay strict).

## Secrets

- Service role and VAPID private must stay server-only.
- `NEXT_PUBLIC_*` is browser-visible by design.

## Service role usage

Used for: tenant onboarding, auth admin APIs, notification fan-out, push subscription queries, public packages, some company logo updates, stale push cleanup.

## Risks

1. **`intermediaries` column missing migration** → runtime insert failures.
2. **Untracked / unapplied RLS migration** → cross-tenant admin risk if not run.
3. **`manageRequest` without server ownership check**.
4. **`visibility=global`** cross-company SELECT.
5. **Public storage buckets** — URLs are guessable if leaked; path policies mitigate write but reads are public.
6. **Silent push/notification failures** hide ops issues.
7. **Edit page** may load another agent’s public fields within tenant without page-level ownership gate.
8. **No generated DB types** → schema drift not caught by TypeScript.

---

# 12. Current Problems

## Bugs / defects

1. **`properties.intermediaries` used in app without confirmed migration** — HIGH/CRITICAL until DB column exists.
2. **`usePropertyLabels` does not `normalizePropertyType`** — legacy Arabic type values display broken keys.
3. **List/search queries omit `custom_property_type`** — “other” shows generic label.
4. **Push click URLs lack locale prefix** (`/dashboard/...` vs `/ar/dashboard/...`).
5. **`npm run lint` fails** — react-hooks `set-state-in-effect` errors (theme-toggle, push manager, property-card) + unused vars.
6. **`getPushErrorStatusCode` unused** after refactor (lint warning).

## Workarounds / temporary solutions

1. ENUM flattened to TEXT after production crashes on Arabic labels.
2. Mock platform growth chart replaced with live aggregation.
3. Middleware excludes `sw.js` after i18n MIME failure.
4. Push errors logged but never fail parent business actions (by design, but masks outages).

## Technical debt

1. Duplicate early init migrations in folder listing — clarify which applied on hosted DB.
2. No `database.types.ts` from Supabase CLI.
3. No `.env.example`.
4. Middleware deprecation warning (Next wants `proxy`).
5. Console.log debug in push/property/request paths.
6. Reports “Excel” is CSV.
7. `maintenanceMode` setting may be non-enforcing.

## Intentionally postponed / missing product features

1. Automated property↔request matching.
2. Payment/billing (Stripe etc.).
3. Cron to archive expired requests.
4. Admin ability to change others’ property status via dedicated action.
5. Super-admin analytics beyond basic counts/growth.
6. Email notifications (only in-app + web push).

## Known limitations

1. Eastern Province cities only (`locations.ts`).
2. Quotas are soft application checks (not DB triggers).
3. Web Push requires HTTPS + user permission; unreliable if SW outdated on device.
4. Image compression is client-only; large batches sequential.

## Race conditions / edge cases

1. Quota check then insert — concurrent creates can exceed quota (no serializable lock).
2. Property create then owner insert — rollback deletes property if owner fails (good); concurrent deletes unconsidered.
3. Last admin demotion protected in `updateUserRole`; last admin delete paths need care.
4. Push: exclude actor means solo agent in company never “receives” their own create (expected).

## Security concerns

See §11 — especially RLS migration apply status and `manageRequest`.

---

# 13. TODO

## High Priority

1. Confirm/add SQL: `ALTER TABLE properties ADD COLUMN IF NOT EXISTS intermediaries TEXT;`
2. Commit + apply `20260711140000_scope_admin_rls_to_company.sql` on production.
3. Add server-side ownership checks to `manageRequest`.
4. Normalize types in `usePropertyLabels`; select `custom_property_type` in list queries.
5. Fix lint errors blocking CI if enabled.

## Medium Priority

1. Locale-aware push URLs.
2. Guard edit page with `canManageProperty`.
3. Enforce or remove `maintenanceMode`.
4. Index `properties(company_id, status)`, `requests(company_id, status, expires_at)`.
5. Generate Supabase TypeScript types.
6. Add `.env.example`.
7. Allow admin to update property status for company listings (product decision).

## Low Priority

1. Migrate middleware → Next `proxy` convention.
2. Remove debug `console.log` from push paths or gate behind env.
3. Deduplicate legacy init migration files in repo hygiene.
4. Automated matching suggestions.
5. Email/SMS notification channels.

---

# 14. Refactoring Opportunities

1. Extract shared “notify company (in-app + push)” helper used by property/request/delete.
2. Centralize authorization helpers (`requireAgent`, `requireTenantAdmin`, `assertSameCompany`).
3. Split `add-property-form.tsx` (1000+ lines) into section components.
4. Introduce generated DB types; stop hand-maintaining insert shapes.
5. Unify error result types across actions.
6. Replace CSV string building with a small export util.
7. Consider React Query only if client caching of notifications becomes hot (currently not used).
8. Align `FOR ALL` policies vs separate UPDATE/DELETE for clarity.
9. Move login actions under `src/actions/` for consistency.

---

# 15. Performance Review

## Database

- Add indexes on frequent filters: `properties(company_id, status, created_at DESC)`, `requests(company_id, status, expires_at)`, `properties(agent_id)`.
- Push broadcast loads all company subscriptions — fine at small tenant size; paginate later.
- Notification fan-out inserts N rows per event — OK for small offices; batch carefully at scale.

## Rendering

- Prefer Server Components already for pages; keep charts client-only.
- Property form is heavy client component — code-split if needed.
- Image previews use object URLs — already revoked on unmount.

## Caching

- `revalidatePath` used liberally; no `cacheTag` / PPR strategy yet.
- No Redis/CDN app cache beyond Vercel defaults.

## Storage

- Public buckets + CDN via Supabase; compression reduces upload size.

---

# 16. Git Status

## Recent commits (newest first)

```
9357a68 Feat: Add conditional intermediaries field for non-direct properties
ef3a35d Fix: Push notification silent failures and SW payload
d71b085 Fix: Exclude sw.js from middleware and fix push notifications
42565cb Feat: Native Web Push Notifications with Tenant Isolation
67ca0d4 Fix: Final schema update and frontend ENUM alignment
6468045 Fix: Global database schema mismatch and frontend ENUM alignment
85f8415 Fix: Replace mock data with real platform growth stats
2c5d631 Production Release (audit, security, UI)
9f7c495 Initial commit from Create Next App
```

## Working tree (at report time)

- Branch: `main` = `origin/main`
- **Untracked:** `supabase/migrations/20260711140000_scope_admin_rls_to_company.sql`
- No other modified tracked files in `git status` snapshot

## Stability classification

| Area | Status |
|------|--------|
| Core listings / requests / team / packages / onboarding | **Stable** (production release baseline) |
| ENUM→TEXT + English type keys | **Stable** after hotfix commits |
| Platform growth chart live data | **Stable** |
| Web Push | **Stabilizing** (worked for subscribe; delivery needed logging fixes) |
| Intermediaries field | **Experimental / incomplete** without DB column confirmation |
| Company-scoped admin RLS migration | **Ready but untracked/unverified on prod** |

---

# 17. Suggested Next Steps

1. **DB sync:** Apply `intermediaries` column + RLS scoping migration; verify with SQL editor.
2. **Commit** the RLS migration to git and redeploy.
3. **Hardening:** Fix `manageRequest` authorization; edit-page guard; label normalization.
4. **Observability:** Keep `[push]` logs until delivery proven; then reduce noise.
5. **Hygiene:** `.env.example`, generated types, lint clean for CI.
6. **Product:** Decide on matching engine, billing, and maintenance mode enforcement.
7. **Indexes** before tenant growth.

---

# 18. Overall Project Health

| Dimension | Score (1–10) | Why |
|-----------|--------------|-----|
| Architecture | **8** | Clear multi-tenant boundaries, Server Actions, separated public/confidential data, i18n-first App Router. Some policy/app-layer auth duplication. |
| Code Quality | **7** | Consistent patterns, Zod boundaries, good domain folders. Large forms, lint failures, debug logs, missing generated types. |
| Security | **6 → 8 after RLS applied** | Strong intent and helpers; historical admin RLS hole; public storage; action auth gaps; intermediaries schema drift. |
| Performance | **7** | Fine for SMB tenants; missing indexes and N-row notification inserts will hurt later. |
| Scalability | **6** | Works for many small agencies; no billing automation, no job queue, soft quotas, push fan-out in-request. |
| Maintainability | **7** | Readable TS, messages files, migrations history. Schema/app drift risk without types; handoff docs previously missing. |
| Developer Experience | **7** | Cursor rules help; next-intl + Supabase well wired. Missing env example, lint friction, Next middleware deprecation, AGENTS.md points to Next docs. |

## Verdict

This is a **real, deployable multi-tenant real-estate SaaS** with thoughtful domain separation and recent production hardening. It is **not** “finished platform” software: payment, matching, jobs, and some security/schema sync items remain. A senior engineer can continue immediately if they:

1. Treat Supabase migrations (especially RLS + `intermediaries`) as the source of truth to reconcile first,
2. Treat Server Actions + RLS as the dual auth model,
3. Never join `property_owners` into public search,
4. Keep property type **values** as English keys and labels via i18n.

---

# Appendix A — Canonical property type keys

```
apartment, duplex_apartment, villa, duplex_villa, building, land,
shop, showroom, warehouse, rest_house, farm, chalet, other
```

Neighborhood “other” option remains Arabic string `أخرى` in `locations.ts` (by design).

## Appendix B — Offer / status / request status keys

- Offer: `sale`, `rent`
- Property status: `available`, `pending`, `sold`, `rented`
- Request status: `active`, `executed`, `archived`
- Visibility: `company_only`, `global`

## Appendix C — Workspace rules (must not violate)

From `.cursorrules`:

1. `properties` strictly separated from `property_owners`.
2. RLS via `private_schema` SECURITY DEFINER functions.
3. `company_id` on every core table.
4. Never swallow `redirect()` — use `isRedirectError`.
5. `@supabase/ssr` clients; schema changes via SQL migrations first.

---

*End of handoff report.*
