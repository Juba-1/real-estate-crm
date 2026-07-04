# تقرير التدقيق الشامل قبل النشر
## نظام إدارة العقارات (Real Estate CRM) — B2B SaaS

**تاريخ التدقيق:** 4 يوليو 2026  
**النطاق:** مراجعة `master.md`، المخطط، Server Actions، الواجهة، RLS، والأمان  
**الحالة العامة:** النظام **جاهز للنشر التجريبي (Soft Launch)** مع وجود **ثغرات أمنية حرجة يجب معالجتها قبل الإنتاج الكامل**.

---

## 1. ملخص تنفيذي

تم بناء منصة متعددة المستأجرين (Multi-Tenant) لإدارة العقارات تتجاوز المخطط الأصلي في `master.md` من حيث ميزات SaaS (سوبر أدمن، باقات، صفحة هبوط، تقارير، إشعارات، ثيم فاخر). البنية الأساسية للأمان (فصل `properties` عن `property_owners`، RLS عبر `private_schema`) **مطبّقة بشكل صحيح** على مستوى PostgreSQL.

ومع ذلك، توجد **فجوات وظيفية** (تعديل العقار، بحث ضبابي، أرشفة تلقائية للطلبات) و**مخاطر أمنية** (تخزين عام للصور، سياسات Storage ضعيفة، مسار seed غير محمي) تتطلب معالجة قبل الإطلاق الرسمي.

| المحور | التقييم |
|--------|---------|
| الميزات الأساسية من `master.md` | ~85% مُنفَّذة |
| ميزات SaaS الإضافية | مُنفَّذة (مراحل 16–27) |
| عزل بيانات الشركات (RLS على الجداول) | جيد |
| أمان التخزين (Storage) | **ضعيف — يحتاج إصلاح عاجل** |
| محاذاة Backend ↔ Frontend | توجد منطق يتيم |
| الجاهزية للإنتاج | **مشروطة بإصلاحات أمنية** |

---

## 2. مراجعة المخطط الأصلي (`master.md`) مقابل التنفيذ

### 2.1 ما تم تنفيذه بنجاح ✅

| الميزة (من `master.md`) | الحالة | الموقع في الكود |
|-------------------------|--------|-----------------|
| Next.js 16 App Router + Tailwind + Shadcn | ✅ | المشروع بالكامل |
| Supabase Auth عبر `@supabase/ssr` | ✅ | `src/lib/supabase/` |
| Zod + React Hook Form | ✅ | النماذج والـ Actions |
| `company_id` على الجداول الأساسية | ✅ | migrations |
| فصل `properties` / `property_owners` | ✅ | schema + RLS |
| RLS عبر `private_schema` SECURITY DEFINER | ✅ | `20260702143817_init_real_estate_schema.sql` |
| أدوار: super_admin / admin / agent | ✅ | `users.role` + middleware |
| إضافة عقار (Comboboxes، المنطقة الشرقية) | ✅ | `add-property-form.tsx` |
| `specs` JSONB + صور Storage | ✅ | `property.ts`, `storage.ts` |
| علم `is_direct` | ✅ | نموذج الإضافة |
| دورة حياة الحالة (available/pending/sold/rented) | ✅ | `property-card.tsx` |
| نافذة حذف الصور عند البيع | ✅ | `soldDialog` في `property-card.tsx` |
| نظام الطلبات الداخلية (Hybrid) | ✅ | `request.ts`, `requests/` |
| تجديد / تنفيذ / أرشفة الطلبات يدوياً | ✅ | `manageRequest` |
| انتهاء الطلبات بعد 14 يوماً (عرض فقط) | ⚠️ جزئي | فلترة `expires_at` في `lib/data/requests.ts` |
| بحث داخلي + عرض وسيط (بدون المالك) | ✅ | `search/page.tsx`, `public-property-card.tsx` |
| إدارة المستخدمين (مدير المكتب) | ✅ | `admin-users.ts`, `admin/page.tsx` |
| تعدد اللغات (عربي/إنجليزي) | ✅ | `messages/`, `next-intl` |

### 2.2 ميزات إضافية خارج `master.md` (مُنفَّذة) ✅

