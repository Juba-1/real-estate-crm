# 07 — Dependency Map

Feature call graphs (UI → validation → action/data → infrastructure). Arrows mean “depends on / calls”.

---

## Add Property

```
Add page (RSC)
↓
AddPropertyForm
↓
insertPropertySchema (types/property)
↓ property-types constants (refinements)
↓
uploadPropertyImages (client) → Supabase Storage (property_media)
↓
addProperty (actions/property)
↓
createClient (server) → properties + property_owners
↓ companies (quota)
↓ createCompanyNotification → admin client → notifications
↓ sendCompanyPushNotification → push_subscriptions + web-push
↓
revalidatePath / redirectTo
```

---

## Edit Property

```
Edit page (RSC)
↓
getPropertyForEdit (lib/data/properties)
↓
editablePropertyToFormValues
↓
AddPropertyForm (edit mode)
↓
updatePropertySchema
↓
updateProperty → properties + property_owners
```

---

## Property Status / Delete

```
PropertyCard
↓
updatePropertyStatus → properties (+ optional storage delete)
↓
deleteProperty → properties (+ notification)
```

---

## Search (Market)

```
Search page
↓
SearchFilters (URL params)
↓
getCompanyProperties
↓
createClient → properties (RLS: company or visibility=global)
↓
PublicPropertyCard
↓ usePropertyLabels + formatListingDate
```

**Must not depend on:** `property_owners`.

---

## My Properties

```
My Properties page
↓
getMyProperties → properties + property_owners (owned)
↓
PropertyCard (confidential section + status)
```

---

## Requests

```
Requests page
↓
getCompanyRequests
↓
AddRequestDialog → insertRequestSchema → addRequest
    ↓ notification + push
↓
RequestCard → manageRequest → requests (RLS)
```

---

## Team Admin

```
Admin page layout (admin-only)
↓
getCompanyTeam
↓
CreateAgentDialog → createCompanyUser → Auth Admin + users + quota
↓
TeamRowActions → updateUserPassword / updateUserRole / deleteCompanyUser
```

---

## Company Settings

```
Settings page
↓
getCompanyBranding
↓
CompanySettingsForm
↓
uploadCompanyLogo → company_logos
↓
updateCompanyLogo → companies.logo_url
```

---

## Auth / Login

```
LoginForm
↓
login (app/.../login/actions)
↓
resolveAuthEmail
↓
supabase.auth.signInWithPassword
↓
users + companies.is_active
↓
redirectTo (/dashboard | /super-admin)
```

```
Middleware
↓
updateSession
↓
next-intl routing
↓
role / inactive company gates
```

---

## Notifications

```
NotificationsDropdown
↓
getUserNotifications / markNotificationAsRead / markAllAsRead
↓
notifications (RLS own rows)
```

Producer path (internal):

```
addProperty | addRequest | deleteProperty
↓
createCompanyNotification (service role fan-out)
```

---

## Web Push

```
PushNotificationManager
↓
lib/push/client (SW /sw.js, VAPID public)
↓
savePushSubscription / removePushSubscription
↓
push_subscriptions
```

```
addProperty | addRequest
↓
sendCompanyPushNotification
↓
admin query subscriptions by company_id
↓
web-push → browser push services
```

---

## Tenant Analytics / Reports

```
Dashboard page
↓
fetchTenantDashboardStats / getDashboardStats
↓
TenantAnalyticsDashboard (+ charts)
```

```
Reports page
↓
getAgentDetailedReports → fetchAgentDetailedReports
↓
AgentReportsPanel (CSV / print)
```

---

## Super Admin — Overview

```
SA page
↓
ensureSuperAdminPage
↓
getSuperAdminStats + getPlatformGrowthData + getRecentCompanies
↓
SuperAdminMetricCards + PlatformGrowthChart + RecentCompaniesCard
```

---

## Super Admin — Companies

```
AddCompanyDialog / CompanyRowActions / CompanyActiveToggle
↓
onboardNewTenant | updateCompany | resetTenantAdminPassword
  | deleteCompany | updateCompanyActiveStatus
↓
requireSuperAdmin
↓
admin client + Auth Admin API + companies/users/packages
```

---

## Super Admin — Packages & Settings

```
CreatePackageDialog / PackageRowActions
↓
createPackage | updatePackage | deletePackage
↓
packages
```

```
SystemSettingsForm
↓
saveSystemSettings
↓
system_settings
```

```
LandingPricing
↓
getPublicPackages (admin client read)
↓
packages
```

---

## Landing (public)

```
Locale home page
↓
LandingHeader / Hero / Features / Pricing / Footer
↓
getPublicPackages (pricing only)
```

Logged-in users redirected away in page logic.

---

## Cross-cutting dependency direction

```
app (pages)
  → components
  → hooks / types / lib/constants
  → actions | lib/data
  → lib/supabase | lib/push | lib/auth
  → Supabase / web-push
```

Forbidden: client components importing `lib/supabase/admin` or `send-company-push` private path with secrets.
