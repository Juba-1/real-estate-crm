# 11 — Architecture Decisions

Record of important decisions **already present** in the codebase and why they exist.

---

## ADR-001 — Separate `properties` and `property_owners`

**Decision:** Public listing fields live on `properties`; owner name/phone/private notes live on `property_owners`.

**Why:** Market search and global visibility must never expose confidential owner PII to other agents. Enforced by workspace rule, UI (public vs my-property cards), and query design.

**Consequence:** Two writes on create/update; search must not join owners.

---

## ADR-002 — Multi-tenant `company_id` everywhere

**Decision:** Core business tables include `company_id`; middleware and RLS isolate tenants.

**Why:** B2B SaaS for multiple agencies on one database. Soft kill-switch via `companies.is_active`.

**Consequence:** Every new table/policy must be company-aware; admin helpers must not omit company scope.

---

## ADR-003 — RLS helpers in `private_schema` (SECURITY DEFINER)

**Decision:** `get_user_company_id`, `is_admin`, `is_super_admin`, `get_auth_user` live in `private_schema`, not recursive policies on `users`.

**Why:** Avoid RLS recursion and keep auth lookups consistent. EXECUTE revoked from PUBLIC.

**Consequence:** New policies should call these helpers; do not reintroduce inline `users` subqueries that recurse.

---

## ADR-004 — Server Actions instead of REST Route Handlers

**Decision:** Mutations and many interactive reads use `"use server"` modules; no `src/app/api` surface.

**Why:** Colocation with forms, cookie session via `@supabase/ssr`, less boilerplate for a CRM admin app.

**Consequence:** Authorization must be implemented in each action; no shared OpenAPI layer.

---

## ADR-005 — `@supabase/ssr` for all session clients

**Decision:** Browser, server, and middleware clients use `@supabase/ssr` patterns in `lib/supabase/*`.

**Why:** Correct cookie handling on Next App Router; workspace rule.

**Consequence:** Do not invent alternate clients; service role remains a separate admin module.

---

## ADR-006 — English enum/type keys with i18n labels

**Decision:** Persist English keys (`villa`, `sale`, `available`); display Arabic/English via `messages/*` and hooks.

**Why:** Postgres ENUM + Arabic labels caused production mismatches; flattening to TEXT + Zod fixed crashes. English keys are stable for code and analytics.

**Consequence:** Legacy Arabic values need `normalizePropertyType`; never store translated labels as type keys.

---

## ADR-007 — Flatten most Postgres ENUMs to TEXT

**Decision:** Property/request status/type/offer/visibility stored as TEXT; keep `user_role` ENUM.

**Why:** Faster product iteration and safer migrations after ENUM pain; app Zod is source of allowed values.

**Consequence:** Invalid strings possible without CHECK constraints — validation discipline required.

---

## ADR-008 — Soft request expiry (`expires_at`) without cron

**Decision:** Default `expires_at = now() + 14 days`; list queries filter active + not expired; renew extends window.

**Why:** Simple MVP without job runners.

**Consequence:** Expired rows remain until manually archived; no automatic cleanup.

---

## ADR-009 — Packages + quotas without payment provider

**Decision:** `packages` define limits copied onto `companies.max_*`; enforced in create actions.

**Why:** Manual SaaS sales / ops-controlled plans; `is_active` is the billing kill switch.

**Consequence:** No Stripe webhooks; concurrent creates can race past quota; ops manage invoices offline.

---

## ADR-010 — Username → synthetic `@agency.local` email

**Decision:** `resolveAuthEmail` maps identifiers without `@` to `{username}@agency.local`.

**Why:** Agents often lack real emails; Supabase Auth still requires email format.

**Consequence:** Auth Admin provisioning must use the same convention; domain is not a real mailbox.

---

## ADR-011 — Global listing visibility

**Decision:** `visibility = 'global'` allows SELECT across companies for authenticated users.

**Why:** Cross-office market sharing for participating listings (product feature from init schema).

**Consequence:** Still must never expose owners; confirm product intent before expanding global writes.

---

## ADR-012 — Service role for fan-out and platform ops

**Decision:** `createAdminClient` used for onboarding, notification inserts, push subscription reads, public packages, some cleanup.

