# Investor & Issuer Onboarding Guide: Authentication, Access Control & Multi-Tenancy

Comprehensive technical specification and operational guide covering **User Authentication**, **Clerk Webhook Synchronization**, **Cross-Portal Protection (Triple Gate Security Engine)**, and **Multi-User Organization Membership Architecture**.

---

## 1. Overview & Core Architecture

The crowdfunding platform provides two distinct, role-segregated portals:

1. **Investor Portal** (`/investor-portal/*`): Dedicated to individual and institutional investors discovering campaigns, making pledges, managing wallets, and viewing active holdings.
2. **Issuer Portal** (`/issuer-portal/*`): Dedicated to corporate issuers creating, configuring, and managing crowdfunding project campaigns.

### 1.1 Fundamental Security Principles
- **Role Isolation**: A user is either an `investor` or an `issuer`. Users and organizations cannot cross portal boundaries without explicitly passing triple-gate verification (triple gate verification is explained later).
- **Dual Investor Operating Modes**: An investor can operate either as an **Individual Investor** (bound to a single Clerk `user_id`) or as an **Institutional Investor** (bound to a shared Clerk `org_id`).
- **Organization-Bound Issuers**: Corporate issuers **must** operate within an active Clerk Organization (`org_id`).
- **Server-Side Enforcement**: All permissions, webhooks, and layout gates are enforced server-side using Supabase Admin (`supabaseAdmin`) and Clerk Server SDK (`@clerk/nextjs/server`).

---

## 2. Account Creation & Sign-In Workflows

### 2.1 Sign-Up Flow
- **Investor Sign-Up** (`/investor/sign-up`):
  - User signs up via Clerk.
  - Form tags user metadata during creation: `publicMetadata.role = 'investor'` and `unsafeMetadata.role = 'investor'`.
  - Upon successful registration, user is redirected to `/investor-portal/onboarding`.
- **Issuer Sign-Up** (`/issuer/sign-up`):
  - User signs up via Clerk and creates a mandatory Organization workspace.
  - Form tags user metadata: `publicMetadata.role = 'issuer'` and `unsafeMetadata.role = 'issuer'`.
  - Upon successful registration, user is redirected to `/issuer-portal/onboarding`.

### 2.2 Sign-In Flow
- **Investor Sign-In** (`/investor/sign-in`): Authenticates investors and redirects to `/investor-portal`.
- **Issuer Sign-In** (`/issuer/sign-in`): Authenticates issuers and redirects to `/issuer-portal`.

---

## 3. Clerk Webhook Synchronization Engine (`/api/webhooks/clerk`)

The webhook route (`app/api/webhooks/clerk/route.ts`) acts as the real-time sync engine between Clerk authentication events and the PostgreSQL database.

```
+----------------+      Svix Verified Payload      +-----------------------+
|  Clerk Webhook | ------------------------------> | /api/webhooks/clerk   |
+----------------+                                 +-----------------------+
                                                               |
                +----------------------------------------------+
                |
                v
  +---------------------------+---------------------------+---------------------------+
  | `user.created`            | `organization.created`    | `organizationMembership`  |
  | -> `users` table          | -> `organizations` table  | -> `memberships` table    |
  | -> `investors` (if role)  | -> `issuers` (if issuer)  | -> sync user role         |
  +---------------------------+---------------------------+---------------------------+
```

### 3.1 Event Handlers & Database Mappings

#### 1. `user.created`
- Extract `id`, `email_addresses`, `first_name`, `last_name`, and `public_metadata.role`.
- Insert into `users` table:
  ```json
  {
    "user_id": "user_3J6fhv5Y9GNcjvcgdYt9wRTPneX",
    "email": "mailtemporary765@gmail.com",
    "first_name": "Issuer",
    "last_name": "One",
    "role": "issuer"
  }
  ```
- **Auto-Provisioning**: If `role === 'investor'`, auto-inserts a default row into `investors` table with `user_id = id` and `onboarding_status = 'incomplete'`.

#### 2. `user.updated`
- Updates `first_name`, `last_name`, `email`, `role`, and `updated_at` on the `users` table.