| الميزة | الوصف |
|--------|--------|
| لوحة سوبر أدمن | شركات، باقات، حصص، إعدادات |
| صفحة هبوط تسويقية | `/[locale]` مع تسعير ديناميكي |
| ثيم فاخر + وضع داكن | Tajawal، `next-themes` |
| شعار المكتب | `logo_url` + `company-settings.ts` |
| حصص مخصصة per-tenant | `max_properties`, `max_agents` |
| تغيير صلاحيات المستخدم | `updateUserRole` |
| لوحة تحليلات المستأجر | `analytics.ts`, `dashboard/page.tsx` |
| تقارير مفصلة + CSV/PDF | `reports/page.tsx` |
| نظام إشعارات | `notifications` table + جرس الهيدر |
| أنواع عقارات موسّعة | migration `expand_property_types` |
| حقول ديناميكية (عمارة، أرض، إلخ) | `floors_count`, `has_annex`, ... |

### 2.3 ما تم تخطيه أو تعديله أو تنفيذه جزئياً ⚠️ / ❌

| الميزة المخططة | الحالة | التفاصيل |
|----------------|--------|----------|
| **تعديل العقار (Edit)** | ❌ غير موجود | يوجد `addProperty` فقط؛ لا `updateProperty` ولا واجهة تعديل |
| **بحث ضبابي (Fuzzy Search)** | ❌ معدّل | البحث الحالي فلاتر dropdown (مدينة، نوع، عرض، حالة) — لا بحث نصي |
| **تذكير حذف الصور بعد 30 يوماً** | ❌ غير منفَّذ | مذكور في `master.md` §5.B؛ لا cron ولا flag ولا UI |
| **أرشفة تلقائية للطلبات** | ⚠️ جزئي | الطلبات المنتهية تُخفى من القائمة (`gte expires_at`) لكن **لا تُحدَّث** `status` إلى `archived` تلقائياً |
| **تنبيه قبل انتهاء الطلب** | ⚠️ جزئي | شارة أيام متبقية في `request-card.tsx`؛ لا modal إلزامي قبل الانتهاء |
| **`visibility = global`** | ❌ غير مربوط | العمود موجود في DB وRLS يدعمه؛ **لا واجهة** لتغييره (الكل `company_only`) |
| **إعدادات النظام العامة** | ❌ واجهة فقط | `saveSystemSettings` يُرجع نجاحاً **بدون حفظ في DB** |
| **`is_active` للشركات** | ⚠️ جزئي | السوبر أدمن يفعّل/يعطّل؛ **لا يُمنع تسجيل الدخول** للشركات المعطّلة |
| **حذف العقار من الواجهة** | ❌ | `deleteProperty` موجود في `property.ts` **لكن غير مربوط بأي زر** |
| **إشعارات حذف العقار** | ⚠️ | المُشغِّل موجود في `deleteProperty` الذي لا يُستدعى من UI |
| **Zinc preset (Shadcn)** | 🔄 معدّل | استُبدل بثيم navy/gold مخصص |
| **مدن الخطة (Khobar/Dammam/Dhahran/Qatif)** | 🔄 موسّع | أُضيفت **الأحساء** أيضاً |

---

## 3. محاذاة Backend ↔ Frontend (المنطق اليتيم)

### 3.1 Server Actions بدون واجهة مستخدم

| الإجراء | الملف | المشكلة |
|---------|-------|---------|
| `deleteProperty` | `src/actions/property.ts` | **لا يوجد زر حذف** في `property-card` أو أي مكوّن |
| `saveSystemSettings` | `src/actions/settings.ts` | واجهة موجودة لكن **لا يوجد جدول `system_settings`** — الحفظ وهمي |
| `createCompanyNotification` | `src/actions/notifications.ts` | داخلي فقط (مقصود) — يُستدعى من `request.ts` و`property.ts` |

### 3.2 أعمدة قاعدة البيانات بدون إدخال من المستخدم

| الجدول | العمود | الحالة |
|--------|--------|--------|
| `properties` | `visibility` | افتراضي `company_only` — **لا UI** |
| `properties` | `status_updated_at` | يُحدَّث تلقائياً — لا عرض للمستخدم |
| `properties` | `custom_property_type` | ✅ مربوط (عند اختيار «أخرى») |
| `properties` | `custom_neighborhood` | ✅ مربوط |
| `properties` | `floors_count`, `apartments_count`, `shops_count`, `has_annex` | ✅ مربوط في نموذج الإضافة |
| `requests` | `status` | يُدار عبر `manageRequest` — لا أرشفة آلية |
| `companies` | `is_active` | سوبر أدمن فقط — **لا تأثير على الدخول** |
| `companies` | `package_id` | سوبر أدمن فقط — المستأجر لا يراه |
| `notifications` | `company_id` | داخلي — لا حاجة لـ UI |

### 3.3 واجهات بدون Backend كامل

