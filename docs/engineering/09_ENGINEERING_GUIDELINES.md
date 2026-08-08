# 09 — Engineering Guidelines

Project-specific standard for DEERAH / real-estate-crm. Complements `.cursorrules` and `AGENTS.md`.

---

## Folder conventions

| Put here | Do not put here |
|----------|-----------------|
| Pages/layouts → `src/app/[locale]/...` | Business rules in pages beyond gates/fetch |
| Mutations → `src/actions/` | New Route Handlers under `app/api` unless explicitly approved |
| Reads for RSC → `src/lib/data/` | Mutations in `lib/data` |
| Zod/TS contracts → `src/types/` | Ad-hoc unreused schemas inside components |
| Domain constants → `src/lib/constants/` | Magic strings for property types in JSX |
| Presentational primitives → `src/components/ui/` | Domain actions or Supabase calls |
| SQL changes → new file in `supabase/migrations/` | Editing applied historical migrations |

Login action may remain colocated under `login/` until intentionally moved.

---

## Naming conventions

- Files: `kebab-case.tsx` / `kebab-case.ts`.
- Components: `PascalCase` exports matching filename intent.
- Server Actions: verb-first (`addProperty`, `manageRequest`).
- Data loaders: `get*` / `fetch*` — prefer one style per domain; document aliases if both exist.
- DB columns: `snake_case`. Property type **values**: English keys (`villa`, not Arabic).
- i18n keys: nested namespaces in `messages/ar.json` & `en.json` — keep keys parallel.

---

## Server Action conventions

1. File starts with `"use server"`.
2. Validate with Zod `safeParse` at the boundary.
3. Call `supabase.auth.getUser()` — never trust client-provided `user.id` alone.
4. Add explicit company/role checks for sensitive mutations (do not rely on RLS alone for defense-in-depth).
5. Return `{ error: string } | null` or a documented typed union.
6. Use `revalidatePath` for affected routes.
7. Use `redirectTo` from `@/i18n/server-redirect`; **always** `if (isRedirectError(error)) throw error`.
8. `createAdminClient` only when RLS cannot express the operation; never import in Client Components.
9. Side effects (notify/push) must not fail the primary business write unless product requires it — but log failures.

---

## Database conventions

1. Every new core table: `company_id`, RLS enabled, policies using `private_schema.*`.
2. Never store owner PII on `properties`.
3. Prefer TEXT + Zod over new Postgres ENUMs (except existing `user_role`).
4. Add indexes with migrations when introducing filtered list queries.
5. Quotas: document whether enforced in app only; prefer future DB constraints for hard limits.

---

## Migration conventions

1. Filename: `YYYYMMDDHHMMSS_description.sql`.
2. Wrap in `BEGIN;` / `COMMIT;` when multiple statements.
3. Prefer `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS` for idempotency where safe.
4. Never edit a migration already applied on shared environments — add a follow-up.
5. App feature that needs a column **ships with its migration in the same PR**.
6. After RLS changes, verify with advisors / manual cross-tenant tests.

---

## Supabase conventions

1. Clients only via `@supabase/ssr` helpers in `lib/supabase/*`.
2. Publishable/anon key for user-scoped work; service role server-only.
3. Storage paths must be tenant-scoped: `{company_id}/...`.
4. Do not put authorization decisions in `user_metadata`.
5. Generate types with Supabase CLI when schema changes (`database.types.ts`) — goal state.

---

## RLS conventions

1. Helpers in `private_schema`, `SECURITY DEFINER`, `SET search_path`, revoke `PUBLIC` execute, grant `authenticated`.
2. Admin branches **must** include `company_id = private_schema.get_user_company_id()` unless the row is platform-global by design (`packages`, `system_settings`).
3. Prefer separate SELECT / INSERT / UPDATE / DELETE policies for clarity on new tables.
4. UPDATE needs SELECT policy; use `WITH CHECK` matching `USING` for ownership.
5. Never join `property_owners` into policies or queries used by public/search cards.

---

## React conventions

1. Default to Server Components; add `"use client"` only for interactivity.
2. Forms: RHF + Zod resolver sharing schemas with actions.
3. Prefer URL search params for shareable filters.
4. No new global client stores unless justified.
5. Follow Next.js 16 docs in `node_modules/next/dist/docs/` (see `AGENTS.md`).
6. Do not add `useMemo`/`useCallback` by default unless repo patterns require them.

---

## TypeScript conventions

1. Prefer Zod-inferred types over parallel hand-written interfaces.
2. Avoid `any`; narrow Supabase results explicitly until generated types land.
3. Shared unions for statuses/types live next to Zod enums in `src/types` or constants.

---

## Reusable component rules

1. `ui/` = primitives only.
2. Domain components receive data via props from RSC when possible.
3. If a UI pattern appears twice (MetricCard, status badge), extract before a third copy.
4. Property form sections should be extractable presentational pieces; keep submit orchestration in one container.
5. Delete dead components rather than leaving “alternate dashboards”.

---

## Utility rules

1. Pure formatters/helpers in `src/lib`; hooks in `src/hooks`.
2. i18n user-facing strings via `next-intl`, not hardcoded Arabic in new code (notifications currently Arabic — migrate carefully).
3. Before adding a helper, search `06_SHARED_UTILITIES.md` and existing `lib/`.
4. Client-safe vs server-only modules must stay separated (push send, admin client).

---

## Validation rules

1. Client validation improves UX; **server Zod is authoritative**.
2. Conditional fields (land plot letter, intermediaries when `is_direct === false`) validated in schema refinements + UI visibility helpers from constants.
3. Empty optional URLs should coerce to null/omit, not store `""` when avoidable.

---

## Documentation rules

1. Schema/behavior changes: update `docs/engineering/03_DATABASE.md` and relevant action/component docs in the same PR when non-trivial.
2. Do not duplicate full inventories across files — link.
3. Mark assumptions explicitly if production state is unknown (e.g. applied migrations).

---

## Review checklist

- [ ] Migration present for any new/changed column or policy  
- [ ] RLS uses `private_schema` and company scoping for admin  
- [ ] No `property_owners` in search/public card queries  
- [ ] Server Action: Zod + getUser + company/role checks  
- [ ] No service role in client bundles  
- [ ] Redirect errors rethrown  
- [ ] i18n keys added to **both** `ar.json` and `en.json`  
- [ ] `revalidatePath` for mutated routes  
- [ ] No new duplicate MetricCard/status badge/formatters  
- [ ] Secrets only in server env (no `NEXT_PUBLIC_` for private keys)  

---

## Definition of Done

A change is done when:

1. It meets the product acceptance criteria.
2. Required SQL is in `supabase/migrations` and noted for apply on remote.
3. Types/Zod/UI agree on field names and enums.
4. Tenant isolation preserved (manual or automated check for cross-company access).
5. Lint/build pass for touched areas (fix known lint debt only with ticket).
6. Engineering docs updated if architecture, schema, or action inventory changed.
7. No owner PII exposed on market/search surfaces.