#### 3. `user.deleted`
- Cascades deletion of user record from `memberships` table and `users` table.

#### 4. `organization.created`
- Extracts `id` (`org_id`), `name`, and `created_by`.
- Determines organization type: Checks creator's role in `users` table. If creator role is `issuer`, sets `type = 'issuer'`, otherwise `type = 'investor'`.
- Upserts into `organizations` table:
  ```json
  {
    "org_id": "org_3J6fjhVCJZWVqLgdVjQt1EQfiDm",
    "org_name": "Kenya Energy",
    "created_by": "user_3J6fhv5Y9GNcjvcgdYt9wRTPneX",
    "type": "issuer"
  }
  ```
- Updates Clerk organization metadata via `clerkClient().organizations.updateOrganizationMetadata(id, { publicMetadata: { type: orgType } })`.
- **Auto-Provisioning**: If `orgType === 'issuer'`, auto-inserts default row into `issuers` table with `org_id = id` and `onboarding_status = 'incomplete'`.

#### 5. `organization.deleted`
- Cascades deletion of organization record from `memberships` table and `organizations` table.

#### 6. `organizationMembership.created` / `organizationMembership.updated`
- Extracts `org_id`, `user_id`, `role` (`admin` / `member`), and `membership_id`.
- Upserts into `memberships` table:
  ```json
  {
    "org_id": "org_3J6fjhVCJZWVqLgdVjQt1EQfiDm",
    "membership_id": "mem_org_3J6fjhVCJZWVqLgdVjQt1EQfiDm_user_3J6fhv5Y9GNcjvcgdYt9wRTPneX",
    "user_id": "user_3J6fhv5Y9GNcjvcgdYt9wRTPneX",
    "role": "admin"
  }
  ```
- **Role Sync**: If organization `type === 'issuer'`, automatically updates user's role to `'issuer'` in `users` table and syncs Clerk user metadata.

#### 7. `organizationMembership.deleted`
- Deletes membership row from `memberships` table matching `membership_id` or `(org_id, user_id)`.

---

## 4. Cross-Portal Protection & Triple Gate Security Engine

