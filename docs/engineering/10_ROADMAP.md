# 10 — Roadmap

Planning document — not a commitment calendar.

---

## Current release

**Focus:** Production-oriented multi-tenant CRM on Vercel + Supabase.

Shipped in recent cycles:

- Core listings, owners separation, requests, team admin, packages/quotas, company branding
- ENUM → TEXT + English property type keys
- In-app notifications + Web Push (tenant-scoped)
- Platform growth chart from live `companies.created_at`
- Google Maps URL + plot letter fields
- Conditional intermediaries UI (DB column still a known gap)
- Company-scoped admin RLS migration authored (verify apply + git track)

---

## Completed features

- Auth (email/username) + role routing (agent/admin/super_admin)
- Property CRUD + status lifecycle + image upload/compression
- Confidential owner records on my-properties/edit only
- Internal requests with soft 14-day expiry
- Company search/filters (including global visibility listings)
- Tenant analytics dashboard + admin reports (CSV/print)
- Super-admin onboarding, packages, system settings, activate/deactivate tenants
- Arabic-first i18n (`ar`/`en`) with always-on locale prefix
- Storage buckets for media and logos with path policies

---

## Pending features / hardening

| Item | Why pending |
|------|-------------|
| Confirm/add `intermediaries` column migration | App already writes field |
| Commit + apply company-scoped admin RLS on all envs | Security |
| `manageRequest` ownership checks | Defense-in-depth |
| Normalize legacy types in labels + select `custom_property_type` in lists | UX correctness |
| Locale-prefixed push URLs | Click-through reliability |
| Lint clean / CI green | Quality gate |
| `.env.example` + generated DB types | Onboarding & type safety |
| Indexes on hot property/request filters | Scale |
| Edit-page ownership guard | Authorization clarity |
| Enforce or remove `maintenanceMode` | Settings honesty |
| Admin status update for company listings | Product decision |

---

## Future ideas (product)

1. Automated property ↔ request matching / suggestions  
2. Billing integration (Stripe or local invoicing) — currently package quotas only  
3. Cron/Edge Function to archive expired requests  
4. Email / SMS notification channels  
5. Broader geography beyond Eastern Province city list  
6. Richer super-admin analytics and audit log  
7. Mobile PWA polish beyond push  
8. Public marketing site CMS / content edits without deploys  

---

## Architecture improvements

1. Extract `notifyCompany({ inApp, push })` shared helper  
2. Central authz helpers (`requireTenantAdmin`, `assertCanManageProperty`)  
3. Split `add-property-form` into section components  
4. Generated Supabase TypeScript types as single schema source  
5. Shared MetricCard + status badge primitives  
6. Migrate middleware to Next.js `proxy` convention when ready  
7. Reduce service-role surface where RLS can express the need  
8. Add RLS/action integration tests  
9. Observability: structured logs for push/quota without noisy `console.log`  
10. Document and test `visibility=global` product rules  

See also: `12_REFACTOR_PLAN.md` for prioritized engineering work.
