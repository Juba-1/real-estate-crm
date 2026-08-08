# 03 — Database

Source of truth: `supabase/migrations/*.sql` (ordered). App Zod schemas must stay aligned.

---

## Schema philosophy

1. **Multi-tenant:** every core business table has `company_id`.
2. **Data normalization:** `properties` = market/listing fields; `property_owners` = confidential owner PII. Never join owners into public search cards.
3. **RLS helpers** live in `private_schema` as `SECURITY DEFINER` with `EXECUTE` revoked from `PUBLIC`, granted to `authenticated`.
4. **App-validated TEXT:** most former ENUMs were flattened to TEXT; Zod enforces allowed values. Remaining Postgres ENUM: `user_role`.
5. **Soft quotas:** `companies.max_*` enforced in Server Actions, not DB triggers.
6. **No views** in current migrations (except functional RPCs).
7. **Opportunity notify receipts** (`opportunity_notification_receipts`) store anti-spam fingerprints for Release 5B — company-scoped, no owner PII.

### Tables that must never be joined together (product rule)

| Forbidden join | Why |
|----------------|-----|
| Public search / market cards ↔ `property_owners` | Owner phone/name must not leak into company-wide or global listing UIs |
| Cross-company joins except intentional `visibility = 'global'` property SELECT | Tenant isolation |

Allowed: agent “My Properties” and edit flows may load owner rows for **owned** listings; admins (same company) after scoped RLS.

---

## `private_schema` functions

| Function | Returns | Role |
|----------|---------|------|
| `get_auth_user()` | UUID | `auth.uid()` |
| `get_user_company_id()` | UUID | Current user’s `users.company_id` |
| `is_admin()` | boolean | role ∈ (`admin`, `super_admin`) |
| `is_super_admin()` | boolean | role = `super_admin` |
| `set_property_status_updated_at()` | trigger fn | Sets `status_updated_at` when `status` changes |
| `get_tenant_dashboard_stats(company_id, agent_id?)` | jsonb | SQL aggregates for dashboard (tenant-gated); public wrapper for `rpc()` |

---

## Tables

### `companies`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | `gen_random_uuid()` |
| `name` | TEXT NOT NULL | |
| `is_active` | BOOLEAN DEFAULT true | Middleware signs out inactive tenants |
| `created_at` | TIMESTAMPTZ | Platform growth aggregation |
| `max_properties` | INTEGER NOT NULL DEFAULT 50 | Quota |
| `max_agents` | INTEGER NOT NULL DEFAULT 3 | Quota |
| `package_id` | UUID FK → `packages` ON DELETE SET NULL | |
| `logo_url` | TEXT | Public storage URL |

**RLS:** SELECT own company or super_admin; super_admin ALL; tenant admins UPDATE own branding (`Admins update own company branding`).

---

### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | = `auth.users.id` ON DELETE CASCADE |
| `company_id` | UUID NOT NULL FK → companies | |
| `role` | `user_role` DEFAULT `agent` | `super_admin` \| `admin` \| `agent` |
| `name` | TEXT NOT NULL | |
| `phone` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

**RLS:** SELECT colleagues same company or super_admin; admins manage same-company users or super_admin.

---

