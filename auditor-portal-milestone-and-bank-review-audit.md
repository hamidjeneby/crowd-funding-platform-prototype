# Auditor Portal — Milestone & Bank Review Audit Guide

This document details the audit workflows for **Milestone Reviews** (`/auditor-portal/milestone-review`) and **Bank Details Reviews** (`/auditor-portal/bank-review`).

---

## Part I: Milestone Review Audit Scenarios

### 1. Overview & Escrow Fund Release System
- **Queue Location**: `/auditor-portal/milestone-review`
- **Target Entities**: `project_milestones` attached to active projects.
- **Purpose**: Verifying execution proof for project roadmap milestones before authorizing escrow fund disbursements or completion verification.

---

### 2. Milestone Classification

1. **System Milestones (`milestone_source = 'system'`)**:
   - Auto-generated milestone events:
     - `campaign_live`
     - `campaign_funded`
     - `custody_transfer_complete`
   - Pre-approved by system (`milestone_verification_status = 'approved'`).
   - System target dates auto-adjust when `campaign_end_date` is updated.

2. **Issuer Milestones (`milestone_source = 'issuer'`)**:
   - Custom roadmap milestones created by the project issuer (e.g. *Land Acquisition*, *Site Construction Phase I*).
   - Require proof document submission and explicit auditor review.

---

### 3. Milestone Audit Workflows & Scenarios

#### Scenario A: Milestone Detail Update by Issuer
- If an issuer edits an existing milestone title, description, or target date in the project creation/edit wizard, `verification_status` is updated to `'pending'` **only for that specific milestone**.
- Other existing approved milestones remain unchanged (`verification_status = 'approved'`).

#### Scenario B: Milestone Completion Proof Submission
- When an issuer marks a milestone as complete and uploads execution proof, `milestone.verification_status` is set to `'pending'`.

#### Scenario C: Auditor Review Action (`updateMilestoneDecision`)
- The auditor views the milestone proof document, target date, description, and AI review confidence score.
- **Action 1: Approve Milestone**
  - Executes `updateMilestoneDecision({ milestoneId, decision: 'approved' })`.
  - Sets `verification_status = 'approved'`, `status = 'completed'`, logs `reviewed_by` and `reviewed_at`.
  - **Escrow Outcome**: Milestone is marked verified for fund release.
- **Action 2: Direct Reject Milestone**
  - Executes `updateMilestoneDecision({ milestoneId, decision: 'rejected' })`.
  - Directly sets `verification_status = 'rejected'` with zero delay (no modal popup required).
  - Optimistic UI immediately updates the card status badge to `Rejected`.

---

## Part II: Bank Details Review Audit Scenarios

### 1. Overview & Bank Verification Queue
- **Queue Location**: `/auditor-portal/bank-review`
- **Target Entities**: Investor Bank Accounts (`investors.bank_verification_status`) and Issuer Bank Accounts (`issuers.bank_verification_status`).

---

### 2. Bank Details Edit Trigger Rules

#### Issuer Bank Details Edit Rule
- When an issuer edits their banking details (Bank Name, Account Holder Name, IBAN, SWIFT) in the Account & Banking page (`/issuer-portal/account`):
  - `bank_details` JSON payload is updated with encrypted IBAN (`encrypt(iban)`).
  - `bank_verification_status` is automatically set to `'pending'`.
  - `bank_verification_rejection_reason` is reset to `null`.
  - A new entry immediately appears in the Auditor Bank Details Review Queue (`/auditor-portal/bank-review`).

#### Investor Bank Details Submission
- When an investor submits bank details during onboarding or updates bank details:
  - `bank_details` IBAN is encrypted at rest.
  - `bank_verification_status` is set to `'pending'`.

---

### 3. Auditor Bank Review Scenarios

#### Audit Steps (`updateBankVerificationDecision` / `updateInvestorBankDecision` / `updateIssuerBankDecision`)
1. **IBAN Inspection**: The auditor views the bank name, account holder name, SWIFT code, and server-side decrypted IBAN.
2. **Proof Document Matching**: Compares the bank details with the uploaded official `bank_verification_letter` document.
3. **Auditor Action**:
   - **Approve Bank Verification**: Sets `bank_verification_status = 'approved'`, `bank_verification_rejection_reason = null`.
   - **Reject Bank Verification**: Sets `bank_verification_status = 'rejected'`, populates `bank_verification_rejection_reason`.

---

## Summary of All Auditor Action Server Handlers

| Action Function | Target Entity | Primary Parameters | Key DB Mutations |
| :--- | :--- | :--- | :--- |
| `submitInvestorFinalOnboardingDecision` | Investor | `investorId`, `decision`, `reviewNotes` | Updates `onboarding_status` (`approved`/`incomplete`/`rejected`), `review_notes`, syncs Clerk role. |
| `updateInvestorClassDecision` | Investor | `investorId`, `selectedClass` | Updates `investor_class` (1–10). |
| `submitIssuerFinalOnboardingDecision` | Issuer | `issuerId`, `decision`, `reviewNotes` | Updates `onboarding_status` (`approved`/`incomplete`/`rejected`), `review_notes`, syncs Clerk role. |
| `updateProjectShariahCompliance` | Project | `projectId`, `certificateFile` | Uploads to `shariah_compliance_docs`, sets `shariah_compliance_status = 'approved'`, locks Steps 1–3. |
| `updateProjectMinClassDecision` | Project | `projectId`, `selectedClass` | Updates `min_eligible_investor_class` (1–10). |
| `updateProjectDocumentDecision` | Project Doc | `docId`, `decision`, `rejectionReason` | Updates `review_status` (`approved`/`rejected`), `rejection_reason`. |
| `updateProjectMediaDecision` | Project Media | `mediaId`, `decision`, `rejectionReason` | Updates `review_status` (`approved`/`rejected`), `rejection_reason`. |
| `updateProjectCoverImageDecision` | Project | `projectId`, `decision` | Updates `cover_image_review_status` (`approved`/`rejected`). |
| `submitProjectFinalDecision` | Project | `projectId`, `decision`, `reviewNotes` | Updates `status` (`campaign_live`/`draft`/`rejected`), `review_notes`. |
| `updateMilestoneDecision` | Milestone | `milestoneId`, `decision` | Updates `verification_status` (`approved`/`rejected`), `status`. |
| `updateBankVerificationDecision` | Investor/Issuer | `entityType`, `entityId`, `decision` | Updates `bank_verification_status` (`approved`/`rejected`). |