The application enforces a **Triple Gate Security Engine** inside layout components ([app/investor-portal/layout.jsx] & [app/issuer-portal/layout.jsx].

```
                       USER REQUEST TO PORTAL
                                 |
                                 v
               +-----------------------------------+
               |  Middleware Authentication Check  |
               +-----------------------------------+
                                 |  (If Logged In)
                                 v
            +-----------------------------------------+
            | GATE 1: Clerk User Metadata Gate       |
            | (role === 'investor' or 'issuer')       |
            +-----------------------------------------+
                                 |  (Passed)
                                 v
            +-----------------------------------------+
            | GATE 2: Clerk Org Metadata Gate        |
            | (org.publicMetadata.type ===           |
            | "investor" or "issuer")                |
            +-----------------------------------------+
                                 |  (Passed)
                                 v
            +-----------------------------------------+
            | GATE 3: Database Org Table Gate         |
            | (organizations.type ===                 |
            | "investor" or "issuer")                |
            +-----------------------------------------+
                                 |
           +---------------------+---------------------+
           | ALL GATES PASS                            | ANY GATE FAILS
           v                                           v
  GRANT PORTAL ACCESS                         RENDER ACCESS RESTRICTED
  (Render Layout & Children)                  CARD VIEW (No Data Leak)
```

### 4.1 Gate Evaluation Breakdown

| Gate Level | Source | Verification Mechanism |
|---|---|---|
| **Middleware** | `middleware.ts` | Checks if user is authenticated. Unauthenticated requests to `/investor-portal/*` redirect to `/investor/sign-in`; `/issuer-portal/*` redirect to `/issuer/sign-in`. |
| **Gate 1** | Clerk User Metadata | Checks `user.publicMetadata.role` or `user.unsafeMetadata.role`. Investor layout requires `'investor'`; Issuer layout requires `'issuer'`. |
| **Gate 2** | Clerk Organization Metadata | When `orgId` is active, checks `clerkOrg.publicMetadata.type`. Investor layout requires `'investor'`; Issuer layout requires `'issuer'`. If uninitialized, auto-tags organization. |
| **Gate 3** | Supabase `organizations` Table | Queries `organizations` table where `org_id = orgId`. Verifies `type === 'investor'` or `'issuer'`. |

### 4.2 Cross-Portal Access Attempt Behavior

If an **Issuer** attempts to open `/investor-portal`, or an **Investor** attempts to open `/issuer-portal`:
1. Gate evaluation fails (`areAllGatesPassed = false`).
2. The portal **does not redirect in a loop** or throw an exception.
3. The page renders an **Access Restricted Screen**:

```
+-------------------------------------------------------------+
|                     [ SHIELD ALERT ICON ]                   |
|                        ACCESS RESTRICTED                    |
|                   No Access To Issuer Portal                |
|                                                             |
|   You are not permitted to access this page or portal      |
|   entirely. Your account role or active organization        |
|   workspace does not have access privileges.                |
|                                                             |
|                   [ Return to Home Button ]                 |
+-------------------------------------------------------------+
```

---

## 5. Multi-User & Multi-Organization Architecture

The platform supports corporate team collaboration and multi-entity organization management.

### 5.1 Operating Modes: Individual vs. Institutional Investors

```
                       INVESTOR LOGIN
                             |
         +-------------------+-------------------+
         |                                       |
         v                                       v
Individual Mode (orgId = null)       Institutional Mode (orgId active)
- Bound to `user_id`                 - Bound to `org_id`
- Individual KYC (DOB, Passport)     - Corporate KYC (Trade License, MoA)
- Private Wallet                     - Shared Corporate Wallet
- Single User Access                 - Multi-Member Team Access
```

1. **Individual Investor**:
   - `auth().orgId` is `null`.
   - Operations map to `investors` table where `user_id = userId`.
   - Single user owns wallet, pledges, and holdings.
2. **Institutional Investor**:
   - User activates a Clerk Organization (`auth().orgId != null`).
   - Operations map to `investors` table where `org_id = orgId`.
   - Shared corporate profile, corporate bank verification, and institutional wallet.
3. **Corporate Issuer**:
   - Always requires an active Clerk Organization (`auth().orgId != null`).
   - Operations map to `issuers` table where `org_id = orgId`.

### 5.2 Multi-Member Organizations & Role Permissions

Within a single organization (`org_id`):
- **Organization Creator**: Recorded as `created_by` in `organizations` table and assigned `role = 'admin'` in `memberships` table.
- **Invited Team Members**: Joined via Clerk Organization Invitations.
  - When a member accepts an invite, Clerk fires `organizationMembership.created`.
  - Webhook inserts a record into `memberships` table.
  - If organization type is `issuer`, webhook automatically syncs the member's user role to `'issuer'`.
- **Shared Access**: All members belonging to the same `org_id` see shared projects, documents, wallet balance, and onboarding progress.

### 5.3 Multi-Organization Switching

A user can belong to multiple Clerk Organizations (e.g. an executive managing two distinct issuing entities):
1. The user uses Clerk's **Organization Switcher** component in the top navigation bar.
2. Selecting a different organization changes `auth().orgId` dynamically on subsequent server requests.
3. The layout Triple Gate re-evaluates Gate 2 and Gate 3 against the new `orgId`.
4. Database queries seamlessly scope records to the newly active `org_id`.

---

## 6. Summary Matrix: Authentication & Access Control

| User Type | Active Org | Accessible Routes | Role Metadata | Database Identity |
|---|---|---|---|---|
| **Unauthenticated** | None | `/`, `/about`, `/investor/sign-in`, `/issuer/sign-in` | None | None |
| **Individual Investor** | None | `/investor-portal/*` | `role: "investor"` | `investors.user_id = userId` |
| **Institutional Investor** | `org_xxx` (Investor) | `/investor-portal/*` | `role: "investor"` | `investors.org_id = orgId` |
| **Corporate Issuer** | `org_yyy` (Issuer) | `/issuer-portal/*` | `role: "issuer"` | `issuers.org_id = orgId` |
| **Cross-Portal Violation** | Mismatched | Blocked (Renders Access Restricted Screen) | Mismatched | Gate Failure |
