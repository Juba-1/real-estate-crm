# 04 — Server Actions

Convention: `"use server"` modules under `src/actions/` (+ colocated `login`). Prefer Zod `safeParse`, return `{ error: string } | null` (or typed unions), `revalidatePath`, rethrow `isRedirectError`.

---

## Auth

### `login` — `src/app/[locale]/login/actions.ts`

| | |
|--|--|
| **Purpose** | Sign in with email or username + password |
| **Inputs** | FormData: identifier, password |
| **Outputs** | Redirect on success; `{ error }` codes (invalid, inactive_company) |
| **Permissions** | Public |
| **Validation** | Non-empty; `resolveAuthEmail` for username |
| **Side effects** | Session cookies; may signOut if company inactive |
| **Pages** | `/[locale]/login` |
| **Tables** | `auth.users`, `users`, `companies` |

### `logout` — `src/actions/auth.ts`

| | |
|--|--|
| **Purpose** | End session |
| **Inputs** | None |
| **Outputs** | Redirect `/login` |
| **Permissions** | Authenticated (best-effort) |
| **Side effects** | `signOut`, redirect |
| **Pages** | Header / any authenticated shell |
| **Tables** | Auth session only |

---

## Properties

### `addProperty` — `src/actions/property.ts`

| | |
|--|--|
| **Purpose** | Create listing + confidential owner row |
| **Inputs** | `InsertPropertyInput` (Zod), incl. transient `mark_urgent` (not a DB column) |
| **Outputs** | `null` or `{ error }` / quota sentinel; redirects to my-properties |
| **Permissions** | Authenticated tenant user; quota vs `max_properties` |
| **Validation** | `insertPropertySchema` |
| **Side effects** | Insert properties + property_owners; company notification + push; if `mark_urgent`, delegates to `applyPropertyUrgentIntent` (urgent activation is logged, never fails the create); revalidate; rollback property if owner insert fails |
| **Pages** | `/dashboard/add` |
| **Tables** | `properties`, `property_owners`, `companies`, `notifications`, `push_subscriptions` |

### `updateProperty`

| | |
|--|--|
| **Purpose** | Update listing + owner confidential fields |
| **Inputs** | propertyId + `UpdatePropertyInput` (incl. transient `mark_urgent`) |
| **Outputs** | error or null |
| **Permissions** | Listing agent or company admin (app check + RLS) |
| **Validation** | Zod update schema |
| **Side effects** | Update both tables; delegates to `applyPropertyUrgentIntent` to activate/clear `urgent_until`; revalidate paths |
| **Pages** | `/dashboard/properties/[id]/edit` |
| **Tables** | `properties`, `property_owners` |

### `deleteProperty`

| | |
|--|--|
| **Purpose** | Delete listing (cascade owners) |
| **Inputs** | propertyId |
| **Outputs** | error or null |
| **Permissions** | Agent owner or company admin |
| **Side effects** | Delete row; optional in-app notification; revalidate |
| **Pages** | My properties card |
| **Tables** | `properties` (+ cascade), `notifications` |

### `updatePropertyStatus` — `src/actions/property-status.ts`

| | |
|--|--|
| **Purpose** | Change status; optionally purge images when sold |
| **Inputs** | propertyId, status, optional deleteImages |
| **Outputs** | error or null |
| **Permissions** | **Agent-owned only** (admins cannot via this action) |
| **Side effects** | Update; storage deletes; revalidate |
| **Pages** | Property card status controls |
| **Tables** | `properties`; Storage `property_media` |

---

## Requests

### `addRequest` — `src/actions/request.ts`

| | |
|--|--|
| **Purpose** | Post internal demand request |
| **Inputs** | `InsertRequestInput` (incl. transient `mark_urgent`) |
| **Outputs** | error or null |
| **Permissions** | Authenticated with company profile |
| **Validation** | `insertRequestSchema` |
| **Side effects** | Insert; notification + push; if `mark_urgent`, delegates to `applyRequestUrgentIntent`; revalidate `/dashboard/requests` |
| **Pages** | Requests page dialog |
| **Tables** | `requests`, `notifications`, `push_subscriptions` |

