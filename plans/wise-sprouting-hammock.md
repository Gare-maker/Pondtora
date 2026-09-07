# Backend Setup Walkthrough

## Context
The code is fully written and the build passes. The backend cannot store or return data yet because four manual steps have not been completed:
1. The Edge Function has not been deployed to Supabase
2. The database tables do not exist (schema.sql was never run)
3. The service-role key secret is not set in the Edge Function environment
4. No admin account exists with `role = 'admin'` in the database

These steps cannot be automated from Figma Make — they require actions in the Supabase dashboard and the Make settings panel.

---

## Step 1 — Deploy the Edge Function

**What it does:** Publishes the server code (`supabase/functions/server/index.tsx`) to Supabase so the app can call it.

**How to do it:**
1. In Figma Make, click the **Settings** gear icon (top-right or sidebar)
2. Find the **Supabase** section
3. Click **Deploy Edge Function** (or just **Deploy**)
4. Wait for the green confirmation — it takes about 30 seconds

**How to verify it worked:**
Open this URL in your browser — it should return `{"status":"ok","version":"2.1"}`:
```
https://opzwytmlhirkzykfqgbu.supabase.co/functions/v1/make-server-1da59a07/health
```
If you see `{"code":"NOT_FOUND"}`, the deploy did not complete — try again.

---

## Step 2 — Create the database tables

**What it does:** Creates all 25 tables, indexes, RLS policies, and the auto-farm trigger in your Supabase PostgreSQL database.

**How to do it:**
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/opzwytmlhirkzykfqgbu/sql/new)
2. Open the file `supabase/schema.sql` in your project (it was just created — 558 lines)
3. Copy the **entire contents** of that file
4. Paste it into the SQL Editor input box
5. Click **Run** (the green button, or Ctrl+Enter / Cmd+Enter)
6. Wait for "Success. No rows returned" — this is correct, it means the tables were created

**How to verify it worked:**
In Supabase → **Table Editor** (left sidebar), you should see tables like `user_profiles`, `farms`, `ponds`, `expenses`, etc. If the list is empty, the SQL did not run — check for any red error messages in the SQL Editor output and share them.

---

## Step 3 — Set the service-role key secret

**What it does:** Gives the Edge Function permission to send staff invitation emails and read all users for the admin panel.

**How to find your service-role key:**
1. Go to Supabase → **Project Settings** (gear icon, bottom-left sidebar)
2. Click **API** in the settings menu
3. Under "Project API keys", find **service_role** — click the eye icon to reveal it
4. Copy it (it starts with `eyJhbGci...`)

**How to add it as a secret:**
1. Go to Supabase → **Edge Functions** (left sidebar)
2. Click on **make-server-1da59a07**
3. Click the **Secrets** tab (or "Manage secrets")
4. Click **Add new secret**
5. Name: `SUPABASE_SERVICE_ROLE_KEY`
6. Value: paste the key you copied
7. Click **Save**
8. Re-deploy the Edge Function (repeat Step 1) so it picks up the new secret

**Important:** This key must NEVER be shared publicly or put in the frontend code. It stays in Supabase secrets only.

---

## Step 4 — Create your admin account

**Sub-step A: Register as a normal user**
1. Open the app (not `/admin` — the regular landing page)
2. Click **Get Started** or **Sign Up**
3. Create an account using the email address you want for admin (e.g. `admin@yourcompany.com`)
4. Choose any plan when prompted
5. You are now a regular "owner" user with a `user_profiles` row in the database

**Sub-step B: Grant admin role in the database**
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/opzwytmlhirkzykfqgbu/sql/new)
2. Run this SQL (replace the email with yours):
```sql
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'admin@yourcompany.com';
```
3. You should see "1 row affected" — the account is now an admin

**Sub-step C: Sign in to the admin panel**
1. Visit your app URL + `/admin` (e.g. `https://yourapp.figma.com/admin`)
2. Enter the same email and password you registered with
3. The admin dashboard should load showing "Supabase" status (green badge)

**How to verify it worked:**
- The Users page in the admin panel shows real accounts from Supabase
- The Settings page shows "Database: Tables found ✓" in green
- Logging in with a non-admin email shows "Access denied" and signs out

---

## Verification checklist (end-to-end)

| # | Check | How to verify |
|---|-------|---------------|
| 1 | Edge Function live | `GET /health` returns `{"status":"ok"}` |
| 2 | Tables exist | Supabase Table Editor shows 25 tables |
| 3 | Registration works | Sign up creates a row in `user_profiles` + `farms` automatically |
| 4 | Data saves | Add a pond in the app — check Supabase Table Editor → `ponds` table |
| 5 | Admin login works | `/admin` accepts your admin email + password |
| 6 | Admin sees users | Users page lists all accounts |
| 7 | Staff invite (needs Step 3) | Invite a staff member — they receive an email with a set-password link |

---

# Admin Dashboard Plan

## Context
The user wants a separate Admin Dashboard accessible at `yourdomain.com/admin`. The admin area should be completely separate from the normal app UI, protected by its own login, and allow management of users, subscriptions, and plans. The main app is a state-driven SPA (no active router despite react-router being installed). The backend is Supabase.

---

## Is It Possible?
**Yes — fully achievable.** Here is the approach:

---

## Implementation Plan

### 1. URL Routing for `/admin`