**Why:** Notifications have no authenticated INSERT; packages locked to super_admin RLS; Auth Admin APIs require elevated key.

**Consequence:** High privilege — keep server-only; always filter by `company_id` for tenant fan-out.

---

## ADR-013 — In-app notifications + Web Push

**Decision:** Persist `notifications` per user; optional browser push via `push_subscriptions` + `public/sw.js` + VAPID.

**Why:** Agents need realtime awareness of new listings/requests without email infrastructure.

**Consequence:** Middleware must exclude `sw.js`; push failures are logged and must not roll back business writes; locale URLs need care.

---

## ADR-014 — Specs as JSONB + typed conditional columns

**Decision:** Flexible attributes in `specs` JSONB; selected building/villa fields as real columns (`floors_count`, `has_annex`, etc.).

**Why:** Balance queryability for important fields vs flexibility for notes/rooms/age.

**Consequence:** Form visibility helpers in `property-types.ts` must stay aligned with Zod.

---

## ADR-015 — Arabic-first routing (`localePrefix: "always"`)

**Decision:** Default locale `ar`; all routes prefixed (`/ar/...`, `/en/...`).

**Why:** Primary market is Arabic-speaking agencies; RTL-first UX.

**Consequence:** Hardcoded paths in push payloads need locale; use i18n navigation helpers.

---

## ADR-016 — Public storage buckets with path policies

**Decision:** `property_media` and `company_logos` are public-read; writes scoped by company path.

**Why:** Simple CDN URLs for cards without signed-URL complexity.

**Consequence:** URLs are durable secrets; deleting listings should consider media cleanup (partially handled on sold status).

---

## ADR-017 — No automated matching engine

**Decision:** Agents match demand/supply manually via Requests + Search.

**Why:** Scope control for production release; matching quality needs product design.

**Consequence:** “CRM matching” is human workflow, not a subsystem.

---

## ADR-018 — Schema changes only via SQL migrations

**Decision:** App must not invent columns without migrations (workspace rule).

**Why:** Prevent prod/runtime drift between TypeScript and Postgres.

**Consequence:** The intermediaries field gap is a process violation to fix with a migration, not more app code.

---

## ADR-019 — Urgent status as a computed timestamp, no cron

**Decision:** "Urgent" (Release 2) is `urgent_until TIMESTAMPTZ NULL` on `properties`/`requests`, never a boolean or priority column. Urgency is always the expression `urgent_until > NOW()`, evaluated at read time (in `lib/data/*` for sort order, in components for badge/border). Activating urgent (including the one-urgent-per-employee "transfer") runs through a `SECURITY INVOKER` SQL function (`public.activate_urgent_property` / `activate_urgent_request`) invoked via `supabase.rpc(...)`, because it must atomically clear one row and set another in a single statement.

**Why:** The product spec explicitly forbids `is_urgent`/`priority` columns and cron/scheduled jobs — expiry must "just work" from a timestamp comparison, matching the existing `requests.expires_at` soft-expiry pattern (ADR-008). The transfer requirement (only one urgent item per employee) needs true atomicity across two rows, which PostgREST's query builder cannot express in a single call; a small `public` SQL function is the minimal primitive that keeps this atomic while still going through the same `SECURITY INVOKER` RLS enforcement as a plain `.update()` call (no privilege escalation, no bypass of company isolation).

**Consequence:** Two small SQL functions live in `public` (not `private_schema`) since they are called directly from Server Actions via RPC, not from inside policies — this is a different category from the ADR-003 helpers and should not be confused with them. Any future "urgent-like" feature should reuse `src/lib/urgent.ts` (`isCurrentlyUrgent`, `compareByUrgency`) rather than re-deriving the comparison.

---

## ADR-020 — Global self-learning dictionary (one table, review gate)

**Decision:** Release 3 dropdown learning uses a single platform-global `dictionary_entries` table keyed by `category` (`property_type` | `city` | `district`), with `parent_value` for city-scoped districts. Employees/admins may only insert `pending` suggestions; values never enter dropdowns/filters until `super_admin` approves. Built-in seed constants (`EASTERN_CITY_NAMES`, `PROPERTY_TYPE_VALUES`, neighborhood maps) remain the baseline and are unioned with approved rows at read time (`dictionary-catalog`). Property/request saves stay non-blocking: `suggestFromListingFields` runs after the primary write.

