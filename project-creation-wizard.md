# Issuer Project Creation Wizard Specification

Comprehensive technical specification and operational guide for the **Issuer Project Creation Wizard** (`/issuer-portal/projects/new` & `/issuer-portal/projects/[slug]/edit`).

---

## 1. Overview & Core Philosophy

The Issuer Project Creation Wizard enables project originators (issuers) to construct, configure, document, and submit Sharia-compliant crowdfunding projects for compliance review. The wizard operates on five core principles:

1. **Step-by-Step Draft Persistence**: Progress is saved per step to the database. An issuer can exit the wizard at any point and resume later. Step progression is tracked in `projects.current_step` (1 to 6).
2. **Server-Enforced Ownership & Security**: All actions require an active Clerk organization session (`org_id`). The server verifies that `issuers.org_id` matches the session and that `projects.issuer_id` belongs to that issuer.
3. **UTC Date Standard**: All user date inputs (`campaign_end_date`, `conversion_deadline`, milestone `target_date`) are treated as **UTC directly** without client-side timezone offset conversions. Values are parsed with `parseAsUtcIso` and stored in UTC ISO 8601 format.
4. **Strict Temporal Validation**: The `conversion_deadline` MUST be strictly after the `campaign_end_date`. The wizard enforces cross-step temporal validation so an issuer cannot set a campaign end date that exceeds or equals the conversion deadline.
5. **SPV Equity vs. Sukuk Contract Locking**:
   - `spv_equity`: Auto-locks `is_spv = true`, `unit_type = 'shares'`, `yield_type = 'equity_appreciation'`, autocalculates `target_goal = unit_price * total_shares_authorized`, and hides ROI % and conversion clause settings.
   - Non-equity Sukuk (`murabaha`, `mudarabah`, `ijara`): Allows optional SPV setup and optional conversion clause terms.

---

## 2. Database Schemas & Sample Rows

Below are the exact database schemas and sample data rows involved in project creation.

### 2.1 `projects` Table

```sql
CREATE TABLE projects (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issuer_id BIGINT REFERENCES issuers(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary TEXT,
  full_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'pending_review', 'campaign_live', 'funded', 'completed', 'cancelled'
  sharia_contract_type TEXT NOT NULL, -- 'murabaha', 'mudarabah', 'ijara', 'spv_equity'
  shariah_compliance_status TEXT DEFAULT 'pending',
  shariah_certificate_doc_id BIGINT,
  visibility_tier TEXT DEFAULT '',
  min_eligible_investor_class INT DEFAULT 10,
  target_goal NUMERIC NOT NULL,
  soft_cap NUMERIC NOT NULL,
  hard_cap NUMERIC NOT NULL,
  min_investment_floor NUMERIC NOT NULL DEFAULT 1000,
  unit_price NUMERIC,
  expected_roi_percent NUMERIC,
  yield_type TEXT, -- 'rental', 'profit_margin', 'equity_appreciation'
  currency TEXT NOT NULL DEFAULT 'AED', -- 'AED', 'MYR', 'USD', 'IDR'
  clearing_option TEXT NOT NULL, -- 'platform_clearing', 'custody_provider_clearing'
  is_spv BOOLEAN NOT NULL DEFAULT FALSE,
  current_step INT DEFAULT 1,
  cover_image_url TEXT,
  unit_type TEXT DEFAULT 'sukuk', -- 'sukuk', 'shares'
  campaign_end_date TIMESTAMPTZ
);
```