| الواجهة | المشكلة |
|---------|---------|
| `SystemSettingsForm` | تعرض نجاح الحفظ بينما لا يُخزَّن شيء |
| صفحة التقارير | ✅ مربوطة بـ `getAgentDetailedReports` |
| جرس الإشعارات | ✅ مربوط — يتطلب تطبيق migration `20260704160000` |

### 3.4 نقاط نهاية API

| المسار | الخطر |
|--------|-------|
| `GET /api/seed-root` | **حرج:** ينشئ سوبر أدمن بكلمة مرور ثابتة (`SuperPassword123!`) ويعيدها في JSON — **يجب تعطيله في الإنتاج** |

### 3.5 جلب البيانات العامة (صفحة الهبوط)

| الدالة | الآلية | الأمان |
|--------|--------|--------|
| `getPublicPackages()` | Service Role على الخادم فقط | ✅ آمن — لا يُعرض المفتاح للمتصفح |
| الباقات في RLS | لا SELECT لـ `anon`/`authenticated` | ✅ القراءة العامة فقط عبر الخادم |

---

## 4. قاموس البيانات — إلزامي مقابل اختياري

### 4.1 الشركات (`companies`)

| الحقل | DB | Zod/UI | ملاحظات |
|-------|-----|--------|---------|
| `id` | تلقائي | — | UUID |
| `name` | **إلزامي** | **إلزامي** | min 2 حرف |
| `is_active` | افتراضي `true` | سوبر أدمن | لا تحقق عند الدخول |
| `max_properties` | **إلزامي** | **إلزامي** (onboard/edit) | افتراضي 50 |
| `max_agents` | **إلزامي** | **إلزامي** | افتراضي 3 |
| `package_id` | اختياري | **إلزامي** في النماذج | FK → `packages` |
| `logo_url` | اختياري | اختياري | رفع من الإعدادات |
| `created_at` | تلقائي | — | |

### 4.2 المستخدمون (`users`)

| الحقل | DB | Zod/UI | ملاحظات |
|-------|-----|--------|---------|
| `id` | **إلزامي** | — | = `auth.users.id` |
| `company_id` | **إلزامي** | — | |
| `role` | افتراضي `agent` | **إلزامي** عند الإنشاء | enum |
| `name` | **إلزامي** | **إلزامي** | |
| `phone` | اختياري | اختياري | |
| `created_at` | تلقائي | — | |

**إنشاء مستخدم (`createCompanyUserSchema`):** الاسم، اسم المستخدم، كلمة المرور (≥6)، الدور — **إلزامية**؛ الهاتف — **اختياري**.

### 4.3 العقارات (`properties`)

| الحقل | DB | Zod (`insertPropertySchema`) | ملاحظات |
|-------|-----|------------------------------|---------|
| `type` | **إلزامي** | **إلزامي** | قائمة عربية موسّعة |
| `custom_property_type` | اختياري | **إلزامي شرطياً** | عند `type = أخرى` |
| `offer_type` | **إلزامي** | **إلزامي** | sale / rent |
| `city` | **إلزامي** | **إلزامي** | من القائمة الشرقية |
| `neighborhood` | **إلزامي** (DB) | **إلزامي** | |
| `custom_neighborhood` | اختياري | **إلزامي شرطياً** | عند حي «أخرى» |
| `price` | **إلزامي** | **إلزامي** | > 0 |
| `area` | **إلزامي** | **إلزامي** | > 0 |
| `specs` | افتراضي `{}` | الكل **اختياري** | rooms, age, street_width, plan_number, plot_number, notes |
| `floors_count` | اختياري | اختياري | للعمارة |
| `apartments_count` | اختياري | اختياري | |
| `shops_count` | اختياري | اختياري | |
| `has_annex` | اختياري | اختياري | |
| `images` | افتراضي `[]` | اختياري | مصفوفة URLs |
| `is_direct` | افتراضي `true` | **إلزامي** (boolean) | |
| `status` | افتراضي `available` | — | يُحدَّث لاحقاً |
| `visibility` | افتراضي `company_only` | — | لا UI |
| `general_notes` | اختياري | اختياري | |
| `company_id`, `agent_id` | **إلزامي** | — | من الجلسة |

### 4.4 ملاك العقار (`property_owners`) — سري

| الحقل | DB | Zod | ملاحظات |
|-------|-----|-----|---------|
| `owner_name` | **إلزامي** | **إلزامي** | |
| `owner_phone` | **إلزامي** | **إلزامي** | |
| `private_notes` | اختياري | اختياري | |
| `property_id`, `company_id`, `agent_id` | **إلزامي** | — | تلقائي |

### 4.5 الطلبات الداخلية (`requests`)

