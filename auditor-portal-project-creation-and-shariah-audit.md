# Auditor Portal — Project Creation & Shariah Audit Guide

This document details the audit workflows, verification procedures, Shariah compliance certificate uploads, baseline investor class calculations, and approval status lifecycle for **Project Creation Audits** (`/auditor-portal/project-creation/[id]`).

---

## 1. Overview & Project Review Workstation

- **Queue Location**: `/auditor-portal/project-creation`
- **Case Review Page**: `/auditor-portal/project-creation/[id]`
- **Target Entities**: Campaign proposals created by verified issuers (`status = 'pending_review'`).

---

## 2. Project Data Sections Audited

When auditing a project proposal, the auditor reviews 5 comprehensive data panels:

### Panel 1: Basic Information
- **Title, Slug, Summary**: Project branding and public summary text.
- **Full Description**: Rendered safely via Markdown / Rich HTML sanitizer.
- **Project Milestones**: Review defined execution milestones (`title`, `description`, `target_date`, `verification_status`).

### Panel 2: Structure & Compliance
- **Shariah Contract Type**: `murabaha`, `mudarabah`, `ijara`, or `spv_equity`.
- **SPV Details Verification (`spv_details`)**:
  - `spv_legal_name`
  - `registration_authority` (DIFC, ADGM, Labuan IBFC, or custom text)
  - `registration_number`
  - `total_shares_authorized`
  - `total_cost_authorized`: If null/empty for `spv_equity` projects, the UI automatically computes and displays this value as `total_shares_authorized * (unit_price || share_price)`.
  - **Auditor Decision**:
    - **Approve SPV**: Sets `spv_detail_verification_status = 'approved'`, resets `rejection_reason = null`. Displays a green background hue (`bg-emerald-50/70 border-emerald-300`).
    - **Reject SPV**: Opens modal requiring auditor feedback; sets `spv_detail_verification_status = 'rejected'`, records reason in `rejection_reason`. Displays a red background hue (`bg-red-50/70 border-red-300`) with an explanatory alert banner.
    - **Interplay with Shariah**: If SPV details are rejected, the Shariah Compliance certificate section is **disabled** and cannot be approved. When Shariah compliance is approved, SPV details are **auto-approved**.
    - **Issuer Resubmission Reset**: When an issuer resubmits a project for review via `submitProjectForReview`:
      - If `shariah_compliance_status !== 'approved'`: `spv_details.spv_detail_verification_status` is reset to `'pending'` and `rejection_reason` is reset to `null`.
      - If `shariah_compliance_status === 'approved'`: SPV details remain `'approved'` (since SPV and project structure were locked from issuer edits) and `rejection_reason` is cleared (`null`).
- **Conversion Clause Terms (if enabled — `class-rules.md` §6)**:
  - `conversion_enabled` (boolean — only available when `sharia_contract_type` is `murabaha`, `mudarabah`, or `ijara` with `is_spv = true`; never available for `spv_equity`)
  - `conversion_trigger_value` (Trigger share price)
  - `conversion_ratio_shares` (Conversion ratio per unit)
  - `conversion_deadline` (Must be after campaign end date)
  - *(Note: Terms are proposed by the issuer, finalized by compliance/Sharia review before launch, and locked once live. Only **Classes 1–4** hold conversion rights [Class 1 uncapped; Class 2 AED 1,000,000 cap; Class 3 AED 500,000 cap; Class 4 AED 250,000 cap] allocated at close in priority order Class 1 $\rightarrow$ Class 4; Classes 5–10 hold cash-only Sukuk.)*

### Panel 3: Financial Terms
- **Target Goal, Soft Cap, Hard Cap**: Campaign funding boundaries.
- **Minimum Investment Floor**: Whole integer floor amount.
- **Currency & Unit Pricing**: Currency (`AED`, `MYR`, `USD`, `IDR`), Unit Price (`unit_price`), Unit Type (`sukuk` vs `shares`).
- **Yield & ROI**: `expected_roi_percent`, `yield_type` (`rental`, `profit_margin`, `equity_appreciation`).
- **Campaign End Date**: Campaign deadline timestamp.
- **Clearing Option**: `platform_clearing` or `custody_provider_clearing`.

### Panel 4: Project Documents Audit (`project_docs`)
- **Required Slots**: `pitch_deck`, `balance_sheet`, `valuation_report`, `cap_table` (SPV), `spv_registration` (SPV).
- **Individual Action**:
  - Approve document: `review_status = 'approved'`, `rejection_reason = null`.
  - Reject document: `review_status = 'rejected'`, populates `rejection_reason`. Prompt banner displayed to issuer requiring document replacement. Replacing file resets `review_status` to `'pending'`.

### Panel 5: Project Media & Cover Image Audit (`project_media`)
- **Cover Image Review (`cover_image_review_status`)**: Direct approval or rejection (`approved` / `rejected`).
  - **Dynamic Background Hue**: Container card dynamically reflects decision state — turns green (`bg-emerald-50/70 border-emerald-300`) when approved, turns red (`bg-red-50/70 border-red-300`) when rejected, and neutral white when pending.
