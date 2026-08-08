# 12 — Refactor Plan

**Do not execute in this documentation task.** Ordered backlog with effort/impact estimates.

Effort: **S** ≤0.5d · **M** 0.5–2d · **L** 2–5d · **XL** >5d  
Impact: **H** security/correctness · **M** maintainability/UX · **L** polish

---

## Critical

| ID | Item | Effort | Impact | Notes |
|----|------|--------|--------|-------|
| C1 | Add/apply migration for `properties.intermediaries` | S | H | Unblocks non-direct listings |
| C2 | Ensure `20260711140000` RLS scoping applied + committed on all envs | S | H | Cross-tenant admin risk |
| C3 | Add ownership/admin checks to `manageRequest` | S | H | Match property action patterns |
| C4 | Confirm product rules for `visibility=global` and document/test | M | H | Prevent accidental data sharing |

---

## High

| ID | Item | Effort | Impact | Notes |
|----|------|--------|--------|-------|
| H1 | Split `add-property-form.tsx` into section components | L | M | **Done (Beta Polish 2)** — see `14_BETA_POLISH_2.md` |
| H2 | Extract `notifyCompany` (in-app + push) helper | M | M | Deduplicate side effects |
| H3 | Centralize authz helpers (`requireTenantAdmin`, `canManageProperty`) | M | H | Consistency |
| H4 | Normalize types in `usePropertyLabels` + select `custom_property_type` in list queries | S | M | Fix “other”/legacy labels |
| H5 | Locale-aware push notification URLs | S | M | Click-through |
| H6 | Fix lint errors blocking CI | M | M | theme-toggle, push manager, unused exports |
| H7 | Generate Supabase TypeScript types; wire to queries | L | H | Schema drift defense |
| H8 | Add indexes for property/request list filters | S | M | Performance before growth |
| H9 | Guard edit property page by manage permission | S | H | Defense-in-depth |
| H10 | Delete orphan `AdminDashboard` / `AgentDashboard` | S | L | Dead code |

---

## Medium

| ID | Item | Effort | Impact | Notes |
|----|------|--------|--------|-------|
| M1 | Shared `MetricCard` + status badge components | M | M | Remove duplicates |
| M2 | Retire `formatPropertyType` in favor of i18n-only labels | M | M | Single source of truth |
| M3 | Add `.env.example` | S | M | Onboarding |
| M4 | Enforce or remove `maintenanceMode` | M | M | Settings honesty |
| M5 | Quota enforcement hardening (transaction/lock or unique constraint strategy) | L | H | Race safety |
| M6 | Move login actions under `src/actions` | S | L | Consistency |
| M7 | Separate UPDATE/DELETE RLS policies on core tables | M | M | Clarity (careful migrate) |
| M8 | Structured logging for push (remove noisy console.log) | S | L | Ops |
| M9 | Admin ability to update property status (product + action) | M | M | Align UI expectations |
| M10 | Media cleanup policy on deleteProperty | M | M | Storage cost |

---

## Low

| ID | Item | Effort | Impact | Notes |
|----|------|--------|--------|-------|
| L1 | Migrate middleware → Next `proxy` convention | M | L | Framework alignment |
| L2 | Remove unused `formatUserRole`, `ui/sonner` wrapper | S | L | Hygiene |
| L3 | Unify action error result types | M | L | DX |
| L4 | CSV export util extraction | S | L | Reports |
| L5 | i18n for hardcoded Arabic notification strings | M | L | Locale parity |
| L6 | Request archive cron (Edge Function / Vercel cron) | L | M | Product maturity |
| L7 | Automated matching suggestions (future product) | XL | M | New subsystem |
| L8 | Billing provider integration | XL | H | New subsystem |
| L9 | Integration tests for RLS cross-tenant cases | L | H | Quality |
| L10 | Reduce service-role usage where possible | L | M | Attack surface |

---

## Suggested sequence

1. **C1 → C2 → C3** (security/data correctness)  
2. **H4 → H5 → H9 → H10** (quick correctness wins)  
3. **H7 + H8 + M3** (platform hygiene)  
4. **H1 → H2 → H3 → M1** (structural maintainability)  
5. Product track: **L6 / L7 / L8** as roadmap allows  

---

## Out of scope for “refactor”

- Rewriting the app to REST/tRPC without clear need  
- Introducing Redux/Zustand without caching pain  
- Merging `properties` and `property_owners`  
- Moving RLS helpers into `public` schema  

Related smell inventory → `08_CODE_SMELLS.md`. Roadmap narrative → `10_ROADMAP.md`.
