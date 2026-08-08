# DEERAH Project Constitution

**Status:** Binding  
**Created:** Release 5.5H — Enterprise Stabilization  
**Audience:** Every engineer, agent, and reviewer who changes this repository

This document is the permanent engineering constitution of DEERAH.  
When it conflicts with convenience, the constitution wins.

---

## Preamble

DEERAH is a multi-tenant real-estate CRM built to last years of product development without architectural degradation. Features ship continuously; architecture debt must not.

---

## Article I — Architecture Invariants

1. **Every new feature must improve the architecture or leave it unchanged.** No feature may increase architectural debt without an explicit, documented ADR exception.
2. **High cohesion, low coupling, single responsibility, and separation of concerns are mandatory.** Prefer extracting a domain module over growing a mega-file.
3. **Dependency direction is one-way:**
   - `app` → `components` / `actions` / `lib/data`
   - `actions` → `types` / `lib` (including `lib/supabase/admin` server-only)
   - `lib/data` → `lib/supabase` (never → `actions`)
   - `lib/constants` must not import `types`
   - `components/ui` must not import domain actions
4. **Intelligence domains remain independent:** Identity, Opportunity, Dictionary, Urgent, and Notifications each own exactly one responsibility. Shared modules must remain domain-independent (no `shared → identity` / `shared → opportunity` imports).
5. **No duplicated business logic. No duplicated scoring logic.** Scoring algorithms live once in their domain package and are imported elsewhere.

---

## Article II — Security (Non-Negotiable)

1. **Tenant isolation is mandatory.** Every core table includes `company_id`. Policies and queries are company-aware.
2. **Never rely solely on RLS.** Application-layer authentication **and** authorization must exist on every sensitive Server Action and confidential read.
3. **Never use the Service Role without explicit authorization.** Service-role clients require:
   - a prior authenticated session check, and
   - a proven company (or platform-role) binding, and
   - a documented reason (e.g. notification fan-out with no authenticated INSERT policy).
4. **Service-role helpers must not be exported as Server Actions.** Keep them in `server-only` library modules.
5. **Owner PII (`property_owners`) is confidential.** Never expose owners on search, public cards, or global listing UIs. Never put owner fields on `properties`.
6. **Never authorize from editable `user_metadata`.** Use the `users` profile row and `private_schema` helpers.
7. **Public storage URLs are not access control.**

---

## Article III — Data & Migrations

1. **Schema changes only via idempotent SQL migrations** (`IF NOT EXISTS`, safe policy drops/recreates).
2. **RLS helpers live in `private_schema`** (`SECURITY DEFINER`). Do not reintroduce recursive `users` subqueries in policies.
3. **`properties` ≠ `property_owners`** (ADR-001). Do not merge them.
4. Prefer additive, rollback-safe migrations. Avoid destructive changes without a written recovery plan.
5. Indexes are part of the feature: every new filtered/list query ships with supporting indexes.

---

## Article IV — Performance

1. **Performance is a design requirement**, not a later optimization phase.
2. Design for enterprise office scale (tens of thousands of properties and requests; hundreds of concurrent users).
3. Choose the right pagination strategy per workload (offset, keyset, or SQL aggregate). Do not force one approach everywhere.
4. Prefer SQL aggregates / RPCs for dashboards over downloading full tables.
5. Eliminate N+1 queries. Cap discovery engines with deterministic limits and ordering.
6. Use the reusable benchmark framework (`src/lib/benchmarks`) to measure subsystems before claiming performance wins.

---

## Article V — Contracts & Quality

1. **Stable contracts** between UI ↔ Server Actions ↔ Data ↔ Intelligence ↔ Database. Prefer explicit result types (`{ error } | data`) over thrown surprises for expected failures.
2. **Never swallow `redirect()`** — always `if (isRedirectError(error)) throw error`.
3. English type keys + i18n labels (ADR-006).
4. Automated tests prioritize scoring, normalization, authorization rules, and business invariants — not trivial getters.
5. Observability: log security rejections and non-blocking side-effect failures with enough context to debug production without leaking secrets.

---

## Article VI — Product Boundaries

1. **Server Actions over new REST Route Handlers** unless explicitly approved (ADR-004).
2. Personas: `super_admin` → `/super-admin/*`; `admin`/`agent` → `/dashboard/*`.
3. `visibility = 'global'` is cross-company SELECT by design — never expand global writes without product confirmation; still never join owners.
4. Do not implement Flutter, public APIs, or AI agents inside product sprints until contracts are stable — but keep today's architecture ready for them (authz at the action layer, domain packages, stable DTOs).

---

## Article VII — Enforcement

1. Code review must check this constitution for every PR that touches security, schema, intelligence, or Server Actions.
2. Release gates that violate Articles II or III are **stop-ship**.
3. When unclear, prefer the safer interpretation and open an ADR.

---

## Related Documents

- `docs/engineering/01_ARCHITECTURE.md`
- `docs/engineering/08_CODE_SMELLS.md`
- `docs/engineering/11_ARCHITECTURE_DECISIONS.md`
- `.cursorrules` / `.cursor/rules/*`
