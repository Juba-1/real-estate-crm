# 06 — Shared Utilities

Inventory of reusable helpers, formatters, hooks, validators, and data loaders. Prefer importing these over copying logic into components.

---

## Hooks

| Symbol | Location | Purpose | Used by | Reuse? | Duplicates? |
|--------|----------|---------|---------|--------|-------------|
| `usePropertyLabels` | `src/hooks/use-property-labels.ts` | i18n labels for type/offer/status/price | Property cards, forms, filters | Yes | Overlaps hardcoded `formatPropertyType` for AR display |

---

## Class / UI helpers

| Symbol | Location | Purpose | Used by | Reuse? |
|--------|----------|---------|---------|--------|
| `cn` | `lib/utils.ts` | `clsx` + `tailwind-merge` | Nearly all components | Yes |

---

## Auth helpers

| Symbol | Location | Purpose | Used by | Reuse? | Notes |
|--------|----------|---------|---------|--------|-------|
| `resolveAuthEmail` | `lib/auth/username.ts` | Map username → `@agency.local` email | Login, user create | Yes | |
| `AGENCY_AUTH_EMAIL_DOMAIN` | same | Domain constant | Same | Yes | |
| `requireSuperAdmin` | `lib/auth/super-admin.ts` | Guard for actions | Super-admin actions | Yes | |
| `ensureSuperAdminPage` | same | Guard for pages | SA layouts/pages | Yes | |
| `isCompanyActiveForUser` | `lib/auth/company-access.ts` | Active company check | Middleware / login | Yes | |

---

## Supabase clients & storage

| Symbol | Location | Purpose | Client-safe? |
|--------|----------|---------|--------------|
| `createClient` | `lib/supabase/client.ts` | Browser client | Yes |
| `createClient` | `lib/supabase/server.ts` | Cookie SSR client | Server only |
| `updateSession` | `lib/supabase/middleware.ts` | Refresh cookies | Middleware |
| `createAdminClient` | `lib/supabase/admin.ts` | Service role | **Server only — never in client** |
| `uploadPropertyImages` | `lib/supabase/storage.ts` | Compress+upload paths | Browser forms |
| `uploadCompanyLogo` | same | Logo upsert | Settings form |
| `extractPropertyMediaPaths` | same | URL → storage paths | Status/delete flows |

---

## Domain constants & field visibility

| Symbol | Location | Purpose | Used by |
|--------|----------|---------|---------|
| `PROPERTY_TYPE_VALUES`, `OTHER_OPTION`, `NEIGHBORHOOD_OTHER_OPTION` | `lib/constants/property-types.ts` | Canonical keys | Types, forms, actions |
| `normalizePropertyType` | same | Legacy → EN key | Prefer in labels/queries |
| `isLandType`, `isVillaType`, `isBuildingType`, `isCommercialType`, `isResidentialType`, `isPropertyTypeOther`, `isNeighborhoodOther`, `isOtherOption` | same | Type predicates | Form conditionals, Zod refinements |
| `shouldShowRooms/Age/StreetWidth/LandFields/BuildingFields/AnnexField` | same | Conditional UI | Add property form |
| `SAUDI_EASTERN_CITIES`, `EASTERN_CITY_NAMES`, `getNeighborhoodsForCity` | `lib/constants/locations.ts` | City/neighborhood lists | Forms, filters |

---

## Property formatters / mappers

| Symbol | Location | Purpose | Used by | Duplicate risk |
|--------|----------|---------|---------|----------------|
| `formatPropertyType` | `lib/property-utils.ts` | Hardcoded AR/EN-ish labels | Notifications, some UI | **Yes** — prefer `usePropertyLabels` / messages |
| `formatNeighborhoodLabel` | same | Other-neighborhood display | Cards | Low |
| `PROPERTY_TYPES` | same | Re-export array | Selects | Overlaps constants |
| `editablePropertyToFormValues` | `lib/property-form-utils.ts` | DB row → RHF defaults | Edit page | Unique — keep |
| `formatListingDate` | `lib/format-listing-date.ts` | Absolute listing date by locale | Both property cards | Canonical — use everywhere |

---

## User / nav / quota