**Why:** One table avoids per-category schema churn when adding future categories (metadata JSONB + CHECK expansion). A review gate prevents typo pollution of the global catalog while still letting agents complete listings immediately with free-text "Other". Cross-company visibility of approved values is intentional product design (shared Saudi market vocabulary), distinct from tenant-scoped business rows that always carry `company_id`.

**Consequence:** Do not put dictionary values on `properties` as FKs in v1 — listings keep TEXT city/neighborhood/custom fields; the dictionary is a catalog overlay. Delete is blocked when reference counts or `usage_count` > 0 (prefer Archive). Similarity warnings are available via action; auto-blocking on fuzzy match is deferred so workflow is never interrupted.

---

## ADR-021 — Intelligence domain + Property Identity Engine

**Decision:** Release 4 introduces an **Intelligence** domain (`src/lib/intelligence/…`) as the long-term home for identity, future matching, recommendations, analytics, and AI. R4 only implements `intelligence/identity`. Property DNA is persisted in `property_identities` (1:1 with `properties`) with denormalized indexed fields + JSON `dna`, `identity_version`, and `coordinate_source`. Learning-ready outcomes go to `intelligence_events` (`domain = 'identity'`). Candidate selection always filters `company_id` in application code — never rely on RLS alone, because ADR-011 global visibility would otherwise leak cross-company rows into duplicate analysis. Similarity returns confidence %, level, reasons, and structured `confidence_breakdown` (stored in event payload, not on the identity row). Save flow is two-phase: `checkPropertyIdentity` (no write) → warning dialog → continue with override; DNA upsert never blocks listing save.

**Why:** Modular DNA (not a hash) is reusable by future matching/AI; a separate identity projection keeps listing tables clean (ADR-014); a shared event store avoids rename migrations when matching arrives; explicit company filters close the global-SELECT identity risk.

**Consequence:** ADR-017 still holds for request↔property auto-matching. Historical backfill and ML threshold tuning are postponed; new/updated listings get DNA on save.

---

## ADR-022 — Opportunity Intelligence Engine (live discovery)

**Decision:** Release 5A adds an **Opportunity Intelligence Engine** under `src/lib/intelligence/opportunities/` (with `shared/`, `matching/` barrel, and Request DNA beside Property DNA). Live progressive discovery runs while agents type property/request forms — no save required, no page reload, no notifications (5B). Scoring is cross-entity opportunity scoring (not R4 identity similarity). Candidate queries always filter `company_id` in application code. Optional `requests.budget_*` / `area_*` plus `request_identities` enable progressive confidence without parsing free-text `details`.

**Why:** ADR-017 blocked *automated deal matching*; live *human-in-the-loop opportunity discovery* is a different product surface and the foundation for AI recommendations. Separating opportunity scoring from identity scoring prevents duplicate-prevention weights from polluting demand/supply fit.

**Consequence:** Partially supersedes ADR-017 for *discovery UX only*. Auto-linking deals, push/in-app opportunity alerts, and dashboards remain Release 5B+. Empty states explain missing inputs / restrictive bands rather than a bare “no results”.

---

## ADR-023 — Enterprise Stabilization (Release 5.5H)

**Decision:** Before further product features (5B+), harden security, scale, and architecture fitness:

1. **App-layer authz** for sensitive mutations/reads (`assertCanManageProperty` / `assertCanManageRequest`); notification fan-out moved out of Server Actions into `server-only` `notifyCompanyUsers` with actor + company binding before service-role use.
2. **Workload-specific pagination** (offset pages for search / my-properties / requests) plus SQL aggregate RPC `get_tenant_dashboard_stats` for dashboards.
3. **Shared intelligence** owns normalize/profile helpers; Identity owns request-identity persistence; Opportunity no longer imports Identity DNA for district resolution.
4. **PROJECT_CONSTITUTION.md** is binding engineering law; Vitest + reusable benchmark framework are first-class.

**Why:** Release 5.5 audit found critical service-role exposure and unbounded list/dashboard scans that would not survive enterprise office scale.

**Consequence:** Apply migration `20260807120000_enterprise_stabilization_indexes.sql` before relying on dashboard RPC in production. Mega-form section extraction continues iteratively under the constitution (payload normalization extracted first).