- **Additional Media Cards**: Individual approval or rejection with reason.

---

## 3. Shariah Compliance Certificate Workflow

Auditors perform Shariah compliance audits directly on the project review page:

1. **Document Upload**:
   - Auditor uploads the official Shariah Compliance Certificate PDF.
   - Saved directly to the root `shariah_compliance_docs` storage bucket (no subfolders).
2. **Database Updates (`updateProjectShariahCompliance`)**:
   - `shariah_compliance_status = 'approved'`
   - `shariah_compliance_doc_url = publicUrl`
   - **Auto-Approval of SPV**: Automatically marks `spv_details.spv_detail_verification_status = 'approved'` and clears `rejection_reason`.
3. **Shariah Non-Compliance (`rejected`)**:
   - If marked non-compliant, `projects.shariah_compliance_status = 'rejected'`.
   - **Clears Class**: Automatically sets `projects.min_eligible_investor_class = null`.
   - **Disables Section 5**: Auditor cannot assign any investor class, and all class selector buttons are locked.
4. **Visual Hue**:
   - Section displays a green background hue (`bg-emerald-50/70 border-emerald-300`) when approved.
   - Section displays a red background hue (`bg-red-50/70 border-red-300`) when marked non-compliant.
5. **Issuer Portal Locking Effect**:
   - Once marked as Shariah Compliant (`approved`), Steps 1 through 3 (Basic Info, Structure & Compliance, Financial Terms) become **locked** against issuer edits in the project editing wizard (`app/issuer-portal/projects/[slug]/edit/page.js`).
   - Issuers may still add or update milestones in Step 1. Updating a milestone changes its `verification_status` to `'pending'` without un-approving other milestones.
6. **Submission & Resubmission Status Lifecycle**:
   - When an issuer submits or resubmits a project for review via `submitProjectForReview`:
     - If `shariah_compliance_status === 'approved'`: It remains `'approved'` because the issuer was locked from altering the SPV details and project structural parameters.
     - If `shariah_compliance_status !== 'approved'` (i.e. was `'rejected'`, `'pending'`, or null): It is automatically changed to `'pending'`, signaling to the auditor that revisions were made and the project is ready for a fresh Shariah compliance audit.

---

## 4. Calculated Baseline Minimum Eligible Investor Class Panel

To enforce regulatory compliance (§1, §9 & §10 of `class-rules.md`), the project review workstation calculates a **System Baseline Minimum Class** (`Class 1` = highest tier / most restrictive; `Class 10` = lowest tier / broadest access, so only investors with `investor_class <= min_eligible_investor_class` may view or pledge):

### Algorithm Logic (`calculateBaselineMinClass`)
1. **Floor Constraint (§1 & §9)**: Matches the project's `min_investment_floor` (in **AED**) against each class's per-project max pledge ceiling so classes unable to meet the minimum floor are excluded:
   - `floor > AED 5,000,000` $\rightarrow$ **Class 1 only** (`1`; only Class 1 has Unlimited max pledge)
   - `floor > AED 2,000,000` $\rightarrow$ Allows up to **Class 2** (`2`; max pledge AED 5,000,000)
   - `floor > AED 1,000,000` $\rightarrow$ Allows up to **Class 3** (`3`; max pledge AED 2,000,000)
   - `floor > AED 500,000` $\rightarrow$ Allows up to **Class 4** (`4`; max pledge AED 1,000,000)
   - `floor > AED 200,000` $\rightarrow$ Allows up to **Class 5** (`5`; max pledge AED 500,000)
   - `floor > AED 50,000` $\rightarrow$ Allows up to **Class 6** (`6`; max pledge AED 200,000)
   - `floor > AED 10,000` $\rightarrow$ Allows up to **Class 7** (`7`; max pledge AED 50,000)
   - `floor > AED 2,000` $\rightarrow$ Allows up to **Class 8** (`8`; max pledge AED 10,000)
   - `floor > AED 500` $\rightarrow$ Allows up to **Class 9** (`9`; max pledge AED 2,000 — excludes Class 10, whose ceiling is AED 500)
   - `floor <= AED 500` $\rightarrow$ Allows up to **Class 10** (`10`; max pledge AED 500)
2. **Target Raise Goal Threshold (§1)**: Classes 1–4 see all live campaigns regardless of target size, whereas Classes 5–10 require campaigns strictly above the following **AED** thresholds (with Classes 9–10 also subject to §2b quarterly / open-pledge limits):
   - Target Goal > **AED 20M** $\rightarrow$ Allows up to **Class 10** (unlocks Classes 8, 9, and 10)
   - Target Goal > **AED 15M** $\rightarrow$ Allows up to **Class 7**
   - Target Goal > **AED 10M** $\rightarrow$ Allows up to **Class 6**
   - Target Goal > **AED 5M** $\rightarrow$ Allows up to **Class 5**
   - Target Goal $\le$ **AED 5M** $\rightarrow$ Capped at **Class 4** (Classes 1–4 eligible only)
