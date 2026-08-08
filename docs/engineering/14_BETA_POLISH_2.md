# 14 — Beta Polish 2: Component Architecture & Enterprise UX

**Status:** Complete for Beta scope (behavior-preserving UI refactors only).  
**Does not change:** Identity Engine, Opportunity Engine, Notifications semantics, Urgent rules, Dictionary, Security/authz, DB schema, or Beta Polish 1 performance baselines.

---

## Goals

1. Split mega-forms into single-responsibility sections.
2. Deduplicate badge / empty-state / urgent-field UI.
3. Standardize list empty states and loading chrome.
4. Keep forms/dialogs accessible and mobile-safe without changing business logic.

---

## Components extracted

### Property form (`add-property-form.tsx` shell)

| Section | Path | Responsibility |
|---------|------|----------------|
| Basic | `properties/form/property-basic-section.tsx` | Type, offer, title, custom type |
| Location | `properties/form/property-location-section.tsx` | City / district / custom location |
| Details | `properties/form/property-details-section.tsx` | Specs, pricing, intermediaries, urgent |
| Maps | `properties/form/property-maps-section.tsx` | Map URL / coordinates |
| Media | `properties/form/property-media-section.tsx` | Image pick / preview / remove |
| Owner | `properties/form/property-owner-section.tsx` | Confidential owner PII fields |
| Payload | `properties/form/normalize-property-payload.ts` | Form → action payload shaping |

Shell retains: RHF orchestration, submit/upload, identity warning, urgent transfer conflict, live opportunity panel.

### Request dialog (`add-request-dialog.tsx` shell)

| Section | Path | Responsibility |
|---------|------|----------------|
| Basic | `requests/form/request-basic-fields.tsx` | Type, offer, title |
| Location | `requests/form/request-location-fields.tsx` | City / district |
| Budget | `requests/form/request-budget-fields.tsx` | Budget / area bands |
| Details | `requests/form/request-details-field.tsx` | Free-text details |

### Shared form / UI

| Component | Path | Notes |
|-----------|------|-------|
| Mark urgent | `forms/mark-urgent-field.tsx` | Shared switch + surface styles |
| Urgent transfer | `forms/urgent-transfer-dialog.tsx` | `entity: property \| request` |
| Empty state | `ui/empty-state.tsx` | List pages |
| Badge styles | `lib/ui/badge-styles.ts` | Status / urgent / expiry classes |

---

## Size reduction (approx. lines)

| File | Before | After |
|------|--------|-------|
| `add-property-form.tsx` | ~1339 | ~479 |
| `add-request-dialog.tsx` | ~623 | ~212 |

---

## UX improvements

- **Empty states:** My Properties, Search, Requests, Super-Admin Packages use `EmptyState`.
- **Badges:** Property / public property / request cards share `badge-styles` (urgent + status/expiry).
- **Urgent UX:** One mark-urgent field + one transfer dialog for both entities.
- **Loading:** Existing `dashboard/loading.tsx` + search filter `Skeleton` suspense fallback.
- **Dialogs:** Request dialog keeps `sm:max-w-2xl` + `max-h-[90vh] overflow-y-auto` for mobile.

---

## Duplicate UI removed

- Inline urgent/status badge class strings on listing cards → `lib/ui/badge-styles.ts`.
- Duplicated dashed empty shells on tenant list pages → `EmptyState`.
- Duplicated mark-urgent switch markup → `MarkUrgentField`.
- Duplicated urgent-transfer AlertDialog copy → `UrgentTransferDialog`.

---

## Remaining technical debt

| Item | Notes |
|------|-------|
| `property-details-section.tsx` (~400 lines) | Still large (pricing + specs + intermediaries + urgent). Further split only if needed; stop if behavior risk rises. |
| Orphan dashboards | `admin-dashboard` / `agent-dashboard` still dead (refactor plan H10). |
| Shared `MetricCard` | Tenant vs super-admin metric tiles still diverge (M1). |
| Dictionary admin empty / tables | Not fully on `EmptyState`; admin tables need dedicated mobile audit. |
| Card / opportunity panels | Not section-split; acceptable for Beta. |
| Notifications dropdown empty | Compact text empty (appropriate for menu; not full `EmptyState`). |
| Form a11y deep pass | Focus order / error linking mostly RHF+shadcn; no automated a11y suite yet. |

---

## Regression guardrails (Objective 8)

Do **not** reverse in follow-ups without an ADR:

- Intelligence engines (identity / opportunity scoring & notify)
- Notification channels & anti-spam receipts
- Authz helpers / RLS private_schema pattern
- Urgent timestamp + RPC transfer semantics
- Dictionary review gate
- Polish 1: `React.cache`, middleware gate, `loading.tsx`, `prefetch={false}`, deferred header islands

---

## Verification checklist

- [x] `npx tsc --noEmit`
- [x] `npm test` (20 passed)
- [x] `npm run build`
