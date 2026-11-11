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
  - `income_evidence` (Pay stub / Tax return / Wealth proof — required when requesting a class above the Class 10 baseline)
  - *(Note: Under `class-rules.md` §3, baseline ID + proof of address alone qualifies for **Class 10** with light-touch review; assigning **Class 1** always requires enhanced due diligence: `source_of_funds` and `audited_financials`.)*
- **Auditor Action**:
  - Click **Approve Document**: Sets `investor_docs.status = 'approved'`, `rejection_reason = null`, logs `reviewed_by` and `reviewed_at`.
  - Click **Reject Document**: Opens modal to enter a detailed rejection reason. Sets `investor_docs.status = 'rejected'`, populates `rejection_reason`.
  - **Document Password**: If encrypted, password is auto-decrypted for auditor inspection.

#### Step C: Investor Classification Assignment (`class-rules.md` §1–§7 & §10)
- **Governance Rule (§3)**: `investor_class` (**1–10**, where **Class 1** is the highest tier and **Class 10** is the lowest tier) is **never self-selected** by the investor. It is system/AI-suggested based on declared net worth band, income band, investment experience, and supporting evidence (using legal/compliance AED thresholds rather than hardcoded guesswork), and **must be confirmed or adjusted by the human auditor**.
- **Class Selector (`updateInvestorClassDecision`)**: Auditor reviews the AI suggestion card and selects/confirms the assigned Investor Class (**Class 1** through **Class 10**):
  - **Class 1 (Family Offices, Islamic Banks, Anchor Investors)**:
    - **Max Pledge per Project**: Unlimited (full project amount).
    - **Visibility**: All projects, including pre-audit drafts (`pending_review`).
    - **Investor Fee**: `0.5%` | **Conversion Access**: Yes — full economic benefit, no cap | **SPV Equity Eligible**: Yes | **Can Underwrite?**: Yes.
    - **Enhanced Due Diligence (§3)**: Assigning Class 1 **always** requires source of funds and audited financials, regardless of initial onboarding or upgrade path.
  - **Classes 2–4 (High-Net-Worth / Corporate Treasury — Full Live Visibility, Conversion & SPV Equity Eligible, No Underwriting)**:
    - **Class 2 (High-net-worth individuals)**: Max pledge **AED 5,000,000** per project; all post-audit, live campaigns; `0.6%` fee; conversion capped at **AED 1,000,000** conversion value.
    - **Class 3 (HNWI / corporate treasury)**: Max pledge **AED 2,000,000** per project; all live campaigns; `0.7%` fee; conversion capped at **AED 500,000** conversion value.
    - **Class 4**: Max pledge **AED 1,000,000** per project; all live campaigns; `0.8%` fee; conversion capped at **AED 250,000** conversion value.
    - *(Note: **Classes 1–4** are the only classes eligible for Sukuk conversion rights (§6) and SPV Equity projects (§10).)*
  - **Classes 5–8 (Mid-Tier to Smaller Capacity — Cash-Only Sukuk, Restricted to Larger Campaigns)**:
    - Hold cash-only Sukuk (no conversion access, no underwriting, **not eligible** for SPV Equity) and can only view live campaigns above the stated AED raise size:
    - **Class 5 (Mid-tier investors)**: Max pledge **AED 500,000** per project; live campaigns **> AED 5M** only; `0.9%` fee.
    - **Class 6**: Max pledge **AED 200,000** per project; live campaigns **> AED 10M** only; `1.0%` fee.
    - **Class 7**: Max pledge **AED 50,000** per project; live campaigns **> AED 15M** only; `1.2%` fee.
    - **Class 8**: Max pledge **AED 10,000** per project; live campaigns **> AED 20M** only; `1.5%` fee.
  - **Classes 9–10 (Retail / General Public — Cash-Only Sukuk & Pledge Frequency Limits §2b)**:
    - Hold cash-only Sukuk (no conversion access, no underwriting, **not eligible** for SPV Equity) with visibility limited to live campaigns **> AED 20M** only:
    - **Class 9 (Retail with higher risk awareness)**: Max pledge **AED 2,000** per project; `2.0%` fee; max **1 campaign per UTC calendar quarter**.
    - **Class 10 (General public — baseline individual onboarding default)**: Max pledge **AED 500** per project; `2.5%` fee; max **1 campaign per UTC calendar quarter** and **max 1 open (`pending`) pledge at a time**.
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
   - **Investor Experience**: Investor can now browse eligible marketplace projects and pledge funds subject to their class per-project ceiling, campaign-size visibility rules, conversion caps, SPV Equity eligibility, and Class 9–10 frequency limits (terms snapshot at pledge time via `investor_class_at_pledge` and `fee_percent_at_pledge` per `class-rules.md` §5).

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

#### Step D: Institutional Investor Class Assignment (`class-rules.md` §1 & §3)
- Under `class-rules.md` §3, institutional class suggestion draws on **entity type** and **audited financial statements** rather than personal net-worth/income declarations — regulated financial institutions and government entities can qualify for **Class 1** largely on entity type and verified registration alone.
- **Class 1 Enhanced Due Diligence**: Regardless of entity type, confirming **Class 1** always requires enhanced due diligence (**`source_of_funds`** and **`audited_financials`**).
- Auditor confirms or adjusts the suggested class (**Class 1–10**) via `updateInvestorClassDecision({ investorId, selectedClass })`.

#### Step E: Bank Verification Review & Final Onboarding Decision
- Verify corporate settlement bank details and approve/reject via `updateInvestorBankDecision`.
- Once documents, bank details, and investor class are confirmed, execute `submitInvestorFinalOnboardingDecision` to Approve (promotes role to `'investor'`), Send Back for Revision (sets status to `'incomplete'`), or Reject.

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