### `properties`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `company_id` | UUID NOT NULL | |
| `agent_id` | UUID NOT NULL → users | Listing agent |
| `type` | TEXT NOT NULL | Canonical EN keys (`villa`, `apartment`, …) |
| `offer_type` | TEXT NOT NULL | `sale` \| `rent` |
| `city` | TEXT NOT NULL | |
| `neighborhood` | TEXT NOT NULL | |
| `price` | NUMERIC NOT NULL | |
| `area` | NUMERIC NOT NULL | |
| `specs` | JSONB DEFAULT `{}` | rooms, age, street_width, plan/plot extras, notes |
| `images` | TEXT[] DEFAULT `{}` | Public URLs |
| `is_direct` | BOOLEAN DEFAULT true | |
| `status` | TEXT DEFAULT `available` | available/pending/sold/rented |
| `visibility` | TEXT DEFAULT `company_only` | company_only \| global |
| `general_notes` | TEXT | Company-visible notes |
| `created_at` | TIMESTAMPTZ | Listing date in UI |
| `status_updated_at` | TIMESTAMPTZ | Trigger-maintained |
| `custom_property_type` | TEXT | When type = `other` |
| `custom_neighborhood` | TEXT | When neighborhood = `أخرى` |
| `floors_count`, `apartments_count`, `shops_count` | INTEGER | Building; CHECKs > 0 or null |
| `has_annex` | BOOLEAN | Villas |
| `google_maps_url` | TEXT | Optional |
| `plot_letter` | TEXT | Land plot letter |
| `intermediaries` | TEXT | Brokers when `is_direct = false` (documented in `20260806120000`) |
| `urgent_until` | TIMESTAMPTZ NULL | NULL=normal, future=urgent, past=auto-expired. No `is_urgent`/`priority` column; always derived via `urgent_until > NOW()` (see `20260716120000`) |

**Trigger:** `trg_property_status_updated_at` BEFORE UPDATE.

**RLS (after `20260711140000`):**
- SELECT: same company OR `visibility = 'global'`
- INSERT: same company AND `agent_id = auth user`
- ALL update/delete: agent self OR (`is_admin()` AND same `company_id`)

---

### `property_owners`

| Column | Type |
|--------|------|
| `id` | UUID PK |
| `property_id` | UUID NOT NULL → properties CASCADE |
| `company_id` | UUID NOT NULL |
| `agent_id` | UUID NOT NULL |
| `owner_name` | TEXT NOT NULL |
| `owner_phone` | TEXT NOT NULL |
| `private_notes` | TEXT |
| `created_at` | TIMESTAMPTZ |

**RLS (after scoped migration):** SELECT/ALL for agent owner OR (admin AND same company); INSERT same company + agent self.

---

### `requests`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `company_id` | UUID NOT NULL | |
| `agent_id` | UUID NOT NULL | |
| `type` | TEXT NOT NULL | |
| `offer_type` | TEXT NOT NULL | |
| `city` | TEXT NOT NULL | |
| `neighborhood` | TEXT | nullable |
| `details` | TEXT NOT NULL | |
| `status` | TEXT DEFAULT `active` | active/executed/archived |
| `created_at` | TIMESTAMPTZ | |
| `expires_at` | TIMESTAMPTZ DEFAULT NOW()+14d | Soft expiry (query filter) |
| `custom_property_type` | TEXT | |
| `custom_neighborhood` | TEXT | |
| `urgent_until` | TIMESTAMPTZ NULL | Same convention as `properties.urgent_until` |

**RLS:** SELECT same company; INSERT self; update/delete agent OR (admin AND same company).

---

### `packages`

| Column | Type |
|--------|------|
| `id` | UUID PK |
| `name` | TEXT NOT NULL |
| `max_properties` | INTEGER NOT NULL (>0) |
| `max_agents` | INTEGER NOT NULL (>0) |
| `created_at` | TIMESTAMPTZ |

**RLS:** super_admin ALL only. Landing page reads via service-role (`getPublicPackages`).

---

### `notifications`

| Column | Type |
|--------|------|
| `id` | UUID PK |
| `company_id` | UUID NOT NULL |
| `user_id` | UUID NOT NULL |
| `title` | TEXT NOT NULL |
| `message` | TEXT NOT NULL |
| `is_read` | BOOLEAN DEFAULT false |
| `created_at` | TIMESTAMPTZ |

**Indexes:** `(user_id, created_at DESC)`; partial unread on `user_id` where not read.

**RLS:** users SELECT/UPDATE own rows. No authenticated INSERT — fan-out uses service role.

---

### `system_settings`