| الحقل | DB | Zod (`insertRequestSchema`) | ملاحظات |
|-------|-----|----------------------------|---------|
| `type` | **إلزامي** | **إلزامي** | |
| `custom_property_type` | اختياري | شرطي | عند «أخرى» |
| `offer_type` | **إلزامي** | **إلزامي** | |
| `city` | **إلزامي** | **إلزامي** | |
| `neighborhood` | اختياري (DB) | اختياري | |
| `custom_neighborhood` | اختياري | شرطي | |
| `details` | **إلزامي** | **إلزامي** | نص حر |
| `status` | افتراضي `active` | — | |
| `expires_at` | افتراضي +14 يوم | — | |

### 4.6 الإشعارات (`notifications`)

| الحقل | DB | ملاحظات |
|-------|-----|---------|
| `title`, `message` | **إلزامي** | يُنشأ عبر Service Role |
| `is_read` | افتراضي `false` | |
| `user_id`, `company_id` | **إلزامي** | |

---

## 5. تحليل الأمان والاستقرار

### 5.1 RLS — جداول PostgreSQL

| الجدول | السياسات | التقييم |
|--------|----------|---------|
| `companies` | عرض الشركة الخاصة + سوبر أدمن | ✅ |
| `users` | زملاء الشركة + إدارة الأدمن | ✅ |
| `properties` | عزل `company_id` + `visibility=global` | ✅ (مع عدم استخدام global حالياً) |
| `property_owners` | الوكيل المُدرِج أو الأدمن فقط | ✅ **حرج — يعمل** |
| `requests` | شركة واحدة فقط | ✅ |
| `packages` | سوبر أدمن فقط | ✅ |
| `notifications` | SELECT/UPDATE للمستخدم نفسه فقط؛ INSERT عبر Service Role | ✅ |

**هل يمكن للوكيل رؤية بيانات شركة أخرى؟**  
على مستوى **جداول SQL مع RLS**: **لا** — بشرط عدم استخدام Service Role من الواجهة.

**استثناء نظري:** `visibility = global` في `properties` يسمح بعرض عقار عبر الشركات — **غير مُفعَّل عملياً** (لا UI).

### 5.2 تسريبات محتملة — Storage (🔴 حرج)

| السياسة | المشكلة |
|---------|---------|
| `property_media` — `Public Access` SELECT | **أي شخص لديه الرابط** يمكنه عرض صور العقارات |
| `property_media` — `Auth Insert` | **أي مستخدم مُصادق** يمكنه الرفع لأي مسار |
| `property_media` — `Auth Delete` | **أي مستخدم مُصادق** يمكنه حذف **أي ملف** في الحاوية إذا عرف المسار |

**التوصية:** جعل الحاوية خاصة، ربط المسارات بـ `company_id`، والتحقق من الملكية في سياسات INSERT/DELETE/SELECT.

### 5.3 التفويض (Authorization) — Server Actions

| الإجراء | الحماية | هل الوكيل يمكنه تجاوزها؟ |
|---------|---------|---------------------------|
| `createCompanyUser` / `deleteCompanyUser` | `requireCompanyAdmin` | ❌ لا |
| `updateUserRole` | `requireTenantAdminOnly` (admin فقط) | ❌ لا |
| `updateCompany` / `onboardNewTenant` | `requireSuperAdmin` | ❌ لا |
| `addProperty` | جلسة + حصة `max_properties` | ❌ لا |
| `deleteProperty` | فحص في الكود (وكيل أو admin) | ❌ لا — لكن **غير متاح من UI** |
| `updatePropertyStatus` | `.eq("agent_id", user.id)` فقط | ⚠️ **الأدمن لا يستطيع** تحديث حالة عقار وكيل آخر عبر هذا الإجراء (RLS يسمح لكن الكود يمنع) |
| `getPublicPackages` | Service Role server-only | ✅ |

### 5.4 نقاط نهاية وأسرار الإنتاج

| الخطر | الخطورة | الإجراء |
|-------|---------|---------|
| `/api/seed-root` مفتوح | 🔴 حرج | حذف أو حماية بمتغير بيئة + IP allowlist |
| `SUPABASE_SERVICE_ROLE_KEY` في `.env.local` | 🔴 | عدم رفعه لـ Git؛ استخدام Vercel Secrets |
| كلمات مرور افتراضية في seed | 🔴 | تغيير فوري بعد أول دخول |

### 5.5 معالجة الأخطاء في Server Actions