**Entry point detection** — No need to add react-router to the main app. Instead, detect the path at the very top of `main.tsx`:

```tsx
// src/main.tsx
const isAdmin = window.location.pathname.startsWith('/admin');
createRoot(document.getElementById('root')!).render(
  isAdmin ? <AdminApp /> : <App />
);
```

**Vercel routing** — Add a `vercel.json` at the project root to ensure `/admin` (and all sub-paths) serve `index.html`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

This means `yourdomain.com/admin` loads the SPA, and the code detects the path and renders the admin UI instead of the main app.

---

### 2. Admin Authentication

**Mechanism**: Supabase auth, same login system as the main app. After login, check if the authenticated user's email matches a designated admin email stored in an environment variable (`VITE_ADMIN_EMAIL`). If not admin, show "Access Denied."

```tsx
// src/admin/AdminApp.tsx
// On Supabase auth success:
if (session.user.email !== import.meta.env.VITE_ADMIN_EMAIL) {
  showAccessDenied();
}
```

This avoids a separate auth system and reuses Supabase. The admin email is set once in Vercel/project environment variables.

---

### 3. Files to Create

| File | Purpose |
|------|---------|
| `src/admin/AdminApp.tsx` | Root admin component, auth gate, nav shell |
| `src/admin/AdminLogin.tsx` | Supabase login form (reuses existing auth pattern) |
| `src/admin/pages/DashboardPage.tsx` | Stats cards + overview |
| `src/admin/pages/UsersPage.tsx` | Users table + Add User + actions |
| `src/admin/pages/SubscriptionsPage.tsx` | Per-user subscription management |
| `src/admin/pages/PlansPage.tsx` | Create/edit global plans |
| `src/admin/types.ts` | AdminUser, AdminPlan, AdminSubscription types |

---

### 4. Admin Data Model

Since the main app stores `activePlan` and `trialStartDate` in Supabase auth metadata AND in the `user_profiles` Supabase table, the admin can **read all user profiles directly from Supabase** using the same Supabase client (with service-role key for admin reads, or via the existing Edge Function).

**AdminUser type:**
```ts
interface AdminUser {
  id: string;
  name: string;
  email: string;
  activePlan: string | null;
  trialStartDate: string | null;
  billingFrequency: 'monthly' | 'yearly';
  subscriptionAmount: number | null;     // custom per-user override
  subscriptionStatus: 'Trial' | 'Active' | 'Expired' | 'Cancelled' | 'Suspended';
  subscriptionStart: string | null;
  subscriptionExpiry: string | null;
  accountStatus: 'Active' | 'Suspended';
  farmCount: number;
}
```

**Data source**: Query `user_profiles` table via the existing Supabase client. This already stores user profile rows. The admin reads all rows (requires RLS to allow admin reads, or use service key via Edge Function).

**AdminPlan type (new global plans table):**
```ts
interface AdminPlan {
  id: string;
  name: string;
  billingFrequency: 'monthly' | 'yearly';
  price: number;
  description: string;
  status: 'Active' | 'Inactive';
  farmLimit: number | null;   // null = unlimited
  pondLimit: number | null;
}
```

---

### 5. Admin Dashboard Pages

#### Dashboard Page
- Stat cards: Total Users, On Trial, Trial Expired, Paid Active, Suspended
- Per-plan breakdown (small grid or table)
- Recent signups list

#### Users Page
- Table columns: Name, Email, Plan, Amount, Status, Trial, Start Date, Expiry, Account Status, Actions
- Actions menu per row: View Details | Change Plan | Change Amount | Suspend/Activate | Delete
- Add User button → modal form (Name, Email, Plan, Amount, Billing, Trial)
- Pagination (PER_PAGE from shared.tsx can be reused)

#### Subscriptions Page
- Per-user subscription configuration
- Each user can have a custom amount override independent of the plan default

#### Plans Page
- Table of global plans (matching the existing plan names used in the main app)
- Add/Edit/Archive plans
- Monthly/yearly pricing per plan

---

### 6. UI Design System

Reuse **all** existing shared components from `src/app/shared.tsx`:
- `Card`, `PBtn`, `Bdg`, `StatCard`, `Modal`, `F`, `IC`, `SC`, `Pagination`, `PER_PAGE`
- Same Tailwind tokens and typography (`font-['Barlow_Condensed',sans-serif]` for headings)
- Same table pattern (sticky first column, `min-w-[...]`, horizontal scroll on mobile)
- Same icon set from `lucide-react`

The admin sidebar will mirror the main app's sidebar visual style but with different nav items (Dashboard, Users, Subscriptions, Plans, Settings).

---

### 7. Vercel Deployment Config

Create `vercel.json` at project root:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

This makes `yourdomain.com/admin` work correctly after deploy.

---

### 8. Environment Variable

Add to Vercel project settings and local `.env`:
```
VITE_ADMIN_EMAIL=your-admin@email.com
```

---

### 9. Files to Modify

| File | Change |
|------|--------|
| `src/main.tsx` | Add path detection — render `AdminApp` when path starts with `/admin`, else `App` |
| `vercel.json` | Create — add SPA rewrite rule |

---

### 10. Verification

1. Visit `localhost:5173/admin` → sees Admin Login page (not the main app)
2. Login with admin email → Admin Dashboard loads with stats and user table
3. Login with non-admin email → "Access Denied" message
4. Visit `localhost:5173/` → main app loads normally (no change)
5. On Vercel: `yourdomain.com/admin` → Admin Dashboard (after env var is set)
6. Add a user via admin → appears in user table
7. Change a user's plan via admin → reflected in their app session on next login