| Column | Type |
|--------|------|
| `key` | TEXT PK |
| `value` | JSONB |
| `updated_at` | TIMESTAMPTZ |

Seeded keys include platformName, supportEmail, defaultCurrency, maintenanceMode.

**RLS:** super_admin ALL.

---

### `push_subscriptions`

| Column | Type |
|--------|------|
| `id` | UUID PK |
| `user_id` | UUID NOT NULL |
| `company_id` | UUID NOT NULL |
| `endpoint` | TEXT NOT NULL |
| `subscription` | JSONB NOT NULL |
| `created_at`, `updated_at` | TIMESTAMPTZ |
| UNIQUE | `(user_id, endpoint)` |

**Indexes:** `company_id`, `user_id`.

**RLS:** enabled (`20260806120100`); users manage own rows with matching `company_id`. Service-role fan-out bypasses RLS for company push send.

---

### `dictionary_entries` (platform-global)

Self-learning dropdown catalog (Release 3). One table for all categories — not one table per category.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `category` | TEXT | `property_type` \| `city` \| `district` |
| `value` | TEXT | Display value (post-edit spelling) |
| `normalized_value` | TEXT | Trim + collapse spaces + NFC for dedupe |
| `parent_value` | TEXT NULL | Required for `district` (parent city) |
| `status` | TEXT | `pending` \| `approved` \| `rejected` \| `archived` |
| `usage_count` | INTEGER ≥ 0 | Incremented on suggest / merge |
| `submitted_by` | UUID FK → users | Nullable |
| `submitted_company_id` | UUID FK → companies | Nullable (audit only; not tenant-scoped rows) |
| `reviewed_by` / `reviewed_at` / `approved_at` | | Super-admin review audit |
| `rejection_note` | TEXT NULL | |
| `metadata` | JSONB | Future extensibility |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**Indexes:** unique active `(category, normalized_value, COALESCE(parent_value,''))` WHERE status ∈ (`pending`,`approved`); `(status, category)`; `(category, normalized_value)`; partial on `parent_value`.

**RLS:** authenticated SELECT approved (or own submissions / super_admin); INSERT pending for own company; ALL mutations for super_admin only. Catalog is intentionally cross-tenant once approved.

**App layer:** seed constants ∪ approved rows via `src/lib/dictionary-catalog.ts`. Suggestions never block property/request saves.

---

### `property_identities` (Intelligence — Release 4)

1:1 DNA projection for listings. Never join into public search cards beyond what product needs; candidate queries always filter `company_id` explicitly.

| Column | Notes |
|--------|-------|
| `property_id` | PK → properties CASCADE |
| `company_id` | Denormalized tenant scope |
| `identity_version` | Algorithm coexistence |
| `profile_key` | land \| villa \| apartment \| generic |
| `type`, `city`, `district`, `area` | Indexed candidate filters |
| `latitude`, `longitude`, `geohash` | From maps URL when parseable |
| `coordinate_source` | `google_maps_url` \| `manual` \| null |
| `dna` | JSONB modular components |

### `intelligence_events`

Future-proof event store (`domain`: identity | matching | …). R4 writes identity warning outcomes with `confidence_breakdown` in `payload`.

### `request_identities` (Intelligence — Release 5A)

1:1 Request DNA projection. Optional demand bands mirrored from `requests.budget_*` / `area_*`.

**Indexes:** `(company_id, type, city, district)`; `requests(company_id, status, type, city)`.

---

## Storage buckets

| Bucket | Public read | Path convention |
|--------|-------------|-----------------|
| `property_media` | yes | `{company_id}/{user_id}/{timestamp}-{file}` |
| `company_logos` | yes | `{company_id}/logo.{ext}` |

Write/update/delete policies scoped by company path + admin helpers (`20260704170000`, logo policies in `20260704120000`).

---

## Explicit indexes (beyond PK/FK)

- `idx_notifications_user_created_at`
- `idx_notifications_user_unread` (partial)
- `idx_push_subscriptions_company_id`
- `idx_push_subscriptions_user_id`

