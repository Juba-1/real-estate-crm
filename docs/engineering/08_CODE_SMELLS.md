# 08 — Code Smells

Documentation only — **do not fix here**. Priorities for remediation live in `12_REFACTOR_PLAN.md`.

---

## Critical / security

1. **`properties.intermediaries` written by app with no SQL migration in repo** — inserts may fail or rely on undocumented prod drift.
2. **`20260711140000_scope_admin_rls_to_company.sql` may be untracked / unapplied** — historical admin RLS allowed cross-tenant mutation via `is_admin()` without `company_id`.
3. **`manageRequest` lacks application-layer ownership/admin check** — depends entirely on RLS; weaker defense-in-depth than property actions.
4. **`visibility = 'global'`** enables cross-company SELECT on properties — intentional product feature or latent leak; needs explicit product confirmation.
5. **Public storage buckets** — anyone with URL can read media; path secrecy is not access control.
6. **Dual auth model** — session RLS + scattered app checks; inconsistent coverage (status action excludes admins; manageRequest is thin).

---

## Dead code / unused exports

| Item | Evidence |
|------|----------|
| `AdminDashboard` | Not imported; dashboard uses `TenantAnalyticsDashboard` |
| `AgentDashboard` | Same |
| `formatUserRole` | Defined in `user-utils.ts`, no consumers |
| `components/ui/sonner.tsx` | Layouts import `sonner` package directly |
| Possible unused helpers in push module | Lint reported unused status-code helper historically |

---

## Large files / SRP violations

| File | ~Lines | Smell |
|------|--------|-------|
| `add-property-form.tsx` | **1018+** | Upload, conditional sections, validation wiring, add+edit — should be split |
| `property.ts` (actions) | ~382 | Create/update/delete + notify — candidate to split notify helper |
| `company-row-actions.tsx` | ~334 | Multi-dialog CRUD in one file |
| `add-request-dialog.tsx` | ~353 | Large form dialog |
| `analytics.ts` (data) | ~323 | Multiple aggregations in one module |
| `property-card.tsx` | ~312 | Display + status + confidential + actions |

Only production source file currently **>1000 lines:** `add-property-form.tsx`.

---

## Duplicate logic

| Duplication | Locations |
|-------------|-----------|
| `MetricCard` local components | admin-dashboard, agent-dashboard, tenant-analytics, super-admin-metric-cards |
| Status badge styling/labels | property-card vs public-property-card |
| Property type labels | `formatPropertyType` (hardcoded) vs `usePropertyLabels` / messages |
| Notify company (in-app + push) | Copied patterns in addProperty / addRequest (delete partial) |
| VAPID key sanitization | Client + server push modules |
| Date display | Mostly centralized now; watch for new ad-hoc formatters |
| Auth/profile bootstrap | Repeated getUser + users select in many actions |

---

## Over-engineered

1. Three dashboard UIs historically (admin/agent/tenant) for one page — retain only tenant analytics.
2. `FOR ALL` policies mixing UPDATE/DELETE semantics — harder to reason than separate policies (style debt).
3. Service role for operations that might be expressible with tighter RLS (some logo/package reads) — review case-by-case.

---

## Under-engineered

1. No generated `database.types.ts` — schema drift undetected by TypeScript.
2. No `.env.example` — onboarding friction / misconfig risk.
3. Soft request expiry without cron/archive job.
4. Soft quotas without DB constraints/locks — race can exceed limits.
5. `maintenanceMode` setting stored but enforcement incomplete in middleware.
6. Push click URLs without locale prefix.
7. List queries omitting `custom_property_type` — “other” labels degrade.
8. `usePropertyLabels` may not normalize legacy Arabic type values.
9. Edit property page ownership gate weak at page layer.
10. No automated tests visible for RLS/actions.

---

## Naming inconsistencies

| Pattern | Issue |
|---------|-------|
| Login action colocated under `app/.../login` vs everything else in `src/actions` | Discovery cost |
| `getDashboardStats` vs `fetchTenantDashboardStats` vs action wrapper | Parallel names |
| Arabic neighborhood sentinel `أخرى` vs English `other` for property type | Dual conventions (documented but easy to misuse) |
| CSV export labeled like Excel in UI copy | Product/copy mismatch |

---

## Circular / coupling risks

1. Soft cycle risk: `types/property` ↔ `lib/constants` (types import constants — OK if constants never import types).
2. Actions importing other actions (`request` → `notifications`) — acceptable but couples side-effect graph.
3. Auth helpers depending on data loaders and vice versa — keep direction `actions/pages → auth → supabase` only.

---

## Repeated UI patterns to extract

- Metric tiles
- Status badges
- City/neighborhood select pair
- Quota exceeded toast handling
- Confirm delete alert-dialog flows (team, package, company, property)

---

## Technical debt register (condensed)

1. Missing intermediaries migration  
2. RLS scoping migration apply/commit verification  
3. manageRequest authorization  
4. Orphan dashboards  
5. Monolithic property form  
6. Duplicate MetricCard / status badge  
7. Dual property label systems  
8. No Supabase generated types  
9. No `.env.example`  
10. Lint failures (`set-state-in-effect`, unused vars)  
11. Debug `console.log` in push/request paths  
12. Middleware → Next `proxy` migration pending  
13. Missing DB indexes on hot filters  
14. Quota race  
15. Global visibility semantics unclear  
16. Public media URLs  
17. Incomplete maintenance mode  
18. Push locale URLs  
19. custom_property_type not in list selects  
20. Label normalization for legacy rows  
21. Admin cannot update others’ status via action (product gap or bug)  
22. Notification/push failures swallowed  
23. No matching engine / billing / cron (product gaps, not bugs)  
24. Handoff report vs engineering docs overlap — keep `docs/engineering` canonical going forward  

---

## Architectural risks

- Tenant isolation depends on **every** new policy remembering `company_id` + private_schema helpers.
- TEXT columns without DB CHECK mean a single bad write path poisons data.
- Service role fan-out is powerful — any new internal action must stay server-only and company-scoped.
- Arabic-first + English keys requires disciplined i18n; hardcoded formatters undermine that.
