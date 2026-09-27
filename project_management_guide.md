# Per-Project Management System Architecture & Tab Specification

This document details the architecture, tab structure, data models, and business logic for the upcoming **Per-Project Management Page** (`/issuer-portal/projects/[slug]/manage`).

---

## 1. Overview & Navigation Model

- **Access Point**: Opened from the **"My Projects"** page via the **"Manage Project"** button (enabled only when `status != 'draft'` and `status != 'pending_review'`).
- **Layout Structure**: Single project container with a tabbed sub-navigation bar rather than flat top-level sidebar items.
- **Scope**: Serves as the central operational hub for ongoing live campaigns, active SPVs, milestone verification, document maintenance, underwriter syndication, equity conversion, and mudarabah/fixed income distributions.

---

## 2. Tab Specifications

### 2.1 Tab 1: Overview
Provides live campaign analytics and investor class breakdowns.

- **Live Funding Metrics**: Live raised amount, target goal, percent funded, remaining time, and active investor count.
- **Investor Breakdown by Class**:
  - Maps directly to the `investor_breakdown` custody API payload:
    ```json
    [
      { "class": 1, "count": 2, "total": 10000000 },
      { "class": 2, "count": 5, "total": 2500000 },
      { "class": 3, "count": 12, "total": 1200000 }
    ]
    ```
- **Campaign End Date & Countdown**: Real-time timer and campaign deadline info.

---

### 2.2 Tab 2: Roadmap (Milestone Management)
Manages project execution phases and confirmation workflows.

- **Milestone Timeline**: Complete historical and upcoming timeline.
- **System Milestones**: Read-only system-triggered events (e.g. Escrow Release, Campaign Close).
- **Issuer-Defined Milestones**:
  - Issuer can add new milestones for active projects.
  - Issuer marks completed milestones as `reached` $\rightarrow$ transitions status to `pending_confirmation`.
  - Platform/Auditor reviewer confirms evidence before milestone transitions to `completed`.

---

### 2.3 Tab 3: Documents
Central document repository and review tracking.

- **Document Inventory**: View pitch deck, balance sheet, valuation report, cap table, and SPV registration documents.
- **Reviewer Feedback Visibility**: Displays reviewer rejection notes or requested changes directly alongside the document.
- **Live Document Replacement Rule (Draft-Lock Exception)**:
  - Replacing or updating a document on a live/approved project is **not** a silent bypass.
  - Uploading an updated document (e.g. updated valuation report or audited financials) triggers a **Draft-Lock Exception**: the document status transitions to `pending_review` and requires auditor sign-off before replacing the active public version.

---

### 2.4 Tab 4: Underwriting *(Conditional: `underwriter_mode_enabled = true`)*
Displays institutional lead underwriting and syndicate commitments.

- **Read-Only Status**:
  - Lists which Class 1 institutional investors were offered deal tranches.
  - Shows committed amounts, lead underwriter designation, and tranche status.
- **Platform Control**: Matching and lead allocation are driven by platform auditors and smart matching logic, so the view remains read-only for the issuer.

---

### 2.5 Tab 5: Conversion & Valuations *(Conditional: `is_spv = true` AND `conversion_enabled = true`)*
Tracks equity conversion triggers and valuation updates.

- **Trigger Progress**: Real-time tracking of latest share price vs. equity conversion trigger price.
- **Valuation Submission**:
  - Allows the issuer to submit a new valuation report upon genuine triggers (audited report, new funding round, secondary listing).
  - Feeds the reviewer-confirmation flow before updating active unit conversion formulas.

---

### 2.6 Tab 6: Distributions
Manages Sharia profit distributions based on contract type.

- **Mudarabah Contracts (Variable Profit Sharing)**:
  - Issuer reports actual period profit/loss.
  - Report goes through reviewer-confirmation step before executing automated wallet payouts to investors.
- **Fixed Rate Contracts (Murabaha / Ijara)**:
  - Read-only payout schedule showing fixed payment dates and rates set at issuance.