| Symbol | Location | Purpose | Used by | Notes |
|--------|----------|---------|---------|-------|
| `formatUserRole` | `lib/user-utils.ts` | Role → display string | **Unused** | Dead export |
| `getUserInitials` | same | Avatar initials | Headers | Live |
| `getDashboardNavItems` | `lib/dashboard-nav.ts` | Role-aware nav | Sidebar | |
| `superAdminNavItems` | `lib/super-admin-nav.ts` | SA nav | SA sidebar | |
| `QUOTA_EXCEEDED`, `isQuotaExceededResult` | `lib/quota.ts` | Quota error sentinel | Property/admin actions + forms | |

---

## Push

| Symbol | Location | Purpose | Used by | Duplicate? |
|--------|----------|---------|---------|------------|
| `getVapidPublicKey`, `isPushSupported`, `registerPushServiceWorker`, `subscribeToPush`, `serializePushSubscription`, `getPushClientErrorMessage` | `lib/push/client.ts` | Browser subscribe | PushNotificationManager | VAPID sanitize may mirror server |
| `sendCompanyPushNotification` | `lib/push/send-company-push.ts` | Tenant broadcast | addProperty, addRequest | Server only |

---

## i18n helpers

| Symbol | Location | Purpose |
|--------|----------|---------|
| Routing / Link / useRouter | `src/i18n/navigation.ts` | Locale-aware navigation |
| `redirectTo` | `src/i18n/server-redirect.ts` | Server redirect with locale |
| Message loading | `src/i18n/request.ts` | next-intl config |
| Locale config | `src/i18n/routing.ts` | `ar`/`en`, always prefix |

---

## Data loaders (`lib/data/*`)

Read models for RSC/pages (not mutations).

| Function | File | Purpose |
|----------|------|---------|
| `getCurrentUser` | `user.ts` | Profile for layouts |
| `getCompanyBranding` | `company.ts` | Name/logo |
| `getCompanyProperties` | `properties.ts` | Search list + filters |
| `getMyProperties` | same | Agent listings + owners |
| `getPropertyForEdit` | same | Edit payload |
| `getCompanyRequests` | `requests.ts` | Active non-expired |
| `getCompanyTeam` | `team.ts` | Admin table |
| `fetchTenantDashboardStats` / `getDashboardStats` | `analytics.ts` | Dashboard metrics |
| `fetchAgentDetailedReports` | `reports.ts` | Reports |
| `getAllPackages` / `getPublicPackages` | `packages.ts` | SA vs landing |
| `getSystemSettings` | `settings.ts` | SA settings |
| `getSuperAdminStats`, `getAllCompanies`, `getPlatformGrowthData`, `getRecentCompanies` | `super-admin.ts` | Control plane |

---

## Validators (Zod) — `src/types/`

| Module | Schemas / types | Used by |
|--------|-----------------|---------|
| `types/property.ts` | insert/update property, specs refinements | Form, property actions |
| `types/request.ts` | insert + manage action union | Request UI/actions |
| `types/user.ts` | CurrentUserProfile, roles | Auth/data |
| `types/company.ts` | Onboarding/update shapes | SA companies |
| `types/package.ts` | Package CRUD | SA packages |
| `types/settings.ts` | System settings | SA settings |
| `types/admin-user.ts` | Create user / role | Admin panel |
| `types/notifications.ts` | Notification shapes | Bell UI |
| `types/reports.ts` | Report DTOs | Reports panel |

**Coupling:** property Zod refinements import `lib/constants/property-types` (allowed direction: types → constants).

---

## Inline / duplicated helpers (should consolidate)

| Pattern | Locations | Recommendation |
|---------|-----------|----------------|
| Status badge class/label | `property-card` + `public-property-card` | Extract shared helper |
| Local `MetricCard` | admin-dashboard, agent-dashboard, tenant-analytics, super-admin-metric-cards | One shared presentational metric |
| Date formatting | listing date util vs ad-hoc elsewhere | Prefer `formatListingDate` |
| VAPID key sanitization | client + server push modules | Single shared pure util (safe for public key only) |
| Property type display | `formatPropertyType` vs i18n hook | Single source via messages |

---

## Reuse checklist for new engineers

1. Need Tailwind class merge → `cn`.
2. Need property field visibility → `shouldShow*` in constants.
3. Need city neighborhoods → `getNeighborhoodsForCity`.
4. Need listing date → `formatListingDate`.
5. Need auth email for username → `resolveAuthEmail`.
6. Need service role → `createAdminClient` only on server.
7. Need quota UI handling → `isQuotaExceededResult`.
8. Do not copy MetricCard or status badge — extract or import.