---

## ADR-024 — Smart Opportunity Notifications (Release 5B)

**Decision:** After property/request **save**, score only company-scoped opposite-side candidates (reuse Opportunity Engine). Notify the **counterparty agent** (request agent when a property is saved; property agent when a request is saved) via existing in-app + Web Push channels. Live typing discovery stays silent.

**Anti-spam:** `opportunity_notification_receipts` stores fingerprint (`prop:…|req:…`) + last confidence/priority/time. Notify only ≥ strong (75). Suppress duplicates unless cooldown expired with material change (≥10pt confidence), priority upgrade, or became-matchable. Group multiple matches per recipient into one message. Explainable Arabic copy from matched opportunity reasons.

**Security:** `notifyOpportunityDiscovery` re-checks actor session + company binding; fan-out uses selective `notifyCompanyUsers` / push with recipient IDs still filtered by `company_id`. No owner PII. Receipts RLS is company-scoped read; writes via service role after authz.

**Why:** 5A discovery without delivery left value on the table; unscoped company fan-out would spam. Targeted + deduped alerts increase value without fatigue.

**Consequence:** Migration `20260807180000_opportunity_smart_notifications.sql` required. Preference/mute UI and per-user notification settings deferred.

---

## ADR-025 — Beta Polish 1 performance baselines

**Decision:** Treat perceived navigation latency as a first-class product requirement. Deduplicate request-scoped auth/profile with `React.cache`, collapse middleware profile gates, add route `loading.tsx`, disable aggressive sidebar prefetch, and defer non-critical header islands (notifications/push/charts). Do not change Identity / Opportunity / security semantics.

**Why:** Audit showed 2–3s soft navigations were dominated by repeated auth/profile DB roundtrips and missing loading UI, not by Opportunity scoring.

**Consequence:** See `docs/engineering/13_PERFORMANCE.md` for budgets and remaining work.

---

## ADR-026 — Beta Polish 2 component architecture (UI only)

**Decision:** Split mega property/request forms into feature sections under `components/properties/form/` and `components/requests/form/`. Extract shared `MarkUrgentField`, `UrgentTransferDialog`, `EmptyState`, and `lib/ui/badge-styles` so listing cards and list pages share one visual language. Do **not** change Identity, Opportunity, Notifications, Urgent SQL semantics, Dictionary, authz, or schema.

**Why:** Oversized form files blocked review and extension; duplicated badge/empty markup drifted visually. Maintainability and Beta polish without product-risk refactors.

**Consequence:** Shells own orchestration (submit, upload, dialogs, live panels). Further splitting `property-details-section` is optional debt. Documented in `docs/engineering/14_BETA_POLISH_2.md`.

---

## ADR-027 — Controlled property removal (Release 6A)

**Decision:** Add a lightweight `property_removal_requests` table. Agents submit **Request Removal** (mandatory reason); property stays active until an admin **Approves** (hard delete), **Rejects**, or **Archives instead** (`status = archived`). Reuse existing in-app notifications. Do not change Identity, Opportunity, Dictionary, or the notification engine.

**Why:** Employees must never permanently remove inventory alone; managers need a simple office workflow without soft-delete redesign.

**Consequence:** See `docs/engineering/18_PROPERTY_REMOVAL.md`. Historical KPIs preserved (archived rows + request audit after approve via `ON DELETE SET NULL`).

---

## ADR-028 — Urgent anytime + push reliability (Release 6B)

**Decision:** Keep `urgent_until` semantics. Add admin-aware `activate_urgent_*` RPCs (transfer the listing owner’s one-urgent slot). Expose card toggles via authz’d `setPropertyUrgent` / `setRequestUrgent`. Harden existing Web Push: locale-prefixed push URLs, SW path allowlist, actor/company bind before push fan-out, gated opportunity receipts, non-blocking post-save notify. Do not replace the push provider or redesign Opportunity.

**Why:** Urgent felt create-only due to missing UI + silent admin RPC no-ops; push failures were silent/locale-broken.

**Consequence:** See `docs/engineering/19_URGENT_AND_PUSH_RELIABILITY.md`. Live OS push still requires device + Vercel VAPID verification.