**Missing (performance risk):** composite indexes on `properties(company_id, status, …)`, `requests(company_id, status, expires_at)`, `properties(agent_id)`.

Added in `20260716120000`: partial indexes `idx_properties_urgent_until`, `idx_requests_urgent_until` (`WHERE urgent_until IS NOT NULL`).

---

## Callable SQL functions (`public` schema, via `supabase.rpc`)

| Function | Purpose |
|---|---|
| `public.activate_urgent_property(p_property_id uuid)` | One UPDATE statement: clears `urgent_until` on any other active-urgent property owned by the caller (`private_schema.get_auth_user()`) and sets it on the target row (+7 days). Atomic "transfer" — safe to call whether or not a prior urgent property exists. `SECURITY INVOKER`, RLS still applies. |
| `public.activate_urgent_request(p_request_id uuid)` | Same behavior as above, scoped to `requests`. |

These live in `public` (not `private_schema`) because they are called directly from Server Actions via `supabase.rpc(...)`, not used inside RLS policies. Both are `SECURITY INVOKER` (default) — every row touched is still subject to the existing "Update/Delete properties"/"Update/Delete requests" policies, so tenant isolation and company scoping are unchanged.

---

## Migration history (repo order)

| File | Intent |
|------|--------|
| `20260702143817_init_real_estate_schema.sql` | Core tables, enums, private_schema, RLS, status trigger |
| `20260702153941_init_storage_bucket.sql` | `property_media` + early policies |
| `20260702160000_storage_delete_policy.sql` | Delete on property_media |
| `20260704103300_add_company_quotas.sql` | max_properties / max_agents |
| `20260704104900_add_packages_table.sql` | packages + company.package_id |
| `20260704120000_add_company_logo.sql` | logo_url + company_logos bucket |
| `20260704130000_expand_property_types.sql` | type → TEXT + custom fields |
| `20260704160000_add_notifications.sql` | notifications |
| `20260704170000_secure_property_media_storage.sql` | Path-scoped storage policies |
| `20260704171000_add_system_settings.sql` | system_settings |
| `20260704180000_flatten_enums_and_normalize_types.sql` | ENUM→TEXT + English remaps + recreate policies |
| `20260704190000_add_push_subscriptions.sql` | Web Push subscriptions |
| `20260711140000_scope_admin_rls_to_company.sql` | Company-scope admin RLS (verify applied + committed) |
| `20260714160000_add_google_maps_url_and_plot_letter.sql` | google_maps_url, plot_letter |
| `20260716120000_add_urgent_until.sql` | `urgent_until` on properties + requests, partial indexes, `activate_urgent_property`/`activate_urgent_request` functions |
| `20260806120000_document_properties_intermediaries.sql` | Documents existing `properties.intermediaries` (`IF NOT EXISTS`) |
| `20260806120100_enable_push_subscriptions_rls.sql` | Enables RLS on `push_subscriptions` + recreates tenant-scoped policy |
| `20260806140000_add_dictionary_entries.sql` | Global self-learning dictionary (`dictionary_entries`) + RLS |
| `20260806150000_add_property_identity_engine.sql` | Property DNA identities + `intelligence_events` |
| `20260806160000_add_opportunity_intelligence.sql` | Request budget/area + `request_identities` + opportunity indexes |

**Gap:** none remaining for known app-written columns (intermediaries documented 2026-08-06).

---

## Relationships (ER sketch)

```
companies 1──* users
companies 1──* properties 1──0..1 property_owners
companies 1──* requests
companies 1──* notifications
companies 1──* push_subscriptions
packages 1──* companies (nullable package_id)
dictionary_entries (platform-global; optional FKs → users/companies for audit)
auth.users 1──1 users
```

See also: `11_ARCHITECTURE_DECISIONS.md` (owners separation, RLS helpers, ADR-020 dictionary).