**Sample Row (`projects`):**
```json
[
  {
    "idx": 0,
    "id": 12,
    "created_at": "2026-09-13 19:29:34.64107+00",
    "issuer_id": 35,
    "title": "GreenGrid Solar Expansion Phase II",
    "slug": "greengrid-solar-expansion-phase-ii",
    "summary": "Expanding off-grid solar microgrids across rural Kenya to bring clean, reliable power to over 5,000 households and local businesses.",
    "full_description": "<h2>GreenGrid Solar Expansion Phase II</h2><p>Kenya Energy is scaling its localized renewable infrastructure...</p>",
    "status": "campaign_live",
    "sharia_contract_type": "mudarabah",
    "shariah_compliance_status": "pending",
    "shariah_certificate_doc_id": null,
    "visibility_tier": "",
    "min_eligible_investor_class": 5,
    "target_goal": 5500000,
    "soft_cap": 2000000,
    "hard_cap": 6000000,
    "min_investment_floor": 1000,
    "unit_price": 250,
    "expected_roi_percent": 14.5,
    "yield_type": "profit_margin",
    "currency": "AED",
    "clearing_option": "platform_clearing",
    "is_spv": true,
    "current_step": 6,
    "cover_image_url": "https://ddtxafswygsidegaclau.supabase.co/storage/v1/object/public/cover_img/org_3J6fjhVCJZWVqLgdVjQt1EQfiDm/5a3e99b4-6126-422b-aac3-e951ace0bed9.png",
    "unit_type": "sukuk",
    "campaign_end_date": "2027-12-31 21:00:00+00"
  }
]
```

---

### 2.2 `spv_details` Table

```sql
CREATE TABLE spv_details (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  spv_legal_name TEXT NOT NULL,
  registration_authority TEXT NOT NULL, -- 'DIFC', 'ADGM', 'LABUAN_IBFC', etc.
  registration_number TEXT NOT NULL,
  issuer_id BIGINT REFERENCES issuers(id),
  conversion_trigger_type TEXT DEFAULT 'share_price_above',
  conversion_enabled BOOLEAN DEFAULT FALSE,
  conversion_trigger_value NUMERIC, -- Trigger share price (e.g. 37.5 AED) --The share price at which conversion is eligible
  conversion_ratio_shares NUMERIC, -- 1 Sukuk unit converts to X shares (e.g. 5)
  conversion_deadline DATE, -- Conversion deadline date in UTC (e.g. '2028-01-01')
  total_shares_authorized NUMERIC, 
  total_cost_authorized NUMERIC,
  spv_detail_verification_status TEXT DEFAULT 'pending'
);
```

**Sample Row (`spv_details`):**
```json
[
  {
    "idx": 0,
    "id": 4,
    "created_at": "2026-09-13 20:02:14.020648+00",
    "project_id": 12,
    "spv_legal_name": "GreenGrid Kenya SPV Limited",
    "registration_authority": "KRA",
    "registration_number": "112345678",
    "issuer_id": 35,
    "conversion_trigger_type": "share_price_above",
    "conversion_enabled": true,
    "conversion_trigger_value": 37.5,
    "conversion_ratio_shares": 5,
    "conversion_deadline": "2028-01-01",
    "total_shares_authorized": 50000,
    "total_cost_authorized": 2500000,
    "spv_detail_verification_status": "pending"
  }
]
```

---

### 2.3 `project_milestones` Table

```sql
CREATE TABLE project_milestones (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE, -- Stored as UTC date string YYYY-MM-DD
  milestone_source TEXT NOT NULL, -- 'issuer' or 'system'
  linked_system_event TEXT, -- 'campaign_live', 'campaign_funded', 'custody_transfer_complete'
  status TEXT DEFAULT 'upcoming',
  issuer_id BIGINT REFERENCES issuers(id)
);
```

**Sample Rows (`project_milestones`):**
```json
[
  {
    "idx": 2,
    "id": 4,
    "created_at": "2026-09-18 21:35:09.296966+00",
    "project_id": 12,
    "title": "Custody transfer complete",
    "description": "Custody transfer and settlement finalized.",
    "target_date": "2028-01-05",
    "milestone_source": "system",
    "linked_system_event": "custody_transfer_complete",
    "status": "upcoming",
    "issuer_id": null
  },
  {
    "idx": 3,
    "id": 54,
    "created_at": "2026-09-19 14:50:01.108582+00",
    "project_id": 12,
    "title": "Site Acquisition",
    "description": "We will buy the site once we reach 800,000 AED invested",
    "target_date": "2026-12-01",
    "milestone_source": "issuer",
    "linked_system_event": null,
    "status": "upcoming",
    "issuer_id": 35
  }
]
```