### `manageRequest`

| | |
|--|--|
| **Purpose** | renew (+14d / active), execute, or archive |
| **Inputs** | requestId, `ManageRequestAction` |
| **Outputs** | error or null |
| **Permissions** | **Auth only in action** — relies on RLS; **no explicit ownership/admin check in TS** |
| **Side effects** | Update status/expiry; revalidate |
| **Pages** | Request card |
| **Tables** | `requests` |

---

## Urgent (Release 2) — `src/actions/urgent.ts`

Shared by `addProperty`/`updateProperty`/`addRequest` — not called directly from unrelated flows.

### `checkUrgentPropertyConflict` / `checkUrgentRequestConflict`

| | |
|--|--|
| **Purpose** | Read-only: does the current agent already have another active-urgent property/request? Drives the "transfer?" confirmation dialog in the form, before any write. |
| **Inputs** | Optional `excludeId` (edit mode excludes the row being edited) |
| **Outputs** | `{ hasConflict: boolean }` |
| **Permissions** | Authenticated; scoped to `agent_id = current user` |
| **Side effects** | None (SELECT only) |
| **Pages** | Add/edit property form, add request dialog |
| **Tables** | `properties` / `requests` (SELECT `id` only) |

### `applyPropertyUrgentIntent` / `applyRequestUrgentIntent`

| | |
|--|--|
| **Purpose** | Make `urgent_until` match the form's `mark_urgent` intent. If turning on: calls `activate_urgent_property`/`activate_urgent_request` RPC (atomic transfer-safe UPDATE), then notifies the company only on the NULL/expired → urgent transition (no repeat notification on re-save). If turning off: clears `urgent_until` on that row only. |
| **Inputs** | propertyId/requestId, `markUrgent: boolean` |
| **Outputs** | `null` or `{ error }` (logged by the caller, never blocks the primary save) |
| **Permissions** | Authenticated; RPC is `SECURITY INVOKER` — bound by existing "Update/Delete" RLS policies |
| **Side effects** | RPC call (or single-row clear); reuses `createCompanyNotification` + `sendCompanyPushNotification` — no new notification channel |
| **Pages** | Called from `addProperty`, `updateProperty`, `addRequest` |
| **Tables** | `properties` / `requests`, `notifications`, `push_subscriptions` |

---

## Dictionary (Release 3) — `src/actions/dictionary.ts`

### `suggestDictionaryEntry` / `suggestFromListingFields`

| | |
|--|--|
| **Purpose** | Create or bump a pending/approved dictionary suggestion from custom listing fields. Never blocks the primary save. |
| **Inputs** | `SuggestDictionaryInput` or listing field bag + built-in catalogs |
| **Outputs** | `{ ok: true, … }` (incl. skip reasons) or `{ error }` — callers treat failures as non-fatal |
| **Permissions** | Authenticated company users insert `pending` for self; exact match increments `usage_count` via service role |
| **Side effects** | Insert/update `dictionary_entries` only |
| **Pages** | Called from `addProperty` / `updateProperty` / `addRequest` after successful write |
| **Tables** | `dictionary_entries` |

### `reviewDictionaryEntry`

| | |
|--|--|
| **Purpose** | Super-admin approve / reject / archive / delete / edit-before-approve / merge-into-existing |
| **Inputs** | `ReviewDictionaryInput` |
| **Outputs** | `null` or `{ error }` |
| **Permissions** | `requireSuperAdmin()` + service-role writes |
| **Side effects** | Status transitions; merge archives source and adds usage to target; delete blocked when refs/`usage_count` > 0 |
| **Pages** | `/super-admin/dictionary` |
| **Tables** | `dictionary_entries` (+ reference counts against `properties`/`requests`) |

### Catalog loaders (`loadCityOptionsAction`, `loadDistrictOptionsAction`, …)

