# Auditor Portal — Workstation Architecture & Review Queues Guide

This document specifies the technical architecture, security model, data flow, and queue management system for the **Auditor Portal Workstation** (`/auditor-portal`).

---

## 1. System Architecture Overview

The Auditor Portal is a dedicated compliance workstation designed for compliance officers and auditors. It provides centralized review interfaces for identity verification (KYC/KYB), financial regulatory compliance, Shariah contract validation, project campaign auditing, milestone escrow releases, and bank settlement routing.

### Key Architectural Layers

```
                                 ┌───────────────────────────────────────────────┐
                                 │            Auditor Web Workstation            │
                                 │             (/auditor-portal/*)               │
                                 └───────────────────────┬───────────────────────┘
                                                         │
                                               Server Actions Context
                                            (app/actions/auditor.js)
                                                         │
                        ┌────────────────────────────────┼────────────────────────────────┐
                        │                                │                                │
             ┌──────────▼──────────┐          ┌──────────▼──────────┐          ┌──────────▼──────────┐
             │   Clerk Auth &      │          │  AES-256 Decryption │          │ Supabase Admin DB   │
             │   Auditor Profile   │          │  (app/utils/crypto) │          │  (Postgres Tables)  │
             └─────────────────────┘          └─────────────────────┘          └─────────────────────┘
```

---

## 2. Authentication & Authorization Model

### Session & Identity Enforcement
- **Clerk Authentication**: All server actions inspect `auth()` from `@clerk/nextjs/server`.
- **Auditor Record Lookup**: Calls `getAuthenticatedAuditor()`, which matches `users.user_id = clerkUserId` to retrieve the internal `users.id` and queries the `auditors` table.
- **Access Control**: Unauthenticated or unauthorized requests throw an explicit error (`"Unauthorized: Auditor profile required."`).

### Server-Side Data Decryption
Sensitive financial and identity fields are stored encrypted in Postgres using **AES-256-CBC** (`encrypt()` / `decrypt()` helpers in `app/utils/crypto.js`):
- **IBAN Numbers** (`bank_details.iban` on `investors` & `issuers` tables).
- **Trade License Numbers** (`trade_license_number` on `issuers` table).
- **Representative ID Numbers** (`id_number` on `issuer_reps` & `investor_reps` tables).
- **Document Passwords** (`document_password` on `investor_docs` & `issuer_docs` tables).

When an auditor fetches case details, these fields are automatically decrypted server-side before rendering, while remaining encrypted at rest in Supabase.

---

## 3. Compliance Review Queues Overview

The Auditor Portal Workstation is structured into **5 active compliance review queues** accessible via the sidebar navigation (`AuditorPortalLayoutClient.jsx`):

| Module | Route | Purpose | Key Database Entities |
| :--- | :--- | :--- | :--- |
| **1. Investor Onboarding** | `/auditor-portal/investor-onboarding` | KYC/AML & Institutional onboarding audit, Investor Class assignment (Class 1–10). | `investors`, `investor_docs`, `investor_reps` |
| **2. Issuer Onboarding** | `/auditor-portal/issuer-onboarding` | Corporate KYB verification, Trade License audit, UBO & Representative review. | `issuers`, `issuer_docs`, `issuer_reps` |
| **3. Project Creation Review** | `/auditor-portal/project-creation` | Campaign details, SPV structures, Shariah certificate upload, baseline investor class. | `projects`, `spv_details`, `project_docs`, `project_media`, `project_milestones` |
| **4. Milestone Review** | `/auditor-portal/milestone-review` | Audit deliverable proof for issuer milestones before escrow fund release. | `project_milestones`, `projects` |
| **5. Bank Details Review** | `/auditor-portal/bank-review` | Dedicated queue for new or updated settlement bank details & IBAN routing. | `investors`, `issuers` |

---

## 4. Real-time Workload Metrics & Dashboard

The Auditor Dashboard (`/auditor-portal`) provides a real-time summary of pending compliance tasks across all 5 queues via `getAuditorDashboardCounts()`:

### Metric Computation Logic
- **`investorOnboarding`**: `count(investors)` WHERE `onboarding_status IN ('pending_review', 'pending review')`.
- **`issuerOnboarding`**: `count(issuers)` WHERE `onboarding_status IN ('pending_review', 'pending review')`.
- **`projectCreation`**: `count(projects)` WHERE `status IN ('pending_review', 'pending review')`.
- **`milestoneReview`**: `count(project_milestones)` WHERE `verification_status IN ('pending', 'pending_review')`.
- **`bankReview`**: `count(investors WHERE bank_verification_status = 'pending')` + `count(issuers WHERE bank_verification_status = 'pending')`.
- **`totalPending`**: Sum of all 5 pending task counts.

---

## 5. Sidebar Navigation Structure

The workstation sidebar (`app/auditor-portal/components/AuditorPortalLayoutClient.jsx`) contains the following routes:
1. **Dashboard** (`/auditor-portal`)
2. **Investor Onboarding** (`/auditor-portal/investor-onboarding`)
3. **Issuer Onboarding** (`/auditor-portal/issuer-onboarding`)
4. **Project Creation Review** (`/auditor-portal/project-creation`)
5. **Milestone Review** (`/auditor-portal/milestone-review`)
6. **Bank Details Review** (`/auditor-portal/bank-review`)