---

### 2.4 Supporting Tables: `project_media`, `project_docs`, `issuers`

```sql
-- project_media
CREATE TABLE project_media (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL DEFAULT 'image',
  url TEXT NOT NULL,
  display_order INT DEFAULT 1,
  issuer_id BIGINT REFERENCES issuers(id)
);

-- project_docs
CREATE TABLE project_docs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, -- 'pitch_deck', 'balance_sheet', 'valuation_report', 'cap_table', 'spv_registration'
  file_url TEXT NOT NULL,
  uploaded_by TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  issuer_id BIGINT REFERENCES issuers(id)
);
```

---

## 3. Related Documentation References

- **[class-rules.md](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/class-rules.md)**: Governs SPV Equity vs Sukuk rules, total cost authorized caps, conversion ceilings, and min floor interaction.
- **[marketplace-and-project-page.md](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/marketplace-and-project-page.md)**: Defines how created campaign terms appear to investors.
- **[pledging-process.md](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/pledging-process.md)**: Governs investor pledges against created projects.

---

## 4. Step-by-Step Wizard Architecture

The wizard consists of 6 sequential steps located in [app/components/wizard/](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/app/components/wizard/).

### Step 1: Basic Information & Issuer Roadmap Milestones
- **File**: `Step1BasicInfo.js`
- **Fields**:
  - **Project Title**: Plain text (triggers unique slug creation via `slugify`).
  - **Summary**: Concise summary (max 150 characters enforced with live counter).
  - **Full Description**: Rich HTML text editor (TipTap integration sanitized via DOMPurify).
  - **Issuer Milestones (Repeatable List)**:
    - Milestone Title (e.g. *"Site Acquisition & Permits"*).
    - Target Date: Date input (`YYYY-MM-DD`). Parsed via `parseAsUtcIso` and saved as UTC string.
    - Description: Execution plan details.
- **Backend Action**: `updateProjectDraft(projectId, data, step: 1)` updates `projects` and synchronizes `project_milestones` (`milestone_source = 'issuer'`).

---

### Step 2: Structure & Compliance
- **File**: `Step2Structure.js`
- **Fields & Controls**:
  - **Sharia Contract Type**: `murabaha`, `mudarabah`, `ijara`, or `spv_equity`.
  - **SPV Configuration**: `is_spv` checkbox (automatically checked and disabled for `spv_equity`).
  - **SPV Details**:
    - `spv_legal_name`: Legal registered entity name.
    - `registration_authority`: `DIFC`, `ADGM`, `LABUAN_IBFC`, or `OTHER`. If `OTHER`, input field opens for custom text.
    - `registration_number`: Official commercial registration number.
  - **Conversion Clause (Non-Equity SPVs)**:
    - `conversion_enabled`: Checkbox to activate conversion clause.
    - `total_shares_authorized`: Total share count reserved for conversion.
    - `conversion_trigger_value`: Trigger price per share (e.g. `37.5`).
    - `conversion_ratio_shares`: Number of shares per 1 Sukuk unit (e.g. `5`).
    - `conversion_deadline`: Date input (`YYYY-MM-DD`).
- **Temporal Validation Rule**:
  - If `conversion_deadline` is set and `campaign_end_date` exists, `conversion_deadline` MUST be strictly after `campaign_end_date`.
  - If `convDate <= campaignDate`, Zod refines with inline error:
    > *"The conversion deadline must be after the campaign end date. Please choose a conversion deadline after the campaign end date."*
- **Backend Action**: `updateProjectDraft(projectId, data, step: 2)` updates `projects.sharia_contract_type`, `unit_type`, and upserts `spv_details`.

---

