master.md
# Real Estate CRM (B2B SaaS) - Master Blueprint

## 1. Project Overview
A multi-tenant Real Estate CRM designed initially for internal office use, architected to scale into a B2B SaaS platform for real estate agencies in Saudi Arabia (Eastern Province). The system ensures absolute data privacy for property owners while providing seamless internal property sharing and a hybrid request-matching system.

## 2. Tech Stack
- **Frontend:** Next.js 16+ (App Router), React, Tailwind CSS.
- **UI Library:** Shadcn UI (Radix engine, Nova preset, Zinc colors).
- **Backend/Database:** Supabase (PostgreSQL, Auth via `@supabase/ssr`, Storage).
- **Form Validation:** Zod + React Hook Form.

## 3. Core Architecture & Security (CRITICAL)
- **Multi-tenant Design:** Every core table MUST include a `company_id`. No cross-company data sharing is allowed currently (visibility defaults to `company_only`).
- **Data Normalization:** - `properties` table: Contains public property specs (visible to all agents in the company).
  - `property_owners` table: Contains confidential owner contact info. STRICTLY separated.
- **RLS (Row Level Security):** - Managed via `SECURITY DEFINER` functions in a `private_schema` to prevent infinite recursion loops.
  - Owner data is ONLY visible to the listing agent (`agent_id`) OR the company `admin`/`super_admin`.

## 4. User Roles
1. **super_admin:** The system owner. Can manage all companies and subscriptions.
2. **admin:** The real estate office owner. Can view all data within their `company_id` and manage their agents.
3. **agent:** The employee. Can add properties, view company-wide properties (without owner details), manage their own listings, and post/view internal requests.

## 5. Core Features & Workflows

### A. Property Management (Add/Edit)
- **Fast Entry:** Use Comboboxes for quick selection.
- **Eastern Province Focus:** Cities include (Khobar, Dammam, Dhahran, Qatif) with cascading neighborhoods.
- **Specs Flexibility:** Property specifics (rooms, age, street width) are stored in a `specs` JSONB column.
- **Images:** Uploaded to Supabase Storage. Saved as an array of URLs.
- **Direct/Indirect:** Boolean flag indicating if the agent is direct with the owner or via another office.

### B. Status Lifecycle & Smart Storage
- **Statuses:** `available`, `pending` (in progress/reserved), `sold`, `rented`.
- **Smart Storage Prompt:** When an agent changes a property status to `sold`, a modal MUST prompt them: "Property sold successfully! Do you want to delete the images to save storage space?"
- **Auto-Reminder:** If images are kept, a delayed prompt/flag reminds the agent to delete them after 30 days.

### C. The Hybrid Request System (Internal Demands)
- A streamlined system for agents to request properties for their clients.
- **Input (Hybrid):** - 3 quick dropdowns: Type (e.g., Villa), Offer Type (Sale/Rent), Location (City/Neighborhood).
  - 1 free-text area: `details` (for budget, specific conditions, etc.).
- **Auto-Archiving (Soft Delete):** Requests expire automatically after 14 days to keep the board clean. Agents receive a prompt before expiration to either "Renew" or "Mark as Executed/Archived".

### D. Fuzzy Search & Internal Market
- Agents can search properties company-wide.
- Search results display the listing agent's name and phone number for internal communication, NEVER the property owner's details.

## 6. Strict AI Coding Guidelines (Cursor Rules)
- **Surgical Execution:** DO NOT refactor unrelated components. Do not "vibe code".
- **Next.js Routing:** NEVER swallow `redirect()` inside a standard `try/catch`. Always use `if (isRedirectError(error)) throw error;`.
- **Supabase SSR:** Use `@supabase/ssr` (`createServerClient`, `createBrowserClient`) exclusively. No deprecated `auth-helpers`.
- **Database First:** Do not write UI code for features requiring new DB fields without providing and running the SQL migration first.