---

### Limitations / Honest Notes

- **User listing** requires the `user_profiles` Supabase table to be readable by the admin's session (RLS policy must allow admin-email reads, or the Edge Function must expose a user-list endpoint). If RLS blocks it, a small Edge Function addition is needed.
- The "changes reflected throughout the app" requirement (req #14) is fully met for plan/trial changes because the main app reads `activePlan` from Supabase auth metadata on session restore.
- Real-time payment processing is not in scope — amounts are stored as configured values; actual billing integration (Stripe, etc.) is separate.

---

# Pondtora — System Documents

---

# Document 1: System Diagnosis Report
*Post-update verification against the System-Wide Functional Review & Validation Checklist*

---

## Section 1 — Pond, Fish Stock & Feeding Relationships

### Pond & Fish Stock

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 1.1 | Pond and Fish Stock are separate entities | ✅ | Creating a Pond sets `species="—"`; Fish Stock added independently |
| 1.2 | A single Fish Stock can exist in multiple ponds | ✅ | Ponds share `species + stockingDate` without constraint |
| 1.3 | Fish Stock permanently identified by Stocking Date | ✅ | All grouping uses `stockingDate` as the primary key |
| 1.4 | Data grouped by Fish Stock + Stocking Date (not log date) | ✅ | PondManagementPage groups by `stockingDate` only |
| 1.5 | Aggregated correctly across ponds sharing the same Fish Stock | ✅ | Section 1 of Fish Stock History sums across all matching ponds |

### Feeding Documentation

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 1.6 | Feed logged against a Pond | ✅ | `FeedingRecord` stores `pond` (name) |
| 1.7 | Fish Stock auto-identified from Pond after selection | ✅ | `pondToStock(pond.name)` resolves `species + stockingDate` |
| 1.8 | Correct Fish Stock used for all feeding calculations | ✅ | Reconciliation derives `fishStock` from `pondToStock` |
| 1.9 | Feed Summary by Pellet updates correctly | ✅ | Derived from `feedingRecords` in real time |

---

## Section 2 — Opened Bags & Remaining Feed

### Opened Bags

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 2.1 | Recorded using Brand, Pellet Size, Fish Stock, Bags Opened | ✅ | `BagOpenLog` type now includes `fishStock?: string`; UI passes it on save |
| 2.2 | kg per bag auto-retrieved from Feed Inventory | ✅ | Pulled from `inventory`; never entered manually by user |
| 2.3 | Opened Bags associated with Fish Stock, not Pond | ✅ | `BagOpenLog` stores `fishStock`; no pondId on the record |

### Remaining Feed

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 2.4 | Recorded using Brand, Pellet Size, Fish Stock, Remaining kg | ✅ | `FeedRemainingLog` has all four fields |
| 2.5 | Remaining Feed tied to Fish Stock only | ✅ | No `pondId` on `FeedRemainingLog` |
| 2.6 | Integrates correctly with reconciliation | ✅ | `remainLogs` filtered by `fishStock` in `reconRows` useMemo |
| 2.7 | Editing Remaining Feed updates reconciliation immediately | ✅ | `reconRows` is derived state — recomputes on every edit |

---

## Section 3 — Feed Reconciliation

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 3.1 | Uses Fish Stock as the reference | ✅ | `reconRows` grouped by `Brand + Size + FishStock` |
| 3.2 | Uses yesterday's Remaining Feed correctly | ✅ | `prevDate` calculated and used to pull `carryover` |
| 3.3 | Feed required calculation is correct | ✅ | `netNeeded = max(0, totalFed - carryover)` |
| 3.4 | Expected bags calculated correctly | ✅ | `Math.ceil(netNeeded / bagWeight)` |
| 3.5 | Compares expected vs recorded bags | ✅ | `bagsDiff`, `remainDiff`, `feedQtyIssue` all computed; bagLogs now filtered by fishStock |
| 3.6 | Detects all 4 mismatch types accurately | ✅ | `feed_qty_mismatch`, `multiple_mismatches`, `bag_mismatch`, `remaining_mismatch` |
| 3.7 | Resolved mismatches removed automatically | ✅ | `reconRows` recomputes; status becomes `"matched"` |
| 3.8 | Notifications updated after mismatch resolved | ✅ | `onReconMismatches` → `setExtraNotifs` in App |
| 3.9 | Full breakdown displayed in mismatch popup | ✅ | `popupRecon` modal shows all calculation fields |

---

## Section 4 — Staff Roles & Permissions

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 4.1 | Staff roles exist | ✅ | Admin, Director, Farm Manager, Feeding Staff, General Staff |
| 4.2 | Permissions control nav visibility | ✅ | Sidebar filters `NAV` items via `NAV_PERM` map + `hasPerm()` |
| 4.3 | Action buttons respect permissions | ✅ | Page-level gating; users without a page permission never see its buttons |
| 4.4 | Hidden pages inaccessible | ✅ | All pages wrapped: `hasPerm(...) ? <Page/> : <AccessDenied/>` |
| 4.5 | Staff Assessment permission enforced | ✅ | `assessments` gated by `hasPerm("Staff Assessment")` |

---

## Section 5 — Farm Assignment

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 5.1 | Managers assignable to multiple farms | ✅ | `StaffMember.farms: string[]` supports multi-farm assignment |
| 5.2 | Farm switcher shows only assigned farms | ✅ | Both desktop and mobile switchers use `accessibleFarms` (filtered by `currentStaff.farms`) |
| 5.3 | Ponds filtered by active farm | ✅ | `farmPonds = ponds.filter(p => p.farmId === activeFarmId)` |
| 5.4 | Feeding records filtered by active farm | ✅ | `farmFeeding` filters via `pond.farmId` |
| 5.5 | Feed Inventory filtered by active farm | ✅ | `farmInventory = inventory.filter(i => !i.farmId \|\| i.farmId === activeFarmId)` |
| 5.6 | Expenses filtered by active farm | ✅ | `farmExpenses = expenses.filter(e => !e.farmId \|\| e.farmId === activeFarmId)` |
| 5.7 | Revenues filtered by active farm | ✅ | `farmRevenues = revenues.filter(r => !r.farmId \|\| r.farmId === activeFarmId)` |
| 5.8 | Reports filtered by active farm | ✅ | `farmReports = reports.filter(r => !r.farmId \|\| r.farmId === activeFarmId)` |
| 5.9 | Treatments filtered by active farm | ✅ | `farmTreatments = treatments.filter(t => t.farmId === activeFarmId)` |

> **Note on legacy data:** Seed data (INIT_EXP, INIT_REV, INIT_INV) does not have `farmId` set, so they appear on all farms via the `!field` fallback. All new records written after this update are stamped with `farmId` and will be correctly isolated.

---

## Section 6 — Subscription Enforcement

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 6.1 | Pond limits enforced | ✅ | Starter=5, Growth=15, Commercial=∞; checked in `addPond` |
| 6.2 | Farm limits enforced | ✅ | 3-Farm=3, 5-Farm=5, etc.; checked in `handleAddFarm` |
| 6.3 | Staff limits enforced | ❌ | Not yet implemented; no per-plan staff cap |
| 6.4 | Upgrade prompts appear | ⚠️ | Only fire for pond/farm count limits; not for other feature gates |
| 6.5 | Trial accounts handled | ✅ | 30-day trial, `trialStartDate`, trial banner, expiry all present |
| 6.6 | Plan upgrade/downgrade immediately updates access | ✅ | `activePlan` is global state; limits recalculate instantly |

---

## Section 7 — Staff Reporting

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 7.1 | Staff can create reports | ✅ | Full submit workflow in ReportsPage |
| 7.2 | Edit within 6-hour window | ✅ | `isWithin6h()` enforced; Edit button hidden after window |
| 7.3 | Staff can view their submitted reports | ✅ | Report list shown in ReportsPage |
| 7.4 | Managers can review/resolve reports | ⚠️ | `resolveReport` handler exists and fires notifications; no dedicated Resolve button in UI yet |
| 7.5 | Report notifications | ✅ | Submitted and resolved notifications appear in Notifications page (blue FileText icon) |

---

## Outstanding Items

| Priority | Item |
|----------|------|
| Medium | **Staff limits per plan** — Define `PLAN_STAFF_LIMITS` and enforce in Invite Staff flow |
| Medium | **Report Resolve button in UI** — Manager/Admin should see a Resolve action on each open report |
| Low | **Upgrade prompts** — Extend to other feature gates beyond pond/farm count |

---
---

# Document 2: Database Schema
*Complete data model for backend implementation*

---

## Entities

### 1. Farm
**Table:** `farms`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | Primary key, e.g. `FARM-001` |
| name | string | ✅ | |
| city | string | ✅ | |
| state | string | ✅ | |
| country | string | ✅ | |

---

### 2. UserProfile (Account Owner)
**Table:** `users`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | Primary key |
| name | string | ✅ | |
| farmName | string | ✅ | Display name for primary farm |
| city | string | ✅ | |
| state | string | ✅ | |
| country | string | ✅ | |
| email | string | ✅ | Login identifier (unique) |
| phone | string | ✅ | |
| currencySymbol | string | ✅ | e.g. `₦` |
| currencyCode | string | ✅ | e.g. `NGN` |
| activePlan | string | ❌ | Subscription plan name |
| trialStartDate | string | ❌ | ISO date |

---

### 3. Pond
**Table:** `ponds`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | |
| farmId | string | ✅ | FK → farms.id |
| name | string | ✅ | |
| type | enum | ✅ | `Earthen \| Concrete \| Tarpaulin` |
| species | string | ✅ | `Tilapia \| Catfish \| Carp \| Salmon \| Bass \| Trout \| Other`; `"—"` = empty |
| sizeM2 | string | ✅ | Area |
| initialStock | integer | ✅ | Fish count at stocking |
| currentCount | integer | ✅ | Live fish count |
| avgWeight | decimal | ✅ | kg |
| stockingDate | string | ✅ | **Fish Stock lifecycle key** |
| stockMonth | string | ✅ | e.g. `Jun` |
| totalCost | decimal | ✅ | |
| status | enum | ✅ | `Active \| Empty` |
| notes | text | ✅ | |
| transferNote | string | ❌ | Set during transfer |
| lengthFt | string | ❌ | |
| widthFt | string | ❌ | |
| defaultPellet | string | ❌ | Default feed pellet size |
| category | enum | ❌ | `Production \| Nursery` |
| maxKgByPallet | jsonb | ❌ | `Record<pelletSize, maxKg>` |
| supplier | string | ❌ | Stock supplier |

---

### 4. StockEvent
**Table:** `stock_events`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | |
| pondId | string | ✅ | FK → ponds.id |
| pondName | string | ✅ | Denormalized snapshot |
| date | string | ✅ | |
| species | string | ✅ | |
| count | integer | ✅ | |
| avgWeight | decimal | ✅ | |
| cost | decimal | ✅ | |
| type | enum | ✅ | `Initial \| Transfer \| Restock \| Closed` |
| salePrice | decimal | ❌ | |
| fromPond | string | ❌ | Source pond name (transfers) |
| clearedDate | string | ❌ | |
| supplier | string | ❌ | |

---

### 5. FeedItem (Inventory)
**Table:** `feed_inventory`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | |
| farmId | string | ✅ | FK → farms.id |
| brand | string | ✅ | |
| size | enum | ✅ | `1.5 mm \| 2.0 mm \| 3.0 mm \| 4.0 mm \| 6.0 mm` |
| bags | integer | ✅ | Current bag count |
| weightPerBag | decimal | ✅ | kg |
| totalKg | decimal | ✅ | `bags × weightPerBag` |
| costPerBag | decimal | ✅ | |
| supplier | string | ✅ | |
| purchaseDate | string | ✅ | |
| month | string | ✅ | |

---

### 6. FeedingRecord
**Table:** `feeding_records`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | |
| date | string | ✅ | e.g. `Jun 26` |
| month | string | ✅ | |
| year | integer | ✅ | |
| pond | string | ✅ | Pond name (denormalized) |
| brand | string | ✅ | |
| size | string | ✅ | Pellet size |
| morning | decimal | ✅ | kg |
| evening | decimal | ✅ | kg |
| total | decimal | ✅ | `morning + evening` |
| recordedBy | string | ✅ | Staff name |
| morningTime | string | ❌ | HH:MM |
| eveningTime | string | ❌ | HH:MM |

> Farm scope derived via `pond → Pond.farmId`

---

### 7. BagOpenLog
**Table:** `bag_open_logs`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | |
| date | string | ✅ | |
| month | string | ✅ | |
| year | integer | ✅ | |
| brand | string | ✅ | |
| size | string | ✅ | |
| kgPerBag | decimal | ✅ | Snapshot from inventory at time of logging |
| bagsOpened | integer | ✅ | |
| totalKg | decimal | ✅ | `bagsOpened × kgPerBag` |
| fishStock | string | ❌ | `"{species} ({stockingDate})"` label |

---

### 8. FeedRemainingLog
**Table:** `feed_remaining_logs`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | |
| brand | string | ✅ | |
| size | string | ✅ | |
| fishStock | string | ✅ | `"{species} ({stockingDate})"` label |
| remainingKg | decimal | ✅ | |
| date | string | ✅ | |

---

### 9. Expense
**Table:** `expenses`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | |
| farmId | string | ❌ | FK → farms.id |
| category | enum | ✅ | Feed, Fish Stock, Maintenance, Medication, Utilities, Labor, Transportation, Loan, General Overhead, Miscellaneous, Others |
| amount | decimal | ✅ | |
| date | string | ✅ | |
| month | string | ✅ | |
| year | integer | ✅ | |
| pond | string | ✅ | Pond name or `"General"` |
| desc | text | ✅ | |
| fishStock | string | ❌ | Fish stock label when pond-linked |

---

### 10. Revenue
**Table:** `revenues`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | |
| farmId | string | ❌ | FK → farms.id |
| source | enum | ✅ | Fish Sales, Pond Rental, Other Income, Others |
| amount | decimal | ✅ | |
| date | string | ✅ | |
| month | string | ✅ | |
| year | integer | ✅ | |
| notes | text | ✅ | |
| pond | string | ❌ | Pond name if linked |
| stockBatch | string | ❌ | Fish stock batch reference |

---

### 11. MortalityEntry
**Table:** `mortality_entries`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | |
| pondId | string | ✅ | FK → ponds.id |
| date | string | ✅ | |
| count | integer | ✅ | Fish that died |
| cause | enum | ✅ | Unknown, Disease, Water stress, Predation, Handling, Oxygen depletion |
| notes | text | ✅ | |

---

### 12. TreatmentRecord
**Table:** `treatment_records`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | |
| pondId | string | ✅ | FK → ponds.id |
| farmId | string | ✅ | FK → farms.id |
| date | string | ✅ | |
| cause | string | ✅ | |
| medicine | string | ✅ | |
| remarks | text | ✅ | |

---

### 13. StaffMember
**Table:** `staff_members`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | |
| name | string | ✅ | |
| email | string | ✅ | Unique; used to match logged-in user |
| phone | string | ✅ | |
| role | enum | ✅ | Admin, Director, Farm Manager, Feeding Staff, General Staff |
| status | enum | ✅ | `Active \| Pending` |
| joinedDate | string | ✅ | |
| permissions | string[] | ✅ | Subset of STAFF_PERMISSIONS (stored as array) |
| farms | string[] | ✅ | FK[] → farms.id (many-to-many join) |

**Permissions enum values:** Financial Dashboard, Pond Management, Pond Details, Feed Inventory, Feed Documentation, Invoice, Reports, Staff Assessment

---

### 14. Report
**Table:** `reports`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | |
| farmId | string | ❌ | FK → farms.id |
| title | string | ✅ | |
| content | text | ✅ | |
| type | enum | ✅ | `Daily \| Weekly \| Monthly` |
| author | string | ✅ | Staff name |
| date | string | ✅ | |
| status | enum | ✅ | `Open \| Resolved` |
| tags | string[] | ✅ | |
| timestamp | string | ❌ | ISO timestamp for 6-hour edit window |
| resolvedBy | string | ❌ | |
| resolvedDate | string | ❌ | |

---

### 15. Customer
**Table:** `customers`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | |
| name | string | ✅ | |
| phone | string | ✅ | |
| email | string | ✅ | |
| businessName | string | ✅ | |
| address | string | ✅ | |

---

### 16. PriceGroup
**Table:** `price_groups`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | |
| group | string | ✅ | Internal key e.g. `A`, `B` |
| displayName | string | ✅ | Label on invoices |
| description | string | ✅ | |
| pricePerKg | decimal | ✅ | |
| status | enum | ✅ | `Active \| Inactive` |

---

### 17. Invoice
**Table:** `invoices`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | |
| invNumber | string | ✅ | e.g. `INV-001` |
| customer | jsonb | ✅ | Snapshot of Customer at invoice time |
| pond | string | ✅ | Pond name |
| species | string | ✅ | |
| items | jsonb | ✅ | Array of InvoiceLineItem |
| discountType | enum | ✅ | `invoice \| item` |
| subtotal | decimal | ✅ | |
| discount | decimal | ✅ | |
| additionalCharges | decimal | ✅ | |
| grandTotal | decimal | ✅ | |
| amountPaid | decimal | ✅ | |
| outstanding | decimal | ✅ | `grandTotal - amountPaid` |
| status | enum | ✅ | Draft, Sent, Pending, Partially Paid, Paid, Overdue, Cancelled, Error |
| paymentMethod | enum | ✅ | Cash, Bank Transfer, POS, Cheque, Other |
| invoiceDate | string | ✅ | |
| dueDate | string | ✅ | |
| notes | text | ✅ | |
| issuedBy | string | ❌ | Staff name |

### InvoiceLineItem (embedded in Invoice.items)

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| groupId | string | FK → price_groups.id |
| groupLabel | string | Denormalized |
| displayName | string | |
| qtyKg | decimal | |
| pricePerKg | decimal | |
| discount | decimal | |
| lineTotal | decimal | |

---

### 18. InvSettings (singleton per farm)
**Table:** `invoice_settings`

| Field | Type | Notes |
|-------|------|-------|
| farmName | string | |
| farmAddress | string | |
| farmPhone | string | |
| farmEmail | string | |
| bankDetails | text | |
| defaultNotes | text | |
| footerMessage | text | |
| taxRate | decimal | |
| invoicePrefix | string | e.g. `INV` |
| paymentTerms | string | |

---

### 19. Assessment — KQuestion / CQuestion
**Tables:** `knowledge_questions`, `compatibility_questions`

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| text | text | Question |
| category | string | From K_CATS / C_CATS |
| options | string[4] | Exactly 4 answer choices |
| correctIndex | integer | 0–3 |

**K_CATS (12):** Fish Feeding, Fish Health, Water Quality Management, Water Flow-Through System, Pond Maintenance, Equipment Operation, Repairs & Maintenance, Fish Stock Management, Harvesting, Inventory Management, Safety & Hygiene, Farm Rules & SOPs

**C_CATS (12):** Communication, Teamwork, Leadership, Responsibility, Emotional Intelligence, Integrity, Discipline, Adaptability, Initiative, Stress Management, Physical Readiness, Problem Solving

---

### 20. Assessment — KResult / CResult
**Tables:** `knowledge_results`, `compatibility_results`

**KResult:**

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| name | string | |
| email | string | |
| phone | string | |
| gender | string | |
| dateTaken | string | |
| timeTaken | string | HH:MM |
| totalCorrect | integer | |
| totalWrong | integer | |
| overallScore | integer | 0–100 |
| pass | boolean | threshold: 70% |
| categoryBreakdown | jsonb | `{category, correct, total}[]` |

**CResult:**

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| name / email / phone / gender | string | |
| dateTaken / timeTaken | string | |
| categoryScores | jsonb | `{category, score}[]` |
| overallScore | integer | 0–100 |
| recommendation | enum | Highly Recommended, Recommended, Consider, Not Recommended |

---

## Entity Relationship Diagram

```
UserProfile (Account)
  │
  └── Farm (1..many, limited by subscription plan)
        │
        ├── Pond (1..many)
        │     ├── StockEvent (1..many, by pondId)
        │     ├── FeedingRecord (1..many, by pond name)
        │     ├── MortalityEntry (1..many, by pondId)
        │     └── TreatmentRecord (1..many, by pondId + farmId)
        │
        ├── FeedItem / Inventory (1..many, by farmId)
        │
        ├── BagOpenLog (1..many, linked to fishStock label)
        ├── FeedRemainingLog (1..many, linked to fishStock label)
        │
        ├── Expense (1..many, by farmId)
        ├── Revenue (1..many, by farmId)
        ├── Report (1..many, by farmId)
        │
        ├── Invoice (1..many)
        │     ├── Customer (embedded snapshot)
        │     └── InvoiceLineItem[] → PriceGroup
        │
        └── StaffMember (many..many via farms[])
              └── Permissions (subset of STAFF_PERMISSIONS)

Assessment (standalone — not farm-scoped):
  KQuestion[] → KResult[]
  CQuestion[] → CResult[]
```

---

## Key Denormalization Notes (for backend awareness)

| Denormalized field | Lives on | Should resolve to |
|--------------------|----------|-------------------|
| `FeedingRecord.pond` | string name | `Pond.name` (no id FK) |
| `Expense.pond` | string name | `Pond.name` or `"General"` |
| `Revenue.pond` | string name | `Pond.name` |
| `BagOpenLog.fishStock` | string label | `"{species} ({stockingDate})"` — composite of Pond fields |
| `FeedRemainingLog.fishStock` | string label | Same composite |
| `StockEvent.pondName` | string | `Pond.name` snapshot |
| `StockEvent.fromPond` | string | Source `Pond.name` for transfers |
| `Invoice.customer` | embedded object | Snapshot; Customer can be edited separately |

> **Recommendation for backend:** Normalize pond references to use `pondId` FK. The `fishStock` composite label should become a proper `fish_stock_id` FK pointing to a `fish_stocks` table (keyed by `species + stockingDate + farmId`).

---

## Subscription Plan Limits

| Plan | Ponds | Farms |
|------|-------|-------|
| Starter | 5 | 1 |
| Growth | 15 | 1 |
| Commercial | Unlimited | 1 |
| 3-Farm Plan | Unlimited | 3 |
| 5-Farm Plan | Unlimited | 5 |
| Unlimited Farms | Unlimited | Unlimited |

---

## Previous Audit Findings (pre-update)

# Functional Review — Audit Results

Full audit of the app against `functional-review-checklist.md`. Each item is assessed as **✅ In place**, **⚠️ Partial**, or **❌ Missing**.

---

## 1. Pond, Fish Stock & Feeding Relationships

### Pond & Fish Stock

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | Pond and Fish Stock are separate entities | ✅ | Creating a Pond sets species="—"; Fish Stock added independently |
| 1.2 | A single Fish Stock can exist in multiple ponds | ✅ | Ponds share species + stockingDate without constraint |
| 1.3 | Fish Stock permanently identified by Stocking Date | ✅ | All grouping uses `stockingDate` as the key |
| 1.4 | Data grouped by Fish Stock + Stocking Date (not log date) | ✅ | PondManagementPage groups by stockingDate only |
| 1.5 | Stock data aggregated correctly across ponds | ✅ | Section 1 of Fish Stock History sums across all matching ponds |

### Feeding Documentation

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.6 | Feed logged against a Pond | ✅ | FeedingRecord stores `pond` name |
| 1.7 | Fish Stock auto-identified from Pond | ✅ | `pondToStock(pond.name)` helper resolves species+stockingDate |
| 1.8 | Correct Fish Stock used for all calculations | ✅ | Reconciliation derives fishStock from pondToStock |
| 1.9 | Feed Summary by Pellet updates correctly | ✅ | Derived from feedingRecords in real time |

---

## 2. Opened Bags & Remaining Feed

### Opened Bags

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | Recorded using Brand, Pellet Size, Fish Stock, Bags Opened | ⚠️ | UI collects fishStock (FeedDocumentationPage ~line 893-897), handler passes it — BUT `BagOpenLog` type (`types.ts` line 12) is **missing `fishStock` field**, so the value is silently dropped |
| 2.2 | kg per bag auto-retrieved from Feed Inventory | ✅ | Pulled from inventory; user never enters it manually |
| 2.3 | Opened Bags associated with Fish Stock, not Pond | ⚠️ | Intended, but blocked by the missing type field above |

**Critical Bug:** `BagOpenLog` in `types.ts` must add `fishStock?: string`. Without it, reconciliation (line 101 of FeedDocumentationPage) cannot filter bags by fish stock — if two fish stocks share the same brand/size on the same day, bags are incorrectly combined.

### Remaining Feed

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.4 | Recorded using Brand, Pellet Size, Fish Stock, Remaining kg | ✅ | `FeedRemainingLog` type is correct |
| 2.5 | Remaining Feed tied to Fish Stock only (never a Pond) | ✅ | No pondId on FeedRemainingLog |
| 2.6 | Integrates correctly with reconciliation | ✅ | `remainLogs` filtered by fishStock in reconRows useMemo |
| 2.7 | Editing Remaining Feed updates reconciliation immediately | ✅ | reconRows is derived state — re-runs on every edit |

---

## 3. Feed Reconciliation

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | Uses Fish Stock as the reference | ✅ | reconRows grouped by Brand + Size + FishStock |
| 3.2 | Uses yesterday's Remaining Feed correctly | ✅ | prevDate calculated and used to pull carryover |
| 3.3 | Feed required calculation documented and correct | ✅ | netNeeded = max(0, totalFed - carryover) |
| 3.4 | Expected bags calculated correctly | ✅ | Math.ceil(netNeeded / bagWeight) |
| 3.5 | Compares expected vs recorded bags | ✅ | bagsDiff, remainDiff, feedQtyIssue all computed |
| 3.6 | Detects all 4 mismatch types accurately | ✅ | feed_qty_mismatch, multiple_mismatches, bag_mismatch, remaining_mismatch |
| 3.7 | Resolved mismatches removed automatically | ✅ | reconRows recomputes; status becomes "matched" |
| 3.8 | Notifications updated after mismatch resolved | ✅ | onReconMismatches → setExtraNotifs in App |
| 3.9 | Full breakdown displayed in mismatch popup | ✅ | popupRecon modal shows all fields |

---

## 4. Staff Roles & Permissions

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1 | Staff roles exist | ✅ | Admin, Director, Farm Manager, Feeding Staff, General Staff defined in data.ts |
| 4.2 | Permissions control page/nav visibility | ❌ | STAFF_PERMISSIONS array exists but **zero enforcement** — all nav items render unconditionally for all users |
| 4.3 | Action buttons gated by permissions | ❌ | All buttons (Add Pond, Add Expense, Invite Staff, etc.) visible to all users regardless of role |
| 4.4 | Hidden pages inaccessible via direct nav | ❌ | All pages render based only on `active` state; no permission gate on any page |
| 4.5 | Staff Assessment permission enforced | ❌ | Permission defined in STAFF_PERMISSIONS but EmployeeAssessmentsPage renders with no check |

**Status: Permissions are defined but completely unenforced. This is the largest outstanding gap.**

---

## 5. Farm Assignment

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | Managers assignable to multiple farms | ✅ | StaffMember has `farms: string[]`; UI allows multi-farm assignment |
| 5.2 | Ponds filtered by assigned farm | ✅ | `farmPonds = ponds.filter(p => p.farmId === activeFarmId)` |
| 5.3 | Feeding records filtered by assigned farm | ✅ | `farmFeeding` filters via pond.farmId |
| 5.4 | Treatments filtered by assigned farm | ✅ | `farmTreatments = treatments.filter(t => t.farmId === activeFarmId)` |
| 5.5 | Feed Inventory filtered by farm | ❌ | `farmInventory = inventory` — no farm filter applied |
| 5.6 | Expenses/Revenues filtered by farm | ❌ | FinancialDashboard receives all expenses and revenues |
| 5.7 | Reports filtered by farm | ❌ | ReportsPage receives all reports with no farmId filter |

---

## 6. Subscription Enforcement

| # | Item | Status | Notes |
|---|------|--------|-------|
| 6.1 | Pond limits enforced (Starter=5, Growth=15, Commercial=∞) | ✅ | PLAN_POND_LIMITS + pondLimit check in addPond |
| 6.2 | Farm limits enforced (3-Farm=3, 5-Farm=5, etc.) | ✅ | PLAN_FARM_LIMITS + farmLimit check in handleAddFarm |
| 6.3 | Staff limits enforced per plan | ❌ | No per-plan staff count cap; Invite Staff has no limit |
| 6.4 | Upgrade prompts appear | ⚠️ | Only for pond/farm creation limits; no upgrade prompt for any other feature gate |
| 6.5 | Trial accounts handled correctly | ✅ | 30-day trial, trialStartDate, trial banner, expiry calculation all present |
| 6.6 | Plan upgrade/downgrade immediately updates access | ✅ | activePlan is global state; pondLimit/farmLimit recalculate instantly |
| 6.7 | Feature locks (locked features inaccessible) | ❌ | No feature flags or locks on any page/feature beyond pond+farm count |

---

## 7. Staff Reporting

| # | Item | Status | Notes |
|---|------|--------|-------|
| 7.1 | Staff can create reports | ✅ | "Submit Report" workflow in ReportsPage |
| 7.2 | Staff can edit within permitted window | ✅ | 6-hour edit window enforced via isWithin6h() |
| 7.3 | Staff can view their own submitted reports | ✅ | Reports display in list |
| 7.4 | Managers can review/resolve submitted reports | ⚠️ | Reports have `status: "Open"|"Resolved"` and `resolvedBy`/`resolvedDate` fields, but **no Resolve button visible in the UI** — resolve workflow is incomplete |
| 7.5 | Report status updates correctly | ⚠️ | Status field exists; state handler likely exists but resolve UI is missing |
| 7.6 | Notifications for reports | ❌ | No notifications for report submission or status changes |

---

## Summary: Items Requiring Work

### Critical
1. **`BagOpenLog` type missing `fishStock` field** — `types.ts` line 12. Add `fishStock?: string`. Without this, opened bags are not correctly linked to fish stocks during reconciliation.

### High Priority
2. **Permission gating not enforced** — Permissions defined but never checked. Nav items, pages, and action buttons must be gated based on the logged-in staff member's permissions array.
3. **Farm filtering incomplete** — Inventory, Expenses/Revenues, and Reports are not filtered by activeFarmId. Must add: `farmInventory = inventory.filter(...)`, `farmExpenses = expenses.filter(...)`, `farmRevenues = revenues.filter(...)`, `farmReports = reports.filter(...)`.

### Medium Priority
4. **Report Resolve UI missing** — Manager review workflow (Resolve button + resolvedBy/resolvedDate flow) is not surfaced in the UI.
5. **Staff limits not enforced** — No per-plan staff count cap. Requires defining PLAN_STAFF_LIMITS and checking before inviting staff.

### Low Priority
6. **Report notifications missing** — No notifications for report submission/resolution events.
7. **Upgrade prompts** — Currently only fire for pond/farm count limits; should also appear for other gated features.
