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
- **SPV Details (if `is_spv = true`)**:
  - `spv_legal_name`
  - `registration_authority` (DIFC, ADGM, Labuan IBFC, or custom text)
  - `registration_number`
  - `total_shares_authorized`
  - `total_cost_authorized`
- **Conversion Clause Terms (if enabled)**:
  - `conversion_enabled` (boolean)
  - `conversion_trigger_value` (Trigger share price)
  - `conversion_ratio_shares` (Conversion ratio per unit)
  - `conversion_deadline` (Must be after campaign end date)

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
- **Cover Image Review (`cover_image_review_status`)**: Direct single-click approval or rejection (`approved` / `rejected`).
- **Additional Media Cards**: Individual approval or rejection with reason.

---

## 3. Shariah Compliance Certificate Workflow

Auditors can perform Shariah compliance audits directly on the project review page:

1. **Document Upload**:
   - Auditor uploads the official Shariah Compliance Certificate PDF.
   - Saved directly to the root `shariah_compliance_docs` storage bucket (no subfolders).
2. **Database Updates (`updateProjectShariahCompliance`)**:
   - `shariah_compliance_status = 'approved'`
   - `shariah_compliance_doc_url = publicUrl`
3. **Issuer Portal Locking Effect**:
   - Once marked as Shariah Compliant (`approved`), Steps 1 through 3 (Basic Info, Structure & Compliance, Financial Terms) become **locked** against issuer edits in the project editing wizard (`app/issuer-portal/projects/[slug]/edit/page.js`).
   - Issuers may still add or update milestones in Step 1. Updating a milestone changes its `verification_status` to `'pending'` without un-approving other milestones.

---

## 4. Calculated Baseline Minimum Eligible Investor Class Panel

To enforce regulatory compliance (§1 & §9 of `class-rules.md`), the project review workstation calculates a **System Baseline Minimum Class**:

### Algorithm Logic (`calculateBaselineMinClass`)
1. **Floor Constraint (§9)**: Calculates max pledge capacity required based on `min_investment_floor`. (e.g. `floor > $500` excludes Class 10, requiring Class 9 or higher).
2. **Target Raise Goal Threshold (§1)**:
   - Target Goal > \$5M $\rightarrow$ Minimum Class 5
   - Target Goal > \$10M $\rightarrow$ Minimum Class 6
   - Target Goal > \$15M $\rightarrow$ Minimum Class 7
   - Target Goal > \$20M $\rightarrow$ Minimum Class 8
3. **Combined System Recommendation**: Takes `Math.min(highestClassByFloor, highestClassByGoal)`.

### Auditor Assignment
- Auditor inspects the recommendation card and saves the project's `min_eligible_investor_class` via `updateProjectMinClassDecision({ projectId, selectedClass })`.

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
   - **Marketplace Visibility**: Project becomes active and visible on the Investor Marketplace (`/investor-portal/marketplace`).

2. **Decision = 'send_back'**:
   - **Status Update**: `projects.status = 'draft'`, `review_notes = reviewNotes`.
   - **Issuer Experience**: Banner displays auditor notes on `/issuer-portal/projects/[slug]/edit`. Issuer can make requested corrections and re-submit. Upon re-submission, `review_notes` is reset to `null`.

3. **Decision = 'reject'**:
   - **Status Update**: `projects.status = 'rejected'`, `review_notes = reviewNotes`.
   - **Outcome**: Campaign proposal is rejected and cannot be submitted.