3. **SPV Equity Structure Constraint (§10)**:
   - For any project where `sharia_contract_type === 'spv_equity'`, eligibility is strictly restricted to **Classes 1–4** (Classes 5–10 are automatically ineligible to view or pledge).
4. **Combined System Recommendation**:
   - Takes the most restrictive overlap (smallest class number): `Math.min(highestClassByFloor, highestClassByGoal, highestClassByContract)`. Investors with a class number higher than `min_eligible_investor_class` cannot view or pledge to this campaign.

### Auditor Assignment
- Auditor inspects the recommendation card and saves the project's `min_eligible_investor_class` via `updateProjectMinClassDecision({ projectId, selectedClass })`.
- **Enforcement Rules**:
  - Assignment is blocked if the project is marked Shariah non-compliant (`shariah_compliance_status === 'rejected'`).
  - For SPV Equity projects, Classes 5–10 are disabled in the UI and rejected server-side.

---

## 5. Final Overall Project Approval Decision Workflow

Auditor executes `submitProjectFinalDecision({ projectId, decision, reviewNotes })`:

```
                                  ┌─────────────────────────────────┐
                                  │   Auditor Decision Action       │
                                  └────────────────┬────────────────┘
                                                   │
                ┌──────────────────────────────────┼──────────────────────────────────┐
                │                                  │                                  │
      ┌─────────▼─────────┐              ┌─────────▼─────────┐              ┌─────────▼─────────┐
      │  Approve Campaign │              │ Send Back (Draft) │              │  Reject Campaign  │
      └─────────┬─────────┘              └─────────┬─────────┘              └─────────┬─────────┘
                │                                  │                                  │
     status = 'campaign_live'             status = 'draft'                   status = 'rejected'
     review_notes = null                  review_notes = notes               review_notes = notes
```

### Scenario Outcomes

1. **Decision = 'approve'**:
   - **Status Update**: `projects.status = 'campaign_live'`, `review_notes = null`.
   - **Marketplace Visibility (§1 & §8)**: While pre-audit (`pending_review`) projects are visible only to **Class 1** investors, approving to `campaign_live` makes the project active on the Investor Marketplace (`/investor-portal/marketplace`) for eligible classes — governed by `min_eligible_investor_class`, target raise size thresholds (`> AED 5M / 10M / 15M / 20M` for Classes 5–10), and the SPV Equity Class 1–4 restriction.

2. **Decision = 'send_back'**:
   - **Status Update**: `projects.status = 'draft'`, `review_notes = reviewNotes`.
   - **Issuer Experience**: Banner displays auditor notes on `/issuer-portal/projects/[slug]/edit`. Issuer can make requested corrections and re-submit. Upon re-submission, `review_notes` is reset to `null`.

3. **Decision = 'reject'**:
   - **Status Update**: `projects.status = 'rejected'`, `review_notes = reviewNotes`.
   - **Outcome**: Campaign proposal is rejected and cannot be submitted.

### Pre-Decision Gating Checklist & Connected Review Dependencies
Like the Investor and Issuer Onboarding Review modules, the Final Project Disposition section locks final submission until every sub-entity is audited. If items remain un-reviewed, it provides an itemized checklist of exact pending items:
- `{N} project document(s) left to review`
- `{N} project milestone(s) left to review`
- `{N} media file(s) left to review`
- `1 campaign hero cover image left to review`
- `SPV legal structure decision has not been provided` (when SPV details exist and `spv_detail_verification_status === 'pending'`)
- `Shariah compliance audit decision has not been provided` (when Shariah status is pending/un-decided, and NOT blocked by SPV rejection)
- `Minimum eligible investor class has not been assigned` (when investor class is unassigned, and NOT blocked by SPV or Shariah rejection)

#### Connected Dependency & Blocking Rules
1. **SPV Rejection Cascading Effect**:
   - If SPV details are rejected (`spv_details.spv_detail_verification_status === 'rejected'`), Shariah compliance is **blocked** from approval, and the minimum investor class **cannot be assigned**.
   - Because the auditor cannot provide a review in these blocked sections, neither Shariah compliance nor Class assignment are displayed as "left to review".
2. **Shariah Non-Compliance Cascading Effect**:
   - If Shariah compliance is marked non-compliant (`projects.shariah_compliance_status === 'rejected'`), minimum eligible investor class assignment is **blocked** (`min_eligible_investor_class = null` and selectors disabled).
   - Because the class cannot be assigned for a non-compliant project, "Minimum eligible investor class has not been assigned" is omitted from the "left to review" checklist.
3. **Publication vs. Return / Rejection Controls**:
   - Once all pending review items are decided, the disposition panel unlocks:
     - **"Send Back for Revision"** and **"Reject Project"** are fully available.
     - **"Approve & Publish Project"** is strictly enabled only if all prerequisites for publication are satisfied: `spv_details` approved, `shariah_compliance_status === 'approved'`, and `min_eligible_investor_class` assigned. If SPV or Shariah was rejected, publication is disabled with an explanatory banner.