| الملف | ملاحظات |
|-------|---------|
| `property.ts` (`addProperty`) | ✅ `try/catch` + `isRedirectError` |
| `login/actions.ts` | ✅ |
| `notifications.ts` (`createCompanyNotification`) | ✅ `try/catch` صامت — مقصود لعدم حجب العمليات |
| `request.ts`, `property-status.ts` | ⚠️ بدون `try/catch` عام — أخطاء غير متوقعة قد تظهر كـ 500 |
| `settings.ts` | ⚠️ يُرجع نجاحاً دون persistence — **سلوك مضلل** |

### 5.6 استقرار ما قبل النشر

- [ ] تطبيق **جميع** migrations (خصوصاً `20260704160000_add_notifications.sql`)
- [ ] تعطيل `/api/seed-root`
- [ ] إصلاح سياسات Storage
- [ ] التحقق من متغيرات البيئة في Vercel
- [ ] تشغيل `npm run build` (✅ ناجح حسب آخر فحص)

---

## 6. توصيات معمارية قبل الإطلاق

### 6.1 أولوية حرجة (قبل الإنتاج)

1. **تأمين Storage `property_media`:** حاوية خاصة + سياسات مبنية على `company_id` في مسار الملف.
2. **تعطيل أو حذف `api/seed-root`** بعد الإعداد الأولي.
3. **منع دخول الشركات المعطّلة:** فحص `companies.is_active` في `login` و/أو middleware.
4. **إصلاح `saveSystemSettings`:** إنشاء جدول `system_settings` أو إزالة الواجهة حتى لا يُضلِل المستخدم.

### 6.2 أولوية عالية (أسبوع الإطلاق)

5. **ربط `deleteProperty` بواجهة** (زر حذف مع تأكيد) لتفعيل إشعارات الحذف.
6. **إضافة `updateProperty`** — الميزة الأكثر طلباً من `master.md`.
7. **Cron / Edge Function** لأرشفة الطلبات المنتهية (`status = archived` عند `expires_at < now()`).
8. **تقييد `Auth Delete` في Storage** بمسار `{company_id}/*` للمستخدم الحالي.

### 6.3 تحسينات متوسطة

9. **Supabase Realtime** على جدول `notifications` بدلاً من polling كل 30 ثانية.
10. **بحث نصي** (`ilike` على city/neighborhood/details) كما في المخطط الأصلي.
11. **تذكير 30 يوماً للصور** — عمود `images_retention_reminder_at` + مهمة مجدولة.
12. **توحيد لغة الإشعارات** — مفاتيح i18n بدلاً من نصوص عربية ثابتة في الكود.
13. **Rate limiting** على `login` و Server Actions الحساسة.
14. **مراجعة `auth.role()`** في سياسات Storage (مُهمَل في Supabase — استبدال بـ `TO authenticated`).

### 6.4 مراقبة ما بعد النشر

- تفعيل Supabase Advisors ومراجعة تحذيرات RLS
- سجلات Vercel + Supabase Auth logs
- نسخ احتياطي يومي لقاعدة البيانات
- خطة تدوير `SERVICE_ROLE_KEY` عند الحاجة

---

## 7. قائمة تحقق سريعة قبل النشر

```
[ ] كل migrations مُطبَّقة على Supabase Production
[ ] SERVICE_ROLE_KEY و DATABASE_URL في أسرار Vercel فقط
[ ] /api/seed-root معطّل أو محذوف
[ ] سياسات Storage property_media مُحدَّثة
[ ] اختبار: وكيل الشركة A لا يرى ملاك عقارات الشركة B
[ ] اختبار: وكيل لا يستطيع حذف مستخدمين أو تغيير حصص الشركة
[ ] اختبار: إشعار يصل عند إضافة طلب داخلي
[ ] اختبار: صفحة الهبوط تعرض الباقات
[ ] HTTPS + نطاق مخصص
[ ] نسخة احتياطية Supabase مفعّلة
```

---

## 8. الخلاصة

المنصة **وظيفياً غنية** وتتجاوز المخطط الأصلي في طبقة SaaS، مع **عزل بيانات جيد على مستوى RLS للجداول**. أضعف حلقة هي **أمان التخزين (Storage)** و**مسار seed العام**، يليهما **فجوات UX** (تعديل العقار، حذف من الواجهة، إعدادات وهمية).

**التوصية النهائية:**  
الموافقة على **نشر تجريبي مغلق (Beta)** للمكاتب الموثوقة بعد إصلاح Storage وseed فوراً. تأجيل **الإعلان العام** حتى اكتمال تعديل العقار وتأمين التخزين بالكامل.

---

*تم إنشاء هذا التقرير آلياً كجزء من Phase 29 — Pre-Deployment Full System Audit.*