Read helpers for client islands; RSC pages prefer `src/lib/dictionary-catalog.ts` / `src/lib/data/dictionary.ts` directly.

---

## Tenant admin / team

### `createCompanyUser` — `src/actions/admin-users.ts`

Create agent/admin auth user + profile; enforce `max_agents`; rollback on failure. **Admin|super_admin** (company-scoped for admin). Tables: `auth.users`, `users`, `companies`.

### `deleteCompanyUser`

Delete auth user (cascades profile). Protect last-admin cases. Admin scoped.

### `updateUserPassword`

Admin resets teammate password via Auth Admin API.

### `updateUserRole`

Promote/demote within company; blocks demoting last admin. **Tenant admin only** (not super_admin path for logo-style rules — verify in file).

### `updateCompanyLogo` — `src/actions/company-settings.ts`

Set `companies.logo_url` after client upload. Tenant admin. Tables: `companies`.

---

## Super admin — companies

All require `requireSuperAdmin` / ensure path (see `lib/auth/super-admin.ts`). File: `src/actions/companies.ts`.

| Action | Purpose | Key side effects |
|--------|---------|------------------|
| `onboardNewTenant` | Company + first admin user | Auth create; package quotas; rollback |
| `updateCompany` | Name, package, quotas | Update companies |
| `resetTenantAdminPassword` | Reset admin password | Auth Admin API |
| `deleteCompany` | Remove tenant | Cascades; Auth cleanup |
| `updateCompanyActiveStatus` | Activate/deactivate | Sets `is_active` |

**Pages:** `/super-admin/companies`. **Tables:** `companies`, `users`, `packages`, auth.

---

## Super admin — packages / settings

| Action | File | Purpose |
|--------|------|---------|
| `createPackage` / `updatePackage` / `deletePackage` | `packages.ts` | CRUD SaaS plans |
| `saveSystemSettings` | `settings.ts` | Upsert `system_settings` keys |

**Pages:** `/super-admin/packages`, `/super-admin/settings`.

---

## Notifications & push

| Action | Purpose | Notes |
|--------|---------|-------|
| `getUserNotifications` | List current user’s notifications | Read |
| `markNotificationAsRead` | Single read | Own row RLS |
| `markAllAsRead` | Bulk read | Own rows |
| `createCompanyNotification` | **Removed from Server Actions** — use `notifyCompanyUsers` (`@/lib/notifications/notify-company`, server-only) with actor + company binding before service-role fan-out |
| `savePushSubscription` | Upsert endpoint/subscription JSON | Own user + company |
| `removePushSubscription` | Delete by endpoint | Own user |

**UI:** `NotificationsDropdown`, `PushNotificationManager`.

---

## Analytics / reports

| Action | Purpose | Permissions |
|--------|---------|-------------|
| `getTenantDashboardStats` | Dashboard metrics wrapper | Authenticated tenant |
| `getAgentDetailedReports` | Agent performance detail | Company admin |

Prefer calling `lib/data/*` from RSC when possible; these exist for client refresh patterns.

---

## Inventory checklist (exports)

- login, logout  
- addProperty, updateProperty, deleteProperty, updatePropertyStatus  
- addRequest, manageRequest  
- checkUrgentPropertyConflict, checkUrgentRequestConflict, applyPropertyUrgentIntent, applyRequestUrgentIntent  
- createCompanyUser, deleteCompanyUser, updateUserPassword, updateUserRole  
- updateCompanyLogo  
- onboardNewTenant, updateCompany, resetTenantAdminPassword, deleteCompany, updateCompanyActiveStatus  
- createPackage, updatePackage, deletePackage  
- saveSystemSettings  
- getUserNotifications, markNotificationAsRead, markAllAsRead
- notifyCompanyUsers (lib, not a Server Action)  
- savePushSubscription, removePushSubscription  
- getTenantDashboardStats, getAgentDetailedReports  

Related diagrams → `07_DEPENDENCY_MAP.md`. Security gaps → `08_CODE_SMELLS.md`.