### Step 3: Financial Terms
- **File**: `Step3Financials.js`
- **Fields & Calculations**:
  - **Currency**: `AED`, `MYR`, `USD`, or `IDR`.
  - **Unit Price**: Price per unit (e.g. `AED 250` per sukuk/share).
  - **Target Goal**: Target raise amount.
    - *SPV Equity*: Autocalculated as `unit_price * total_shares_authorized` and locked.
  - **Soft Cap & Hard Cap**:
    - `soft_cap <= target_goal <= hard_cap`.
    - *SPV Equity*: `hard_cap` is locked to equal `target_goal`.
  - **Min Investment Floor**: Minimum integer pledge floor (e.g. `AED 1,000`).
  - **Campaign Deadline (`campaign_end_date`)**:
    - HTML `datetime-local` input (e.g. `2027-12-31T21:00`).
    - **UTC Rule**: Input values are assumed to be in UTC directly! Saved via `parseAsUtcIso` as `2027-12-31T21:00:00.000Z` without local offset adjustment.
  - **Yield Type**: `rental`, `profit_margin`, or `equity_appreciation` (locked to `equity_appreciation` for `spv_equity`).
  - **Expected ROI %**: Annual target ROI (hidden for `spv_equity`).
  - **Clearing Option**: `platform_clearing` or `custody_provider_clearing`.
- **Validation Rules**:
  - `soft_cap <= target_goal <= hard_cap`.
  - Minimum Target Goal requirement for conversion clause: `target_goal >= Total Cost Authorized = (unit_price / conversion_ratio_shares) * total_shares_authorized`.
  - Campaign End Date vs Conversion Deadline check: `campaign_end_date` cannot be later than or equal to `conversion_deadline`. If invalid, displays inline error:
    > *"The campaign end date cannot be later than the conversion deadline. Please go back to Step 2 to change the conversion deadline or choose an earlier campaign end date."*
- **Automatic System Milestones Synchronization**:
  - `ensureSystemMilestonesExist(projectId, campaignEndDateIso)` automatically creates/updates system milestones:
    - `campaign_live`: Initial live launch milestone.
    - `campaign_funded`: Target date set to `campaign_end_date`.
    - `custody_transfer_complete`: Target date set to `campaign_end_date + 5 days`.

---

### Step 4: Document Center
- **File**: `Step4Documents.js`
- Uploads required legal and financial documents to Supabase Storage bucket `project_docs`.
- **Mandatory Documents**:
  1. Pitch Deck (`pitch_deck`)
  2. Audited Balance Sheet (`balance_sheet`)
  3. Valuation Report (`valuation_report`)
  4. Cap Table (`cap_table` - required if `is_spv = true`)
  5. SPV Registration Certificate (`spv_registration` - required if `is_spv = true`)
- Deletion helper: `deleteProjectDoc(projectId, fileUrl)`.

---

### Step 5: Media & Gallery
- **File**: `Step5Media.js`
- Uploads cover image (`cover_image_url`) and gallery visuals to `project_media`.
- Deletion helper: `deleteProjectMedia(projectId, fileUrl)`.

---

### Step 6: Review & Final Submission
- **File**: `Step6Preview.js`
- Renders full interactive summary of all entered parameters across all 5 preceding steps.
- Renders all dates in UTC format (`formatUtcDate` / `formatUtcDateOnly`).
- **Submission Action (`submitProjectForReview`)**:
  - Executes comprehensive completeness checks across text fields, financial terms, mandatory document types, and media.
  - If any required field is missing, returns `{ success: false, missingFields: [...] }`.
  - Upon validation pass, updates `projects.status = "pending_review"`.

---

## 5. Summary Checklist for Issuers & Developers

- [x] Draft progress persisted across wizard steps in `projects.current_step`.
- [x] Issuer ownership verified via `org_id` -> `issuers.id`.
- [x] Date inputs parsed directly as UTC (`parseAsUtcIso`).
- [x] `conversion_deadline` enforced to be strictly after `campaign_end_date`.
- [x] System milestones automatically synced upon setting campaign end date.
- [x] SPV Equity terms autocalculated and locked.
