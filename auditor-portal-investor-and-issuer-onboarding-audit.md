# Auditor Portal — Investor & Issuer Onboarding Audit Guide

This document provides a comprehensive scenario-by-scenario guide on how **Investor Onboarding Audits** (`/auditor-portal/investor-onboarding`) and **Issuer Onboarding Audits** (`/auditor-portal/issuer-onboarding`) are performed in the Auditor Portal.

---

## Part I: Investor Onboarding Auditing Scenarios

### 1. Overview & Workload Queue
- **Queue Location**: `/auditor-portal/investor-onboarding`
- **Tabs**: `Pending Review` vs `Resolved Cases`.
- **Target Entities**: Individual Investors (`investor_type = 'individual'`) and Institutional Investors (`investor_type = 'institutional'`).

---

### 2. Individual Investor Audit Scenario

#### Step A: Identity & Personal Information Check
- The auditor views full name, email, phone, residential country, and city.
- Confirms consistency with submitted identity documents.

#### Step B: Document Compliance Audit (`investor_docs`)
- **Required Document Slots**:
  - `identification` (National ID / Passport)
  - `proof_of_address` (Utility Bill / Bank Statement)
  - `income_evidence` (Pay stub / Tax return / Wealth proof)
- **Auditor Action**:
  - Click **Approve Document**: Sets `investor_docs.status = 'approved'`, `rejection_reason = null`, logs `reviewed_by` and `reviewed_at`.
  - Click **Reject Document**: Opens modal to enter a detailed rejection reason. Sets `investor_docs.status = 'rejected'`, populates `rejection_reason`.
  - **Document Password**: If encrypted, password is auto-decrypted for auditor inspection.

#### Step C: Investor Classification Assignment (§1 & §9 Class Rules)
- **Class Selector**: Auditor selects assigned Investor Class (**Class 1** through **Class 10**).
- **Regulatory Framework**:
  - **Class 1 (Retail Unaccredited)**: Subject to annual pledge caps (e.g. max \$5,000 / \$10,000 per campaign).
  - **Classes 2–4 (Mid-tier Accredited)**: Higher capacity thresholds.
  - **Classes 5–8 (High Net Worth & Institutional)**: Access to larger raise campaigns (\$5M+ / \$10M+ / \$15M+ / \$20M+).
  - **Classes 9–10 (Institutional / Ultra High Net Worth)**: Uncapped pledge limits.
- **Server Action**: `updateInvestorClassDecision({ investorId, selectedClass })` updates `investors.investor_class`.

#### Step D: Bank Verification Review
- Auditor reviews bank details (`bank_name`, `account_holder_name`, IBAN, SWIFT).
- IBAN is decrypted server-side for validation against bank verification letter.
- Server action `updateInvestorBankDecision({ investorId, decision: 'approved' | 'rejected' })` updates `bank_verification_status`.

#### Step E: Final Investor Onboarding Decision
Auditor executes `submitInvestorFinalOnboardingDecision({ investorId, decision, reviewNotes })`:

1. **Option 1: Approve Application**
   - **Database Action**: Sets `investors.onboarding_status = 'approved'`, `review_notes = null`.
   - **Clerk Metadata Sync**: Updates Clerk user `publicMetadata.role = 'investor'`.
   - **Investor Experience**: Investor can now browse the marketplace and pledge funds up to their class capacity.

2. **Option 2: Send Back for Revision**
   - **Database Action**: Sets `investors.onboarding_status = 'incomplete'`, populates `review_notes = reviewNotes`.
   - **Investor Experience**: An Amber alert banner appears at top of onboarding flow displaying auditor review notes. The investor can edit flagged details/documents and re-submit. Upon resubmission, `review_notes` is reset to `null`.

3. **Option 3: Reject Application**
   - **Database Action**: Sets `investors.onboarding_status = 'rejected'`, populates `review_notes`.
   - **Investor Experience**: Application is closed and marked rejected.

---

### 3. Institutional Investor Audit Scenario

#### Step A: Corporate Entity Details
- Review legal entity name, country of incorporation, business email, business phone, trade license / registration number.

#### Step B: Corporate Representatives Review (`investor_reps`)
- Review authorized signatories, directors, and UBOs (Ultimate Beneficial Owners with % shareholding).
- Inspect uploaded representative passports/IDs via authenticated storage URLs.

#### Step C: Corporate Documents Audit (`investor_docs`)
- **Required Slots**: `trade_certificate`, `certificate_of_incorporation`, `audited_financials`, `source_of_funds`, `bank_verification_letter`.
- Individual document approval or rejection with reason.

#### Step D: Final Onboarding Decision
- Approve (promotes role to `'investor'`), Send Back for Revision (sets status to `'incomplete'`), or Reject.

---

## Part II: Issuer Onboarding Auditing Scenarios

### 1. Overview & Workload Queue
- **Queue Location**: `/auditor-portal/issuer-onboarding`
- **Target Entities**: Corporate Issuers seeking to list crowdfunding campaigns.

---

### 2. Issuer Audit Steps & Execution

#### Step A: Corporate Entity & Trade License Verification
- Review `legal_entity_name`, `country`, `city`, `business_type`, `license_authority`.
- `trade_license_number` is decrypted server-side for auditor inspection.

#### Step B: Authorized Representatives & UBO Audit (`issuer_reps`)
- Verify list of corporate reps, shareholding percentages (UBO %), and director flags.
- Inspect representative identification documents (`id_url` stored in `issuer_reps` bucket).

#### Step C: Corporate Compliance Documents Audit (`issuer_docs`)
- **Required Slots**:
  1. `trade_certificate`
  2. `certificate_of_incorporation`
  3. `ubo_decleration`
  4. `proof_of_address`
  5. `bank_verification_letter`
- Each document can be individually approved or rejected with feedback.

#### Step D: Settlement Bank Account Review
- Inspect bank details and decrypted IBAN.
- Update `bank_verification_status` to `'approved'` or `'rejected'`.

#### Step E: Final Issuer Onboarding Decision
Auditor executes `submitIssuerFinalOnboardingDecision({ issuerId, decision, reviewNotes })`:

1. **Approve**: Sets `issuers.onboarding_status = 'approved'`, `review_notes = null`, syncs Clerk user `publicMetadata.role = 'issuer'`. Enables issuer to create campaign drafts.
2. **Send Back for Revision**: Sets `issuers.onboarding_status = 'incomplete'`, populates `review_notes`. Displays feedback banner in issuer portal onboarding wizard.
3. **Reject**: Sets `issuers.onboarding_status = 'rejected'`, populates `review_notes`.
